import { describe, expect, it } from 'vitest'
import {
  getEnhancedSpellSuggestions,
  getPortugueseSpellSuggestions
} from '../spellcheckService'

describe('Dicionário ortográfico pt-BR', () => {
  it(
    'sugere palavras aproximadas que não dependem do vocabulário manual',
    async () => {
      const cases = [
        ['inconsitentes', 'inconsistentes'],
        ['interoperabiliddae', 'interoperabilidade'],
        ['aprimroamento', 'aprimoramento'],
        ['tecnoloiga', 'tecnologia'],
        ['contexot', 'contexto'],
        ['qualker', 'qualquer']
      ] as const

      for (const [misspelledWord, expectedSuggestion] of cases) {
        const suggestions = await getPortugueseSpellSuggestions(misspelledWord)
        expect(suggestions).toContain(expectedSuggestion)
      }
    },
    10_000
  )

  it('não oferece correção para uma palavra já válida', async () => {
    await expect(getPortugueseSpellSuggestions('abacaxi')).resolves.toEqual([])
  })

  it('preserva palavras inglesas válidas quando os dois idiomas estão ativos', async () => {
    await expect(
      getEnhancedSpellSuggestions('canvas', ['pt-BR', 'en-US'])
    ).resolves.toEqual([])
  })
})

describe('Dicionário ortográfico en-US', () => {
  it(
    'sugere palavras inglesas aproximadas quando somente o inglês está ativo',
    async () => {
      const cases = [
        ['recieve', 'receive'],
        ['seperate', 'separate'],
        ['definately', 'definitely'],
        ['tecnology', 'technology']
      ] as const

      for (const [misspelledWord, expectedSuggestion] of cases) {
        const suggestions = await getEnhancedSpellSuggestions(misspelledWord, ['en-US'])
        expect(suggestions).toContain(expectedSuggestion)
      }
    },
    10_000
  )

  it('não oferece correção para uma palavra inglesa válida', async () => {
    await expect(
      getEnhancedSpellSuggestions('architecture', ['en-US'])
    ).resolves.toEqual([])
  })

  it('preserva a capitalização da palavra digitada nas sugestões', async () => {
    const suggestions = await getEnhancedSpellSuggestions('Recieve', ['en-US'])
    expect(suggestions).toContain('Receive')
  })
})
