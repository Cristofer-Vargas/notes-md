import type { Editor } from '@tiptap/react'

/** Restore a failed native click without moving a valid selection or stealing a new focus. */
export function recoverEditorFocusAfterClick(
  editor: Editor,
  point: { left: number; top: number },
  previousFocus: Element | null,
  ownerDocument: Document = document
): boolean {
  if (editor.isDestroyed || !editor.isEditable || !editor.view.dom.isConnected) return false
  const root = editor.view.dom
  const active = ownerDocument.activeElement
  if (active && active !== ownerDocument.body && active !== previousFocus && !root.contains(active)) return false

  const selection = ownerDocument.getSelection()
  if (editor.view.hasFocus() && selection?.anchorNode && root.contains(selection.anchorNode)) return false

  const hit = editor.view.posAtCoords(point)
  if (hit) editor.commands.setTextSelection(hit.pos)
  editor.view.focus()
  return true
}
