import { Fragment } from '@tiptap/pm/model'
import { NodeSelection, TextSelection } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'

export function blockShortcut(event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey' | 'isComposing'>): { direction: -1 | 1; duplicate: boolean } | null {
  if (!event.ctrlKey || event.metaKey || event.shiftKey || event.isComposing || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return null
  return { direction: event.key === 'ArrowUp' ? -1 : 1, duplicate: event.altKey }
}

export function moveEditorBlocks(view: EditorView, direction: -1 | 1, duplicate: boolean): boolean {
  const { state } = view
  const { selection } = state
  const { $from, $to } = selection
  let depth = $from.sharedDepth(selection.to)
  while (depth > 0 && !['bulletList', 'orderedList', 'taskList'].includes($from.node(depth).type.name)) depth--
  const parent = $from.node(depth)
  const parentStart = depth === 0 ? 0 : $from.start(depth)
  const startIndex = $from.index(depth)
  let endIndex = $to.index(depth)
  if ($to.pos > $to.start(depth) && $to.parentOffset === 0 && $to.depth === depth) endIndex--
  if (selection instanceof NodeSelection) endIndex = startIndex
  endIndex = Math.max(startIndex, Math.min(endIndex, parent.childCount - 1))
  if (startIndex >= parent.childCount) return true
  if (!duplicate && ((direction < 0 && startIndex === 0) || (direction > 0 && endIndex === parent.childCount - 1))) return true

  const children = Array.from({ length: parent.childCount }, (_, i) => parent.child(i))
  const selected = children.slice(startIndex, endIndex + 1)
  const originalStart = parentStart + children.slice(0, startIndex).reduce((sum, node) => sum + node.nodeSize, 0)
  const targetIndex = duplicate ? (direction < 0 ? startIndex : endIndex + 1) : startIndex + direction
  const replacement = [...children]
  if (duplicate) replacement.splice(targetIndex, 0, ...selected)
  else { replacement.splice(startIndex, selected.length); replacement.splice(targetIndex, 0, ...selected) }
  const fragment = Fragment.fromArray(replacement)
  if (!parent.canReplace(0, parent.childCount, fragment)) return true
  const newStart = parentStart + replacement.slice(0, targetIndex).reduce((sum, node) => sum + node.nodeSize, 0)
  const shift = newStart - originalStart
  const tr = state.tr.replaceWith(parentStart, parentStart + parent.content.size, fragment)
  if (selection instanceof NodeSelection) tr.setSelection(NodeSelection.create(tr.doc, newStart))
  else if (selection instanceof TextSelection) {
    tr.setSelection(TextSelection.create(tr.doc, selection.anchor + shift, selection.head + shift))
  }
  view.dispatch(tr.scrollIntoView())
  return true
}

export function moveMarkdownLines(value: string, start: number, end: number, direction: -1 | 1, duplicate: boolean): { value: string; start: number; end: number } | null {
  const lines = value.split('\n')
  const hasTrailingNewline = value.endsWith('\n')
  if (hasTrailingNewline) lines.pop()
  const lineAt = (pos: number): number => value.slice(0, pos).split('\n').length - 1
  const first = Math.min(lineAt(start), lines.length - 1)
  const last = Math.min(lineAt(end > start && value[end - 1] === '\n' ? end - 1 : end), lines.length - 1)
  if (first < 0 || (!duplicate && (direction < 0 ? first === 0 : last >= lines.length - 1))) return null
  const originalOffset = lines.slice(0, first).reduce((sum, line) => sum + line.length + 1, 0)
  const selected = lines.slice(first, last + 1)
  const target = duplicate ? (direction < 0 ? first : last + 1) : first + direction
  if (duplicate) lines.splice(target, 0, ...selected)
  else { lines.splice(first, selected.length); lines.splice(target, 0, ...selected) }
  const newOffset = lines.slice(0, target).reduce((sum, line) => sum + line.length + 1, 0)
  return { value: lines.join('\n') + (hasTrailingNewline ? '\n' : ''), start: start + newOffset - originalOffset, end: end + newOffset - originalOffset }
}
