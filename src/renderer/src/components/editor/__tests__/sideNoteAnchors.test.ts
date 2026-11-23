import { describe, expect, it } from 'vitest'
import { Schema } from '@tiptap/pm/model'
import { EditorState } from '@tiptap/pm/state'
import { anchorFromEditorSelection, mapEditorAnchor, mapEditorAnchorByDiff, projectDocumentText, resolveEditorAnchor } from '../sideNoteAnchors'

const schema = new Schema({ nodes: {
  doc: { content: 'block+' },
  paragraph: { group: 'block', content: 'text*' },
  text: { group: 'inline' }
} })
const paragraph = (text: string) => schema.node('paragraph', null, text ? schema.text(text) : undefined)

describe('vínculos no editor', () => {
  it('vincula seleção parcial e vários parágrafos sem alterar o documento', () => {
    const doc = schema.node('doc', null, [paragraph('primeiro'), paragraph('segundo')])
    const anchor = anchorFromEditorSelection(doc, 3, 15)!
    expect(anchor.quote).toBe('imeiro\nsegu')
    expect(resolveEditorAnchor(doc, anchor)).toEqual({ status: 'attached', from: 3, to: 15 })
    expect(doc.textContent).toBe('primeirosegundo')
  })
  it('usa o parágrafo inteiro quando só há cursor e preserva parágrafos vazios', () => {
    const doc = schema.node('doc', null, [paragraph('um'), paragraph(''), paragraph('dois')])
    expect(projectDocumentText(doc).text).toBe('um\n\ndois')
    expect(anchorFromEditorSelection(doc, 2, 2)?.quote).toBe('um')
  })
  it('acompanha uma edição dentro do trecho e remove o vínculo quando o trecho é apagado', () => {
    const doc = schema.node('doc', null, [paragraph('alfa beta gama')])
    const anchor = anchorFromEditorSelection(doc, 6, 10)!
    const state = EditorState.create({ doc })
    const edit = state.tr.insertText('X', 8)
    const updated = mapEditorAnchor(doc, edit.doc, edit.mapping, anchor)!
    expect(updated.quote).toBe('beXta')
    const erase = state.tr.delete(6, 10)
    expect(mapEditorAnchor(doc, erase.doc, erase.mapping, anchor)).toBeNull()
  })
  it('acompanha a edição do trecho em documentos reconstruídos do Markdown', () => {
    const before = schema.node('doc', null, [paragraph('alfa beta gama')])
    const after = schema.node('doc', null, [paragraph('alfa beXta gama')])
    const anchor = anchorFromEditorSelection(before, 6, 10)!
    expect(mapEditorAnchorByDiff(before, after, anchor)?.quote).toBe('beXta')
    const removed = schema.node('doc', null, [paragraph('alfa  gama')])
    expect(mapEditorAnchorByDiff(before, removed, anchor)).toBeNull()
  })
})
