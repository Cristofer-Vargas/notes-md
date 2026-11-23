import { describe, expect, it } from 'vitest'
import { findSideNoteInSource } from '../sideNoteSource'

describe('localização de observações no Markdown', () => {
  it('encontra o trecho mesmo com formatação entre as palavras', () => {
    const source = 'Antes: texto **importante** aqui.'
    const range = findSideNoteInSource(source, { quote: 'texto importante', prefix: 'Antes: ', suffix: ' aqui.' })!
    expect(source.slice(range.from, range.to)).toBe('texto **importante')
  })

  it('não escolhe silenciosamente entre trechos repetidos sem contexto', () => {
    expect(findSideNoteInSource('texto e texto', { quote: 'texto', prefix: '', suffix: '' })).toBeNull()
  })
})
