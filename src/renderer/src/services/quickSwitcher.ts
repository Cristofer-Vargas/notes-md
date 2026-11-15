import type { VaultFileEntry, VaultNoteData } from '../../../preload/index.d'

export type QuickSuggestion =
  | { kind: 'folder'; path: string; name: string }
  | { kind: 'note'; path: string; note: VaultNoteData }
  | { kind: 'create'; path: string; folder: string; name: string }

export function listVaultFolders(tree: VaultFileEntry[]): string[] {
  const folders: string[] = []
  const visit = (entries: VaultFileEntry[]): void => {
    for (const entry of entries) if (entry.isDirectory) {
      folders.push(entry.relativePath.replace(/\\/g, '/'))
      if (entry.children) visit(entry.children)
    }
  }
  visit(tree)
  return folders
}

export function quickSuggestions(query: string, notes: VaultNoteData[], folders: string[]): QuickSuggestion[] {
  const input = query.trimStart().replace(/\\/g, '/').replace(/^\/+/, '')
  const slash = input.lastIndexOf('/')
  const requestedFolder = slash < 0 ? '' : input.slice(0, slash)
  const term = (slash < 0 ? input : input.slice(slash + 1)).trim().toLocaleLowerCase()
  const noteTerm = term.replace(/\.md$/i, '')
  const folder = requestedFolder ? folders.find((path) => path.toLocaleLowerCase() === requestedFolder.toLocaleLowerCase()) : ''
  if (folder === undefined || (requestedFolder && requestedFolder.split('/').some((part) => part === '.' || part === '..' || !part))) return []
  const prefix = folder ? `${folder}/` : ''
  const norm = (text: string): string => text.toLocaleLowerCase()
  const matches: QuickSuggestion[] = []

  for (const path of folders) {
    if (!norm(path).startsWith(norm(prefix)) || path === folder) continue
    const rest = path.slice(prefix.length)
    if (rest.includes('/') || !norm(rest).includes(term)) continue
    matches.push({ kind: 'folder', path, name: rest })
  }
  for (const note of notes) {
    const path = note.relativePath.replace(/\\/g, '/')
    if (slash >= 0 && !norm(path).startsWith(norm(prefix))) continue
    if (slash >= 0 && path.slice(prefix.length).includes('/')) continue
    if (!noteTerm || norm(note.name).includes(noteTerm) || (slash < 0 && (norm(path).includes(term) || norm(note.content).includes(term)))) matches.push({ kind: 'note', path, note })
  }
  const title = (slash < 0 ? input : input.slice(slash + 1)).trim().replace(/\.md$/i, '')
  const validTitle = title && !/^[.]+$/.test(title) && !/[<>:"/\\|?*]/.test(title)
  const newPath = `${prefix}${title}.md`
  if (validTitle && !notes.some((note) => norm(note.relativePath.replace(/\\/g, '/')) === norm(newPath))) {
    matches.push({ kind: 'create', path: newPath, folder: folder || '', name: title })
  }
  return matches
}
