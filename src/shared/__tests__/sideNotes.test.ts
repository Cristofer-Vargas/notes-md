import { describe, expect, it } from 'vitest'
import { createSideNoteAnchor, resolveSideNoteAnchor } from '../sideNotes'

describe('vínculos de notas laterais', () => {
  it('encontra o trecho depois de inserir conteúdo antes dele', () => {
    const anchor = createSideNoteAnchor('primeiro trecho final', 9, 15)!
    expect(resolveSideNoteAnchor('novo primeiro trecho final', anchor)).toEqual({ status: 'attached', from: 14, to: 20 })
  })
  it('usa o contexto para distinguir ocorrências repetidas', () => {
    const original = 'início palavra azul; outra palavra verde'
    const at = original.lastIndexOf('palavra')
    const anchor = createSideNoteAnchor(original, at, at + 7)!
    expect(resolveSideNoteAnchor(original, anchor)).toEqual({ status: 'attached', from: at, to: at + 7 })
  })
  it('não inventa vínculo se o trecho sumir ou houver empate', () => {
    expect(resolveSideNoteAnchor('outro', { quote: 'texto', prefix: '', suffix: '' })).toEqual({ status: 'missing' })
    expect(resolveSideNoteAnchor('texto texto', { quote: 'texto', prefix: '', suffix: '' })).toEqual({ status: 'ambiguous' })
    expect(createSideNoteAnchor('abc', 1, 1)).toBeNull()
  })
  it('marca como incerto um trecho igual quando todo o contexto mudou', () => {
    const anchor = createSideNoteAnchor('antes trecho depois', 6, 12)!
    expect(resolveSideNoteAnchor('diferente trecho outro', anchor)).toEqual({ status: 'ambiguous' })
  })
})
