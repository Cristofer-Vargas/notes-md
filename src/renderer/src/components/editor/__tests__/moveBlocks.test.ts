import { describe, expect, it, vi } from 'vitest'
import { Schema } from '@tiptap/pm/model'
import { EditorState, TextSelection } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'
import { blockShortcut, moveEditorBlocks, moveMarkdownLines } from '../moveBlocks'

const schema = new Schema({ nodes: {
  doc: { content: 'block+' },
  paragraph: { group: 'block', content: 'text*' },
  bulletList: { group: 'block', content: 'listItem+' },
  listItem: { content: 'paragraph block*' },
  text: { group: 'inline' }
} })

function viewFor(doc: ReturnType<typeof schema.node>, from: number, to = from): EditorView {
  const view = { state: EditorState.create({ doc, selection: TextSelection.create(doc, from, to) }), dispatch: vi.fn() } as unknown as EditorView
  vi.mocked(view.dispatch).mockImplementation((tr) => { Object.assign(view, { state: view.state.apply(tr) }) })
  return view
}
const paragraph = (text: string) => schema.node('paragraph', null, schema.text(text))

describe('movimentação de blocos', () => {
  it('reconhece apenas os atalhos solicitados', () => {
    const event = { key: 'ArrowUp', ctrlKey: true, altKey: false, metaKey: false, shiftKey: false, isComposing: false }
    expect(blockShortcut(event)).toEqual({ direction: -1, duplicate: false })
    expect(blockShortcut({ ...event, altKey: true })).toEqual({ direction: -1, duplicate: true })
    expect(blockShortcut({ ...event, ctrlKey: false })).toBeNull()
  })

  it('move e duplica parágrafos inteiros preservando a seleção parcial', () => {
    const view = viewFor(schema.node('doc', null, [paragraph('um'), paragraph('dois'), paragraph('três')]), 5, 7)
    moveEditorBlocks(view, -1, false)
    expect(view.state.doc.textContent).toBe('doisumtrês')
    expect([view.state.selection.from, view.state.selection.to]).toEqual([1, 3])
    moveEditorBlocks(view, 1, true)
    expect(view.state.doc.textContent).toBe('doisdoisumtrês')
    expect([view.state.selection.from, view.state.selection.to]).toEqual([7, 9])
  })

  it('move itens de lista sem separar seus conteúdos', () => {
    const list = schema.node('bulletList', null, [schema.node('listItem', null, paragraph('um')), schema.node('listItem', null, paragraph('dois'))])
    const view = viewFor(schema.node('doc', null, [list]), 10)
    moveEditorBlocks(view, -1, false)
    expect(view.state.doc.firstChild?.textContent).toBe('doisum')
  })

  it('opera sobre linhas no Markdown e respeita limites', () => {
    expect(moveMarkdownLines('um\ndois\ntrês', 4, 6, -1, false)).toEqual({ value: 'dois\num\ntrês', start: 1, end: 3 })
    expect(moveMarkdownLines('um\ndois', 4, 4, 1, true)).toEqual({ value: 'um\ndois\ndois', start: 9, end: 9 })
    expect(moveMarkdownLines('um\ndois', 0, 0, -1, false)).toBeNull()
  })
})
