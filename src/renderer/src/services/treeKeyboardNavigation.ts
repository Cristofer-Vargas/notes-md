import type { VaultFileEntry } from '../../../preload/index.d'

export interface VisibleTreeEntry {
  entry: VaultFileEntry
  parentPath: string | null
}

export function visibleTreeEntries(tree: VaultFileEntry[], expanded: Record<string, boolean>, parentPath: string | null = null): VisibleTreeEntry[] {
  return tree.flatMap((entry) => [
    { entry, parentPath },
    ...(entry.isDirectory && (expanded[entry.relativePath] ?? true)
      ? visibleTreeEntries(entry.children ?? [], expanded, entry.relativePath)
      : [])
  ])
}

export function nextTreeEntry(entries: VisibleTreeEntry[], currentPath: string, key: 'ArrowUp' | 'ArrowDown' | 'Home' | 'End'): string | null {
  if (!entries.length) return null
  const index = entries.findIndex(({ entry }) => entry.relativePath === currentPath)
  if (index < 0) return null
  const next = key === 'Home' ? 0 : key === 'End' ? entries.length - 1 : key === 'ArrowUp' ? Math.max(0, index - 1) : Math.min(entries.length - 1, index + 1)
  return entries[next].entry.relativePath
}
