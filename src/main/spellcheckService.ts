import type { Hunspell } from 'hunspell-wasm'

const MAX_WORD_LENGTH = 64
const MAX_SUGGESTIONS = 8
const MAX_CACHE_ENTRIES = 300

type SupportedSpellLanguage = 'pt-BR' | 'en-US'

const checkerPromises = new Map<SupportedSpellLanguage, Promise<Hunspell | null>>()
const suggestionCache = new Map<string, string[]>()

function resolveSupportedLanguage(language: string): SupportedSpellLanguage | null {
  const normalizedLanguage = language.toLocaleLowerCase()
  if (normalizedLanguage.startsWith('pt')) return 'pt-BR'
  if (normalizedLanguage.startsWith('en')) return 'en-US'
  return null
}

function getSpellChecker(language: SupportedSpellLanguage): Promise<Hunspell | null> {
  const existingPromise = checkerPromises.get(language)
  if (existingPromise) return existingPromise

  const dictionaryPromise =
    language === 'pt-BR' ? import('dictionary-pt') : import('dictionary-en')
  const checkerPromise = Promise.all([import('hunspell-wasm'), dictionaryPromise])
    .then(async ([hunspellModule, dictionaryModule]) => {
      const decoder = new TextDecoder()
      const dictionary = dictionaryModule.default

      return hunspellModule.createHunspellFromStrings(
        decoder.decode(dictionary.aff),
        decoder.decode(dictionary.dic)
      )
    })
    .catch((error) => {
      console.warn(`Falha ao inicializar o dicionário ortográfico ${language}:`, error)
      return null
    })

  checkerPromises.set(language, checkerPromise)
  return checkerPromise
}

function sanitizeWord(word: string): string | null {
  const cleanWord = typeof word === 'string' ? word.trim() : ''
  if (cleanWord.length < 2 || cleanWord.length > MAX_WORD_LENGTH) return null
  if (!/^[\p{L}]+(?:[-'][\p{L}]+)*$/u.test(cleanWord)) return null
  return cleanWord
}

function matchInputCase(input: string, suggestion: string): string {
  const locale = 'pt-BR'

  if (input === input.toLocaleUpperCase(locale)) {
    return suggestion.toLocaleUpperCase(locale)
  }

  if (input === input.toLocaleLowerCase(locale)) {
    return suggestion.toLocaleLowerCase(locale)
  }

  const firstCharacter = input[0]
  const remainingInput = input.slice(1)
  const isCapitalized =
    firstCharacter === firstCharacter.toLocaleUpperCase(locale) &&
    remainingInput === remainingInput.toLocaleLowerCase(locale)

  if (isCapitalized) {
    return (
      suggestion[0].toLocaleUpperCase(locale) + suggestion.slice(1).toLocaleLowerCase(locale)
    )
  }

  return suggestion
}

function rememberSuggestions(cacheKey: string, suggestions: string[]): void {
  suggestionCache.set(cacheKey, suggestions)

  if (suggestionCache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = suggestionCache.keys().next().value
    if (oldestKey) suggestionCache.delete(oldestKey)
  }
}

/**
 * Loads the default offline dictionaries before the first context-menu request.
 * Initialization is intentionally non-blocking for the window startup.
 */
export function warmSpellCheckers(languages: string[] = ['pt-BR', 'en-US']): void {
  for (const language of languages) {
    const supportedLanguage = resolveSupportedLanguage(language)
    if (supportedLanguage) void getSpellChecker(supportedLanguage)
  }
}

/**
 * Complements Chromium with full offline Hunspell suggestions for the enabled languages.
 */
export async function getEnhancedSpellSuggestions(
  word: string,
  languages: string[] = ['pt-BR', 'en-US']
): Promise<string[]> {
  const cleanWord = sanitizeWord(word)
  if (!cleanWord) return []

  const supportedLanguages = Array.from(
    new Set(
      languages
        .map(resolveSupportedLanguage)
        .filter((language): language is SupportedSpellLanguage => Boolean(language))
    )
  )
  if (supportedLanguages.length === 0) return []

  const cacheKey = `${supportedLanguages.join(',')}:${cleanWord}`
  const cached = suggestionCache.get(cacheKey)
  if (cached) return [...cached]

  const initializedCheckers = await Promise.all(supportedLanguages.map(getSpellChecker))
  const cachedAfterInitialization = suggestionCache.get(cacheKey)
  if (cachedAfterInitialization) return [...cachedAfterInitialization]

  const checkers = initializedCheckers.filter((checker): checker is Hunspell => Boolean(checker))
  if (checkers.length === 0) {
    rememberSuggestions(cacheKey, [])
    return []
  }

  try {
    for (const checker of checkers) {
      if (checker.testSpelling(cleanWord)) {
        rememberSuggestions(cacheKey, [])
        return []
      }
    }

    const normalizedInput = cleanWord.toLocaleLowerCase('pt-BR')
    const seen = new Set<string>()
    const suggestions: string[] = []

    for (const checker of checkers) {
      for (const rawSuggestion of checker.getSpellingSuggestions(cleanWord)) {
        const suggestion = matchInputCase(cleanWord, rawSuggestion.trim())
        const normalizedSuggestion = suggestion.toLocaleLowerCase('pt-BR')

        if (
          !suggestion ||
          normalizedSuggestion === normalizedInput ||
          seen.has(normalizedSuggestion)
        ) {
          continue
        }

        seen.add(normalizedSuggestion)
        suggestions.push(suggestion)
        if (suggestions.length >= MAX_SUGGESTIONS) break
      }

      if (suggestions.length >= MAX_SUGGESTIONS) break
    }

    rememberSuggestions(cacheKey, suggestions)
    return [...suggestions]
  } catch (error) {
    console.warn(`Falha ao gerar sugestões ortográficas para "${cleanWord}":`, error)
    return []
  }
}

export function getPortugueseSpellSuggestions(word: string): Promise<string[]> {
  return getEnhancedSpellSuggestions(word, ['pt-BR'])
}
