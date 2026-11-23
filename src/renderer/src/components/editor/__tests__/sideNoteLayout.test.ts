import { describe, expect, it } from 'vitest'
import { layoutSideNotes, shouldCompactSideNotes } from '../sideNoteLayout'

describe('posição das observações', () => {
  it('mantém os indicadores nos trechos quando os textos se sobrepõem', () => {
    expect(layoutSideNotes([
      { id: 'a', top: 100, height: 60, textHeight: 90, createdAt: 1 },
      { id: 'b', top: 130, height: 25, textHeight: 30, createdAt: 2 }
    ])).toEqual({
      a: { top: 100, height: 60, textTop: 100 },
      b: { top: 130, height: 25, textTop: 200 }
    })
  })

  it('atualiza a altura do indicador sem alterar a posição do documento', () => {
    const item = { id: 'a', top: 40, height: 20, textHeight: 30, createdAt: 1 }
    expect(layoutSideNotes([{ ...item, height: 80 }]).a).toEqual({ top: 40, height: 80, textTop: 40 })
  })
  it('só usa a coluna quando ela cabe sem comprimir a página', () => {
    expect(shouldCompactSideNotes(1000, 768)).toBe(false)
    expect(shouldCompactSideNotes(991, 768)).toBe(true)
    expect(shouldCompactSideNotes(700, 768)).toBe(true)
    expect(shouldCompactSideNotes(1400, Infinity)).toBe(true)
  })
})
