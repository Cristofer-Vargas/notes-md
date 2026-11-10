import { describe, it, expect } from 'vitest'
import {
  generateFallbackSuggestions,
  getWordRangeAtPos,
  mergeSpellSuggestions
} from '../spellcheckService'
import { schema } from '@tiptap/pm/schema-basic'

describe('Spellchecker Fallback Suggestions', () => {
  it('should generate correction for repeated trailing characters', () => {
    const sugs = generateFallbackSuggestions('computadorr')
    expect(sugs).toContain('computador')

    const devSugs = generateFallbackSuggestions('developerr')
    expect(devSugs).toContain('developer')
  })

  it('should generate accent suggestions for -veis and -vel adjectives', () => {
    const reutilizaveis = generateFallbackSuggestions('reutilizaveis')
    expect(reutilizaveis).toContain('reutilizáveis')

    const variaveis = generateFallbackSuggestions('variaveis')
    expect(variaveis).toContain('variáveis')

    const responsavel = generateFallbackSuggestions('responsavel')
    expect(responsavel).toContain('responsável')
  })

  it('should generate accent suggestions for common Portuguese words', () => {
    const sugs = generateFallbackSuggestions('programacao')
    expect(sugs).toContain('programação')

    const capSugs = generateFallbackSuggestions('Configuracao')
    expect(capSugs).toContain('Configuração')

    const dirSugs = generateFallbackSuggestions('diretorio')
    expect(dirSugs).toContain('diretório')
  })

  it('should generate intelligent Levenshtein typo corrections like excluidsos -> excluídos', () => {
    const sugs = generateFallbackSuggestions('excluidsos')
    expect(sugs).toContain('excluídos')

    const inconsitentes = generateFallbackSuggestions('inconsitentes')
    expect(inconsitentes).toContain('inconsistentes')

    const qualker = generateFallbackSuggestions('qualker')
    expect(qualker).toContain('qualquer')
  })

  it('should ignore words with length < 2 or empty', () => {
    expect(generateFallbackSuggestions('')).toEqual([])
    expect(generateFallbackSuggestions('a')).toEqual([])
  })

  it('should merge native and enhanced suggestions without case-insensitive duplicates', () => {
    expect(
      mergeSpellSuggestions(
        'tecnoloiga',
        ['tecnologia', 'Tecnologia'],
        ['tecnologia', 'tecnóloga']
      )
    ).toEqual(['tecnologia', 'tecnóloga'])
  })

  it('should extract word at pos correctly for all inner positions', () => {
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [schema.text('ponentes reutilizaveis de ações')])
    ])
    // Test various positions inside 'reutilizaveis'
    // 'ponentes ' is 9 chars.
    // In doc, paragraph node starts at 0, content starts at 1.
    // 'ponentes ' is from pos 1 to 10.
    // 'reutilizaveis' is from pos 10 to 23.
    for (let p = 10; p <= 23; p++) {
      const range = getWordRangeAtPos(doc as any, p)
      expect(range?.word).toBe('reutilizaveis')
    }
  })
})
