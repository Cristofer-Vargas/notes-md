import { app, shell, BrowserWindow, ipcMain, dialog, session, powerMonitor, Notification } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import {
  ensureDefaultVault,
  loadVaultSnapshot,
  readNoteFile,
  writeNoteFile,
  createNoteFile,
  createVaultFolder,
  renameVaultEntry,
  moveVaultEntry,
  deleteVaultEntry,
  readVaultImageBase64,
  VaultWatcher
} from './vaultService'
import { loadWindowState, trackWindowState } from './windowState'
import {
  getEnhancedSpellSuggestions,
  warmSpellCheckers
} from './spellcheckService'
import { DiscordPresenceService } from './discordPresenceService'
import {
  formatWindowTitle,
  resolveAppIconPath,
  resolveRuntimeConfig
} from './runtimeEnv'
import { AppUpdateService } from './updateService'
import { PomodoroService } from './pomodoroService'
import type { PomodoroAction, PomodoroContext, PomodoroNote, PomodoroSettings } from '../shared/pomodoro'
import type {
  DiscordPresenceContext,
  DiscordPresenceSettings,
  DiscordPresenceStatus
} from '../shared/discordPresence'
import type { AppRuntimeInfo, AppUpdateState } from '../shared/appUpdate'

const runtimeConfig = resolveRuntimeConfig({
  isPackaged: app.isPackaged,
  appDataPath: app.getPath('appData'),
  documentsPath: app.getPath('documents'),
  cwdPath: process.cwd()
})

// Isolate Dev Chromium profile, localStorage, and window-state from Stable executable
app.setPath('userData', runtimeConfig.userDataPath)
if (!app.isPackaged) {
  app.setName(runtimeConfig.appName)
}

// Hardware Acceleration & Chromium GPU Rendering Pipeline Optimization
app.commandLine.appendSwitch('enable-gpu-rasterization')
app.commandLine.appendSwitch('enable-zero-copy')
app.commandLine.appendSwitch('ignore-gpu-blocklist')

let primaryWindow: BrowserWindow | null = null
let vaultWatcher: VaultWatcher | null = null
let discordPresenceService: DiscordPresenceService | null = null
let appUpdateService: AppUpdateService | null = null
let pomodoroService: PomodoroService | null = null
let pomodoroWindow: BrowserWindow | null = null
let pomodoroContext: PomodoroContext = { vaultPath: '', vaultName: '', activePath: null, notes: [] }

const hasStableLock = !app.isPackaged || app.requestSingleInstanceLock()
if (!hasStableLock) {
  app.quit()
} else if (app.isPackaged) {
  app.on('second-instance', () => {
    if (primaryWindow && !primaryWindow.isDestroyed()) {
      if (primaryWindow.isMinimized()) primaryWindow.restore()
      primaryWindow.focus()
    }
  })
}

function broadcastVaultChanged(snapshot: any): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('vault:changed', snapshot)
    }
  }
}

function broadcastDiscordPresenceStatus(status: DiscordPresenceStatus): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('discord-presence:status', status)
    }
  }
}

function broadcastAppUpdateState(state: AppUpdateState): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('app-update:state-changed', state)
    }
  }
}

function applyWindowEnvironmentTitle(win: BrowserWindow): void {
  if (!runtimeConfig.windowTitleSuffix) return
  win.on('page-title-updated', (event, title) => {
    event.preventDefault()
    if (!win.isDestroyed()) {
      win.setTitle(formatWindowTitle(title, runtimeConfig.windowTitleSuffix))
    }
  })
}

function getAppIcon(): string | undefined {
  return resolveAppIconPath({
    isPackaged: app.isPackaged,
    mainDir: __dirname,
    resourcesPath: process.resourcesPath,
    fileExists: existsSync
  })
}

