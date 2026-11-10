import { app, shell, BrowserWindow, ipcMain, dialog, session } from 'electron'
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

// Hardware Acceleration & Chromium GPU Rendering Pipeline Optimization
app.commandLine.appendSwitch('enable-gpu-rasterization')
app.commandLine.appendSwitch('enable-zero-copy')
app.commandLine.appendSwitch('ignore-gpu-blocklist')

let vaultWatcher: VaultWatcher | null = null

function broadcastVaultChanged(snapshot: any): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('vault:changed', snapshot)
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
    mainWindow.webContents.send('editor:spellcheck-suggestions', {
      misspelledWord: params.misspelledWord || '',
      suggestions: params.dictionarySuggestions || []
    })
  })

  trackWindowState(mainWindow, windowStatePath)

  mainWindow.on('ready-to-show', () => {
    if (savedWindowState.isMaximized) {
      mainWindow.maximize()
    }
    mainWindow.show()
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
      hash: hash ? hash.replace(/^#\/?/, '') : undefined
    })
  }
}

let settingsWindow: BrowserWindow | null = null

function openSettingsWindow(): void {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    if (settingsWindow.isMinimized()) settingsWindow.restore()
    settingsWindow.focus()
    return
  }

  settingsWindow = new BrowserWindow({
    width: 960,
    height: 720,
    minWidth: 700,
    minHeight: 500,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#181825',
    title: 'Configurações — Notes-MD',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      spellcheck: true
    }
  })

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
    width: 980,
    height: 720,
    minWidth: 420,
    minHeight: 320,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#11111b',
    title: `${fileName} — Notes-MD`,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

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
  electronApp.setAppUserModelId('com.cristofer.notesmd')

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
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
