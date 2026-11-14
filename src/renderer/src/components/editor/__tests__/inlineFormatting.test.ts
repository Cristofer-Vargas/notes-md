import { describe, expect, it, vi } from 'vitest'
import { Schema } from '@tiptap/pm/model'
import { EditorState, TextSelection } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'
import { applyInlineFormatting, inlineFormattingKey, wrapMarkdownSelection } from '../inlineFormatting'

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { group: 'block', content: 'text*' },
    codeBlock: { group: 'block', content: 'text*', code: true },
    text: { group: 'inline' }
  },
  marks: {
    bold: {}, italic: {}, strike: {}, code: { excludes: '_' }, highlight: {}
  }
})

function makeView(block = 'paragraph', selection = [1, 6]): EditorView {
  const doc = schema.node('doc', null, [schema.node(block, null, [schema.text('texto')])])
  const state = EditorState.create({ doc, selection: TextSelection.create(doc, selection[0], selection[1]) })
  const view = { state, dispatch: vi.fn() } as unknown as EditorView
  vi.mocked(view.dispatch).mockImplementation((transaction) => {
    Object.assign(view, { state: view.state.apply(transaction) })
  })
  return view
}

describe('formatação inline pela seleção', () => {
  it('identifica os símbolos digitados sem interferir em atalhos ou composição', () => {
    const event = { key: '*', ctrlKey: false, metaKey: false, altKey: false, isComposing: false }
    expect(inlineFormattingKey(event)).toBe('*')
    expect(inlineFormattingKey({ ...event, ctrlKey: true })).toBeNull()
    expect(inlineFormattingKey({ ...event, isComposing: true })).toBeNull()
    expect(inlineFormattingKey({ ...event, key: 'a' })).toBeNull()
  })

  it('envolve e mantém selecionado o conteúdo no Markdown, inclusive repetindo para negrito', () => {
    const italic = wrapMarkdownSelection('um texto aqui', 3, 8, '*')!
    expect(italic).toEqual({ value: 'um *texto* aqui', start: 4, end: 9 })
    expect(wrapMarkdownSelection(italic.value, italic.start, italic.end, '*')?.value).toBe('um **texto** aqui')
    expect(wrapMarkdownSelection('texto', 0, 5, '~')?.value).toBe('~~texto~~')
    expect(wrapMarkdownSelection('texto', 0, 5, '=')?.value).toBe('<mark>texto</mark>')
    expect(wrapMarkdownSelection('texto', 2, 2, '`')).toBeNull()
  })

  it('aplica itálico e depois negrito no editor visual mantendo a seleção', () => {
    const view = makeView()
    expect(applyInlineFormatting(view, '*')).toBe(true)
    expect(view.state.doc.rangeHasMark(1, 6, schema.marks.italic)).toBe(true)
    expect(applyInlineFormatting(view, '*')).toBe(true)
    expect(view.state.doc.rangeHasMark(1, 6, schema.marks.bold)).toBe(true)
    expect(view.state.doc.rangeHasMark(1, 6, schema.marks.italic)).toBe(false)
    expect([view.state.selection.from, view.state.selection.to]).toEqual([1, 6])
  })

  it('aplica e remove outros estilos e ignora texto sem seleção ou em bloco de código', () => {
    for (const [key, name] of [['~', 'strike'], ['`', 'code'], ['=', 'highlight']] as const) {
      const view = makeView()
      expect(applyInlineFormatting(view, key)).toBe(true)
      expect(view.state.doc.rangeHasMark(1, 6, schema.marks[name])).toBe(true)
      expect(applyInlineFormatting(view, key)).toBe(true)
      expect(view.state.doc.rangeHasMark(1, 6, schema.marks[name])).toBe(false)
    }
    expect(applyInlineFormatting(makeView('codeBlock'), '*')).toBe(false)
    expect(applyInlineFormatting(makeView('paragraph', [1, 1]), '*')).toBe(false)
  })
})
