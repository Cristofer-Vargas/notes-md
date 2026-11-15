import { describe, expect, it } from 'vitest'
import type { VaultFileEntry, VaultNoteData } from '../../../../preload/index.d'
import { listVaultFolders, quickSuggestions } from '../quickSwitcher'

const folder = (relativePath: string, children: VaultFileEntry[] = []): VaultFileEntry => ({ name: relativePath.split('/').pop()!, relativePath, fullPath: relativePath, isDirectory: true, updatedAt: 0, children })
const note = (relativePath: string): VaultNoteData => ({ name: relativePath.split('/').pop()!.replace(/\.md$/, ''), fileName: relativePath.split('/').pop()!, relativePath, fullPath: relativePath, content: '', updatedAt: 0 })
const folders = listVaultFolders([folder('Projetos', [folder('Projetos/Estudos')]), folder('Pessoal')])
const notes = [note('Projetos/Estudos/Plano.md'), note('Pessoal/Plano.md'), note('Raiz.md')]

describe('busca rápida por pastas', () => {
  it('lista pastas e permite navegar por caminhos aninhados', () => {
    expect(quickSuggestions('Proj', notes, folders)).toContainEqual({ kind: 'folder', path: 'Projetos', name: 'Projetos' })
    expect(quickSuggestions('Projetos/Est', notes, folders)).toContainEqual({ kind: 'folder', path: 'Projetos/Estudos', name: 'Estudos' })
    expect(quickSuggestions('Projetos/Estudos/Pl', notes, folders).filter((s) => s.kind === 'note').map((s) => s.path)).toEqual(['Projetos/Estudos/Plano.md'])
  })
  it('cria no diretório escolhido e considera duplicidade apenas nele', () => {
    expect(quickSuggestions('Projetos/Nova', notes, folders)).toContainEqual({ kind: 'create', path: 'Projetos/Nova.md', folder: 'Projetos', name: 'Nova' })
    expect(quickSuggestions('Projetos/Plano', notes, folders)).toContainEqual({ kind: 'create', path: 'Projetos/Plano.md', folder: 'Projetos', name: 'Plano' })
    expect(quickSuggestions('Pessoal/Plano.md', notes, folders).some((s) => s.kind === 'create')).toBe(false)
  })
  it('recusa diretórios inexistentes e caminhos de navegação fora do cofre', () => {
    expect(quickSuggestions('Inexistente/nota', notes, folders)).toEqual([])
    expect(quickSuggestions('../nota', notes, folders)).toEqual([])
  })
})
