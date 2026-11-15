import { Extension } from '@tiptap/core'
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export const headingFoldKey = new PluginKey<Set<number>>('headingFold')

export function createHeadingFoldPlugin(): Plugin<Set<number>> {
    return new Plugin<Set<number>>({
      key: headingFoldKey,
      state: {
        init: () => new Set<number>(),
        apply(transaction, previous) {
          const action = transaction.getMeta(headingFoldKey) as { reset?: boolean; toggle?: number } | undefined
          if (action?.reset) return new Set<number>()
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
          let hiding = false
          let hiddenBranchLevel: number | null = null
          state.doc.forEach((node, position, index) => {
            if (hiddenBranchLevel !== null) {
              if (node.type.name !== 'heading' || node.attrs.level > hiddenBranchLevel) {
                decorations.push(Decoration.node(position, position + node.nodeSize, { class: 'heading-fold-hidden' }))
                return
              }
              hiddenBranchLevel = null
              hiding = false
            }
            if (node.type.name === 'heading') {
              hiding = folded.has(position)
              const isFolded = hiding
              const nextNode = index + 1 < state.doc.childCount ? state.doc.child(index + 1) : null
              const hasSubheadings = nextNode?.type.name === 'heading' && nextNode.attrs.level > node.attrs.level
              if (!nextNode || (nextNode.type.name === 'heading' && !hasSubheadings)) return
              if (isFolded && hasSubheadings) hiddenBranchLevel = node.attrs.level
              decorations.push(Decoration.widget(position + 1, (view, getPos) => {
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
                  const transaction = view.state.tr.setMeta(headingFoldKey, { toggle: headingPos })
                  if (!headingFoldKey.getState(view.state)?.has(headingPos)) {
                    const heading = view.state.doc.nodeAt(headingPos)
                    let end = headingPos + (heading?.nodeSize ?? 0)
                    let branch: boolean | null = null
                    let stopped = false
                    view.state.doc.forEach((child, pos) => {
                      if (pos < end || stopped) return
                      if (branch === null) branch = child.type.name === 'heading' && child.attrs.level > heading?.attrs.level
                      if (child.type.name === 'heading' && (!branch || child.attrs.level <= heading?.attrs.level)) { stopped = true; return }
                      end = pos + child.nodeSize
                    })
                    if (view.state.selection.from < end && view.state.selection.to > headingPos) {
                      transaction.setSelection(TextSelection.near(transaction.doc.resolve(headingPos + 1)))
                    }
                  }
                  view.dispatch(transaction)
                }
                control.addEventListener('mousedown', (event) => event.preventDefault())
                control.addEventListener('click', (event) => { event.preventDefault(); event.stopPropagation(); toggle() })
                control.addEventListener('keydown', (event) => {
                  if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); toggle() }
                })
                return control
              }, { key: `heading-fold-${position}-${hiding}`, side: -1 }))
            } else if (hiding) {
              decorations.push(Decoration.node(position, position + node.nodeSize, { class: 'heading-fold-hidden' }))
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
