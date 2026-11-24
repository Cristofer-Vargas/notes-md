import { Extension } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export const headingFoldKey = new PluginKey<Set<number>>('headingFold')

export interface FoldedHeadingReference {
  level: number
  text: string
  occurrence: number
}

function listHeadings(doc: ProseMirrorNode): Array<FoldedHeadingReference & { position: number }> {
  const occurrences = new Map<string, number>()
  const headings: Array<FoldedHeadingReference & { position: number }> = []
  doc.forEach((node, position) => {
    if (node.type.name !== 'heading') return
    const level = Number(node.attrs.level)
    const text = node.textContent.trim().replace(/\s+/g, ' ')
    const key = JSON.stringify([level, text])
    const occurrence = (occurrences.get(key) ?? 0) + 1
    occurrences.set(key, occurrence)
    headings.push({ position, level, text, occurrence })
  })
  return headings
}

function headingReferenceKey(reference: FoldedHeadingReference): string {
  return JSON.stringify([reference.level, reference.text, reference.occurrence])
}

/** Create stable heading references that can be stored between editor sessions. */
export function getFoldedHeadingReferences(doc: ProseMirrorNode, folded: Set<number>): FoldedHeadingReference[] {
  return listHeadings(doc)
    .filter((heading) => folded.has(heading.position))
    .map(({ level, text, occurrence }) => ({ level, text, occurrence }))
}

/** Resolve saved heading references against the current document structure. */
export function restoreFoldedHeadings(doc: ProseMirrorNode, references: readonly FoldedHeadingReference[]): Set<number> {
  const validReferences = new Set(references.filter((reference) =>
    Number.isInteger(reference.level) && reference.level >= 1 && reference.level <= 6 &&
    typeof reference.text === 'string' && Number.isInteger(reference.occurrence) && reference.occurrence > 0
  ).map(headingReferenceKey))
  return new Set(listHeadings(doc)
    .filter((heading) => validReferences.has(headingReferenceKey(heading)))
    .map((heading) => heading.position))
}

function getHeadingSection(doc: ProseMirrorNode, position: number): { start: number; end: number; level: number } | null {
  const blocks: Array<{ position: number; node: ProseMirrorNode }> = []
  doc.forEach((node, blockPosition) => blocks.push({ node, position: blockPosition }))
  const headingIndex = blocks.findIndex((block) => block.position === position && block.node.type.name === 'heading')
  if (headingIndex < 0) return null

  const heading = blocks[headingIndex]
  const level = Number(heading.node.attrs.level)
  const start = position + heading.node.nodeSize
  let end = start
  for (let index = headingIndex + 1; index < blocks.length; index++) {
    const block = blocks[index]
    if (block.node.type.name === 'heading' && Number(block.node.attrs.level) <= level) break
    end = block.position + block.node.nodeSize
  }
  return { start, end, level }
}

/** Find a folded heading that currently hides the given document position. */
export function foldedHeadingContainingPosition(doc: ProseMirrorNode, folded: Set<number>, target: number): number | null {
  for (const headingPosition of folded) {
    const section = getHeadingSection(doc, headingPosition)
    if (section && section.end > section.start && target >= section.start && target < section.end) return headingPosition
  }
  return null
}

/** Find all folded sections that overlap an anchored range, from outer to inner. */
export function foldedHeadingsContainingRange(doc: ProseMirrorNode, folded: Set<number>, from: number, to: number): number[] {
  return Array.from(folded)
    .filter((headingPosition) => {
      const section = getHeadingSection(doc, headingPosition)
      if (!section || section.end <= section.start) return false
      return from === to
        ? from >= section.start && from < section.end
        : from < section.end && to > section.start
    })
    .sort((left, right) => left - right)
}

