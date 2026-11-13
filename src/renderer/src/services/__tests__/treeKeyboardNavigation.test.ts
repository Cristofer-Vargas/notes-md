import { describe, expect, it } from 'vitest'
import type { VaultFileEntry } from '../../../../preload/index.d'
import { nextTreeEntry, visibleTreeEntries } from '../treeKeyboardNavigation'

const entry = (relativePath: string, children?: VaultFileEntry[]): VaultFileEntry => ({
  name: relativePath.split('/').pop() || relativePath,
  relativePath,
  fullPath: relativePath,
  isDirectory: Boolean(children),
  children,
  updatedAt: 0
})

const tree = [entry('Pasta', [entry('Pasta/Nota.md'), entry('Pasta/Sub', [entry('Pasta/Sub/Outra.md')])]), entry('Raiz.md')]

describe('navegação da árvore de arquivos', () => {
  it('ignora descendentes de pastas recolhidas', () => {
    const visible = visibleTreeEntries(tree, { Pasta: false })
    expect(visible.map(({ entry: item }) => item.relativePath)).toEqual(['Pasta', 'Raiz.md'])
    expect(nextTreeEntry(visible, 'Pasta', 'ArrowDown')).toBe('Raiz.md')
    expect(nextTreeEntry(visible, 'Raiz.md', 'ArrowUp')).toBe('Pasta')
  })

  it('percorre entradas visíveis e mantém a relação com a pasta pai', () => {
    const visible = visibleTreeEntries(tree, { Pasta: true, 'Pasta/Sub': false })
    expect(visible.map(({ entry: item }) => item.relativePath)).toEqual(['Pasta', 'Pasta/Nota.md', 'Pasta/Sub', 'Raiz.md'])
    expect(visible[2].parentPath).toBe('Pasta')
    expect(nextTreeEntry(visible, 'Pasta/Nota.md', 'Home')).toBe('Pasta')
    expect(nextTreeEntry(visible, 'Pasta/Nota.md', 'End')).toBe('Raiz.md')
    expect(nextTreeEntry(visible, 'Raiz.md', 'ArrowDown')).toBe('Raiz.md')
  })
})
