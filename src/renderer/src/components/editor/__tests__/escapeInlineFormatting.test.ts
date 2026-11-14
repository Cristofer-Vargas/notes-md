import { describe, expect, it, vi } from 'vitest'
import { Schema } from '@tiptap/pm/model'
import { EditorState, TextSelection } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'
import { escapeInlineFormatting } from '../escapeInlineFormatting'

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { group: 'block', content: 'text*' },
    codeBlock: { group: 'block', content: 'text*', code: true },
    text: { group: 'inline' }
  },
  marks: { code: {}, bold: {}, highlight: {}, textStyle: { attrs: { color: {} } } }
})

function makeView(text: ReturnType<typeof schema.text>[], position: number, block = 'paragraph'): EditorView {
  const doc = schema.node('doc', null, [schema.node(block, null, text)])
  const view = { state: EditorState.create({ doc, selection: TextSelection.create(doc, position) }), dispatch: vi.fn() } as unknown as EditorView
  vi.mocked(view.dispatch).mockImplementation((transaction) => {
    Object.assign(view, { state: view.state.apply(transaction) })
  })
  return view
}

const arrow = (key: string, extra = {}): KeyboardEvent => ({ key, ...extra }) as KeyboardEvent

describe('saída de formatação inline com as setas', () => {
  it.each(['code', 'bold', 'highlight', 'textStyle'])('permite continuar sem %s no fim do parágrafo', (name) => {
    const mark = schema.marks[name].create(name === 'textStyle' ? { color: 'red' } : undefined)
    const view = makeView([schema.text('texto', [mark])], 6)
    expect(escapeInlineFormatting(view, arrow('ArrowRight'))).toBe(true)
    view.dispatch(view.state.tr.insertText('!'))
    expect(view.state.doc.textContent).toBe('texto!')
    expect(view.state.doc.nodeAt(6)?.marks).toEqual([])
  })

  it('sai para a esquerda no início e não prende a seta após sair', () => {
    const view = makeView([schema.text('texto', [schema.marks.code.create()])], 1)
    expect(escapeInlineFormatting(view, arrow('ArrowLeft'))).toBe(true)
    expect(view.state.storedMarks).toEqual([])
    expect(escapeInlineFormatting(view, arrow('ArrowLeft'))).toBe(false)
  })

  it('mantém a marca que continua no trecho seguinte', () => {
    const bold = schema.marks.bold.create()
    const code = schema.marks.code.create()
    const view = makeView([schema.text('um', [bold, code]), schema.text('dois', [bold])], 3)
    expect(escapeInlineFormatting(view, arrow('ArrowRight'))).toBe(true)
    expect(view.state.storedMarks).toEqual([bold])
  })

  it('não interfere em movimento dentro da marca, seleção, modificadores ou bloco de código', () => {
    const mark = schema.marks.bold.create()
    const view = makeView([schema.text('texto', [mark])], 3)
    expect(escapeInlineFormatting(view, arrow('ArrowRight'))).toBe(false)
    expect(escapeInlineFormatting(view, arrow('ArrowRight', { shiftKey: true }))).toBe(false)
    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, 1, 3)))
    expect(escapeInlineFormatting(view, arrow('ArrowRight'))).toBe(false)
    expect(escapeInlineFormatting(makeView([schema.text('texto')], 6, 'codeBlock'), arrow('ArrowRight'))).toBe(false)
  })
})
