import { contextBridge, ipcRenderer, webFrame } from 'electron'
import type { ElectronAPI, VaultSnapshot } from './index.d'

const api: ElectronAPI = {
  getDefaultVault: () => ipcRenderer.invoke('vault:get-default'),
  selectVaultFolder: () => ipcRenderer.invoke('vault:select-folder'),
  loadVault: (vaultPath: string) => ipcRenderer.invoke('vault:load', vaultPath),
  readNote: (vaultPath: string, relativePath: string) =>
    ipcRenderer.invoke('vault:read-note', vaultPath, relativePath),
  writeNote: (vaultPath: string, relativePath: string, content: string) =>
    ipcRenderer.invoke('vault:write-note', vaultPath, relativePath, content),
  createNote: (
    vaultPath: string,
    folderRelativePath: string,
    noteTitle: string,
    initialContent?: string
  ) =>
    ipcRenderer.invoke(
      'vault:create-note',
      vaultPath,
      folderRelativePath,
      noteTitle,
      initialContent
    ),
  createFolder: (vaultPath: string, parentRelativePath: string, folderName: string) =>
    ipcRenderer.invoke('vault:create-folder', vaultPath, parentRelativePath, folderName),
  renameEntry: (vaultPath: string, oldRelativePath: string, newName: string) =>
    ipcRenderer.invoke('vault:rename-entry', vaultPath, oldRelativePath, newName),
  moveEntry: (
    vaultPath: string,
    oldRelativePath: string,
    newParentFolderRelativePath: string
  ) =>
    ipcRenderer.invoke('vault:move-entry', vaultPath, oldRelativePath, newParentFolderRelativePath),
  readImageBase64: (vaultPath: string, relativePath: string) =>
    ipcRenderer.invoke('vault:read-image-base64', vaultPath, relativePath),
  deleteEntry: (vaultPath: string, relativePath: string) =>
    ipcRenderer.invoke('vault:delete-entry', vaultPath, relativePath),
  openExternal: (url: string) => ipcRenderer.invoke('shell:open-external', url),
  openInExplorer: (vaultPath: string) => ipcRenderer.invoke('shell:open-in-explorer', vaultPath),
  checkPathExists: (folderPath: string) => ipcRenderer.invoke('vault:exists', folderPath),
  onVaultChanged: (callback: (snapshot: VaultSnapshot) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, snapshot: VaultSnapshot): void => {
      callback(snapshot)
    }
    ipcRenderer.on('vault:changed', listener)
    return () => {
      ipcRenderer.removeListener('vault:changed', listener)
    }
  },
  getSpellCheckerLanguages: () => ipcRenderer.invoke('spellcheck:get-languages'),
  getAvailableSpellCheckerLanguages: () =>
    ipcRenderer.invoke('spellcheck:get-available-languages'),
  setSpellCheckerLanguages: (languages: string[]) =>
    ipcRenderer.invoke('spellcheck:set-languages', languages),
  setSpellCheckerEnabled: (enabled: boolean) =>
    ipcRenderer.invoke('spellcheck:set-enabled', enabled),
  addWordToDictionary: (word: string) => ipcRenderer.invoke('spellcheck:add-word', word),
  removeWordFromDictionary: (word: string) =>
    ipcRenderer.invoke('spellcheck:remove-word', word),
  listWordsInDictionary: () => ipcRenderer.invoke('spellcheck:list-words'),
  syncIgnoredWords: (words: string[]) =>
    ipcRenderer.invoke('spellcheck:sync-ignored-words', words),
  isWordMisspelled: (word: string) => {
    try {
      return webFrame.isWordMisspelled(word)
    } catch {
      return false
    }
  },
  getWordSuggestions: (word: string) => {
    try {
      return webFrame.getWordSuggestions(word)
    } catch {
      return []
    }
  },
  getEnhancedSpellSuggestions: (word: string) =>
    ipcRenderer.invoke('spellcheck:get-enhanced-suggestions', word),
  configureDiscordPresence: (settings) =>
    ipcRenderer.invoke('discord-presence:configure', settings),
  updateDiscordPresenceContext: (context) =>
    ipcRenderer.invoke('discord-presence:update-context', context),
  getDiscordPresenceStatus: () => ipcRenderer.invoke('discord-presence:get-status'),
  reconnectDiscordPresence: () => ipcRenderer.invoke('discord-presence:reconnect'),
  onDiscordPresenceStatus: (callback) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      status: Parameters<typeof callback>[0]
    ): void => callback(status)
    ipcRenderer.on('discord-presence:status', listener)
    return () => {
      ipcRenderer.removeListener('discord-presence:status', listener)
    }
  },
  replaceMisspelling: (suggestion: string) =>
    ipcRenderer.invoke('spellcheck:replace-misspelling', suggestion),
  onSpellcheckSuggestions: (
    callback: (data: { misspelledWord: string; suggestions: string[] }) => void
  ) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      data: { misspelledWord: string; suggestions: string[] }
    ): void => {
      callback(data)
    }
    ipcRenderer.on('editor:spellcheck-suggestions', listener)
    return () => {
      ipcRenderer.removeListener('editor:spellcheck-suggestions', listener)
    }
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electronAPI = api
}
