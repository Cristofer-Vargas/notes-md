import { describe, expect, it } from 'vitest'
import { getPreviewClipHeight } from '../sideNotePreviewLayout'

describe('corte da prévia de observação', () => {
  it('oculta a linha que ultrapassa o limite', () => {
    expect(getPreviewClipHeight(96, [{ top: 57, bottom: 73 }, { top: 80, bottom: 99 }])).toBe(80)
  })
  it('oculta também trechos da mesma linha com tamanhos diferentes', () => {
    expect(getPreviewClipHeight(96, [{ top: 80, bottom: 99 }, { top: 77, bottom: 92 }])).toBe(77)
  })
  it('mantém o limite quando não há linha parcialmente visível', () => {
    expect(getPreviewClipHeight(96, [{ top: 60, bottom: 78 }, { top: 100, bottom: 118 }])).toBe(96)
  })
  it('não retorna altura negativa para conteúdo que começa acima da prévia', () => {
    expect(getPreviewClipHeight(20, [{ top: -3, bottom: 25 }])).toBe(0)
  })
})
