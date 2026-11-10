import { app, shell, BrowserWindow, ipcMain, dialog, session, powerMonitor } from 'electron'
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
import type {
  DiscordPresenceContext,
  DiscordPresenceSettings,
  DiscordPresenceStatus
} from '../shared/discordPresence'

// Hardware Acceleration & Chromium GPU Rendering Pipeline Optimization
app.commandLine.appendSwitch('enable-gpu-rasterization')
app.commandLine.appendSwitch('enable-zero-copy')
app.commandLine.appendSwitch('ignore-gpu-blocklist')

let vaultWatcher: VaultWatcher | null = null
let discordPresenceService: DiscordPresenceService | null = null

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

function createWindow(): void {
  const windowStatePath = join(app.getPath('userData'), 'window-state.json')
  const savedWindowState = loadWindowState(windowStatePath)

  const mainWindow = new BrowserWindow({
    width: savedWindowState.width,
    height: savedWindowState.height,
    x: savedWindowState.x,
    y: savedWindowState.y,
    minWidth: 800,
    minHeight: 540,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#f8fafc',
    title: 'Notes-MD',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      spellcheck: true
    }
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

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.cristofer.notesmd')

  discordPresenceService = new DiscordPresenceService({
    getSystemIdleTime: () => powerMonitor.getSystemIdleTime(),
    onStatusChange: broadcastDiscordPresenceStatus
  })

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  vaultWatcher = new VaultWatcher((snapshot) => {
    broadcastVaultChanged(snapshot)
  })

  const defaultVaultDir = join(process.cwd(), 'Vault-Notas')

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

  // Initialize native spellchecker with Portuguese (Brazil) and English (US) simultaneously by default
  try {
    session.defaultSession.setSpellCheckerLanguages(['pt-BR', 'en-US'])
    session.defaultSession.setSpellCheckerEnabled(true)
  } catch {
    // fallback if OS spellchecker provider is warming up
  }

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  vaultWatcher?.stop()
  void discordPresenceService?.shutdown()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  void discordPresenceService?.shutdown()
})
