import { TextSelection } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'

type InlineKey = '*' | '_' | '~' | '`' | '='

export function inlineFormattingKey(event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'isComposing'>): InlineKey | null {
  if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return null
  return ['*', '_', '~', '`', '='].includes(event.key) ? event.key as InlineKey : null
}

export function wrapMarkdownSelection(value: string, start: number, end: number, key: InlineKey): { value: string; start: number; end: number } | null {
  if (start >= end || !value.slice(start, end).trim()) return null
  const [open, close] = key === '~' ? ['~~', '~~'] : key === '=' ? ['<mark>', '</mark>'] : [key, key]
  return {
    value: value.slice(0, start) + open + value.slice(start, end) + close + value.slice(end),
    start: start + open.length,
    end: end + open.length
  }
}

export function applyInlineFormatting(view: EditorView, key: InlineKey): boolean {
  const { state } = view
  const { selection, schema, doc } = state
  if (!(selection instanceof TextSelection) || selection.empty || !doc.textBetween(selection.from, selection.to, '\n').trim()) return false

  let insideCodeBlock = false
  doc.nodesBetween(selection.from, selection.to, (node) => {
    if (node.type.spec.code && node.isBlock) insideCodeBlock = true
  })
  if (insideCodeBlock) return false

  const { from, to } = selection
  const markName = key === '*' || key === '_' ? 'italic' : key === '~' ? 'strike' : key === '`' ? 'code' : 'highlight'
  const mark = schema.marks[markName]
  if (!mark) return false

  const tr = state.tr
  if ((key === '*' || key === '_') && doc.rangeHasMark(from, to, mark) && !doc.rangeHasMark(from, to, schema.marks.bold)) {
    tr.removeMark(from, to, mark).addMark(from, to, schema.marks.bold.create())
  } else if (doc.rangeHasMark(from, to, mark)) {
    tr.removeMark(from, to, mark)
  } else {
    tr.addMark(from, to, mark.create())
  }
  view.dispatch(tr.scrollIntoView())
  return true
}
