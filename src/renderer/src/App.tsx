import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import {
  PanelLeft,
  PanelRight,
  Plus,
  X,
  FileText,
  Sun,
  Moon,
  Palette,
  Search,
  Columns2,
  Rows2,
  Split
} from 'lucide-react'
import type { VaultFileEntry, VaultNoteData, VaultSnapshot } from '../../preload/index.d'
import type { AppSettings, EditorPaneState, OpenTab, SplitLayoutMode } from './types/app'
import {
  buildVaultIndex,
  resolveWikiLinkTarget,
  updateWikiLinksAfterRename
} from './services/noteIndexer'
import { FileExplorerSidebar } from './components/sidebar/FileExplorerSidebar'
import { BacklinksSidebar } from './components/sidebar/BacklinksSidebar'
import { EditorWorkspace } from './components/editor/EditorWorkspace'
import { SettingsModal } from './components/modals/SettingsModal'
import { ImagePreviewModal } from './components/modals/ImagePreviewModal'
import { QuickSwitcherModal } from './components/modals/QuickSwitcherModal'
import { HelpShortcutsModal } from './components/modals/HelpShortcutsModal'
import { InputPromptModal } from './components/modals/InputPromptModal'
import { WikiLinkHoverPreview } from './components/editor/WikiLinkHoverPreview'
import { Button, IconButton } from './components/ui'

const SETTINGS_STORAGE_KEY = 'notes-md:settings:v1'
const LAST_VAULT_STORAGE_KEY = 'notes-md:last-vault'
const VAULT_SESSIONS_STORAGE_KEY = 'notes-md:vault-sessions:v1'

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

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  accent: 'blue',
  fontFamily: 'sans',
  baseFontSize: 16,
  lineHeight: 1.7,
  pageWidth: 'standard',
  canvasStyle: 'paper',
  showLeftSidebar: true,
  showRightSidebar: true,
  spellcheck: true,
  spellcheckLanguages: ['pt-BR', 'en-US'],
  ignoredWords: []
}

