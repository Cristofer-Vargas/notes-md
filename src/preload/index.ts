import { contextBridge, ipcRenderer, webFrame } from 'electron'
import type { ElectronAPI, VaultSnapshot } from './index.d'

const api: ElectronAPI = {
  getPomodoro: () => ipcRenderer.invoke('pomodoro:get'),
  getPomodoroHistory: () => ipcRenderer.invoke('pomodoro:history'),
  deletePomodoroHistory: (from, to) => ipcRenderer.invoke('pomodoro:delete-history', from, to),
  openPomodoroReports: () => ipcRenderer.invoke('pomodoro:show-reports'),
  onOpenPomodoroReports: (callback) => {
    const listener = (): void => callback()
    ipcRenderer.on('pomodoro:show-reports', listener)
    return () => { ipcRenderer.removeListener('pomodoro:show-reports', listener) }
  },
  getPomodoroContext: () => ipcRenderer.invoke('pomodoro:get-context'),
  setPomodoroContext: (context) => ipcRenderer.invoke('pomodoro:set-context', context),
  onPomodoroContext: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, context: Parameters<typeof callback>[0]): void => callback(context)
    ipcRenderer.on('pomodoro:context', listener)
    return () => { ipcRenderer.removeListener('pomodoro:context', listener) }
  },
  pomodoroAction: (action, note) => ipcRenderer.invoke('pomodoro:action', action, note),
  configurePomodoro: (settings) => ipcRenderer.invoke('pomodoro:configure', settings),
  openPomodoroWindow: () => ipcRenderer.invoke('pomodoro:open-window'),
  setPomodoroAlwaysOnTop: (enabled) => ipcRenderer.invoke('pomodoro:always-on-top', enabled),
  onPomodoroState: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, state: Parameters<typeof callback>[0]): void => callback(state)
    ipcRenderer.on('pomodoro:state', listener)
    return () => { ipcRenderer.removeListener('pomodoro:state', listener) }
  },
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
  },
  openImageWindow: (vaultPath: string, relativePath: string, fileName: string) =>
    ipcRenderer.invoke('window:open-image', vaultPath, relativePath, fileName),
  openSettingsWindow: () => ipcRenderer.invoke('window:open-settings'),
  closeCurrentWindow: () => ipcRenderer.invoke('window:close-current'),
  broadcastSettings: (settings: unknown) => ipcRenderer.invoke('settings:broadcast', settings),
  onSettingsChanged: (callback: (settings: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, settings: unknown): void => {
      callback(settings)
    }
    ipcRenderer.on('settings:changed', listener)
    return () => {
      ipcRenderer.removeListener('settings:changed', listener)
    }
  },
  getAppRuntimeInfo: () => ipcRenderer.invoke('app:get-runtime-info'),
  getAppUpdateState: () => ipcRenderer.invoke('app-update:get-state'),
  checkForAppUpdates: () => ipcRenderer.invoke('app-update:check'),
  downloadAppUpdate: () => ipcRenderer.invoke('app-update:download'),
  installAppUpdate: () => ipcRenderer.invoke('app-update:install'),
  onAppUpdateStateChanged: (callback) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      state: Parameters<typeof callback>[0]
    ): void => callback(state)
    ipcRenderer.on('app-update:state-changed', listener)
    return () => {
      ipcRenderer.removeListener('app-update:state-changed', listener)
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
