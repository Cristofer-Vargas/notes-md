import { describe, expect, it } from 'vitest'
import type { VaultNoteData } from '../../../../preload/index.d'
import { searchVault } from '../vaultSearch'

const note = (name: string, content: string): VaultNoteData => ({ name, fileName: `${name}.md`, relativePath: `${name}.md`, fullPath: `/vault/${name}.md`, content, updatedAt: 0 })

describe('pesquisa no cofre', () => {
  const notes = [note('Projeto', '# Planejamento\n#trabalho e trabalho\nMais TRABALHO'), note('Trabalho pessoal', 'Texto sem ocorrência'), note('Outra', 'Sem resultados')]

  it('encontra títulos, tags e conteúdo sem diferenciar maiúsculas', () => {
    const results = searchVault(notes, 'trabalho')
    expect(results.map((result) => result.note.name)).toEqual(['Trabalho pessoal', 'Projeto'])
    expect(results[1].occurrenceCount).toBe(3)
    expect(results[1].matches.map((match) => match.line)).toEqual([2, 3])
    expect(searchVault(notes, '#trabalho')[0].note.name).toBe('Projeto')
  })

  it('não exibe todas as notas para consulta vazia', () => {
    expect(searchVault(notes, '  ')).toEqual([])
    expect(searchVault(notes, 'inexistente')).toEqual([])
  })
})