export function App(): React.ReactElement {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY)
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS
    } catch {
      return DEFAULT_SETTINGS
    }
  })

  const [vaultPath, setVaultPath] = useState<string>('')
  const [vaultName, setVaultName] = useState<string>('Vault-Notas')
  const [tree, setTree] = useState<VaultFileEntry[]>([])
  const [notes, setNotes] = useState<VaultNoteData[]>([])
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
  const notesRef = useRef<VaultNoteData[]>([])
  useEffect(() => {
    notesRef.current = notes
  }, [notes])

  const [isZenMode, setIsZenMode] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
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
    document.documentElement.setAttribute('data-theme', settings.theme)
    document.documentElement.setAttribute('data-accent', settings.accent)
    document.documentElement.classList.toggle('dark', settings.theme === 'dark')
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
    } catch {
      // ignore storage errors
    }

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
    setSettings((prev) => ({ ...prev, ...partial }))
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

  // Subscribe to real-time file system watcher events from Main process
  useEffect(() => {
    if (!window.electronAPI?.onVaultChanged) return
    const unsubscribe = window.electronAPI.onVaultChanged((snapshot) => {
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
      try {
        const lastPath = localStorage.getItem(LAST_VAULT_STORAGE_KEY)
        if (lastPath) {
          try {
            const loaded = await window.electronAPI.loadVault(lastPath)
            if (loaded && loaded.notes.length > 0) {
              applyVaultSnapshot(loaded)
              return
            }
          } catch {
            // Fallback to default vault
          }
        }
        const defaultSnap = await window.electronAPI.getDefaultVault()
        applyVaultSnapshot(defaultSnap)
      } catch (err) {
        console.error('Erro ao inicializar Vault:', err)
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
      if (vaultPath) {
        try {
          await window.electronAPI.writeNote(vaultPath, relativePath, newMarkdown)
        } catch (err) {
          console.error('Falha ao salvar nota:', err)
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

  const handleCreateNotePrompt = useCallback(
    (folderRelativePath = '') => {
      setPromptModal({
        open: true,
        title: folderRelativePath
          ? `Nova Nota em "${folderRelativePath}"`
          : 'Criar Nova Nota Markdown',
        placeholder: 'Ex: Ideias de Arquitetura',
        initialValue: '',
        onConfirm: async (noteTitle) => {
          if (!vaultPath) return
          if (folderRelativePath) {
            setExpandedFolders((prev) => ({ ...prev, [folderRelativePath]: true }))
          }
          const created = await window.electronAPI.createNote(
            vaultPath,
            folderRelativePath,
            noteTitle
          )
          const refreshed = await window.electronAPI.loadVault(vaultPath)
          applyVaultSnapshot(refreshed, created.relativePath)
        }
      })
    },
    [vaultPath, applyVaultSnapshot]
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
    async (oldRelativePath: string, newTitle: string) => {
      if (!vaultPath) return
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
      applyVaultSnapshot(
        refreshed,
        activeNotePath === oldRelativePath ? newRelativePath : activeNotePath || undefined
      )
    },
    [vaultPath, notes, activeNotePath, applyVaultSnapshot]
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

  const handleOpenImage = useCallback((relativePath: string, fileName: string) => {
    setImageModal({
      open: true,
      fileName,
      relativePath
    })
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

  // Global keyboard shortcuts (Ctrl+P, Ctrl+N, Ctrl+,)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        setIsQuickSwitcherOpen((prev) => !prev)
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        handleCreateNotePrompt('')
      } else if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault()
        setIsSettingsOpen((prev) => !prev)
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [handleCreateNotePrompt])

  return (
    <div className="h-screen w-screen flex flex-col bg-surface-bg text-content-primary overflow-hidden">
      {/* Top Application Header */}
      <header className="h-10 bg-surface-secondary border-b border-surface-border px-3 flex items-center justify-between gap-3 shrink-0 select-none">
        {/* Left Sidebar Toggle + App Brand */}
        <div className="flex items-center gap-1.5 shrink-0">
          <IconButton
            variant="ghost"
            size="sm"
            isActive={settings.showLeftSidebar && !isZenMode}
            onClick={() => updateSettings({ showLeftSidebar: !settings.showLeftSidebar })}
            tooltip="Mostrar/Ocultar Explorador de Arquivos (Ctrl+B)"
            icon={<PanelLeft className="w-4 h-4" />}
          />

          <div className="flex items-center gap-1.5 px-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-accent" />
            <span className="text-xs font-extrabold tracking-tight text-content-primary">
              Notes-MD
            </span>
          </div>
        </div>

        {/* Center: Quick Switcher Search Pill */}
        <div className="flex-1 max-w-md flex justify-center">
          <button
            type="button"
            onClick={() => setIsQuickSwitcherOpen(true)}
            title="Buscar notas ou executar comandos (Ctrl+P)"
            className="w-full flex items-center justify-between gap-2 px-3 py-1 rounded-lg bg-surface-bg border border-surface-border text-xs text-content-muted hover:text-content-primary hover:border-accent/50 transition-colors shadow-2xs group cursor-pointer"
          >
            <div className="flex items-center gap-2 truncate">
              <Search className="w-3.5 h-3.5 text-accent shrink-0" />
              <span className="truncate">Buscar notas ou comandos...</span>
            </div>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] bg-surface-secondary border border-surface-border font-mono text-content-muted group-hover:text-content-primary">
              Ctrl+P
            </kbd>
          </button>
        </div>

        {/* Right Controls: Split Layout Quick Toggle, Theme Toggle, Customization, Right Sidebar Toggle */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Split Mode Quick Switcher */}
          <div className="flex items-center p-0.5 rounded-lg bg-surface-bg border border-surface-border mr-1">
            <IconButton
              variant={splitLayout !== 'single' ? 'accent' : 'ghost'}
              size="xs"
              onClick={() => {
                if (splitLayout === 'single') {
                  const activeTab =
                    pane1.tabs.find((t) => t.relativePath === pane1.activeNotePath) || pane1.tabs[0]
                  if (activeTab) {
                    setPane2({
                      id: 'pane-2',
                      tabs: [{ ...activeTab }],
                      activeNotePath: activeTab.relativePath
                    })
                  }
                  setSplitLayout('horizontal')
                  setActivePaneId('pane-2')
                } else {
                  setSplitLayout('single')
                  setActivePaneId('pane-1')
                }
              }}
              tooltip={
                splitLayout === 'single'
                  ? 'Dividir Janela ao Meio (Lado a Lado)'
                  : 'Voltar para Janela Única'
              }
              icon={<Columns2 className="w-3.5 h-3.5" />}
            />

            {splitLayout !== 'single' && (
              <IconButton
                variant="ghost"
                size="xs"
                onClick={() =>
                  setSplitLayout((prev) => (prev === 'horizontal' ? 'vertical' : 'horizontal'))
                }
                tooltip={
                  splitLayout === 'horizontal'
                    ? 'Alternar para Divisão Vertical (Em Cima e Embaixo)'
                    : 'Alternar para Divisão Horizontal (Lado a Lado)'
                }
                icon={<Rows2 className="w-3.5 h-3.5" />}
                className="ml-0.5"
              />
            )}
          </div>

          <IconButton
            variant="ghost"
            size="sm"
            onClick={() =>
              updateSettings({
                theme:
                  settings.theme === 'light'
                    ? 'dark'
                    : settings.theme === 'dark'
                      ? 'sepia'
                      : 'light'
              })
            }
            tooltip={`Tema atual: ${settings.theme.toUpperCase()} (Clique para alternar)`}
            icon={
              settings.theme === 'dark' ? (
                <Moon className="w-4 h-4 text-accent" />
              ) : (
                <Sun className="w-4 h-4 text-amber-500" />
              )
            }
          />

          <Button
            variant="ghost"
            size="xs"
            onClick={() => setIsSettingsOpen(true)}
            title="Personalização de Temas, Fontes e Layout (Ctrl+,)"
            leftIcon={<Palette className="w-3.5 h-3.5 text-accent" />}
          >
            <span className="hidden md:inline">Personalizar</span>
          </Button>

          <IconButton
            variant="ghost"
            size="sm"
            isActive={settings.showRightSidebar && !isZenMode}
            onClick={() => updateSettings({ showRightSidebar: !settings.showRightSidebar })}
            tooltip="Mostrar/Ocultar Painel Direito (Backlinks, Sumário e Arquivos)"
            icon={<PanelRight className="w-4 h-4" />}
          />
        </div>
      </header>

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
              onCreateNote={handleCreateNotePrompt}
              onCreateFolder={handleCreateFolderPrompt}
              onDuplicateNote={handleDuplicateNote}
              onRenameEntry={handleRenameEntryPrompt}
              onDeleteEntry={handleDeleteEntry}
              onSwitchVault={handleSwitchVault}
              onRefreshVault={handleRefreshVault}
              onOpenInExplorer={handleOpenInExplorer}
              onOpenQuickSwitcher={() => setIsQuickSwitcherOpen(true)}
              onOpenSettings={() => setIsSettingsOpen(true)}
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
          onRenameActiveNote={(newTitle) => {
            if (activeNote) {
              performRename(activeNote.relativePath, newTitle)
            }
          }}
          onNavigateWikiLink={handleNavigateWikiLink}
          onToggleZenMode={() => setIsZenMode((prev) => !prev)}
          onOpenHelpModal={() => setIsHelpOpen(true)}
          onUpdateSettings={updateSettings}
          onOpenQuickSwitcher={() => setIsQuickSwitcherOpen(true)}
          onCreateNotePrompt={handleCreateNotePrompt}
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
            />
          </>
        )}
      </div>

      {/* Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        onUpdateSettings={updateSettings}
        onClose={() => setIsSettingsOpen(false)}
      />

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
