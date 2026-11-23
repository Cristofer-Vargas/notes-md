import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { Mapping } from '@tiptap/pm/transform'
import { createSideNoteAnchor, resolveSideNoteAnchor, type SideNoteAnchor } from '../../../../shared/sideNotes'

export interface TextProjection {
  text: string
  /** One document position per character boundary. */
  positions: number[]
}

/** Project text blocks into a stable string while retaining ProseMirror positions. */
export function projectDocumentText(doc: ProseMirrorNode): TextProjection {
  let text = ''
  const positions: number[] = []
  let seenBlock = false
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true
    if (seenBlock) {
      text += '\n'
      positions.push(pos + 1)
    } else {
      positions.push(pos + 1)
    }
    seenBlock = true
    node.descendants((child, childPos) => {
      const start = pos + 1 + childPos
      if (child.isText && child.text) {
        for (let i = 0; i < child.text.length; i++) {
          text += child.text[i]
          positions.push(start + i + 1)
        }
      } else if (child.isInline && child.isLeaf) {
        text += '\ufffc'
        positions.push(start + child.nodeSize)
      }
      return !child.isLeaf
    })
    return false
  })
  return { text, positions }
}

export function anchorFromEditorSelection(doc: ProseMirrorNode, from: number, to: number): SideNoteAnchor | null {
  if (from === to) {
    const resolved = doc.resolve(from)
    if (!resolved.parent.isTextblock) return null
    from = resolved.start()
    to = resolved.end()
  }
  const projection = projectDocumentText(doc)
  const start = projection.positions.findIndex((position) => position >= from)
  let end = -1
  for (let i = projection.positions.length - 1; i >= 0; i--) {
    if (projection.positions[i] <= to) { end = i; break }
  }
  return start < 0 || end < 0 ? null : createSideNoteAnchor(projection.text, start, end)
}

export function resolveEditorAnchor(doc: ProseMirrorNode, anchor: SideNoteAnchor): { status: 'attached'; from: number; to: number } | { status: 'missing' | 'ambiguous' } {
  const projection = projectDocumentText(doc)
  const result = resolveSideNoteAnchor(projection.text, anchor)
  if (result.status !== 'attached') return result
  const from = projection.positions[result.from]
  const to = projection.positions[result.to]
  return from === undefined || to === undefined ? { status: 'missing' } : { status: 'attached', from, to }
}

/** Map an attached range through an editor transaction without modifying the note. */
export function mapEditorAnchor(previousDoc: ProseMirrorNode, nextDoc: ProseMirrorNode, mapping: Mapping, anchor: SideNoteAnchor): SideNoteAnchor | null {
  const range = resolveEditorAnchor(previousDoc, anchor)
  if (range.status !== 'attached') return null
  const from = mapping.mapResult(range.from, 1)
  const to = mapping.mapResult(range.to, -1)
  if (from.pos >= to.pos || (from.deletedAcross && to.deletedAcross)) return null
  return anchorFromEditorSelection(nextDoc, from.pos, to.pos)
}

/** Map one contiguous document change when editing the Markdown source. */
export function mapEditorAnchorByDiff(previousDoc: ProseMirrorNode, nextDoc: ProseMirrorNode, anchor: SideNoteAnchor): SideNoteAnchor | null {
  const range = resolveEditorAnchor(previousDoc, anchor)
  if (range.status !== 'attached') return null
  const start = previousDoc.content.findDiffStart(nextDoc.content)
  if (start === null) return anchor
  const end = previousDoc.content.findDiffEnd(nextDoc.content)
  if (!end) return null
  const oldEnd = Math.max(start, end.a)
  const newEnd = Math.max(start, end.b)
  const delta = newEnd - oldEnd
  const from = range.from < start ? range.from : range.from >= oldEnd ? range.from + delta : start
  const to = range.to <= start ? range.to : range.to >= oldEnd ? range.to + delta : newEnd
  if (from >= to || from < 0 || to > nextDoc.content.size) return null
  try { return anchorFromEditorSelection(nextDoc, from, to) } catch { return null }
}
