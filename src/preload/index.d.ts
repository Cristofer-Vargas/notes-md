export interface VaultFileEntry {
  name: string
  relativePath: string
  fullPath: string
  isDirectory: boolean
  updatedAt: number
  extension?: string
  children?: VaultFileEntry[]
}

export interface VaultNoteData {
  name: string // filename without .md
  fileName: string // filename with .md
  relativePath: string // normalized forward slashes e.g. "Projetos/App.md"
  fullPath: string
  content: string
  updatedAt: number
}

export interface VaultSnapshot {
  vaultPath: string
  vaultName: string
  tree: VaultFileEntry[]
  notes: VaultNoteData[]
}

export interface ElectronAPI {
  getDefaultVault: () => Promise<VaultSnapshot>
  selectVaultFolder: () => Promise<VaultSnapshot | null>
  loadVault: (vaultPath: string) => Promise<VaultSnapshot>
  readNote: (vaultPath: string, relativePath: string) => Promise<string>
  writeNote: (
    vaultPath: string,
    relativePath: string,
    content: string
  ) => Promise<{ updatedAt: number }>
  createNote: (
    vaultPath: string,
    folderRelativePath: string,
    noteTitle: string,
    initialContent?: string
  ) => Promise<VaultNoteData>
  createFolder: (vaultPath: string, parentRelativePath: string, folderName: string) => Promise<string>
  renameEntry: (
    vaultPath: string,
    oldRelativePath: string,
    newName: string
  ) => Promise<{ newRelativePath: string; newName: string }>
  moveEntry: (
    vaultPath: string,
    oldRelativePath: string,
    newParentFolderRelativePath: string
  ) => Promise<{ newRelativePath: string }>
  readImageBase64: (
    vaultPath: string,
    relativePath: string
  ) => Promise<{ dataUrl: string; size: number } | null>
  deleteEntry: (vaultPath: string, relativePath: string) => Promise<boolean>
  openExternal: (url: string) => Promise<void>
  openInExplorer: (vaultPath: string) => Promise<void>
  onVaultChanged: (callback: (snapshot: VaultSnapshot) => void) => () => void
  getSpellCheckerLanguages: () => Promise<string[]>
  getAvailableSpellCheckerLanguages: () => Promise<string[]>
  setSpellCheckerLanguages: (languages: string[]) => Promise<boolean>
  setSpellCheckerEnabled: (enabled: boolean) => Promise<boolean>
  addWordToDictionary: (word: string) => Promise<boolean>
  removeWordFromDictionary: (word: string) => Promise<boolean>
  listWordsInDictionary: () => Promise<string[]>
  syncIgnoredWords: (words: string[]) => Promise<boolean>
  isWordMisspelled: (word: string) => boolean
  getWordSuggestions: (word: string) => string[]
  replaceMisspelling: (suggestion: string) => Promise<void>
  onSpellcheckSuggestions: (
    callback: (data: { misspelledWord: string; suggestions: string[] }) => void
  ) => () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
