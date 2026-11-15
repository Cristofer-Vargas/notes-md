import type { VaultNoteData } from '../../../preload/index.d'

export interface VaultSearchResult {
  note: VaultNoteData
  titleMatch: boolean
  matches: Array<{ line: number; text: string; count: number }>
  occurrenceCount: number
}

export function searchVault(notes: VaultNoteData[], query: string): VaultSearchResult[] {
  const needle = query.trim().toLocaleLowerCase()
  if (!needle) return []
  const results: VaultSearchResult[] = []
  for (const note of notes) {
    const titleMatch = note.name.toLocaleLowerCase().includes(needle)
    let occurrenceCount = 0
    const matches: VaultSearchResult['matches'] = []
    note.content.split(/\r?\n/).forEach((text, index) => {
      const lower = text.toLocaleLowerCase()
      let count = 0
      let cursor = 0
      while ((cursor = lower.indexOf(needle, cursor)) !== -1) {
        count++
        cursor += needle.length
      }
      if (count) {
        occurrenceCount += count
        matches.push({ line: index + 1, text: text.trim(), count })
      }
    })
    if (titleMatch || matches.length) results.push({ note, titleMatch, matches, occurrenceCount })
  }
  return results.sort((a, b) => Number(b.titleMatch) - Number(a.titleMatch) || a.note.relativePath.localeCompare(b.note.relativePath, 'pt-BR'))
}