function createWindow(): void {
  const windowStatePath = join(app.getPath('userData'), 'window-state.json')
  const savedWindowState = loadWindowState(windowStatePath)

  const mainWindow = new BrowserWindow({
    icon: getAppIcon(),
    width: savedWindowState.width,
    height: savedWindowState.height,
    x: savedWindowState.x,
    y: savedWindowState.y,
    minWidth: 800,
    minHeight: 540,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#282a36',
    title: formatWindowTitle('Notes MD - Editor Markdown', runtimeConfig.windowTitleSuffix),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      spellcheck: true
    }
  })

  primaryWindow = mainWindow
  applyWindowEnvironmentTitle(mainWindow)
  mainWindow.on('focus', () => {
    appUpdateService?.maybeCheckOnFocus()
  })

  try {
    mainWindow.webContents.session.setSpellCheckerLanguages(['pt-BR', 'en-US'])
  } catch (err) {
    console.warn('Falha ao definir idiomas do corretor no startup:', err)
  }

  // Transmit native spellchecker corrections and dictionary suggestions to custom editor context menu
  mainWindow.webContents.on('context-menu', (_event, params) => {
    const misspelledWord = params.misspelledWord || ''
    const nativeSuggestions = params.dictionarySuggestions || []
    mainWindow.webContents.send('editor:spellcheck-suggestions', {
      misspelledWord,
      suggestions: nativeSuggestions
    })

    const usesEnhancedDictionary = mainWindow.webContents.session
      .getSpellCheckerLanguages()
      .some((language) => /^(pt|en)/i.test(language))

    if (misspelledWord && usesEnhancedDictionary) {
      void getEnhancedSpellSuggestions(
        misspelledWord,
        mainWindow.webContents.session.getSpellCheckerLanguages()
      ).then((enhancedSuggestions) => {
        if (enhancedSuggestions.length === 0 || mainWindow.isDestroyed()) return

        mainWindow.webContents.send('editor:spellcheck-suggestions', {
          misspelledWord,
          suggestions: [...nativeSuggestions, ...enhancedSuggestions]
        })
      })
    }
  })

  trackWindowState(mainWindow, windowStatePath)

  mainWindow.on('ready-to-show', () => {
    if (savedWindowState.isMaximized) {
      mainWindow.maximize()
    }
    mainWindow.show()
    warmSpellCheckers(mainWindow.webContents.session.getSpellCheckerLanguages())
  })

  // Whenever the user returns to the app from Windows Explorer or another editor, verify immediately
  mainWindow.on('focus', () => {
    vaultWatcher?.scheduleCheck(40)
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => {
    pomodoroService?.shutdown()
    if (primaryWindow === mainWindow) {
      primaryWindow = null
    }
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.close()
      }
    }
  })

  loadWindowRoute(mainWindow, '')
}

function loadWindowRoute(win: BrowserWindow, routeWithHash: string): void {
  const hash = routeWithHash ? (routeWithHash.startsWith('#') ? routeWithHash : `#${routeWithHash}`) : ''
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}${hash}`)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'), {
      hash: hash ? hash.replace(/^#/, '') : undefined
    })
  }
}

function openPomodoroWindow(): void {
  if (pomodoroWindow && !pomodoroWindow.isDestroyed()) { pomodoroWindow.show(); pomodoroWindow.focus(); return }
  const win = new BrowserWindow({ icon: getAppIcon(), width: 420, height: 650, minWidth: 340, minHeight: 420, show: false, autoHideMenuBar: true, title: 'Pomodoro — Notes MD', webPreferences: { preload: join(__dirname, '../preload/index.js'), sandbox: false } })
  pomodoroWindow = win
  applyWindowEnvironmentTitle(win)
  win.on('ready-to-show', () => win.show())
  win.on('closed', () => { if (pomodoroWindow === win) pomodoroWindow = null })
  loadWindowRoute(win, '#/pomodoro')
}

let settingsWindow: BrowserWindow | null = null

function openSettingsWindow(): void {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    if (settingsWindow.isMinimized()) settingsWindow.restore()
    settingsWindow.focus()
    return
  }

  settingsWindow = new BrowserWindow({
    icon: getAppIcon(),
    width: 960,
    height: 720,
    minWidth: 700,
    minHeight: 500,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#181825',
    title: formatWindowTitle('Configurações — Notes MD', runtimeConfig.windowTitleSuffix),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      spellcheck: true
    }
  })

  applyWindowEnvironmentTitle(settingsWindow)

  settingsWindow.on('ready-to-show', () => {
    settingsWindow?.show()
  })

  settingsWindow.on('closed', () => {
    settingsWindow = null
  })

  loadWindowRoute(settingsWindow, '#/settings')
}

function openImageWindow(vaultPath: string, relativePath: string, fileName: string): void {
  const imageWin = new BrowserWindow({
    icon: getAppIcon(),
    width: 980,
    height: 720,
    minWidth: 420,
    minHeight: 320,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#11111b',
    title: formatWindowTitle(`${fileName} — Notes MD`, runtimeConfig.windowTitleSuffix),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  applyWindowEnvironmentTitle(imageWin)

  imageWin.on('ready-to-show', () => {
    imageWin.show()
  })

  const query = new URLSearchParams({
    vaultPath,
    relativePath,
    fileName
  }).toString()

  loadWindowRoute(imageWin, `#/image-viewer?${query}`)
}

