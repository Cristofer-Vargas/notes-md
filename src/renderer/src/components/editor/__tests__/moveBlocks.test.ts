import { describe, expect, it, vi } from 'vitest'
import { Schema } from '@tiptap/pm/model'
import { EditorState, TextSelection } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'
import { blockShortcut, moveEditorBlocks, moveMarkdownLines } from '../moveBlocks'

const schema = new Schema({ nodes: {
  doc: { content: 'block+' },
  paragraph: { group: 'block', content: 'text*' },
  heading: { group: 'block', content: 'text*', attrs: { level: { default: 3 } } },
  bulletList: { group: 'block', content: 'listItem+' },
  listItem: { content: 'paragraph block*' },
  taskList: { group: 'block', content: 'taskItem+' },
  taskItem: { content: 'paragraph block*', attrs: { checked: { default: false } } },
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

  it('move checkbox pelo limite da lista para antes do título, preservando seu estado', () => {
    const heading = schema.node('heading', null, schema.text('H3'))
    const first = schema.node('taskItem', { checked: true }, paragraph('primeiro'))
    const second = schema.node('taskItem', { checked: false }, paragraph('segundo'))
    const list = schema.node('taskList', null, [first, second])
    const view = viewFor(schema.node('doc', null, [heading, list]), heading.nodeSize + 3)
    moveEditorBlocks(view, -1, false)
    expect(view.state.doc.content.content.map((n) => n.type.name)).toEqual(['taskList', 'heading', 'taskList'])
    expect(view.state.doc.child(0).firstChild?.attrs.checked).toBe(true)
    expect(view.state.doc.child(2).textContent).toBe('segundo')
    expect(view.state.selection.$from.parent.textContent).toBe('primeiro')
  })

  it('move o último item para depois do próximo título sem remover os demais', () => {
    const first = schema.node('taskItem', { checked: false }, paragraph('um'))
    const last = schema.node('taskItem', { checked: true }, paragraph('dois'))
    const list = schema.node('taskList', null, [first, last])
    const heading = schema.node('heading', null, schema.text('Próxima seção'))
    const view = viewFor(schema.node('doc', null, [list, heading]), 1 + first.nodeSize + 2)
    moveEditorBlocks(view, 1, false)
    expect(view.state.doc.content.content.map((n) => n.type.name)).toEqual(['taskList', 'heading', 'taskList'])
    expect(view.state.doc.child(0).textContent).toBe('um')
    expect(view.state.doc.child(2).firstChild?.attrs.checked).toBe(true)
    expect(view.state.selection.$from.parent.textContent).toBe('dois')
  })

  it('opera sobre linhas no Markdown e respeita limites', () => {
    expect(moveMarkdownLines('um\ndois\ntrês', 4, 6, -1, false)).toEqual({ value: 'dois\num\ntrês', start: 1, end: 3 })
    expect(moveMarkdownLines('um\ndois', 4, 4, 1, true)).toEqual({ value: 'um\ndois\ndois', start: 9, end: 9 })
    expect(moveMarkdownLines('um\ndois', 0, 0, -1, false)).toBeNull()
  })
})