export function createHeadingFoldPlugin(): Plugin<Set<number>> {
    return new Plugin<Set<number>>({
      key: headingFoldKey,
      state: {
        init: () => new Set<number>(),
        apply(transaction, previous) {
          const action = transaction.getMeta(headingFoldKey) as { reset?: boolean; toggle?: number; restore?: number[] } | undefined
          if (action?.reset) return new Set<number>()
          if (action?.restore) {
            return new Set(action.restore.filter((position) => transaction.doc.nodeAt(position)?.type.name === 'heading'))
          }
          const next = new Set<number>()
          for (const position of previous) {
            const mapped = transaction.mapping.mapResult(position, 1)
            if (!mapped.deleted && transaction.doc.nodeAt(mapped.pos)?.type.name === 'heading') next.add(mapped.pos)
          }
          if (action?.toggle !== undefined) {
            if (next.has(action.toggle)) next.delete(action.toggle)
            else next.add(action.toggle)
          }
          return next
        }
      },
      props: {
        decorations(state) {
          const folded = headingFoldKey.getState(state) ?? new Set<number>()
          const decorations: Decoration[] = []
          let hiddenSectionLevel: number | null = null
          state.doc.forEach((node, position) => {
            if (hiddenSectionLevel !== null) {
              if (node.type.name !== 'heading' || Number(node.attrs.level) > hiddenSectionLevel) {
                decorations.push(Decoration.node(position, position + node.nodeSize, { class: 'heading-fold-hidden' }))
                return
              }
              hiddenSectionLevel = null
            }
            if (node.type.name === 'heading') {
              const section = getHeadingSection(state.doc, position)
              const canFold = Boolean(section && section.end > section.start)
              const isFolded = canFold && folded.has(position)
              if (isFolded && section) hiddenSectionLevel = section.level
              decorations.push(Decoration.widget(position + 1, (view, getPos) => {
                const group = document.createElement('span')
                group.className = 'heading-decoration-group'
                group.dataset.level = String(node.attrs.level)
                group.setAttribute('contenteditable', 'false')

                const marker = document.createElement('span')
                marker.className = 'heading-level-marker'
                marker.setAttribute('aria-hidden', 'true')
                group.appendChild(marker)

                if (!canFold) return group

                const control = document.createElement('span')
                control.className = 'heading-fold-control'
                control.setAttribute('role', 'button')
                control.setAttribute('contenteditable', 'false')
                control.setAttribute('aria-expanded', String(!isFolded))
                control.setAttribute('aria-label', isFolded ? 'Expandir conteúdo do título' : 'Recolher conteúdo do título')
                control.setAttribute('title', isFolded ? 'Expandir conteúdo do título' : 'Recolher conteúdo do título')
                control.tabIndex = 0
                const toggle = (): void => {
                  const widgetPos = getPos()
                  if (widgetPos === undefined) return
                  const headingPos = widgetPos - 1
                  const section = getHeadingSection(view.state.doc, headingPos)
                  const transaction = view.state.tr.setMeta(headingFoldKey, { toggle: headingPos })
                  const isExpanding = headingFoldKey.getState(view.state)?.has(headingPos)
                  const selection = view.state.selection
                  const selectionTouchesSection = section && (selection.empty
                    ? selection.from >= section.start && selection.from < section.end
                    : selection.to > section.start && selection.from < section.end)
                  if (!isExpanding && selectionTouchesSection) {
                    transaction.setSelection(TextSelection.near(transaction.doc.resolve(headingPos + 1)))
                  }
                  view.dispatch(transaction)
                }
                control.addEventListener('mousedown', (event) => event.preventDefault())
                control.addEventListener('click', (event) => { event.preventDefault(); event.stopPropagation(); toggle() })
                control.addEventListener('keydown', (event) => {
                  if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); toggle() }
                })
                group.appendChild(control)
                return group
              }, { key: `heading-decoration-${position}-${node.attrs.level}-${isFolded}`, side: -1 }))
            }
          })
          return DecorationSet.create(state.doc, decorations)
        }
      }
    })
}

export const HeadingFold = Extension.create({
  name: 'headingFold',
  addProseMirrorPlugins() {
    return [createHeadingFoldPlugin()]
  }
})
