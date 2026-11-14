import type {
  DiscordPresenceContext,
  DiscordPresenceSettings,
  DiscordPresenceStatus
} from '../shared/discordPresence'
import type { AppRuntimeInfo, AppUpdateState } from '../shared/appUpdate'
import type { PomodoroAction, PomodoroContext, PomodoroNote, PomodoroSession, PomodoroSettings, PomodoroState } from '../shared/pomodoro'

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
  getPomodoro: () => Promise<PomodoroState>
  getPomodoroHistory: () => Promise<PomodoroSession[]>
  deletePomodoroHistory: (from: number, to: number) => Promise<number>
  openPomodoroReports: () => Promise<void>
  onOpenPomodoroReports: (callback: () => void) => () => void
  getPomodoroContext: () => Promise<PomodoroContext>
  setPomodoroContext: (context: PomodoroContext) => Promise<void>
  onPomodoroContext: (callback: (context: PomodoroContext) => void) => () => void
  pomodoroAction: (action: PomodoroAction, note?: PomodoroNote | null) => Promise<PomodoroState>
  configurePomodoro: (settings: Partial<PomodoroSettings>) => Promise<PomodoroState>
  openPomodoroWindow: () => Promise<void>
  setPomodoroAlwaysOnTop: (enabled: boolean) => Promise<void>
  onPomodoroState: (callback: (state: PomodoroState) => void) => () => void
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
  checkPathExists: (folderPath: string) => Promise<boolean>
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
  getEnhancedSpellSuggestions: (word: string) => Promise<string[]>
  configureDiscordPresence: (
    settings: DiscordPresenceSettings
  ) => Promise<DiscordPresenceStatus | undefined>
  updateDiscordPresenceContext: (
    context: DiscordPresenceContext
  ) => Promise<DiscordPresenceStatus | undefined>
  getDiscordPresenceStatus: () => Promise<DiscordPresenceStatus | undefined>
  reconnectDiscordPresence: () => Promise<DiscordPresenceStatus | undefined>
  onDiscordPresenceStatus: (
    callback: (status: DiscordPresenceStatus) => void
  ) => () => void
  replaceMisspelling: (suggestion: string) => Promise<void>
  onSpellcheckSuggestions: (
    callback: (data: { misspelledWord: string; suggestions: string[] }) => void
  ) => () => void
  openImageWindow: (vaultPath: string, relativePath: string, fileName: string) => Promise<void>
  openSettingsWindow: () => Promise<void>
  closeCurrentWindow: () => Promise<void>
  broadcastSettings: (settings: unknown) => Promise<void>
  onSettingsChanged: (callback: (settings: unknown) => void) => () => void
  getAppRuntimeInfo: () => Promise<AppRuntimeInfo>
  getAppUpdateState: () => Promise<AppUpdateState | undefined>
  checkForAppUpdates: () => Promise<AppUpdateState | undefined>
  downloadAppUpdate: () => Promise<AppUpdateState | undefined>
  installAppUpdate: () => Promise<boolean>
  onAppUpdateStateChanged: (callback: (state: AppUpdateState) => void) => () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