app.whenReady().then(() => {
  if (!hasStableLock) return

  electronApp.setAppUserModelId(runtimeConfig.appUserModelId)

  discordPresenceService = new DiscordPresenceService({
    getSystemIdleTime: () => powerMonitor.getSystemIdleTime(),
    onStatusChange: broadcastDiscordPresenceStatus
  })

  appUpdateService = new AppUpdateService({
    isPackaged: app.isPackaged,
    currentVersion: app.getVersion(),
    onStateChange: broadcastAppUpdateState
  })

  let lastRewardId: string | null = null
  pomodoroService = new PomodoroService(join(app.getPath('userData'), 'pomodoro.json'), (state) => {
    const reward = state.progress.lastReward
    const isNewReward = Boolean(reward && reward.sessionId !== lastRewardId)
    if (isNewReward && reward) lastRewardId = reward.sessionId
    for (const win of BrowserWindow.getAllWindows()) if (!win.isDestroyed()) {
      win.webContents.send('pomodoro:state', state)
      if (isNewReward && reward) win.webContents.send('pomodoro:reward', reward, state.progress.level)
    }
  }, (phase, sound) => {
    if (Notification.isSupported()) new Notification({ title: 'Pomodoro — Notes MD', body: phase === 'focus' ? 'Foco concluído. Hora de uma pausa.' : 'Pausa concluída. Pronto para voltar ao foco.', silent: !sound }).show()
  })
  powerMonitor.on('suspend', () => { if (pomodoroService?.getState().status === 'running') pomodoroService.action('pause', undefined, undefined, 'suspend') })
  ipcMain.handle('pomodoro:get', () => pomodoroService?.getState())
  ipcMain.handle('pomodoro:history', () => pomodoroService?.getHistory() ?? [])
  ipcMain.handle('pomodoro:delete-history', (_event, from: number, to: number) => pomodoroService?.deleteHistory(from, to) ?? 0)
  ipcMain.handle('pomodoro:show-reports', () => { if (primaryWindow && !primaryWindow.isDestroyed()) { if (primaryWindow.isMinimized()) primaryWindow.restore(); primaryWindow.show(); primaryWindow.focus(); primaryWindow.webContents.send('pomodoro:show-reports') } })
  ipcMain.handle('pomodoro:get-context', () => pomodoroContext)
  ipcMain.handle('pomodoro:set-context', (_event, context: PomodoroContext) => { pomodoroContext = context; if (pomodoroWindow && !pomodoroWindow.isDestroyed()) pomodoroWindow.webContents.send('pomodoro:context', context) })
  ipcMain.handle('pomodoro:action', (_event, action: PomodoroAction, note?: PomodoroNote | null) => pomodoroService?.action(action, note, pomodoroContext))
  ipcMain.handle('pomodoro:configure', (_event, settings: Partial<PomodoroSettings>) => pomodoroService?.configure(settings))
  ipcMain.handle('pomodoro:open-window', () => openPomodoroWindow())
  ipcMain.handle('pomodoro:always-on-top', (event, enabled: boolean) => { BrowserWindow.fromWebContents(event.sender)?.setAlwaysOnTop(Boolean(enabled)) })

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  vaultWatcher = new VaultWatcher((snapshot) => {
    broadcastVaultChanged(snapshot)
  })

  const defaultVaultDir = runtimeConfig.defaultVaultDir

  ipcMain.handle('vault:get-default', async () => {
    const snapshot = await ensureDefaultVault(defaultVaultDir)
    vaultWatcher?.watch(snapshot.vaultPath, snapshot)
    return snapshot
  })

  ipcMain.handle('vault:select-folder', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Selecionar Pasta do Vault (Notas Markdown)',
      properties: ['openDirectory', 'createDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    const snapshot = await loadVaultSnapshot(result.filePaths[0])
    vaultWatcher?.watch(snapshot.vaultPath, snapshot)
    return snapshot
  })

  ipcMain.handle('vault:exists', async (_event, folderPath: string) => {
    try {
      return Boolean(folderPath && existsSync(folderPath))
    } catch {
      return false
    }
  })

  ipcMain.handle('vault:load', async (_event, vaultPath: string) => {
    const snapshot = await loadVaultSnapshot(vaultPath)
    vaultWatcher?.watch(snapshot.vaultPath, snapshot)
    return snapshot
  })

  ipcMain.handle('vault:read-note', async (_event, vaultPath: string, relativePath: string) => {
    return readNoteFile(vaultPath, relativePath)
  })

  ipcMain.handle(
    'vault:write-note',
    async (_event, vaultPath: string, relativePath: string, content: string) => {
      const res = await writeNoteFile(vaultPath, relativePath, content)
      // Internal editor save: do not flood with immediate full disk rescan
      return res
    }
  )

  ipcMain.handle(
    'vault:create-note',
    async (
      _event,
      vaultPath: string,
      folderRelativePath: string,
      noteTitle: string,
      initialContent?: string
    ) => {
      const created = await createNoteFile(
        vaultPath,
        folderRelativePath,
        noteTitle,
        initialContent
      )
      vaultWatcher?.scheduleCheck(60)
      return created
    }
  )

  ipcMain.handle(
    'vault:create-folder',
    async (_event, vaultPath: string, parentRelativePath: string, folderName: string) => {
      const rel = await createVaultFolder(vaultPath, parentRelativePath, folderName)
      vaultWatcher?.scheduleCheck(60)
      return rel
    }
  )

  ipcMain.handle(
    'vault:rename-entry',
    async (_event, vaultPath: string, oldRelativePath: string, newName: string) => {
      const renamed = await renameVaultEntry(vaultPath, oldRelativePath, newName)
      pomodoroService?.rename(vaultPath, oldRelativePath, renamed.newRelativePath)
      vaultWatcher?.scheduleCheck(60)
      return renamed
    }
  )

  ipcMain.handle(
    'vault:move-entry',
    async (
      _event,
      vaultPath: string,
      oldRelativePath: string,
      newParentFolderRelativePath: string
    ) => {
      const moved = await moveVaultEntry(vaultPath, oldRelativePath, newParentFolderRelativePath)
      pomodoroService?.rename(vaultPath, oldRelativePath, moved.newRelativePath)
      vaultWatcher?.scheduleCheck(40)
      return moved
    }
  )

  ipcMain.handle(
    'vault:read-image-base64',
    async (_event, vaultPath: string, relativePath: string) => {
      return readVaultImageBase64(vaultPath, relativePath)
    }
  )

  ipcMain.handle('vault:delete-entry', async (_event, vaultPath: string, relativePath: string) => {
    const fullPath = join(vaultPath, relativePath)
    try {
      await shell.trashItem(fullPath)
    } catch (err) {
      console.warn('shell.trashItem falhou, usando deleteVaultEntry como fallback:', err)
      await deleteVaultEntry(vaultPath, relativePath)
    }
    vaultWatcher?.scheduleCheck(60)
    return true
  })

  ipcMain.handle('shell:open-external', async (_event, url: string) => {
    await shell.openExternal(url)
  })

  ipcMain.handle('shell:open-in-explorer', async (_event, targetPath: string) => {
    await shell.openPath(targetPath)
  })

  // Native OS Spellchecker IPC handlers
  ipcMain.handle('spellcheck:get-available-languages', async () => {
    return session.defaultSession.availableSpellCheckerLanguages || []
  })

  ipcMain.handle('spellcheck:get-languages', async () => {
    return session.defaultSession.getSpellCheckerLanguages() || []
  })

  ipcMain.handle('spellcheck:set-languages', async (_event, languages: string[]) => {
    try {
      session.defaultSession.setSpellCheckerLanguages(languages)
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle('spellcheck:set-enabled', async (_event, enabled: boolean) => {
    try {
      session.defaultSession.setSpellCheckerEnabled(enabled)
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle('spellcheck:add-word', async (_event, word: string) => {
    try {
      session.defaultSession.addWordToSpellCheckerDictionary(word)
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle('spellcheck:remove-word', async (_event, word: string) => {
    try {
      session.defaultSession.removeWordFromSpellCheckerDictionary(word)
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle('spellcheck:list-words', async () => {
    try {
      return await session.defaultSession.listWordsInSpellCheckerDictionary()
    } catch {
      return []
    }
  })

  ipcMain.handle('spellcheck:sync-ignored-words', async (_event, words: string[]) => {
    try {
      if (Array.isArray(words)) {
        for (const word of words) {
          if (word && typeof word === 'string' && word.trim()) {
            session.defaultSession.addWordToSpellCheckerDictionary(word.trim())
          }
        }
      }
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle('spellcheck:replace-misspelling', async (event, suggestion: string) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender)
      win?.webContents.replaceMisspelling(suggestion)
    } catch {
      // ignore
    }
  })

  ipcMain.handle('spellcheck:get-enhanced-suggestions', async (_event, word: string) => {
    return getEnhancedSpellSuggestions(word, session.defaultSession.getSpellCheckerLanguages())
  })

  ipcMain.handle(
    'discord-presence:configure',
    async (_event, settings: DiscordPresenceSettings) => {
      return discordPresenceService?.configure(settings)
    }
  )

  ipcMain.handle(
    'discord-presence:update-context',
    async (_event, context: DiscordPresenceContext) => {
      return discordPresenceService?.updateContext(context)
    }
  )

  ipcMain.handle('discord-presence:get-status', async () => {
    return discordPresenceService?.getStatus()
  })

  ipcMain.handle('discord-presence:reconnect', async () => {
    return discordPresenceService?.reconnect()
  })

  // Multi-Window IPC Handlers
  ipcMain.handle(
    'window:open-image',
    async (_event, vaultPath: string, relativePath: string, fileName: string) => {
      openImageWindow(vaultPath, relativePath, fileName)
      return true
    }
  )

  ipcMain.handle('window:open-settings', async () => {
    openSettingsWindow()
    return true
  })

  ipcMain.handle('window:close-current', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win && !win.isDestroyed()) {
      win.close()
    }
    return true
  })

  ipcMain.handle('settings:broadcast', async (_event, newSettings: unknown) => {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send('settings:changed', newSettings)
      }
    }
    return true
  })

  ipcMain.handle('app:get-runtime-info', async (): Promise<AppRuntimeInfo> => ({
    version: app.getVersion(),
    environment: runtimeConfig.environment,
    isPackaged: app.isPackaged,
    userDataPath: runtimeConfig.userDataPath,
    defaultVaultDir: runtimeConfig.defaultVaultDir
  }))

  ipcMain.handle('app-update:get-state', async () => {
    return appUpdateService?.getState()
  })

  ipcMain.handle('app-update:check', async () => {
    return appUpdateService?.checkForUpdates({ silentIfUnavailable: false })
  })

  ipcMain.handle('app-update:download', async () => {
    return appUpdateService?.downloadUpdate()
  })

  ipcMain.handle('app-update:install', async () => {
    return appUpdateService?.installUpdate() ?? false
  })

  // Initialize native spellchecker with Portuguese (Brazil) and English (US) simultaneously by default
  try {
    session.defaultSession.setSpellCheckerLanguages(['pt-BR', 'en-US'])
    session.defaultSession.setSpellCheckerEnabled(true)
  } catch {
    // fallback if OS spellchecker provider is warming up
  }

  createWindow()

  appUpdateService?.startAutoCheck()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  appUpdateService?.stopAutoCheck()
  vaultWatcher?.stop()
  void discordPresenceService?.shutdown()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  pomodoroService?.shutdown()
  appUpdateService?.stopAutoCheck()
  void discordPresenceService?.shutdown()
})
