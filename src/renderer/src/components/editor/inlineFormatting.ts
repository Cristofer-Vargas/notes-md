import { TextSelection } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'

type InlineKey = '*' | '_' | '~' | '`' | '='

export const ORANGE_HIGHLIGHT_COLOR = '#fed7aa'

export function inlineFormattingKey(event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'isComposing'>): InlineKey | null {
  if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return null
  return ['*', '_', '~', '`', '='].includes(event.key) ? event.key as InlineKey : null
}

export function wrapMarkdownSelection(value: string, start: number, end: number, key: InlineKey): { value: string; start: number; end: number } | null {
  if (start >= end || !value.slice(start, end).trim()) return null
  if (key === '=') {
    const unwrapped = unwrapSelectedMark(value, start, end)
    if (unwrapped) return unwrapped
  }
  const [open, close] = key === '~' ? ['~~', '~~'] : key === '=' ? ['<mark>', '</mark>'] : [key, key]
  return {
    value: value.slice(0, start) + open + value.slice(start, end) + close + value.slice(end),
    start: start + open.length,
    end: end + open.length
  }
}

export function wrapMarkdownSelectionWithHighlightColor(
  value: string,
  start: number,
  end: number,
  color: string
): { value: string; start: number; end: number } | null {
  if (start >= end || !value.slice(start, end).trim()) return null
  const unwrapped = unwrapSelectedMark(value, start, end, color)
  if (unwrapped) return unwrapped

  const open = `<mark data-color="${color}">`
  const close = '</mark>'
  return {
    value: value.slice(0, start) + open + value.slice(start, end) + close + value.slice(end),
    start: start + open.length,
    end: end + open.length
  }
}

export function applyHighlightColor(view: EditorView, color: string): boolean {
  const { state } = view
  const { selection, schema, doc } = state
  if (!(selection instanceof TextSelection) || selection.empty || !doc.textBetween(selection.from, selection.to, '\n').trim()) return false

  let insideCodeBlock = false
  doc.nodesBetween(selection.from, selection.to, (node) => {
    if (node.type.spec.code && node.isBlock) insideCodeBlock = true
  })
  if (insideCodeBlock) return false

  const highlight = schema.marks.highlight
  if (!highlight) return false
  let foundText = false
  let selectionHasOnlyThisColor = true
  doc.nodesBetween(selection.from, selection.to, (node, position) => {
    if (!node.isText || Math.min(selection.to, position + node.nodeSize) <= Math.max(selection.from, position)) return
    foundText = true
    if (highlight.isInSet(node.marks)?.attrs.color !== color) selectionHasOnlyThisColor = false
  })

  const transaction = state.tr
  if (foundText && selectionHasOnlyThisColor) transaction.removeMark(selection.from, selection.to, highlight)
  else transaction.addMark(selection.from, selection.to, highlight.create({ color }))
  view.dispatch(transaction.scrollIntoView())
  return true
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

function unwrapSelectedMark(
  value: string,
  start: number,
  end: number,
  color?: string
): { value: string; start: number; end: number } | null {
  const openingMatch = value.slice(0, start).match(/<mark\b[^>]*>$/i)
  const closingMatch = value.slice(end).match(/^<\/mark\s*>/i)
  if (!openingMatch || !closingMatch) return null

  if (color) {
    const existingColor = openingMatch[0].match(/\bdata-color\s*=\s*(["'])(.*?)\1/i)?.[2]
    if (existingColor?.toLowerCase() !== color.toLowerCase()) return null
  }

  const openingStart = start - openingMatch[0].length
  const nextValue = value.slice(0, openingStart) + value.slice(start, end) + value.slice(end + closingMatch[0].length)
  const nextSelectionStart = start - openingMatch[0].length
  return {
    value: nextValue,
    start: nextSelectionStart,
    end: nextSelectionStart + end - start
  }
}
