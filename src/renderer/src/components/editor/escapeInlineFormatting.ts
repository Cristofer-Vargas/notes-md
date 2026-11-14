import type { EditorView } from '@tiptap/pm/view'

/** Leave only the marks that continue on the other side of the cursor. */
export function escapeInlineFormatting(view: EditorView, event: KeyboardEvent): boolean {
  if (
    (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') ||
    event.shiftKey || event.ctrlKey || event.metaKey || event.altKey || event.isComposing ||
    !view.state.selection.empty
  ) return false

  const { $head } = view.state.selection
  if (!$head.parent.isTextblock || $head.parent.type.spec.code) return false

  const forward = event.key === 'ArrowRight'
  const origin = forward ? $head.nodeBefore : $head.nodeAfter
  const destination = forward ? $head.nodeAfter : $head.nodeBefore
  if (!origin?.isText) return false

  const active = view.state.storedMarks ?? $head.marks()
  const retained = active.filter((mark) =>
    !mark.isInSet(origin.marks) || Boolean(destination && mark.isInSet(destination.marks))
  )
  if (retained.length === active.length) return false

  view.dispatch(view.state.tr.setStoredMarks(retained))
  return true
}
