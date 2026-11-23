import { describe, expect, it } from 'vitest'
import { Schema } from '@tiptap/pm/model'
import { EditorState } from '@tiptap/pm/state'
import { DecorationSet } from '@tiptap/pm/view'
import { createHeadingFoldPlugin, foldedHeadingContainingPosition, headingFoldKey } from '../HeadingFold'

const schema = new Schema({ nodes: {
  doc: { content: 'block+' },
  heading: { group: 'block', content: 'text*', attrs: { level: { default: 1 } } },
  paragraph: { group: 'block', content: 'text*' },
  text: { group: 'inline' }
} })
const node = (type: string, text: string) => schema.node(type, null, schema.text(text))

describe('recolhimento de títulos', () => {
  it('oculta apenas blocos antes do próximo título e preserva o documento', () => {
    const doc = schema.node('doc', null, [node('heading', 'H1'), node('paragraph', 'corpo'), node('heading', 'H2'), node('paragraph', 'filho'), node('heading', 'H3'), node('paragraph', 'outro')])
    const plugin = createHeadingFoldPlugin()
    let state = EditorState.create({ doc, plugins: [plugin] })
    state = state.apply(state.tr.setMeta(headingFoldKey, { toggle: 0 }))
    const decorations = plugin.props.decorations!.call(plugin, state) as DecorationSet
    const hidden = decorations.find().filter((d) => d.from !== d.to)
    expect(hidden.map((d) => state.doc.nodeAt(d.from)?.textContent)).toEqual(['corpo'])
    expect(state.doc.eq(doc)).toBe(true)
    state = state.apply(state.tr.setMeta(headingFoldKey, { toggle: 0 }))
    expect((plugin.props.decorations!.call(plugin, state) as DecorationSet).find().filter((d) => d.from !== d.to)).toHaveLength(0)
  })

  it('mantém o recolhimento ao inserir conteúdo antes do título e permite redefini-lo', () => {
    const plugin = createHeadingFoldPlugin()
    let state = EditorState.create({ doc: schema.node('doc', null, [node('heading', 'Título'), node('paragraph', 'texto')]), plugins: [plugin] })
    state = state.apply(state.tr.setMeta(headingFoldKey, { toggle: 0 }))
    const inserted = node('paragraph', 'antes')
    state = state.apply(state.tr.insert(0, inserted))
    expect(headingFoldKey.getState(state)?.has(inserted.nodeSize)).toBe(true)
    state = state.apply(state.tr.setMeta(headingFoldKey, { reset: true }))
    expect(headingFoldKey.getState(state)?.size).toBe(0)
  })

  it('recolhe subtítulos quando o título pai não possui conteúdo próprio', () => {
    const heading = (text: string, level: number) => schema.node('heading', { level }, schema.text(text))
    const doc = schema.node('doc', null, [heading('Fix', 1), heading('Título 4', 4), node('paragraph', 'tarefas'), heading('Feature', 1), node('paragraph', 'outro')])
    const plugin = createHeadingFoldPlugin()
    let state = EditorState.create({ doc, plugins: [plugin] })
    state = state.apply(state.tr.setMeta(headingFoldKey, { toggle: 0 }))
    const hidden = (plugin.props.decorations!.call(plugin, state) as DecorationSet).find().filter((d) => d.from !== d.to)
    expect(hidden.map((d) => state.doc.nodeAt(d.from)?.textContent)).toEqual(['Título 4', 'tarefas'])
    expect(state.doc.eq(doc)).toBe(true)
    state = state.apply(state.tr.setMeta(headingFoldKey, { toggle: 0 }))
    expect((plugin.props.decorations!.call(plugin, state) as DecorationSet).find().filter((d) => d.from !== d.to)).toHaveLength(0)
  })
  it('identifica apenas o título recolhido que oculta o trecho solicitado', () => {
    const heading = (text: string, level: number) => schema.node('heading', { level }, schema.text(text))
    const parent = heading('Pai', 1)
    const child = heading('Filho', 2)
    const paragraph = node('paragraph', 'trecho')
    const sibling = heading('Outro', 1)
    const doc = schema.node('doc', null, [parent, child, paragraph, sibling])
    const childPosition = parent.nodeSize
    const target = childPosition + child.nodeSize + 1
    expect(foldedHeadingContainingPosition(doc, new Set([0, childPosition]), target)).toBe(0)
    expect(foldedHeadingContainingPosition(doc, new Set([childPosition]), target)).toBe(childPosition)
    expect(foldedHeadingContainingPosition(doc, new Set([0]), doc.content.size - sibling.nodeSize + 1)).toBeNull()
  })
})
