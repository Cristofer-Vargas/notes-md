import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import {
  Download,
  PanelLeft,
  PanelRight,
  RotateCcw,
  X
} from 'lucide-react'
import type { VaultFileEntry, VaultNoteData, VaultSnapshot } from '../../preload/index.d'
import type { AppSettings, EditorPaneState, OpenTab, RecentVault, SplitLayoutMode } from './types/app'
import type { AppUpdateState } from '../../shared/appUpdate'
import {
  buildVaultIndex,
  resolveWikiLinkTarget,
  updateWikiLinksAfterRename
} from './services/noteIndexer'
import { getShortcutKey, matchesShortcut } from './services/shortcutService'
import { FileExplorerSidebar } from './components/sidebar/FileExplorerSidebar'
import { addRecentVault, MAX_RECENT_VAULTS, removeRecentVault } from './services/recentVaults'
import { BacklinksSidebar } from './components/sidebar/BacklinksSidebar'
import { EditorWorkspace } from './components/editor/EditorWorkspace'
import { SettingsModal, type SettingsTab } from './components/modals/SettingsModal'
import { ImagePreviewModal } from './components/modals/ImagePreviewModal'
import { QuickSwitcherModal } from './components/modals/QuickSwitcherModal'
import { HelpShortcutsModal } from './components/modals/HelpShortcutsModal'
import { InputPromptModal } from './components/modals/InputPromptModal'
import { WikiLinkHoverPreview } from './components/editor/WikiLinkHoverPreview'
import { DiscordLoadingScreen } from './components/common/DiscordLoadingScreen'
import { Badge, Button, IconButton } from './components/ui'
import {
  DEFAULT_DISCORD_PRESENCE_SETTINGS,
  normalizeDiscordPresenceSettings
} from '../../shared/discordPresence'
import {
  loadSettings,
  saveSettings,
  applyThemeToDocument
} from './services/settingsManager'

const LAST_VAULT_STORAGE_KEY = 'notes-md:last-vault'
const VAULT_SESSIONS_STORAGE_KEY = 'notes-md:vault-sessions:v1'
const RECENT_VAULTS_KEY = 'notes-md:recent-vaults:v1'

interface PersistedVaultSession {
  openTabPaths: string[]
  activeNotePath: string | null
  expandedFolders: Record<string, boolean>
}

function loadVaultSession(targetVaultPath: string): PersistedVaultSession | null {
  try {
    const raw = localStorage.getItem(VAULT_SESSIONS_STORAGE_KEY)
    if (!raw) return null
    const allSessions = JSON.parse(raw) as Record<string, PersistedVaultSession>
    return allSessions[targetVaultPath] || null
  } catch {
    return null
  }
}

function saveVaultSession(targetVaultPath: string, session: PersistedVaultSession): void {
  if (!targetVaultPath) return
  try {
    const raw = localStorage.getItem(VAULT_SESSIONS_STORAGE_KEY)
    const allSessions: Record<string, PersistedVaultSession> = raw ? JSON.parse(raw) : {}
    allSessions[targetVaultPath] = session
    localStorage.setItem(VAULT_SESSIONS_STORAGE_KEY, JSON.stringify(allSessions))
  } catch {
    // ignore storage errors
  }
}

export function App(): React.ReactElement {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings())

  const [vaultPath, setVaultPath] = useState<string>('')
  const [vaultName, setVaultName] = useState<string>('Vault-Notas')
  const [tree, setTree] = useState<VaultFileEntry[]>([])
  const [notes, setNotes] = useState<VaultNoteData[]>([])
  const [recentVaults, setRecentVaults] = useState<RecentVault[]>(() => {
    try {
      const raw = localStorage.getItem(RECENT_VAULTS_KEY)
      return raw ? (JSON.parse(raw) as RecentVault[]).slice(0, MAX_RECENT_VAULTS) : []
    } catch {
      return []
    }
  })

  // Prune deleted or inaccessible vault paths on mount
  useEffect(() => {
    const verifyPaths = async (): Promise<void> => {
      try {
        const raw = localStorage.getItem(RECENT_VAULTS_KEY)
        if (!raw) return
        const list: RecentVault[] = JSON.parse(raw)
        const invalid: RecentVault[] = []
        for (const v of list) {
          if (window.electronAPI?.checkPathExists) {
            const exists = await window.electronAPI.checkPathExists(v.path)
            if (!exists) invalid.push(v)
          }
        }
        setRecentVaults((current) => {
          const next = current.filter((item) => !invalid.some((v) => v.path === item.path && v.lastOpened === item.lastOpened)).slice(0, MAX_RECENT_VAULTS)
          try { localStorage.setItem(RECENT_VAULTS_KEY, JSON.stringify(next)) } catch {}
          return next
        })
      } catch {
        // ignore
      }
    }
    verifyPaths()
  }, [])

  const recordRecentVault = useCallback((vPath: string, vName: string) => {
    if (!vPath) return
    setRecentVaults((prev) => {
      const next = addRecentVault(prev, { path: vPath, name: vName, lastOpened: Date.now() })
      try {
        localStorage.setItem(RECENT_VAULTS_KEY, JSON.stringify(next))
      } catch {}
      return next
    })
  }, [])

  const handleRemoveRecentVault = useCallback((path: string) => {
    setRecentVaults((current) => {
      const next = removeRecentVault(current, path)
      try { localStorage.setItem(RECENT_VAULTS_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const [splitLayout, setSplitLayout] = useState<SplitLayoutMode>('single')
  const [splitRatio, setSplitRatio] = useState<number>(0.5)
  const [pane1, setPane1] = useState<EditorPaneState>({
    id: 'pane-1',
    tabs: [],
    activeNotePath: null
  })
  const [pane2, setPane2] = useState<EditorPaneState>({
    id: 'pane-2',
    tabs: [],
    activeNotePath: null
  })
  const [activePaneId, setActivePaneId] = useState<'pane-1' | 'pane-2'>('pane-1')
  const [pendingTitleFocus, setPendingTitleFocus] = useState<{ path: string; paneId: 'pane-1' | 'pane-2' } | null>(null)

  const activePane = activePaneId === 'pane-1' ? pane1 : pane2
  const activeNotePath = activePane.activeNotePath || pane1.activeNotePath || null
  const openTabs = useMemo(() => {
    const list = [...pane1.tabs]
    for (const t of pane2.tabs) {
      if (!list.some((existing) => existing.relativePath === t.relativePath)) {
        list.push(t)
      }
    }
    return list
  }, [pane1.tabs, pane2.tabs])

  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    Projetos: true
  })
  const [lastSyncTime, setLastSyncTime] = useState<number>(Date.now())

  const currentVaultPathRef = useRef<string>('')
  const lastInternalSaveTimeRef = useRef<number>(0)
  const pendingRenameOperationsRef = useRef(0)
  const notesRef = useRef<VaultNoteData[]>([])
  useEffect(() => {
    notesRef.current = notes
  }, [notes])

  const [isZenMode, setIsZenMode] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [settingsInitialTab, setSettingsInitialTab] = useState<SettingsTab>('appearance')
  const [appUpdateState, setAppUpdateState] = useState<AppUpdateState | null>(null)
  const [isUpdateBannerDismissed, setIsUpdateBannerDismissed] = useState(false)
  const [isStartupLoading, setIsStartupLoading] = useState(true)
  const [startupMessage, setStartupMessage] = useState('Iniciando o Notes MD...')
  const [showUpdateOverlay, setShowUpdateOverlay] = useState(false)
  const [isQuickSwitcherOpen, setIsQuickSwitcherOpen] = useState(false)
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [imageModal, setImageModal] = useState<{
    open: boolean
    fileName: string
    relativePath: string
  } | null>(null)

  const [promptModal, setPromptModal] = useState<{
    open: boolean
    title: string
    placeholder: string
    initialValue?: string
    onConfirm: (val: string) => void
  }>({
    open: false,
    title: '',
    placeholder: '',
    onConfirm: () => {}
  })

  // Obsidian-style Ctrl + Hover Note WYSIWYG Page Preview
  const [appHoverPreview, setAppHoverPreview] = useState<{
    targetName: string
    position: { top: number; left: number }
  } | null>(null)
  const appHoverTimeoutRef = useRef<number | null>(null)
  const appHoverTargetRef = useRef<{
    targetName: string
    position: { top: number; left: number }
  } | null>(null)
  const isMouseOverAppPreviewRef = useRef(false)

  const handleShowAppPreview = useCallback(
    (targetName: string, position: { top: number; left: number }) => {
      if (appHoverTimeoutRef.current) window.clearTimeout(appHoverTimeoutRef.current)
      setAppHoverPreview({ targetName, position })
    },
    []
  )

  const handleScheduleHideAppPreview = useCallback(() => {
    if (appHoverTimeoutRef.current) window.clearTimeout(appHoverTimeoutRef.current)
    appHoverTimeoutRef.current = window.setTimeout(() => {
      if (!isMouseOverAppPreviewRef.current) {
        setAppHoverPreview(null)
      }
    }, 200)
  }, [])

  const handleHoverSidebarTarget = useCallback(
    (targetName: string, rect: DOMRect, isCtrlDown: boolean) => {
      const pos = { top: rect.bottom, left: rect.left }
      appHoverTargetRef.current = { targetName, position: pos }
      if (isCtrlDown) {
        handleShowAppPreview(targetName, pos)
      }
    },
    [handleShowAppPreview]
  )

  const handleLeaveSidebarTarget = useCallback(() => {
    appHoverTargetRef.current = null
    handleScheduleHideAppPreview()
  }, [handleScheduleHideAppPreview])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        setAppHoverPreview(null)
        appHoverTargetRef.current = null
        return
      }
      if ((e.key === 'Control' || e.key === 'Meta') && appHoverTargetRef.current) {
        if (appHoverTimeoutRef.current) window.clearTimeout(appHoverTimeoutRef.current)
        setAppHoverPreview(appHoverTargetRef.current)
      }
    }

    const handleKeyUp = (e: KeyboardEvent): void => {
      if ((e.key === 'Control' || e.key === 'Meta') && !isMouseOverAppPreviewRef.current) {
        setAppHoverPreview(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // Resizable Sidebars state (Left and Right)
  const [leftSidebarWidth, setLeftSidebarWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('notes-md:left-sidebar-width')
      if (saved) {
        const parsed = parseInt(saved, 10)
        if (parsed >= 180 && parsed <= 600) return parsed
      }
    } catch {
      // ignore
    }
    return 260
  })

  const [rightSidebarWidth, setRightSidebarWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('notes-md:right-sidebar-width')
      if (saved) {
        const parsed = parseInt(saved, 10)
        if (parsed >= 200 && parsed <= 650) return parsed
      }
    } catch {
      // ignore
    }
    return 280
  })

  const [isResizingLeft, setIsResizingLeft] = useState(false)
  const [isResizingRight, setIsResizingRight] = useState(false)

  const leftSidebarWidthRef = useRef(leftSidebarWidth)
  leftSidebarWidthRef.current = leftSidebarWidth
  const rightSidebarWidthRef = useRef(rightSidebarWidth)
  rightSidebarWidthRef.current = rightSidebarWidth

  const handleStartLeftResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizingLeft(true)
    const startX = e.clientX
    const initialWidth = leftSidebarWidthRef.current

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX
      const newWidth = Math.max(180, Math.min(600, initialWidth + delta))
      setLeftSidebarWidth(newWidth)
    }

    const handleMouseUp = () => {
      setIsResizingLeft(false)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      try {
        localStorage.setItem('notes-md:left-sidebar-width', String(leftSidebarWidthRef.current))
      } catch {
        // ignore
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }, [])

  const handleStartRightResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizingRight(true)
    const startX = e.clientX
    const initialWidth = rightSidebarWidthRef.current

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = startX - moveEvent.clientX
      const newWidth = Math.max(200, Math.min(650, initialWidth + delta))
      setRightSidebarWidth(newWidth)
    }

    const handleMouseUp = () => {
      setIsResizingRight(false)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      try {
        localStorage.setItem('notes-md:right-sidebar-width', String(rightSidebarWidthRef.current))
      } catch {
        // ignore
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }, [])

  // Apply theme and accent to document root + sync spellchecker settings
  useEffect(() => {
    applyThemeToDocument(settings)
    saveSettings(settings)

    if (window.electronAPI) {
      window.electronAPI.setSpellCheckerEnabled(settings.spellcheck).catch(() => {})
      if (settings.spellcheckLanguages && settings.spellcheckLanguages.length > 0) {
        window.electronAPI.setSpellCheckerLanguages(settings.spellcheckLanguages).catch(() => {})
      }
      if (settings.ignoredWords && settings.ignoredWords.length > 0) {
        window.electronAPI.syncIgnoredWords(settings.ignoredWords).catch(() => {})
      }
    }
  }, [settings])

  useEffect(() => {
    window.electronAPI
      ?.configureDiscordPresence(settings.discordPresence)
      .catch(() => {})
  }, [settings.discordPresence])

  // Listen to broadcasted settings from other windows (e.g. standalone Settings window)
  useEffect(() => {
    if (!window.electronAPI?.onSettingsChanged) return
    const unsub = window.electronAPI.onSettingsChanged((updated: unknown) => {
      if (updated && typeof updated === 'object') {
        setSettings((prev) => ({ ...prev, ...(updated as Partial<AppSettings>) }))
      }
    })
    return () => unsub()
  }, [])

  // Persist per-Vault session (open tabs, last active note, and expanded/collapsed folders)
  useEffect(() => {
    if (!vaultPath) return
    saveVaultSession(vaultPath, {
      openTabPaths: openTabs.map((t) => t.relativePath),
      activeNotePath,
      expandedFolders
    })
  }, [vaultPath, openTabs, activeNotePath, expandedFolders])

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial }
      saveSettings(next)
      window.electronAPI?.broadcastSettings(next).catch(() => {})
      return next
    })
  }, [])

  const applyVaultSnapshot = useCallback((snapshot: VaultSnapshot, preferredNotePath?: string) => {
    const isSwitchingOrInitialVault = currentVaultPathRef.current !== snapshot.vaultPath
    currentVaultPathRef.current = snapshot.vaultPath

    const previousNotes = notesRef.current
    const prevPathSet = new Set(previousNotes.map((n) => n.relativePath))
    const addedNotes = snapshot.notes.filter((n) => !prevPathSet.has(n.relativePath))

    setVaultPath(snapshot.vaultPath)
    setVaultName(snapshot.vaultName)
    setTree(snapshot.tree)
    setNotes(snapshot.notes)
    setLastSyncTime(Date.now())
    if (isSwitchingOrInitialVault) recordRecentVault(snapshot.vaultPath, snapshot.vaultName)

    try {
      localStorage.setItem(LAST_VAULT_STORAGE_KEY, snapshot.vaultPath)
    } catch {
      // ignore
    }

    if (snapshot.notes.length === 0) {
      setPane1({ id: 'pane-1', tabs: [], activeNotePath: null })
      setPane2({ id: 'pane-2', tabs: [], activeNotePath: null })
      setSplitLayout('single')
      return
    }

    const welcome =
      (preferredNotePath && snapshot.notes.find((n) => n.relativePath === preferredNotePath)) ||
      snapshot.notes.find((n) => n.name.toLowerCase().includes('bem-vindo')) ||
      snapshot.notes[0]

    // When loading a Vault for the first time (on app startup or when switching Vault),
    // restore saved expanded folders, open tabs, and last active note from localStorage!
    if (isSwitchingOrInitialVault) {
      const savedSession = loadVaultSession(snapshot.vaultPath)
      if (savedSession) {
        if (savedSession.expandedFolders) {
          setExpandedFolders(savedSession.expandedFolders)
        }

        const restoredTabs: OpenTab[] = []
        for (const relPath of savedSession.openTabPaths || []) {
          const found = snapshot.notes.find((n) => n.relativePath === relPath)
          if (found && !restoredTabs.some((t) => t.relativePath === found.relativePath)) {
            restoredTabs.push({ relativePath: found.relativePath, title: found.name })
          }
        }

        if (restoredTabs.length > 0) {
          const savedActiveExists =
            savedSession.activeNotePath &&
            restoredTabs.some((t) => t.relativePath === savedSession.activeNotePath)
          const targetActive = savedActiveExists
            ? savedSession.activeNotePath
            : restoredTabs[0].relativePath

          setPane1({
            id: 'pane-1',
            tabs: restoredTabs,
            activeNotePath: targetActive
          })
          setPane2({ id: 'pane-2', tabs: [], activeNotePath: null })
          setSplitLayout('single')
          setActivePaneId('pane-1')
          return
        }
      } else {
        setExpandedFolders({ Projetos: true })
      }
    }

    // Map any externally renamed/moved note to its new path by matching content or basename
    const remapPathIfRenamedExternally = (oldRelPath: string): VaultNoteData | undefined => {
      const stillThere = snapshot.notes.find((n) => n.relativePath === oldRelPath)
      if (stillThere) return stillThere

      const oldNoteObj = previousNotes.find((n) => n.relativePath === oldRelPath)
      if (oldNoteObj && addedNotes.length > 0) {
        const byContent = addedNotes.find((n) => n.content === oldNoteObj.content)
        if (byContent) return byContent
        const bySameName = addedNotes.find((n) => n.name === oldNoteObj.name)
        if (bySameName) return bySameName
      }
      return undefined
    }

    setPane1((prev) => {
      const remappedTabs: OpenTab[] = []
      for (const tab of prev.tabs) {
        const target = remapPathIfRenamedExternally(tab.relativePath)
        if (target && !remappedTabs.some((t) => t.relativePath === target.relativePath)) {
          remappedTabs.push({ relativePath: target.relativePath, title: target.name })
        }
      }

      if (remappedTabs.length === 0 && welcome) {
        remappedTabs.push({ relativePath: welcome.relativePath, title: welcome.name })
      }
      if (
        welcome &&
        preferredNotePath &&
        !remappedTabs.some((t) => t.relativePath === preferredNotePath)
      ) {
        remappedTabs.push({ relativePath: preferredNotePath, title: welcome.name })
      }

      let nextActive: string | null = null
      if (preferredNotePath && snapshot.notes.some((n) => n.relativePath === preferredNotePath)) {
        nextActive = preferredNotePath
      } else if (prev.activeNotePath) {
        const remapped = remapPathIfRenamedExternally(prev.activeNotePath)
        nextActive = remapped ? remapped.relativePath : null
      }
      if (!nextActive && remappedTabs.length > 0) {
        nextActive = remappedTabs[0].relativePath
      }

      return {
        ...prev,
        tabs: remappedTabs,
        activeNotePath: nextActive
      }
    })

    setPane2((prev) => {
      if (prev.tabs.length === 0) return prev
      const remappedTabs: OpenTab[] = []
      for (const tab of prev.tabs) {
        const target = remapPathIfRenamedExternally(tab.relativePath)
        if (target && !remappedTabs.some((t) => t.relativePath === target.relativePath)) {
          remappedTabs.push({ relativePath: target.relativePath, title: target.name })
        }
      }

      let nextActive = prev.activeNotePath
      if (nextActive) {
        const remapped = remapPathIfRenamedExternally(nextActive)
        nextActive = remapped ? remapped.relativePath : null
      }
      return {
        ...prev,
        tabs: remappedTabs,
        activeNotePath: nextActive || (remappedTabs[0]?.relativePath ?? null)
      }
    })
  }, [])

  // Sync app update notifications from main process
  useEffect(() => {
    if (!window.electronAPI?.getAppUpdateState) return
    let mounted = true

    window.electronAPI
      .getAppUpdateState()
      .then((state) => {
        if (mounted && state) setAppUpdateState(state)
      })
      .catch(() => {})

    const unsubscribe = window.electronAPI.onAppUpdateStateChanged?.((state) => {
      if (!mounted) return
      setAppUpdateState(state)
      if (state.phase === 'available' || state.phase === 'downloaded') {
        setIsUpdateBannerDismissed(false)
      }
    })

    return () => {
      mounted = false
      unsubscribe?.()
    }
  }, [])

  // Subscribe to real-time file system watcher events from Main process
  useEffect(() => {
    if (!window.electronAPI?.onVaultChanged) return
    const unsubscribe = window.electronAPI.onVaultChanged((snapshot) => {
      if (pendingRenameOperationsRef.current > 0) return
      // If notification is an echo from a very recent local note save, skip re-render to preserve typing smoothness
      const isRecentInternalSave = Date.now() - lastInternalSaveTimeRef.current < 2500
      const currentNotes = notesRef.current
      if (isRecentInternalSave && currentNotes.length === snapshot.notes.length) {
        const samePaths = currentNotes.every(
          (n, i) => n.relativePath === snapshot.notes[i]?.relativePath
        )
        if (samePaths) {
          return
        }
      }
      applyVaultSnapshot(snapshot)
    })
    return () => {
      unsubscribe()
    }
  }, [applyVaultSnapshot])

  // Load initial Vault on mount
  useEffect(() => {
    async function initVault(): Promise<void> {
      const startTime = Date.now()
      setStartupMessage('Carregando notas do Vault...')
      try {
        const lastPath = localStorage.getItem(LAST_VAULT_STORAGE_KEY)
        if (lastPath) {
          try {
            const loaded = await window.electronAPI.loadVault(lastPath)
            if (loaded && loaded.notes.length > 0) {
              setStartupMessage('Indexando conexões Zettelkasten...')
              applyVaultSnapshot(loaded)
              const elapsed = Date.now() - startTime
              const remaining = Math.max(0, 600 - elapsed)
              setTimeout(() => setIsStartupLoading(false), remaining)
              return
            }
          } catch {
            // Fallback to default vault
          }
        }
        const defaultSnap = await window.electronAPI.getDefaultVault()
        setStartupMessage('Indexando conexões Zettelkasten...')
        applyVaultSnapshot(defaultSnap)
      } catch (err) {
        console.error('Erro ao inicializar Vault:', err)
      } finally {
        const elapsed = Date.now() - startTime
        const remaining = Math.max(0, 600 - elapsed)
        setTimeout(() => setIsStartupLoading(false), remaining)
      }
    }
    initVault()
  }, [applyVaultSnapshot])

  // Compute real-time Obsidian index (WikiLinks, Backlinks, Headings, Excerpts)
  const vaultIndex = useMemo(() => buildVaultIndex(notes), [notes])

  const activeNote = useMemo(
    () => notes.find((n) => n.relativePath === activeNotePath) || null,
    [notes, activeNotePath]
  )

  useEffect(() => {
    window.electronAPI
      ?.updateDiscordPresenceContext({
        vaultName: vaultName || null,
        noteName: activeNote?.name || null
      })
      .catch(() => {})
  }, [activeNote?.name, vaultName])

  const navigateToNote = useCallback(
    (relativePath: string, openInNewTab = false) => {
      const normTargetRel = relativePath.replace(/\\/g, '/').toLowerCase()
      const target = notes.find(
        (n) => n.relativePath.replace(/\\/g, '/').toLowerCase() === normTargetRel
      )
      if (!target) return

      const setTargetPane = activePaneId === 'pane-1' ? setPane1 : setPane2

      setTargetPane((prev) => {
        const existing = prev.tabs.find(
          (t) => t.relativePath.replace(/\\/g, '/').toLowerCase() === normTargetRel
        )
        if (existing) {
          return { ...prev, activeNotePath: existing.relativePath }
        }

        if (openInNewTab || prev.tabs.length === 0 || !prev.activeNotePath) {
          return {
            ...prev,
            tabs: [...prev.tabs, { relativePath: target.relativePath, title: target.name }],
            activeNotePath: target.relativePath
          }
        }

        const nextTabs = prev.tabs.map((t) =>
          t.relativePath.replace(/\\/g, '/').toLowerCase() ===
          prev.activeNotePath?.replace(/\\/g, '/').toLowerCase()
            ? { relativePath: target.relativePath, title: target.name }
            : t
        )
        return {
          ...prev,
          tabs: nextTabs,
          activeNotePath: target.relativePath
        }
      })
    },
    [notes, activePaneId]
  )

  const pendingNoteWritesRef = useRef<Map<string, Promise<void>>>(new Map())

  // Save content to disk and update in-memory state immediately
  const handleSaveContent = useCallback(
    async (relativePath: string, newMarkdown: string) => {
      lastInternalSaveTimeRef.current = Date.now()
      setNotes((prev) =>
        prev.map((n) =>
          n.relativePath === relativePath
            ? { ...n, content: newMarkdown, updatedAt: Date.now() }
            : n
        )
      )
      if (!vaultPath) return
      const previous = pendingNoteWritesRef.current.get(relativePath) ?? Promise.resolve()
      const write = previous.catch(() => {}).then(async () => {
        await window.electronAPI.writeNote(vaultPath, relativePath, newMarkdown)
      })
      pendingNoteWritesRef.current.set(relativePath, write)
      try {
        await write
      } catch (err) {
        console.error('Falha ao salvar nota:', err)
        throw err
      } finally {
        if (pendingNoteWritesRef.current.get(relativePath) === write) {
          pendingNoteWritesRef.current.delete(relativePath)
        }
      }
    },
    [vaultPath]
  )

  // Navigate to [[WikiLink]] or automatically create the note if it doesn't exist
  const handleNavigateWikiLink = useCallback(
    async (targetTitle: string, openInNewTab = false) => {
      const cleanTarget = targetTitle.trim()
      if (!cleanTarget || !vaultPath) return

      const existing = resolveWikiLinkTarget(cleanTarget, notes)
      if (existing) {
        navigateToNote(existing.relativePath, openInNewTab)
        return
      }

      // Create the note automatically on click (Obsidian behavior)
      try {
        const created = await window.electronAPI.createNote(vaultPath, '', cleanTarget)
        const refreshed = await window.electronAPI.loadVault(vaultPath)
        
        // Update in-memory state
        setNotes(refreshed.notes)
        setTree(refreshed.tree)
        setLastSyncTime(Date.now())

        navigateToNote(created.relativePath, openInNewTab)
      } catch (err) {
        console.error('Erro ao criar nota vinculada:', err)
      }
    },
    [vaultPath, notes, navigateToNote]
  )

  const handleCreateNote = useCallback(
    async (folderRelativePath = '', paneId: 'pane-1' | 'pane-2' = activePaneId) => {
      if (!vaultPath) return
      try {
        const created = await window.electronAPI.createNote(vaultPath, folderRelativePath, 'Nova nota')
        const refreshed = await window.electronAPI.loadVault(vaultPath)
        if (folderRelativePath) {
          setExpandedFolders((prev) => ({ ...prev, [folderRelativePath]: true }))
        }
        applyVaultSnapshot(refreshed)
        const setTargetPane = paneId === 'pane-1' ? setPane1 : setPane2
        setTargetPane((prev) => ({
          ...prev,
          tabs: prev.tabs.some((tab) => tab.relativePath === created.relativePath)
            ? prev.tabs
            : [...prev.tabs, { relativePath: created.relativePath, title: created.name }],
          activeNotePath: created.relativePath
        }))
        setActivePaneId(paneId)
        setPendingTitleFocus({ path: created.relativePath, paneId })
      } catch (error) {
        console.error('Falha ao criar nota:', error)
        window.alert('Não foi possível criar a nota. Verifique o acesso à pasta e tente novamente.')
      }
    },
    [vaultPath, activePaneId, applyVaultSnapshot]
  )

  const handleCreateFolderPrompt = useCallback(
    (parentRelativePath: string) => {
      setPromptModal({
        open: true,
        title: parentRelativePath
          ? `Nova Subpasta em "${parentRelativePath}"`
          : 'Criar Nova Pasta no Vault',
        placeholder: 'Ex: Estudos',
        initialValue: '',
        onConfirm: async (folderName) => {
          if (!vaultPath) return
          const createdFolderRel = await window.electronAPI.createFolder(
            vaultPath,
            parentRelativePath,
            folderName
          )
          setExpandedFolders((prev) => ({
            ...prev,
            ...(parentRelativePath ? { [parentRelativePath]: true } : {}),
            [createdFolderRel]: true
          }))
          const refreshed = await window.electronAPI.loadVault(vaultPath)
          applyVaultSnapshot(refreshed, activeNotePath || undefined)
        }
      })
    },
    [vaultPath, activeNotePath, applyVaultSnapshot]
  )

  const performRename = useCallback(
    async (oldRelativePath: string, newTitle: string): Promise<boolean> => {
      if (!vaultPath) return false
      pendingRenameOperationsRef.current += 1
      try {
        await pendingNoteWritesRef.current.get(oldRelativePath)
        const targetNote = notes.find((n) => n.relativePath === oldRelativePath)
        const oldName = targetNote ? targetNote.name : oldRelativePath.replace(/\.md$/i, '')

        const { newRelativePath, newName } = await window.electronAPI.renameEntry(
          vaultPath,
          oldRelativePath,
          newTitle
        )

        // Preserve expanded folder state if a folder was renamed
        if (!targetNote) {
          setExpandedFolders((prev) => {
            const next: Record<string, boolean> = {}
            for (const [k, v] of Object.entries(prev)) {
              if (k === oldRelativePath) {
                next[newRelativePath] = v
              } else if (k.startsWith(`${oldRelativePath}/`)) {
                next[`${newRelativePath}${k.slice(oldRelativePath.length)}`] = v
              } else {
                next[k] = v
              }
            }
            return next
          })
        }

        // Automatically update [[WikiLinks]] across all notes in the Vault if renaming a note
        if (targetNote) {
          for (const note of notes) {
            if (note.relativePath === oldRelativePath) continue
            const { updatedContent, changed } = updateWikiLinksAfterRename(
              note.content,
              oldName,
              oldRelativePath,
              newName,
              newRelativePath
            )
            if (changed) {
              await window.electronAPI.writeNote(vaultPath, note.relativePath, updatedContent)
            }
          }
        }

        // Update tabs in pane1 and pane2
        const updatePaneTabsOnRename = (prev: EditorPaneState): EditorPaneState => {
          const nextTabs = prev.tabs.map((t) => {
            if (t.relativePath === oldRelativePath) {
              return { ...t, relativePath: newRelativePath, title: newName }
            }
            if (t.relativePath.startsWith(`${oldRelativePath}/`)) {
              return {
                ...t,
                relativePath: `${newRelativePath}${t.relativePath.slice(oldRelativePath.length)}`
              }
            }
            return t
          })
          const nextActive =
            prev.activeNotePath === oldRelativePath
              ? newRelativePath
              : prev.activeNotePath?.startsWith(`${oldRelativePath}/`)
                ? `${newRelativePath}${prev.activeNotePath.slice(oldRelativePath.length)}`
                : prev.activeNotePath
          return { ...prev, tabs: nextTabs, activeNotePath: nextActive }
        }

        setPane1(updatePaneTabsOnRename)
        setPane2(updatePaneTabsOnRename)

        const refreshed = await window.electronAPI.loadVault(vaultPath)
        applyVaultSnapshot(refreshed)
        return true
      } catch (error) {
        console.error('Falha ao renomear:', error)
        try {
          const refreshed = await window.electronAPI.loadVault(vaultPath)
          applyVaultSnapshot(refreshed)
        } catch {
          // Preserve the current view if the vault cannot be reloaded.
        }
        window.alert('Não foi possível renomear. Verifique o nome ou se já existe um arquivo com esse nome.')
        return false
      } finally {
        pendingRenameOperationsRef.current -= 1
      }
    },
    [vaultPath, notes, applyVaultSnapshot]
  )

  const handleMoveEntry = useCallback(
    async (oldRelativePath: string, newParentFolderRelativePath: string) => {
      if (!vaultPath) return
      try {
        const { newRelativePath } = await window.electronAPI.moveEntry(
          vaultPath,
          oldRelativePath,
          newParentFolderRelativePath
        )

        const updatePaneTabsOnMove = (prev: EditorPaneState): EditorPaneState => {
          const nextTabs = prev.tabs.map((t) => {
            if (t.relativePath === oldRelativePath) {
              const fileName = newRelativePath.split('/').pop() || t.title
              return {
                relativePath: newRelativePath,
                title: fileName.replace(/\.md$/i, '')
              }
            }
            if (t.relativePath.startsWith(oldRelativePath + '/')) {
              const updatedSub = t.relativePath.replace(oldRelativePath, newRelativePath)
              return { ...t, relativePath: updatedSub }
            }
            return t
          })

          const nextActive =
            prev.activeNotePath === oldRelativePath
              ? newRelativePath
              : prev.activeNotePath?.startsWith(oldRelativePath + '/')
                ? prev.activeNotePath.replace(oldRelativePath, newRelativePath)
                : prev.activeNotePath

          return { ...prev, tabs: nextTabs, activeNotePath: nextActive }
        }

        setPane1(updatePaneTabsOnMove)
        setPane2(updatePaneTabsOnMove)

        const isOldActive = activeNotePath === oldRelativePath
        const isChildActive = activeNotePath?.startsWith(oldRelativePath + '/')
        const targetActive = isOldActive
          ? newRelativePath
          : isChildActive && activeNotePath
            ? activeNotePath.replace(oldRelativePath, newRelativePath)
            : activeNotePath || undefined

        if (newParentFolderRelativePath) {
          setExpandedFolders((prev) => ({ ...prev, [newParentFolderRelativePath]: true }))
        }

        const refreshed = await window.electronAPI.loadVault(vaultPath)
        applyVaultSnapshot(refreshed, targetActive)
      } catch (err: any) {
        console.error('Falha ao mover item:', err)
      }
    },
    [vaultPath, activeNotePath, applyVaultSnapshot]
  )

  const handleOpenImage = useCallback(
    (relativePath: string, fileName: string) => {
      if (window.electronAPI?.openImageWindow && vaultPath) {
        window.electronAPI.openImageWindow(vaultPath, relativePath, fileName).catch(() => {
          setImageModal({
            open: true,
            fileName,
            relativePath
          })
        })
      } else {
        setImageModal({
          open: true,
          fileName,
          relativePath
        })
      }
    },
    [vaultPath]
  )

  const handleOpenSettings = useCallback(() => {
    if (window.electronAPI?.openSettingsWindow) {
      window.electronAPI.openSettingsWindow().catch(() => {
        setIsSettingsOpen(true)
      })
    } else {
      setIsSettingsOpen((prev) => !prev)
    }
  }, [])

  const handleOpenOtherFile = useCallback(
    (relativePath: string, _fileName: string) => {
      const fullPath = `${vaultPath}/${relativePath}`
      window.electronAPI.openExternal(`file://${fullPath}`).catch(() => {
        window.electronAPI.openInExplorer(fullPath)
      })
    },
    [vaultPath]
  )

  const handleRenameEntryPrompt = useCallback(
    (oldRelativePath: string, currentName: string) => {
      setPromptModal({
        open: true,
        title: `Renomear "${currentName}"`,
        placeholder: 'Novo nome',
        initialValue: currentName,
        onConfirm: (newName) => {
          performRename(oldRelativePath, newName)
        }
      })
    },
    [performRename]
  )

  const handleDeleteEntry = useCallback(
    async (relativePath: string, name: string) => {
      if (!vaultPath) return
      const confirmed = window.confirm(`Deseja mover "${name}" para a Lixeira do sistema?`)
      if (!confirmed) return

      await window.electronAPI.deleteEntry(vaultPath, relativePath)

      const filterPaneOnDelete = (prev: EditorPaneState): EditorPaneState => {
        const nextTabs = prev.tabs.filter(
          (t) => t.relativePath !== relativePath && !t.relativePath.startsWith(relativePath + '/')
        )
        const nextActive =
          prev.activeNotePath === relativePath ||
          prev.activeNotePath?.startsWith(relativePath + '/')
            ? nextTabs.length > 0
              ? nextTabs[nextTabs.length - 1].relativePath
              : null
            : prev.activeNotePath
        return { ...prev, tabs: nextTabs, activeNotePath: nextActive }
      }

      setPane1(filterPaneOnDelete)
      setPane2((prev) => {
        const filtered = filterPaneOnDelete(prev)
        if (filtered.tabs.length === 0) {
          setSplitLayout('single')
          setActivePaneId('pane-1')
        }
        return filtered
      })

      const refreshed = await window.electronAPI.loadVault(vaultPath)
      applyVaultSnapshot(refreshed)
    },
    [vaultPath, applyVaultSnapshot]
  )

  const handleSwitchVault = async (): Promise<void> => {
    const selected = await window.electronAPI.selectVaultFolder()
    if (selected) {
      applyVaultSnapshot(selected)
    }
  }

  const handleSelectRecentVault = useCallback(
    async (targetPath: string) => {
      if (!targetPath || targetPath === vaultPath) return
      try {
        const snapshot = await window.electronAPI.loadVault(targetPath)
        applyVaultSnapshot(snapshot)
      } catch (err) {
        console.error('Erro ao abrir cofre recente:', err)
      }
    },
    [vaultPath, applyVaultSnapshot]
  )

  const handleRefreshVault = useCallback(async () => {
    if (!vaultPath) return
    const refreshed = await window.electronAPI.loadVault(vaultPath)
    applyVaultSnapshot(refreshed, activeNotePath || undefined)
  }, [vaultPath, activeNotePath, applyVaultSnapshot])

  const handleOpenInExplorer = useCallback(
    async (subRelativePath?: string) => {
      if (!vaultPath) return
      const target = subRelativePath
        ? `${vaultPath}/${subRelativePath.replace(/^\/+/, '')}`
        : vaultPath
      await window.electronAPI.openInExplorer(target)
    },
    [vaultPath]
  )

  const handleDuplicateNote = useCallback(
    async (relativePath: string) => {
      if (!vaultPath) return
      const sourceNote = notes.find((n) => n.relativePath === relativePath)
      if (!sourceNote) return

      const normalized = relativePath.replace(/\\/g, '/')
      const lastSlash = normalized.lastIndexOf('/')
      const parentFolder = lastSlash === -1 ? '' : normalized.slice(0, lastSlash)

      const created = await window.electronAPI.createNote(
        vaultPath,
        parentFolder,
        `${sourceNote.name} (Cópia)`,
        sourceNote.content
      )
      const refreshed = await window.electronAPI.loadVault(vaultPath)
      applyVaultSnapshot(refreshed, created.relativePath)
    },
    [vaultPath, notes, applyVaultSnapshot]
  )

  const activePaneIdRef = useRef(activePaneId)
  activePaneIdRef.current = activePaneId
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  // Global keyboard shortcuts (configurable in Settings)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent): void => {
      const curSettings = settingsRef.current
      if (matchesShortcut(e, getShortcutKey(curSettings, 'nextTab'))) {
        e.preventDefault()
        const targetPaneId = activePaneIdRef.current
        const setTargetPane = targetPaneId === 'pane-1' ? setPane1 : setPane2
        setTargetPane((prev) => {
          if (prev.tabs.length <= 1) return prev
          const curIdx = prev.tabs.findIndex((t) => t.relativePath === prev.activeNotePath)
          const nextIdx = (curIdx + 1 + prev.tabs.length) % prev.tabs.length
          return { ...prev, activeNotePath: prev.tabs[nextIdx].relativePath }
        })
      } else if (matchesShortcut(e, getShortcutKey(curSettings, 'prevTab'))) {
        e.preventDefault()
        const targetPaneId = activePaneIdRef.current
        const setTargetPane = targetPaneId === 'pane-1' ? setPane1 : setPane2
        setTargetPane((prev) => {
          if (prev.tabs.length <= 1) return prev
          const curIdx = prev.tabs.findIndex((t) => t.relativePath === prev.activeNotePath)
          const nextIdx = (curIdx - 1 + prev.tabs.length) % prev.tabs.length
          return { ...prev, activeNotePath: prev.tabs[nextIdx].relativePath }
        })
      } else if (matchesShortcut(e, getShortcutKey(curSettings, 'closeTab'))) {
        e.preventDefault()
        const targetPaneId = activePaneIdRef.current
        const setTargetPane = targetPaneId === 'pane-1' ? setPane1 : setPane2
        setTargetPane((prev) => {
          if (!prev.activeNotePath || prev.tabs.length === 0) return prev
          const remainingTabs = prev.tabs.filter((t) => t.relativePath !== prev.activeNotePath)
          const nextActive = remainingTabs.length > 0 ? remainingTabs[remainingTabs.length - 1].relativePath : null
          return { ...prev, tabs: remainingTabs, activeNotePath: nextActive }
        })
      } else if (matchesShortcut(e, getShortcutKey(curSettings, 'toggleLeftSidebar'))) {
        e.preventDefault()
        updateSettings({ showLeftSidebar: !curSettings.showLeftSidebar })
      } else if (matchesShortcut(e, getShortcutKey(curSettings, 'toggleRightSidebar'))) {
        e.preventDefault()
        updateSettings({ showRightSidebar: !curSettings.showRightSidebar })
      } else if (matchesShortcut(e, getShortcutKey(curSettings, 'quickSwitcher'))) {
        e.preventDefault()
        setIsQuickSwitcherOpen((prev) => !prev)
      } else if (matchesShortcut(e, getShortcutKey(curSettings, 'newNote'))) {
        e.preventDefault()
        handleCreateNote('')
      } else if (matchesShortcut(e, getShortcutKey(curSettings, 'openSettings'))) {
        e.preventDefault()
        handleOpenSettings()
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [handleCreateNote, updateSettings, handleOpenSettings])

  return (
    <div className="h-screen w-screen flex flex-col bg-surface-bg text-content-primary overflow-hidden relative">
      {/* Floating Toggle Left Sidebar Button (when sidebar is closed) */}
      {!settings.showLeftSidebar && !isZenMode && (
        <div className="absolute top-1 left-1.5 z-30 pointer-events-auto">
          <IconButton
            variant="secondary"
            size="sm"
            onClick={() => updateSettings({ showLeftSidebar: true })}
            tooltip="Mostrar Explorador de Arquivos (Ctrl+B)"
            icon={<PanelLeft className="w-4 h-4 text-content-primary" />}
            className="shadow-sm bg-surface-secondary/95 backdrop-blur-sm border border-surface-border hover:bg-surface-tertiary hover:border-accent/40 transition-all hover:scale-105"
          />
        </div>
      )}

      {/* Floating Toggle Right Sidebar Button (when sidebar is closed) */}
      {!settings.showRightSidebar && !isZenMode && (
        <div className="absolute top-1 right-1.5 z-30 pointer-events-auto">
          <IconButton
            variant="secondary"
            size="sm"
            onClick={() => updateSettings({ showRightSidebar: true })}
            tooltip="Mostrar Painel Direito (Links e Sumário)"
            icon={<PanelRight className="w-4 h-4 text-content-primary" />}
            className="shadow-sm bg-surface-secondary/95 backdrop-blur-sm border border-surface-border hover:bg-surface-tertiary hover:border-accent/40 transition-all hover:scale-105"
          />
        </div>
      )}

      {/* Main 3-Pane Workspace */}
      <div
        className={`flex-1 flex min-h-0 overflow-hidden ${
          isResizingLeft || isResizingRight ? 'cursor-col-resize select-none' : ''
        }`}
      >
        {settings.showLeftSidebar && !isZenMode && (
          <>
            <FileExplorerSidebar
              width={leftSidebarWidth}
              vaultName={vaultName}
              vaultPath={vaultPath}
              tree={tree}
              activeNotePath={activeNotePath}
              lastSyncTime={lastSyncTime}
              expandedFolders={expandedFolders}
              onSetExpandedFolders={setExpandedFolders}
              onSelectNote={navigateToNote}
              onMoveEntry={handleMoveEntry}
              onOpenImage={handleOpenImage}
              onOpenOtherFile={handleOpenOtherFile}
              onHoverTarget={handleHoverSidebarTarget}
              onLeaveTarget={handleLeaveSidebarTarget}
              onCreateNote={handleCreateNote}
              onCreateFolder={handleCreateFolderPrompt}
              onDuplicateNote={handleDuplicateNote}
              onRenameEntry={handleRenameEntryPrompt}
              onDeleteEntry={handleDeleteEntry}
              onSwitchVault={handleSwitchVault}
              onRefreshVault={handleRefreshVault}
              onOpenInExplorer={handleOpenInExplorer}
              onOpenQuickSwitcher={() => setIsQuickSwitcherOpen(true)}
              onOpenSettings={handleOpenSettings}
              theme={settings.theme}
              onToggleTheme={() =>
                updateSettings({
                  theme:
                    settings.theme === 'light'
                      ? 'dark'
                      : settings.theme === 'dark'
                        ? 'sepia'
                        : 'light'
                })
              }
              onCloseSidebar={() => updateSettings({ showLeftSidebar: false })}
              recentVaults={recentVaults}
              onSelectRecentVault={handleSelectRecentVault}
              onRemoveRecentVault={handleRemoveRecentVault}
            />
            {/* Left Resizer Drag Handle */}
            <div
              onMouseDown={handleStartLeftResize}
              className="group relative w-1 hover:w-1.5 -ml-0.5 z-20 cursor-col-resize shrink-0 select-none hover:bg-accent/50 active:bg-accent transition-all duration-150 flex items-center justify-center"
              title="Arraste para redimensionar o painel esquerdo"
            >
              <div className="hidden group-hover:block absolute h-8 w-1 rounded-full bg-accent" />
            </div>
          </>
        )}

        {/* Central Flexible Editor Workspace (Single or Split Panes Lado a Lado / Em Cima e Embaixo) */}
        <EditorWorkspace
          splitLayout={splitLayout}
          onUpdateSplitLayout={setSplitLayout}
          splitRatio={splitRatio}
          onUpdateSplitRatio={setSplitRatio}
          pane1={pane1}
          onUpdatePane1={setPane1}
          pane2={pane2}
          onUpdatePane2={setPane2}
          activePaneId={activePaneId}
          onSetActivePaneId={setActivePaneId}
          allNotes={notes}
          vaultIndex={vaultIndex}
          settings={settings}
          isZenMode={isZenMode}
          onSaveContent={handleSaveContent}
          onRenameNote={performRename}
          onNavigateWikiLink={handleNavigateWikiLink}
          onToggleZenMode={() => setIsZenMode((prev) => !prev)}
          onOpenHelpModal={() => setIsHelpOpen(true)}
          onUpdateSettings={updateSettings}
          onOpenQuickSwitcher={() => setIsQuickSwitcherOpen(true)}
          onCreateNote={handleCreateNote}
          pendingTitleFocus={pendingTitleFocus}
          onTitleFocusHandled={() => setPendingTitleFocus(null)}
          hasLeftFloatingToggle={!settings.showLeftSidebar && !isZenMode}
          hasRightFloatingToggle={!settings.showRightSidebar && !isZenMode}
        />

        {settings.showRightSidebar && !isZenMode && (
          <>
            {/* Right Resizer Drag Handle */}
            <div
              onMouseDown={handleStartRightResize}
              className="group relative w-1 hover:w-1.5 -mr-0.5 z-20 cursor-col-resize shrink-0 select-none hover:bg-accent/50 active:bg-accent transition-all duration-150 flex items-center justify-center"
              title="Arraste para redimensionar o painel direito"
            >
              <div className="hidden group-hover:block absolute h-8 w-1 rounded-full bg-accent" />
            </div>
            <BacklinksSidebar
              width={rightSidebarWidth}
              vaultName={vaultName}
              activeNote={activeNote}
              noteMeta={activeNote ? vaultIndex[activeNote.relativePath] : undefined}
              allNotes={notes}
              onOpenNoteByPath={navigateToNote}
              onNavigateWikiLink={handleNavigateWikiLink}
              onHoverTarget={handleHoverSidebarTarget}
              onLeaveTarget={handleLeaveSidebarTarget}
              onCloseSidebar={() => updateSettings({ showRightSidebar: false })}
            />
          </>
        )}
      </div>

      {/* Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        onUpdateSettings={updateSettings}
        onClose={() => {
          setIsSettingsOpen(false)
          setSettingsInitialTab('appearance')
        }}
        initialTab={settingsInitialTab}
      />

      {!isUpdateBannerDismissed &&
        appUpdateState &&
        (appUpdateState.phase === 'available' ||
          appUpdateState.phase === 'downloading' ||
          appUpdateState.phase === 'downloaded') && (
          <div className="fixed bottom-4 right-4 z-40 max-w-sm rounded-2xl border border-surface-border bg-surface-bg/95 backdrop-blur-md shadow-xl p-3.5 space-y-2.5 animate-in fade-in">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant={appUpdateState.phase === 'downloaded' ? 'success' : 'accent'} size="sm">
                    {appUpdateState.phase === 'downloaded'
                      ? 'Atualização pronta'
                      : appUpdateState.phase === 'downloading'
                        ? `Baixando ${appUpdateState.downloadPercent ?? 0}%`
                        : 'Nova versão'}
                  </Badge>
                  {appUpdateState.availableVersion && (
                    <span className="text-xs font-mono text-content-secondary">
                      v{appUpdateState.availableVersion}
                    </span>
                  )}
                </div>
                <p className="text-xs text-content-secondary leading-snug">
                  {appUpdateState.message}
                </p>
              </div>
              <IconButton
                variant="ghost"
                size="xs"
                onClick={() => setIsUpdateBannerDismissed(true)}
                tooltip="Dispensar aviso"
                icon={<X className="w-3.5 h-3.5" />}
              />
            </div>

            <div className="flex items-center gap-2">
              {appUpdateState.phase === 'available' && (
                <Button
                  variant="primary"
                  size="xs"
                  onClick={() => {
                    setShowUpdateOverlay(true)
                    window.electronAPI?.downloadAppUpdate?.()
                  }}
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                >
                  Baixar e atualizar
                </Button>
              )}
              {appUpdateState.phase === 'downloading' && (
                <Button
                  variant="primary"
                  size="xs"
                  onClick={() => setShowUpdateOverlay(true)}
                  leftIcon={<Download className="w-3.5 h-3.5 animate-bounce" />}
                >
                  Ver progresso ({appUpdateState.downloadPercent ?? 0}%)
                </Button>
              )}
              {appUpdateState.phase === 'downloaded' && (
                <Button
                  variant="primary"
                  size="xs"
                  onClick={() => {
                    setShowUpdateOverlay(true)
                    window.electronAPI?.installAppUpdate?.()
                  }}
                  leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                >
                  Instalar e reiniciar
                </Button>
              )}
              <Button
                variant="secondary"
                size="xs"
                onClick={() => {
                  setSettingsInitialTab('updates')
                  setIsSettingsOpen(true)
                }}
              >
                Detalhes
              </Button>
            </div>
          </div>
        )}

      {/* Discord-Style Loading Screens */}
      {isStartupLoading && (
        <DiscordLoadingScreen
          mode="startup"
          subtitle={startupMessage}
        />
      )}

      {showUpdateOverlay && appUpdateState?.phase === 'downloading' && (
        <DiscordLoadingScreen
          mode="update"
          title="Atualizando o Notes MD"
          subtitle={`Baixando atualização ${appUpdateState.availableVersion ? `v${appUpdateState.availableVersion}` : ''} (${appUpdateState.downloadPercent ?? 0}%)...`}
          progress={appUpdateState.downloadPercent ?? 0}
          version={appUpdateState.availableVersion}
          onDismiss={() => setShowUpdateOverlay(false)}
        />
      )}

      {(appUpdateState?.phase === 'installing' ||
        (showUpdateOverlay && appUpdateState?.phase === 'downloaded')) && (
        <DiscordLoadingScreen
          mode="update"
          title="Reiniciando para Atualizar"
          subtitle="Instalando nova versão e reiniciando o aplicativo..."
          progress={100}
          version={appUpdateState?.availableVersion}
        />
      )}

      <QuickSwitcherModal
        isOpen={isQuickSwitcherOpen}
        notes={notes}
        vaultIndex={vaultIndex}
        onSelectNote={navigateToNote}
        onCreateNewNoteWithTitle={(title, openInNewTab) => handleNavigateWikiLink(title, openInNewTab)}
        onClose={() => setIsQuickSwitcherOpen(false)}
      />

      <HelpShortcutsModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

      <InputPromptModal
        isOpen={promptModal.open}
        title={promptModal.title}
        placeholder={promptModal.placeholder}
        initialValue={promptModal.initialValue}
        onConfirm={promptModal.onConfirm}
        onClose={() => setPromptModal((prev) => ({ ...prev, open: false }))}
      />

      {imageModal && (
        <ImagePreviewModal
          isOpen={imageModal.open}
          fileName={imageModal.fileName}
          relativePath={imageModal.relativePath}
          vaultPath={vaultPath}
          onClose={() => setImageModal(null)}
          onOpenInExplorer={handleOpenInExplorer}
        />
      )}

      {/* Obsidian-style WYSIWYG Hover Preview Modal for Sidebars and File Explorer */}
      {appHoverPreview && (
        <WikiLinkHoverPreview
          targetName={appHoverPreview.targetName}
          position={appHoverPreview.position}
          resolvedNote={
            notes.find(
              (n) =>
                n.relativePath.toLowerCase() === appHoverPreview.targetName.toLowerCase() ||
                n.name.toLowerCase() === appHoverPreview.targetName.toLowerCase()
            ) || resolveWikiLinkTarget(appHoverPreview.targetName, notes)
          }
          noteMeta={
            (() => {
              const res =
                notes.find(
                  (n) =>
                    n.relativePath.toLowerCase() === appHoverPreview.targetName.toLowerCase() ||
                    n.name.toLowerCase() === appHoverPreview.targetName.toLowerCase()
                ) || resolveWikiLinkTarget(appHoverPreview.targetName, notes)
              return res ? vaultIndex[res.relativePath] : undefined
            })()
          }
          onOpenNote={(target, openInNewTab) => {
            setAppHoverPreview(null)
            appHoverTargetRef.current = null
            handleNavigateWikiLink(target, openInNewTab)
          }}
          onMouseEnter={() => {
            isMouseOverAppPreviewRef.current = true
            if (appHoverTimeoutRef.current) window.clearTimeout(appHoverTimeoutRef.current)
          }}
          onMouseLeave={() => {
            isMouseOverAppPreviewRef.current = false
            handleScheduleHideAppPreview()
          }}
          onClose={() => {
            isMouseOverAppPreviewRef.current = false
            appHoverTargetRef.current = null
            setAppHoverPreview(null)
          }}
        />
      )}
    </div>
  )
}

export default App
