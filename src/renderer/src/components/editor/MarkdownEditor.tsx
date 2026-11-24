import React, { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from 'tiptap-markdown'
import Underline from '@tiptap/extension-underline'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import TextAlign from '@tiptap/extension-text-align'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'

import { FontSizeExtension } from './extensions/FontSizeExtension'
import { WikiLinkExtension } from './extensions/WikiLinkExtension'
import { EditorToolbar } from './EditorToolbar'
import { EditorContextMenu, type EditorContextMenuPosition } from './EditorContextMenu'
import { SideNoteCard } from './SideNoteCard'
import { SideNoteDeleteDialog } from './SideNoteDeleteDialog'
import { SideNotePreview } from './SideNotePreview'
import { SelectionButton } from '../ui/SelectionButton'
import { SideNoteLane, measureSideNoteSourceRange } from './SideNoteLane'
import { useSideNotes } from './useSideNotes'
import { anchorFromEditorSelection, mapEditorAnchor, mapEditorAnchorByDiff, projectDocumentText, resolveEditorAnchor } from './sideNoteAnchors'
import { findSideNoteInSource } from './sideNoteSource'
import { shouldCompactSideNotes } from './sideNoteLayout'
import { recoverEditorFocusAfterClick } from './editorFocus'
import { createSideNoteAnchor, resolveSideNoteAnchor } from '../../../../shared/sideNotes'
import { DOMParser as ProseMirrorDOMParser } from '@tiptap/pm/model'
import { WikiLinkSuggestion } from './WikiLinkSuggestion'
import { WikiLinkHoverPreview } from './WikiLinkHoverPreview'
import { CustomCodeBlock, lowlight } from './extensions/CustomCodeBlock'
import { CustomHighlight } from './extensions/CustomHighlight'
import { HeadingFold, foldedHeadingsContainingRange, getFoldedHeadingReferences, headingFoldKey, restoreFoldedHeadings, type FoldedHeadingReference } from './extensions/HeadingFold'
import { applyInlineFormatting, inlineFormattingKey, wrapMarkdownSelection } from './inlineFormatting'
import { escapeInlineFormatting } from './escapeInlineFormatting'
import { blockShortcut, moveEditorBlocks, moveMarkdownLines } from './moveBlocks'
import {
  generateFallbackSuggestions,
  getWordRangeAtPos,
  isPosInsideCode,
  mergeSpellSuggestions
} from '../../services/spellcheckService'
import {
  preprocessMarkdownForEditor,
  postprocessMarkdownFromEditor,
  resolveWikiLinkTarget,
  countWords
} from '../../services/noteIndexer'
import { loadNoteViewState, saveNoteViewState } from '../../services/vaultSession'
import { getEditorFontStack } from '../../services/settingsManager'
import { getShortcutKey, matchesShortcut } from '../../services/shortcutService'
import type { VaultNoteData } from '../../../../preload/index.d'
import type { AppSettings, IndexedNoteMeta } from '../../types/app'
import { CheckCircle2, Clock, ExternalLink, FolderOpen, Link2, MessageSquarePlus, PanelLeftClose, PanelLeftOpen, Pencil, RefreshCw, Sparkles, Trash2, Unlink } from 'lucide-react'
import appLogo from '../../assets/logo.png'
import { Button, IconButton, Input, Textarea } from '../ui'

interface MarkdownEditorProps {
  vaultPath: string
  observationsPanelTarget: HTMLDivElement | null
  onOpenNoteByPath: (path: string) => void
  activeNote: VaultNoteData | null
  allNotes: VaultNoteData[]
  vaultIndex: Record<string, IndexedNoteMeta>
  settings: AppSettings
  onUpdateSettings: (partial: Partial<AppSettings>) => void
  onSaveContent: (relativePath: string, newMarkdown: string) => Promise<void>
  onRenameNote: (path: string, newTitle: string) => Promise<boolean>
  shouldFocusTitle: boolean
  onTitleFocusHandled: () => void
  onNavigateWikiLink: (targetTitle: string, openInNewTab?: boolean) => void
  isZenMode: boolean
  onToggleZenMode: () => void
  onOpenHelpModal: () => void
  pomodoroControl?: React.ReactNode
}

function legacyHeadingFoldStorageKey(vaultPath: string, notePath: string): string {
  return `notes-md:heading-folds:v1:${JSON.stringify([vaultPath, notePath])}`
}

function readHeadingFoldReferences(key: string): FoldedHeadingReference[] {
  try {
    const stored: unknown = JSON.parse(window.localStorage.getItem(key) ?? '[]')
    if (!Array.isArray(stored)) return []
    return stored.filter((reference): reference is FoldedHeadingReference =>
      Boolean(reference) &&
      Number.isInteger(reference.level) && reference.level >= 1 && reference.level <= 6 &&
      typeof reference.text === 'string' &&
      Number.isInteger(reference.occurrence) && reference.occurrence > 0
    )
  } catch {
    return []
  }
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  vaultPath,
  observationsPanelTarget,
  onOpenNoteByPath,
  activeNote,
  allNotes,
  vaultIndex,
  settings,
  onUpdateSettings,
  onSaveContent,
  onRenameNote,
  shouldFocusTitle,
  onTitleFocusHandled,
  onNavigateWikiLink,
  isZenMode,
  onToggleZenMode,
  onOpenHelpModal,
  pomodoroControl
}) => {
  const sideNotes = useSideNotes(vaultPath)
  const sideNotesRef = useRef(sideNotes)
  sideNotesRef.current = sideNotes
  const [sideEditor, setSideEditor] = useState<Editor | null>(null)
  const [sideFilter, setSideFilter] = useState<'current' | 'vault'>('current')
  const [sideSearch, setSideSearch] = useState('')
  const [sourceMenu, setSourceMenu] = useState<{ x: number; y: number } | null>(null)
  const [compactSideNotes, setCompactSideNotes] = useState(true)
  const [manuallyCompactSideNotes, setManuallyCompactSideNotes] = useState(false)
  useLayoutEffect(() => {
    if (!activeNote) {
      setManuallyCompactSideNotes(false)
      return
    }
    setManuallyCompactSideNotes(loadNoteViewState(vaultPath, activeNote.relativePath)?.sideNotesCollapsed ?? false)
  }, [vaultPath, activeNote?.relativePath])
  const [selectedSideNote, setSelectedSideNote] = useState<string | null>(null)
  const [editingSideNote, setEditingSideNote] = useState<string | null>(null)
  const [sideNoteToDelete, setSideNoteToDelete] = useState<string | null>(null)
  const sideNotesPanelRef = useRef<HTMLDivElement>(null)
  const [sideNoteNavigation, setSideNoteNavigation] = useState<{ id: string; path: string } | null>(null)
  const sourceRef = useRef<HTMLTextAreaElement>(null)
  const savedSelectionRef = useRef<{ from: number; to: number } | null>(null)
  const wikiEditorRef = useRef<Editor | null>(null)
  const disposeSideEditor = useCallback((instance: Editor) => setSideEditor((current) => current === instance ? null : current), [])
  const [isSourceMode, setIsSourceMode] = useState(false)
  const [rawMarkdown, setRawMarkdown] = useState('')
  const [noteTitleInput, setNoteTitleInput] = useState('')
  const [isRenaming, setIsRenaming] = useState(false)
  const titleInputRef = useRef<HTMLTextAreaElement>(null)
  const resizeNoteTitle = useCallback(() => {
    const title = titleInputRef.current
    if (!title) return
    title.style.height = 'auto'
    title.style.height = `${title.scrollHeight}px`
  }, [])
  useLayoutEffect(() => {
    resizeNoteTitle()
  }, [
    noteTitleInput,
    activeNote?.fullPath,
    settings.baseFontSize,
    settings.fontFamily,
    settings.customFontFamily,
    resizeNoteTitle
  ])
  useEffect(() => {
    const title = titleInputRef.current
    if (!title) return
    const observer = new ResizeObserver(resizeNoteTitle)
    observer.observe(title)
    return () => observer.disconnect()
  }, [activeNote?.fullPath, resizeNoteTitle])
  const cancelTitleEditRef = useRef(false)
  const [activeNodePath, setActiveNodePath] = useState('documento › p')
  const [saveStatus, setSaveStatus] = useState<'saved' | 'typing' | 'saving'>('saved')
  const saveTimeoutRef = useRef<number | null>(null)
  const editorRef = useRef<any>(null)
  const onSaveContentRef = useRef(onSaveContent)
  onSaveContentRef.current = onSaveContent

  // [[WikiLink]] autocomplete state
  const [wikiSuggest, setWikiSuggest] = useState<{
    open: boolean
    query: string
    initialAlias?: string
    rangeFrom: number
    rangeTo: number
    position: { top: number; left: number }
  } | null>(null)

  // [[WikiLink]] hover preview state
  const [hoverPreview, setHoverPreview] = useState<{
    targetName: string
    position: { top: number; left: number }
  } | null>(null)

  // Right-click & Text-Selection Quick Tools Menu state
  const [contextMenuPos, setContextMenuPos] = useState<EditorContextMenuPosition | null>(null)
  const [spellSuggestions, setSpellSuggestions] = useState<{
    misspelledWord: string
    suggestions: string[]
    isMisspelled: boolean
  } | null>(null)
  const [targetWordRange, setTargetWordRange] = useState<{
    from: number
    to: number
    word: string
  } | null>(null)

  // Inline standard Markdown Link [Text](url) editor bar when cursor is on a link
  const [activeLinkEdit, setActiveLinkEdit] = useState<{
    href: string
    position: { top: number; left: number }
  } | null>(null)

  const hoverTimeoutRef = useRef<number | null>(null)
  const hoveredWikiLinkRef = useRef<{
    targetName: string
    position: { top: number; left: number }
  } | null>(null)
  const isMouseOverPreviewRef = useRef(false)
  const activeNotePathRef = useRef<string | null>(null)
  const activeNoteKeyRef = useRef<string | null>(null)
  const headingFoldStorageRef = useRef<{ key: string; value: string }>({ key: '', value: '' })
  const documentScrollRef = useRef<HTMLDivElement>(null)
  const focusRecoveryFrameRef = useRef<number | null>(null)
  const pendingScrollPositionsRef = useRef(new Map<string, number>())
  const scrollSaveTimeoutsRef = useRef(new Map<string, number>())
  const scrollNoteKeyRef = useRef<string | null>(null)
  const scrollRestoreFrameRef = useRef<number | null>(null)
  const [bottomScrollSpace, setBottomScrollSpace] = useState(0)
  const bottomScrollSpaceRef = useRef(0)
  const [readyNoteKey, setReadyNoteKey] = useState<string | null>(null)
  const hydratedEditorRef = useRef<{ editor: unknown; path: string } | null>(null)
  const isInternalUpdateRef = useRef(false)
  const hasPendingSaveRef = useRef(false)
  const lastSavedMarkdownRef = useRef<string>('')
  const lastInternalEditTimeRef = useRef<number>(0)
  const isSourceModeRef = useRef(isSourceMode)
  isSourceModeRef.current = isSourceMode
  const rawMarkdownRef = useRef(rawMarkdown)
  rawMarkdownRef.current = rawMarkdown
  const allNotesRef = useRef<VaultNoteData[]>(allNotes)
  allNotesRef.current = allNotes

  const persistHeadingFolds = useCallback((instance: Editor) => {
    const notePath = activeNotePathRef.current
    if (!notePath || instance.isDestroyed) return
    const key = JSON.stringify([vaultPath, notePath])
    const references = getFoldedHeadingReferences(instance.state.doc, headingFoldKey.getState(instance.state) ?? new Set())
    const value = JSON.stringify(references)
    if (headingFoldStorageRef.current.key === key && headingFoldStorageRef.current.value === value) return
    saveNoteViewState(vaultPath, notePath, { foldedHeadings: references })
    headingFoldStorageRef.current = { key, value }
  }, [vaultPath])

  const restoreHeadingFolds = useCallback((instance: Editor, notePath: string, legacyFullPath: string) => {
    if (instance.isDestroyed) return
    const key = JSON.stringify([vaultPath, notePath])
    const savedViewState = loadNoteViewState(vaultPath, notePath)
    const legacyKey = legacyHeadingFoldStorageKey(vaultPath, legacyFullPath)
    const references = savedViewState?.foldedHeadings ?? (!savedViewState ? readHeadingFoldReferences(legacyKey) : [])
    const restored = restoreFoldedHeadings(instance.state.doc, references)
    const normalizedReferences = getFoldedHeadingReferences(instance.state.doc, restored)
    const value = JSON.stringify(normalizedReferences)
    headingFoldStorageRef.current = { key, value }
    try {
      if (JSON.stringify(savedViewState?.foldedHeadings ?? []) !== value) {
        saveNoteViewState(vaultPath, notePath, { foldedHeadings: normalizedReferences })
      }
      window.localStorage.removeItem(legacyKey)
    } catch {
      // The editor can still open the note if persistent storage is unavailable.
    }
    instance.view.dispatch(instance.state.tr.setMeta(headingFoldKey, { restore: Array.from(restored) }))
  }, [vaultPath])

  const queueScrollPositionSave = useCallback((notePath: string, scrollTop: number) => {
    pendingScrollPositionsRef.current.set(notePath, scrollTop)
    const previousTimeout = scrollSaveTimeoutsRef.current.get(notePath)
    if (previousTimeout !== undefined) window.clearTimeout(previousTimeout)
    const timeout = window.setTimeout(() => {
      scrollSaveTimeoutsRef.current.delete(notePath)
      const latestPosition = pendingScrollPositionsRef.current.get(notePath)
      if (latestPosition === undefined) return
      pendingScrollPositionsRef.current.delete(notePath)
      saveNoteViewState(vaultPath, notePath, { scrollTop: latestPosition })
    }, 300)
    scrollSaveTimeoutsRef.current.set(notePath, timeout)
  }, [vaultPath])

  const flushQueuedScrollPositions = useCallback(() => {
    for (const timeout of scrollSaveTimeoutsRef.current.values()) window.clearTimeout(timeout)
    scrollSaveTimeoutsRef.current.clear()
    for (const [notePath, scrollTop] of pendingScrollPositionsRef.current) {
      saveNoteViewState(vaultPath, notePath, { scrollTop })
    }
    pendingScrollPositionsRef.current.clear()
  }, [vaultPath])

  const flushActiveScrollPosition = useCallback(() => {
    const notePath = activeNote?.relativePath
    const noteKey = activeNote?.fullPath
    const container = documentScrollRef.current
    if (notePath && noteKey && scrollNoteKeyRef.current === noteKey && container) {
      const timeout = scrollSaveTimeoutsRef.current.get(notePath)
      if (timeout !== undefined) window.clearTimeout(timeout)
      scrollSaveTimeoutsRef.current.delete(notePath)
      pendingScrollPositionsRef.current.delete(notePath)
      saveNoteViewState(vaultPath, notePath, { scrollTop: container.scrollTop })
    }
    flushQueuedScrollPositions()
  }, [activeNote?.fullPath, activeNote?.relativePath, flushQueuedScrollPositions, vaultPath])

  useEffect(() => {
    window.addEventListener('beforeunload', flushActiveScrollPosition)
    return () => {
      window.removeEventListener('beforeunload', flushActiveScrollPosition)
      flushActiveScrollPosition()
    }
  }, [flushActiveScrollPosition])

  const flushPendingSave = useCallback((): Promise<void> => {
    const hadPendingTimeout = Boolean(saveTimeoutRef.current)
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }
    if (!hadPendingTimeout && !hasPendingSaveRef.current) {
      return Promise.resolve()
    }
    hasPendingSaveRef.current = false

    const notePath = activeNotePathRef.current
    if (!notePath) return Promise.resolve()

    if (isSourceModeRef.current) {
      const nextMd = rawMarkdownRef.current
      if (nextMd !== lastSavedMarkdownRef.current) {
        lastSavedMarkdownRef.current = nextMd
        lastInternalEditTimeRef.current = Date.now()
        setSaveStatus('saving')
        const saved = onSaveContentRef.current(notePath, nextMd)
        window.setTimeout(() => setSaveStatus('saved'), 350)
        return saved
      } else {
        setSaveStatus('saved')
      }
      return Promise.resolve()
    }

    const ed = editorRef.current
    if (ed) {
      try {
        const raw = (ed.storage as any).markdown.getMarkdown() as string
        const cleanMd = postprocessMarkdownFromEditor(raw)
        if (cleanMd !== lastSavedMarkdownRef.current) {
          lastSavedMarkdownRef.current = cleanMd
          lastInternalEditTimeRef.current = Date.now()
          setRawMarkdown(cleanMd)
          setSaveStatus('saving')
          const saved = onSaveContentRef.current(notePath, cleanMd)
          window.setTimeout(() => setSaveStatus('saved'), 350)
          return saved
        } else {
          setSaveStatus('saved')
        }
      } catch {
        // ignore
      }
    }
    return Promise.resolve()
  }, [])

  const syncWikiLinkMissingClasses = useCallback((dom: HTMLElement) => {
    const wikiNodes = dom.querySelectorAll<HTMLElement>('.wiki-link-node')
    wikiNodes.forEach((el) => {
      const target = el.getAttribute('data-wiki-link') || ''
      const exists = Boolean(resolveWikiLinkTarget(target, allNotesRef.current))
      if (exists) {
        el.classList.remove('is-missing')
      } else {
        el.classList.add('is-missing')
      }
    })
  }, [])

  const handleOpenQuickToolsAtCaretRef = useRef<() => void>(() => {})

  const getSideNoteAnchor = useCallback(() => {
    if (!editorRef.current) return null
    const current = editorRef.current as Editor
    let anchor
    if (isSourceModeRef.current && sourceRef.current) {
      const input = sourceRef.current
      let from = input.selectionStart
      let to = input.selectionEnd
      if (from === to) {
        from = input.value.lastIndexOf('\n', Math.max(0, from - 1)) + 1
        const end = input.value.indexOf('\n', to)
        to = end < 0 ? input.value.length : end
      }
      const selected = input.value.slice(from, to)
      const projection = projectDocumentText(current.state.doc)
      let match = resolveSideNoteAnchor(projection.text, { quote: selected, prefix: '', suffix: '' })
      if (match.status !== 'attached') {
        const container = document.createElement('div')
        container.innerHTML = (current.storage as any).markdown.parser.parse(selected)
        const parsed = ProseMirrorDOMParser.fromSchema(current.schema).parse(container)
        const quote = projectDocumentText(parsed).text
        match = resolveSideNoteAnchor(projection.text, { quote, prefix: '', suffix: '' })
      }
      anchor = match.status === 'attached' ? createSideNoteAnchor(projection.text, match.from, match.to) : null
    } else {
      const selection = savedSelectionRef.current ?? current.state.selection
      anchor = anchorFromEditorSelection(current.state.doc, selection.from, selection.to)
    }
    savedSelectionRef.current = null
    return anchor
  }, [])

  const createSideAnnotation = useCallback(async () => {
    if (!activeNote) return
    const anchor = getSideNoteAnchor()
    if (!anchor) { window.alert('Selecione um trecho ou posicione o cursor em um parágrafo com texto.'); return }
    const created = await sideNotesRef.current.create(activeNote.relativePath, anchor)
    if (created) setSelectedSideNote(created.id)
  }, [activeNote, getSideNoteAnchor])

  const editorExtensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
        codeBlock: false,
        code: {
          HTMLAttributes: {
            spellcheck: 'false',
            'data-gramm': 'false'
          }
        }
      }),
      CustomCodeBlock.configure({
        lowlight,
        defaultLanguage: 'plaintext'
      }),
      HeadingFold,
      Markdown.configure({
        html: true,
        tightLists: true,
        transformPastedText: true,
        transformCopiedText: true
      }),
      Underline,
      CustomHighlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      FontSizeExtension,
      Subscript,
      Superscript,
      TextAlign.configure({
        types: ['heading', 'paragraph']
      }),
      Table.configure({
        resizable: true
      }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({
        nested: true
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: 'noopener noreferrer'
        }
      }),
      Image,
      WikiLinkExtension,
      Placeholder.configure({
        placeholder:
          'Comece a escrever sua nota... Digite [[ para conectar a outra nota ou use a barra WYSIWYG acima.'
      }),
      CharacterCount
    ],
    []
  )

  const editor = useEditor({
    extensions: editorExtensions,
    content: '',
    onFocus: () => setSideEditor(null),
    onTransaction: ({ transaction, editor: instance }) => {
      if (isInternalUpdateRef.current) return
      if (transaction.docChanged || transaction.getMeta(headingFoldKey)) persistHeadingFolds(instance)
      if (!transaction.docChanged) return
      for (const note of sideNotesRef.current.notesRef.current) {
        if (note.sourcePath !== activeNotePathRef.current || note.detached) continue
        const before = resolveEditorAnchor(transaction.before, note.anchor)
        if (before.status !== 'attached') continue
        const anchor = mapEditorAnchor(transaction.before, transaction.doc, transaction.mapping, note.anchor)
        if (anchor && JSON.stringify(anchor) !== JSON.stringify(note.anchor)) sideNotesRef.current.update(note.id, { anchor })
        else if (!anchor) sideNotesRef.current.update(note.id, { detached: true })
      }
    },
    onUpdate: ({ editor: ed }) => {
      if (isInternalUpdateRef.current) return

      // Fast check for [[ autocomplete trigger
      const { selection } = ed.state
      const { $from, from } = selection
      const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, '\ufffc')
      const textAfter = $from.parent.textBetween(
        $from.parentOffset,
        $from.parent.content.size,
        undefined,
        '\ufffc'
      )
      const match = /(\[{2,})([^[\]\n]*)$/.exec(textBefore)

      if (match) {
        const query = match[2]
        const rangeFrom = from - match[0].length
        const closingMatch = /^\]+/.exec(textAfter)
        const rangeTo = from + (closingMatch ? closingMatch[0].length : 0)
        const coords = ed.view.coordsAtPos(from)
        setWikiSuggest({
          open: true,
          query,
          rangeFrom,
          rangeTo,
          position: { top: coords.bottom, left: coords.left }
        })
      } else {
        setWikiSuggest((prev) => (prev ? null : prev))
      }

      // Indicate content is modified
      setSaveStatus('typing')

      // Smart Debounced Save: 2000ms (2 seconds) of pause before heavy disk/IPC serialization
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current)
      }
      hasPendingSaveRef.current = true

      saveTimeoutRef.current = window.setTimeout(() => {
        saveTimeoutRef.current = null
        hasPendingSaveRef.current = false
        if (!activeNotePathRef.current) return
        try {
          const rawSerialized = (ed.storage as any).markdown.getMarkdown() as string
          const cleanMd = postprocessMarkdownFromEditor(rawSerialized)
          lastSavedMarkdownRef.current = cleanMd
          lastInternalEditTimeRef.current = Date.now()
          setRawMarkdown(cleanMd)
          setSaveStatus('saving')
          void onSaveContentRef.current(activeNotePathRef.current, cleanMd).catch(() => {})
          window.setTimeout(() => setSaveStatus('saved'), 350)

          // Selection updated
        } catch {
          // ignore
        }
      }, 2000)
    },
    onSelectionUpdate: ({ editor: ed }) => {
      const { $from, empty, from } = ed.state.selection
      const chain: string[] = []
      for (let d = 1; d <= $from.depth; d++) {
        const nodeName = $from.node(d).type.name
        if (nodeName === 'heading') {
          chain.push(`h${$from.node(d).attrs.level}`)
        } else if (nodeName === 'paragraph') {
          chain.push('p')
        } else if (nodeName === 'bulletList') {
          chain.push('ul')
        } else if (nodeName === 'orderedList') {
          chain.push('ol')
        } else if (nodeName === 'taskList') {
          chain.push('checklist')
        } else if (nodeName === 'blockquote') {
          chain.push('quote')
        } else {
          chain.push(nodeName)
        }
      }
      setActiveNodePath(chain.length > 0 ? chain.join(' › ') : 'documento')

      // Close selection-triggered quick tools menu when selection becomes empty
      if (empty) {
        setContextMenuPos((prev) => (prev?.trigger === 'selection' ? null : prev))
      }

      // Show inline URL editor when cursor is placed on a standard Markdown link [Text](url)
      if (ed.isActive('link')) {
        const href = (ed.getAttributes('link').href as string) || ''
        let coords: { left: number; bottom: number } | null = null
        try {
          coords = ed.view.coordsAtPos(from)
        } catch {
          coords = null
        }
        if (coords && !isNaN(coords.bottom) && !isNaN(coords.left)) {
          setActiveLinkEdit({
            href,
            position: { top: coords.bottom + 6, left: coords.left }
          })
        } else {
          setActiveLinkEdit(null)
        }
      } else {
        setActiveLinkEdit(null)
      }

      window.requestAnimationFrame(() => {
        syncWikiLinkMissingClasses(ed.view.dom)
      })
    },
    editorProps: {
      handleKeyDown: (view, event) => {
        const blockAction = blockShortcut(event)
        if (blockAction) {
          event.preventDefault()
          return moveEditorBlocks(view, blockAction.direction, blockAction.duplicate)
        }
        if (escapeInlineFormatting(view, event)) {
          event.preventDefault()
          return true
        }
        if (
          matchesShortcut(event, getShortcutKey(settings, 'quickTools')) ||
          (event.shiftKey && event.key === 'F10') ||
          event.key === 'ContextMenu'
        ) {
          event.preventDefault()
          handleOpenQuickToolsAtCaretRef.current()
          return true
        }
        if (matchesShortcut(event, getShortcutKey(settings, 'toggleSourceMode'))) {
          event.preventDefault()
          handleToggleSourceMode()
          return true
        }
        if (matchesShortcut(event, getShortcutKey(settings, 'toggleZenMode'))) {
          event.preventDefault()
          onToggleZenMode()
          return true
        }
        if (matchesShortcut(event, getShortcutKey(settings, 'insertWikiLink'))) {
          event.preventDefault()
          handleOpenWikiPickerFromToolbar()
          return true
        }
        if (matchesShortcut(event, getShortcutKey(settings, 'saveNote'))) {
          event.preventDefault()
          void flushPendingSave().catch(() => {})
          return true
        }
        const inlineKey = inlineFormattingKey(event)
        if (inlineKey && applyInlineFormatting(view, inlineKey)) {
          event.preventDefault()
          return true
        }
        return false
      }
    }
  })

  useEffect(() => {
    if (!sideNoteNavigation || !editor || editor.isDestroyed || activeNote?.relativePath !== sideNoteNavigation.path || readyNoteKey !== activeNote.fullPath || activeNoteKeyRef.current !== activeNote.fullPath || hydratedEditorRef.current?.path !== activeNote.fullPath) return
    const note = sideNotes.notes.find((item) => item.id === sideNoteNavigation.id)
    if (!note || note.detached) { setSideNoteNavigation(null); return }
    const range = resolveEditorAnchor(editor.state.doc, note.anchor)
    if (range.status !== 'attached') { setSideNoteNavigation(null); return }
    if (isSourceMode) {
      const input = sourceRef.current
      const match = input ? findSideNoteInSource(input.value, note.anchor) : null
      if (input && match) {
        input.focus({ preventScroll: true })
        input.setSelectionRange(match.from, match.from)
        let bounds = measureSideNoteSourceRange(input, note)
        if (bounds) {
          const inputRect = input.getBoundingClientRect()
          input.scrollTop += bounds.top - inputRect.top - input.clientHeight / 2
          bounds = measureSideNoteSourceRange(input, note)
          const container = documentScrollRef.current
          if (container && bounds) container.scrollTo({ top: container.scrollTop + bounds.top - container.getBoundingClientRect().top - container.clientHeight / 2, behavior: 'smooth' })
        }
        setSideNoteNavigation(null)
      } else {
        setReadyNoteKey(null)
        setIsSourceMode(false)
      }
      return
    }
    const frame = window.requestAnimationFrame(() => {
      if (!editor.isDestroyed) {
        const folded = headingFoldKey.getState(editor.state) ?? new Set()
        const headingsToExpand = foldedHeadingsContainingRange(editor.state.doc, folded, range.from, range.to)
        for (const headingPosition of headingsToExpand) {
          if (headingFoldKey.getState(editor.state)?.has(headingPosition)) {
            editor.view.dispatch(editor.state.tr.setMeta(headingFoldKey, { toggle: headingPosition }))
          }
        }
        editor.chain().focus(undefined, { scrollIntoView: false }).setTextSelection(range.from).run()
        const container = documentScrollRef.current
        if (container) {
          const target = editor.view.coordsAtPos(range.from)
          container.scrollTo({ top: container.scrollTop + target.top - container.getBoundingClientRect().top - container.clientHeight / 2, behavior: 'smooth' })
        }
      }
      setSideNoteNavigation(null)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [sideNoteNavigation, editor, activeNote, readyNoteKey, sideNotes.notes, isSourceMode])

  const requestEnhancedSpellSuggestions = useCallback(
    (word: string): void => {
      const cleanWord = word.trim()
      const spellcheckApi = window.electronAPI
      const usesEnhancedDictionary = (settings.spellcheckLanguages || []).some((language) =>
        /^(pt|en)/i.test(language)
      )
      const isIgnored = settings.ignoredWords?.some(
        (ignoredWord) =>
          ignoredWord.toLocaleLowerCase('pt-BR') === cleanWord.toLocaleLowerCase('pt-BR')
      )

      if (
        !cleanWord ||
        !settings.spellcheck ||
        !usesEnhancedDictionary ||
        isIgnored ||
        !spellcheckApi?.getEnhancedSpellSuggestions
      ) {
        return
      }

      void spellcheckApi
        .getEnhancedSpellSuggestions(cleanWord)
        .then((enhancedSuggestions) => {
          if (!enhancedSuggestions.length) return

          setSpellSuggestions((current) => {
            if (
              !current ||
              current.misspelledWord.toLocaleLowerCase('pt-BR') !==
                cleanWord.toLocaleLowerCase('pt-BR')
            ) {
              return current
            }

            return {
              ...current,
              isMisspelled: true,
              suggestions: mergeSpellSuggestions(
                cleanWord,
                current.suggestions,
                enhancedSuggestions
              )
            }
          })
        })
        .catch(() => {})
    },
    [settings.ignoredWords, settings.spellcheck, settings.spellcheckLanguages]
  )

  // Listen to OS / Electron native spellchecker suggestions
  useEffect(() => {
    if (!window.electronAPI?.onSpellcheckSuggestions) return
    const unsub = window.electronAPI.onSpellcheckSuggestions((data) => {
      if (!editor || isPosInsideCode(editor)) {
        setSpellSuggestions(null)
        return
      }
      if (data && data.misspelledWord) {
        if (settings.ignoredWords?.includes(data.misspelledWord)) {
          setSpellSuggestions(null)
          return
        }
        const fallbacks = generateFallbackSuggestions(data.misspelledWord)
        const combined = mergeSpellSuggestions(
          data.misspelledWord,
          data.suggestions,
          fallbacks
        )
        setSpellSuggestions({
          misspelledWord: data.misspelledWord,
          suggestions: combined,
          isMisspelled: true
        })
        requestEnhancedSpellSuggestions(data.misspelledWord)
      }
    })
    return () => unsub()
  }, [editor, requestEnhancedSpellSuggestions, settings.ignoredWords])

  
  useEffect(() => {
    editorRef.current = editor
  }, [editor])

  // Obsidian-style: show hover preview when Ctrl is pressed while hovering over a [[WikiLink]], and hide when Ctrl is released
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        setHoverPreview(null)
        hoveredWikiLinkRef.current = null
        return
      }
      if ((e.key === 'Control' || e.key === 'Meta') && hoveredWikiLinkRef.current) {
        if (hoverTimeoutRef.current) window.clearTimeout(hoverTimeoutRef.current)
        setHoverPreview(hoveredWikiLinkRef.current)
      }
    }

    const handleKeyUp = (e: KeyboardEvent): void => {
      if ((e.key === 'Control' || e.key === 'Meta') && !isMouseOverPreviewRef.current) {
        setHoverPreview(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  useEffect(() => {
    const handleFlush = () => {
      void flushPendingSave().catch(() => {})
    }
    window.addEventListener('beforeunload', handleFlush)
    window.addEventListener('blur', handleFlush)
    return () => {
      window.removeEventListener('beforeunload', handleFlush)
      window.removeEventListener('blur', handleFlush)
    }
  }, [flushPendingSave])

  // Synchronize editor when switching active note OR when external file changes occur
  useEffect(() => {
    if (!activeNote) {
      if (scrollRestoreFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollRestoreFrameRef.current)
        scrollRestoreFrameRef.current = null
      }
      scrollNoteKeyRef.current = null
      void flushPendingSave().catch(() => {})
      activeNotePathRef.current = null
      activeNoteKeyRef.current = null
      hydratedEditorRef.current = null
      hasPendingSaveRef.current = false
      lastSavedMarkdownRef.current = ''
      setRawMarkdown('')
      setNoteTitleInput('')
      return
    }

    const isNewPath = activeNoteKeyRef.current !== activeNote.fullPath
    const canHydrateEditor = Boolean(editor && !editor.isDestroyed)
    const needsEditorHydration =
      canHydrateEditor &&
      (hydratedEditorRef.current?.editor !== editor ||
        hydratedEditorRef.current?.path !== activeNote.fullPath)

    if (isNewPath) {
      void flushPendingSave().catch(() => {})
      activeNotePathRef.current = activeNote.relativePath
      activeNoteKeyRef.current = activeNote.fullPath
      hasPendingSaveRef.current = false
      lastSavedMarkdownRef.current = activeNote.content
      setNoteTitleInput(activeNote.name)
      setRawMarkdown(activeNote.content)
      setWikiSuggest(null)
      setHoverPreview(null)
      setContextMenuPos(null)
      setActiveLinkEdit(null)
    }

    if (isNewPath || needsEditorHydration) {
      if (editor && !editor.isDestroyed) {
        isInternalUpdateRef.current = true
        const prepared = preprocessMarkdownForEditor(activeNote.content)
        editor.commands.setContent(prepared, false)
        restoreHeadingFolds(editor, activeNote.relativePath, activeNote.fullPath)
        isInternalUpdateRef.current = false
        hydratedEditorRef.current = { editor, path: activeNote.fullPath }
      }
      if (isNewPath || needsEditorHydration) {
        scrollNoteKeyRef.current = null
        if (scrollRestoreFrameRef.current !== null) {
          window.cancelAnimationFrame(scrollRestoreFrameRef.current)
        }
        setReadyNoteKey(null)
      }
      return
    }

    // Same note path: check if name or external content changed on disk
    if (document.activeElement !== titleInputRef.current && !isRenaming) {
      setNoteTitleInput((prev) => (prev !== activeNote.name ? activeNote.name : prev))
    }

    const isExternalModification =
      activeNote.content !== lastSavedMarkdownRef.current &&
      Date.now() - lastInternalEditTimeRef.current > 600

    if (isExternalModification) {
      lastSavedMarkdownRef.current = activeNote.content
      hasPendingSaveRef.current = false
      setRawMarkdown(activeNote.content)
      if (editor && !editor.isDestroyed) {
        isInternalUpdateRef.current = true
        const prepared = preprocessMarkdownForEditor(activeNote.content)
        editor.commands.setContent(prepared, false)
        restoreHeadingFolds(editor, activeNote.relativePath, activeNote.fullPath)
        isInternalUpdateRef.current = false
        hydratedEditorRef.current = { editor, path: activeNote.fullPath }
      }
    }
  }, [activeNote, editor, flushPendingSave, isRenaming, restoreHeadingFolds])

  useEffect(() => {
    if (!activeNote || (!isSourceMode && (!editor || editor.isDestroyed))) return
    const noteKey = activeNote.fullPath
    const container = documentScrollRef.current
    if (!container) return
    let cancelled = false
    let initialized = false
    let finished = false
    let frame = 0
    const finish = (): void => {
      if (cancelled || finished) return
      finished = true
      observer.disconnect()
      window.clearTimeout(timeout)
      scrollRestoreFrameRef.current = window.requestAnimationFrame(() => {
        if (cancelled) return
        const savedScrollTop = loadNoteViewState(vaultPath, activeNote.relativePath)?.scrollTop ?? 0
        container.scrollTop = savedScrollTop
        scrollNoteKeyRef.current = noteKey
        scrollRestoreFrameRef.current = null
        setReadyNoteKey(noteKey)
      })
    }
    const check = (): void => {
      if (initialized && !container.querySelector('[data-mermaid-rendering="true"]')) finish()
    }
    const observer = new MutationObserver(check)
    observer.observe(container, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-mermaid-rendering'] })
    const timeout = window.setTimeout(finish, 15000)
    frame = window.requestAnimationFrame(() => {
      frame = window.requestAnimationFrame(() => {
        initialized = true
        check()
      })
    })
    return () => {
      cancelled = true
      observer.disconnect()
      window.clearTimeout(timeout)
      window.cancelAnimationFrame(frame)
      if (scrollRestoreFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollRestoreFrameRef.current)
        scrollRestoreFrameRef.current = null
      }
    }
  }, [activeNote?.fullPath, activeNote?.relativePath, editor, isSourceMode, vaultPath])

  useEffect(() => {
    const container = documentScrollRef.current
    if (!container) return
    const update = (): void => {
      const style = getComputedStyle(container)
      const width = Math.max(0, container.clientWidth - parseFloat(style.paddingLeft || '0') - parseFloat(style.paddingRight || '0'))
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
      const maxWidth = settings.pageWidth === 'standard' ? 48 * rem : settings.pageWidth === 'wide' ? 64 * rem : Infinity
      setCompactSideNotes(shouldCompactSideNotes(width, maxWidth, 14 * rem))
    }
    const observer = new ResizeObserver(update)
    observer.observe(container)
    window.addEventListener('resize', update)
    update()
    return () => { observer.disconnect(); window.removeEventListener('resize', update) }
  }, [activeNote?.fullPath, settings.pageWidth, settings.canvasStyle])

  useEffect(() => {
    const container = documentScrollRef.current
    if (!container || !activeNote) return

    let frame = 0
    const measure = (): void => {
      frame = 0
      const viewportHeight = container.clientHeight
      if (!viewportHeight) return

      const containerRect = container.getBoundingClientRect()
      const editorContent = isSourceMode ? sourceRef.current : editor?.view.dom
      let contentBottom = titleInputRef.current?.getBoundingClientRect().bottom ?? containerRect.top
      let sourceTextHeight = 0

      if (isSourceMode && sourceRef.current) {
        const textarea = sourceRef.current
        const computed = window.getComputedStyle(textarea)
        const mirror = document.createElement('div')
        Object.assign(mirror.style, {
          position: 'absolute',
          visibility: 'hidden',
          pointerEvents: 'none',
          left: '-100000px',
          top: '0',
          boxSizing: computed.boxSizing,
          width: `${textarea.clientWidth}px`,
          padding: computed.padding,
          border: computed.border,
          font: computed.font,
          lineHeight: computed.lineHeight,
          letterSpacing: computed.letterSpacing,
          wordSpacing: computed.wordSpacing,
          whiteSpace: 'pre-wrap',
          overflowWrap: 'break-word',
          wordBreak: computed.wordBreak,
          tabSize: computed.tabSize
        })
        mirror.textContent = `${textarea.value}\u200b`
        document.body.appendChild(mirror)
        sourceTextHeight = mirror.getBoundingClientRect().height
        contentBottom = Math.max(contentBottom, textarea.getBoundingClientRect().top + sourceTextHeight)
        mirror.remove()
      } else if (editorContent) {
        const visibleBlocks = Array.from(editorContent.children).filter((child) => {
          const element = child as HTMLElement
          return getComputedStyle(element).display !== 'none' && element.getBoundingClientRect().height > 0
        })
        const lastBlock = visibleBlocks[visibleBlocks.length - 1] as HTMLElement | undefined
        if (lastBlock) contentBottom = Math.max(contentBottom, lastBlock.getBoundingClientRect().bottom)
      }

      if (editorContent) {
        const page = editorContent.closest<HTMLElement>('.relative.w-full.min-w-0')
        const pagePaddingBottom = page ? parseFloat(getComputedStyle(page).paddingBottom) || 0 : 0
        const containerPaddingBottom = parseFloat(getComputedStyle(container).paddingBottom) || 0
        const editorTop = editorContent.getBoundingClientRect().top - containerRect.top + container.scrollTop
        const availableEditorHeight = Math.max(0, viewportHeight - editorTop - pagePaddingBottom - containerPaddingBottom)
        const minimumEditorHeight = Math.min(620, availableEditorHeight)
        editorContent.style.minHeight = `${minimumEditorHeight}px`
        if (isSourceMode && sourceRef.current) {
          sourceRef.current.style.height = `${Math.max(minimumEditorHeight, sourceTextHeight)}px`
        }
      }

      const contentHeight = contentBottom - containerRect.top + container.scrollTop
      const minimumHeightBeforeExtraScroll = viewportHeight * (2 / 3)
      const targetBottomPosition = viewportHeight * 0.45
      const desiredMaxScroll = contentHeight > minimumHeightBeforeExtraScroll
        ? contentHeight - targetBottomPosition
        : 0
      const currentExtraSpace = bottomScrollSpaceRef.current
      const baseMaxScroll = Math.max(0, container.scrollHeight - viewportHeight - currentExtraSpace)
      const nextExtraSpace = Math.max(0, desiredMaxScroll - baseMaxScroll)

      if (Math.abs(nextExtraSpace - currentExtraSpace) > 1) {
        bottomScrollSpaceRef.current = nextExtraSpace
        setBottomScrollSpace(nextExtraSpace)
      }
    }
    const scheduleMeasure = (): void => {
      if (!frame) frame = window.requestAnimationFrame(measure)
    }

    const resizeObserver = new ResizeObserver(scheduleMeasure)
    resizeObserver.observe(container)
    if (editor?.view.dom) resizeObserver.observe(editor.view.dom)
    if (titleInputRef.current) resizeObserver.observe(titleInputRef.current)
    if (sourceRef.current) resizeObserver.observe(sourceRef.current)

    const mutationObserver = new MutationObserver(scheduleMeasure)
    mutationObserver.observe(container, { childList: true, characterData: true, subtree: true })
    editor?.on('transaction', scheduleMeasure)
    window.addEventListener('resize', scheduleMeasure)
    scheduleMeasure()

    return () => {
      resizeObserver.disconnect()
      mutationObserver.disconnect()
      editor?.off('transaction', scheduleMeasure)
      window.removeEventListener('resize', scheduleMeasure)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [activeNote?.fullPath, editor, isSourceMode, rawMarkdown])

  useEffect(() => () => {
    if (scrollRestoreFrameRef.current !== null) {
      window.cancelAnimationFrame(scrollRestoreFrameRef.current)
    }
    if (focusRecoveryFrameRef.current !== null) window.cancelAnimationFrame(focusRecoveryFrameRef.current)
  }, [])

  useEffect(() => {
    if (!shouldFocusTitle || !activeNote) return
    const frame = window.requestAnimationFrame(() => {
      titleInputRef.current?.focus()
      titleInputRef.current?.select()
      onTitleFocusHandled()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [shouldFocusTitle, activeNote?.relativePath, onTitleFocusHandled])

  useEffect(() => {
    editor?.setEditable(!isRenaming, false)
  }, [editor, isRenaming])

  // Update visual styling of existing vs non-existing [[WikiLinks]] in DOM
  useEffect(() => {
    if (!editor) return
    syncWikiLinkMissingClasses(editor.view.dom)
  }, [editor, rawMarkdown, allNotes, syncWikiLinkMissingClasses])

  const handleSelectWikiSuggestion = useCallback(
    (targetNoteTitle: string, alias?: string) => {
      if (!editor) return
      const targetEditor = wikiEditorRef.current && !wikiEditorRef.current.isDestroyed ? wikiEditorRef.current : editor
      if (!targetEditor) return
      if (wikiSuggest) {
        targetEditor
          .chain()
          .focus()
          .deleteRange({ from: wikiSuggest.rangeFrom, to: wikiSuggest.rangeTo })
          .insertWikiLink({ target: targetNoteTitle, alias })
          .run()
      } else {
        targetEditor.chain().focus().insertWikiLink({ target: targetNoteTitle, alias }).run()
      }
      wikiEditorRef.current = null
      setWikiSuggest(null)
    },
    [editor, wikiSuggest]
  )

  const handleOpenWikiPickerFromToolbar = (): void => {
    const targetEditor = sideEditor && !sideEditor.isDestroyed ? sideEditor : editor
    if (!targetEditor) return
    wikiEditorRef.current = targetEditor
    const { from, to, $from } = targetEditor.state.selection
    const coords = targetEditor.view.coordsAtPos(from)

    // If text is selected, use the selected text as initialAlias and replace the selection range
    if (from !== to) {
      const selectedText = targetEditor.state.doc
        .textBetween(from, to, ' ')
        .replace(/^\[+|\]+$/g, '')
        .trim()
      setWikiSuggest({
        open: true,
        query: '',
        initialAlias: selectedText,
        rangeFrom: from,
        rangeTo: to,
        position: { top: coords.bottom, left: coords.left }
      })
      return
    }

    // If cursor is inside or next to existing [ or ] brackets, consume them so no extra [[]] are created
    const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, '\ufffc')
    const textAfter = $from.parent.textBetween(
      $from.parentOffset,
      $from.parent.content.size,
      undefined,
      '\ufffc'
    )
    const openMatch = /\[+([^[\]\n]*)$/.exec(textBefore)
    const closeMatch = /^([^[\]\n]*)\]+/.exec(textAfter)

    const rangeFrom = openMatch ? from - openMatch[0].length : from
    const rangeTo = closeMatch ? from + closeMatch[0].length : from
    const existingInside = (
      (openMatch ? openMatch[1] : '') + (closeMatch ? closeMatch[1] : '')
    ).trim()

    setWikiSuggest({
      open: true,
      query: existingInside,
      rangeFrom,
      rangeTo,
      position: { top: coords.bottom, left: coords.left }
    })
  }

  const handleAddIgnoredWord = useCallback(
    (word: string) => {
      const clean = word.trim()
      if (!clean) return
      const current = settings.ignoredWords || []
      if (!current.includes(clean)) {
        const nextWords = [...current, clean]
        onUpdateSettings({ ignoredWords: nextWords })
        window.electronAPI?.syncIgnoredWords?.(nextWords).catch(() => {})
      }
      setSpellSuggestions(null)
      setTargetWordRange(null)
    },
    [settings.ignoredWords, onUpdateSettings]
  )

  const handleOpenQuickToolsAtCaret = useCallback(() => {
    if (!editor) return
    const pos = editor.state.selection.from
    const inCode = isPosInsideCode(editor, pos)
    let wordInfo: { from: number; to: number; word: string } | null = null

    try {
      if (editor.state.selection.from !== editor.state.selection.to) {
        const rawSel = editor.state.doc
          .textBetween(editor.state.selection.from, editor.state.selection.to, ' ')
          .trim()
        const clean = rawSel.replace(/^[\s.,;:!?()[\]{}"'`]+|[\s.,;:!?()[\]{}"'`]+$/g, '')
        if (clean && !clean.includes(' ')) {
          wordInfo = { from: editor.state.selection.from, to: editor.state.selection.to, word: clean }
        }
      }

      if (!wordInfo) {
        wordInfo = getWordRangeAtPos(editor.state.doc, pos)
      }

      if (wordInfo && !inCode) {
        const cleanWord = wordInfo.word.replace(/^[\s.,;:!?()[\]{}"'`]+|[\s.,;:!?()[\]{}"'`]+$/g, '')
        const isIgnored = Boolean(settings.ignoredWords?.includes(cleanWord))
        let isMisspelled = false
        try {
          isMisspelled =
            !isIgnored && Boolean(window.electronAPI?.isWordMisspelled?.(cleanWord))
        } catch {
          isMisspelled = false
        }
        const nativeList = isMisspelled
          ? window.electronAPI?.getWordSuggestions?.(cleanWord) || []
          : []
        const fallbackList = isMisspelled ? generateFallbackSuggestions(cleanWord) : []
        const combinedList = mergeSpellSuggestions(cleanWord, nativeList, fallbackList)

        setTargetWordRange(wordInfo)
        setSpellSuggestions({
          misspelledWord: cleanWord,
          suggestions: combinedList,
          isMisspelled
        })
        requestEnhancedSpellSuggestions(cleanWord)

        if (editor.state.selection.from === editor.state.selection.to) {
          editor.commands.setTextSelection({ from: wordInfo.from, to: wordInfo.to })
        }
      } else {
        setSpellSuggestions(null)
        setTargetWordRange(null)
      }

      let coords: { left: number; bottom: number } | null = null
      try {
        coords = editor.view.coordsAtPos(pos)
      } catch {
        coords = null
      }

      const safeLeft = coords && !isNaN(coords.left) ? Math.max(16, coords.left) : 100
      const safeTop = coords && !isNaN(coords.bottom) ? coords.bottom + 6 : 100

      setHoverPreview(null)
      setContextMenuPos({
        x: safeLeft,
        y: safeTop,
        trigger: 'contextmenu'
      })
    } catch (err) {
      console.error('Falha ao abrir ferramentas de contexto no cursor:', err)
    }
  }, [editor, requestEnhancedSpellSuggestions, settings.ignoredWords])

  useEffect(() => {
    handleOpenQuickToolsAtCaretRef.current = handleOpenQuickToolsAtCaret
  }, [handleOpenQuickToolsAtCaret])

  const handleToggleSourceMode = (): void => {
    if (!editor || !activeNote) return
    if (isSourceMode) {
      // Switching from Raw Markdown back to WYSIWYG
      isInternalUpdateRef.current = true
      try {
        editor.commands.setContent(preprocessMarkdownForEditor(rawMarkdown), false)
        restoreHeadingFolds(editor, activeNote.relativePath, activeNote.fullPath)
      } finally {
        isInternalUpdateRef.current = false
      }
      setIsSourceMode(false)
    } else {
      // Switching from WYSIWYG to Raw Markdown
      persistHeadingFolds(editor)
      const serialized = (editor.storage as any).markdown.getMarkdown() as string
      setRawMarkdown(postprocessMarkdownFromEditor(serialized))
      setIsSourceMode(true)
    }
  }

  const updateRawMarkdown = (nextMd: string): void => {
    setRawMarkdown(nextMd)
    if (editor && !editor.isDestroyed) {
      const previousDoc = editor.state.doc
      isInternalUpdateRef.current = true
      editor.commands.setContent(preprocessMarkdownForEditor(nextMd), false)
      isInternalUpdateRef.current = false
      const nextDoc = editor.state.doc
      for (const note of sideNotesRef.current.notesRef.current) {
        if (note.sourcePath !== activeNotePathRef.current || note.detached || resolveEditorAnchor(previousDoc, note.anchor).status !== 'attached') continue
        const anchor = mapEditorAnchorByDiff(previousDoc, nextDoc, note.anchor)
        if (anchor && JSON.stringify(anchor) !== JSON.stringify(note.anchor)) sideNotesRef.current.update(note.id, { anchor })
        else if (!anchor) sideNotesRef.current.update(note.id, { detached: true })
      }
    }
    setSaveStatus('typing')

    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current)
    }
    hasPendingSaveRef.current = true

    saveTimeoutRef.current = window.setTimeout(() => {
      saveTimeoutRef.current = null
      hasPendingSaveRef.current = false
      if (activeNotePathRef.current) {
        lastSavedMarkdownRef.current = nextMd
        lastInternalEditTimeRef.current = Date.now()
        setSaveStatus('saving')
        void onSaveContentRef.current(activeNotePathRef.current, nextMd).catch(() => {})
        window.setTimeout(() => setSaveStatus('saved'), 350)
      }
    }, 2000)
  }

  const handleRawMarkdownChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    updateRawMarkdown(e.target.value)
  }

  // Handle click & hover on [[WikiLink]] nodes and external links inside the editor
  // Normal click on a [[WikiLink]] places the cursor inside so it unfolds into [[Nota|Alias]] for inline editing (like Obsidian).
  // Clicking the ↗ trigger button OR Ctrl+Click navigates to the target note!
  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>): void => {
    const isMiddle = e.button === 1
    const openTriggerEl = (e.target as HTMLElement).closest(
      '.wiki-link-open-trigger'
    ) as HTMLElement | null
    if (openTriggerEl) {
      e.preventDefault()
      e.stopPropagation()
      const targetNote = openTriggerEl.getAttribute('data-wiki-open')
      if (targetNote) {
        setHoverPreview(null)
        onNavigateWikiLink(targetNote, isMiddle)
      }
      return
    }

    const wikiEl = (e.target as HTMLElement).closest(
      '.wiki-link-node, .wiki-link-editing'
    ) as HTMLElement | null
    if (wikiEl && (e.ctrlKey || e.metaKey || isMiddle)) {
      e.preventDefault()
      e.stopPropagation()
      const targetNote = wikiEl.getAttribute('data-wiki-link')
      if (targetNote) {
        setHoverPreview(null)
        onNavigateWikiLink(targetNote, isMiddle)
      }
      return
    }

    const anchorEl = (e.target as HTMLElement).closest('a') as HTMLAnchorElement | null
    if (anchorEl && anchorEl.href && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      window.electronAPI.openExternal(anchorEl.href)
    }
  }

  const handleEditorMouseMove = (e: React.MouseEvent<HTMLDivElement>): void => {
    const targetEl = (e.target as HTMLElement).closest(
      '.wiki-link-node, .wiki-link-open-trigger'
    ) as HTMLElement | null

    if (targetEl) {
      const targetNote =
        targetEl.getAttribute('data-wiki-link') || targetEl.getAttribute('data-wiki-open')
      if (targetNote) {
        const rect = targetEl.getBoundingClientRect()
        const pos = { top: rect.bottom, left: rect.left }
        hoveredWikiLinkRef.current = { targetName: targetNote, position: pos }

        // Trigger preview when Ctrl (or Cmd) is pressed!
        if (e.ctrlKey || e.metaKey) {
          if (hoverTimeoutRef.current) window.clearTimeout(hoverTimeoutRef.current)
          setHoverPreview({ targetName: targetNote, position: pos })
        }
        return
      }
    }

    // Cursor moved outside a wiki link
    if (hoveredWikiLinkRef.current) {
      hoveredWikiLinkRef.current = null
      if (!isMouseOverPreviewRef.current) {
        if (hoverTimeoutRef.current) window.clearTimeout(hoverTimeoutRef.current)
        hoverTimeoutRef.current = window.setTimeout(() => {
          if (!isMouseOverPreviewRef.current) {
            setHoverPreview(null)
          }
        }, 180)
      }
    }
  }

  const handleEditorMouseOut = (e: React.MouseEvent<HTMLDivElement>): void => {
    const targetEl = (e.target as HTMLElement).closest(
      '.wiki-link-node, .wiki-link-open-trigger'
    ) as HTMLElement | null
    if (targetEl) {
      hoveredWikiLinkRef.current = null
      if (hoverTimeoutRef.current) window.clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = window.setTimeout(() => {
        if (!isMouseOverPreviewRef.current) {
          setHoverPreview(null)
        }
      }, 200)
    }
  }

  if (!activeNote) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-surface-canvas p-8 text-center select-none">
        <div className="w-16 h-16 rounded-2xl bg-surface-secondary/70 border border-surface-border flex items-center justify-center mb-4 p-3 shadow-xs">
          <img
            src={appLogo}
            alt="Notes MD"
            className="app-logo w-full h-full object-contain select-none pointer-events-none drop-shadow-xs"
          />
        </div>
        <h2 className="text-lg font-bold text-content-primary mb-1">
          Nenhuma nota aberta no momento
        </h2>
        <p className="text-xs text-content-secondary max-w-md">
          Selecione uma nota na barra lateral esquerda, pressione <kbd className="px-1.5 py-0.5 rounded bg-surface-tertiary text-content-primary">Ctrl+P</kbd> para buscar ou crie uma nova nota.
        </p>
      </div>
    )
  }

  const wordCount = (editor?.storage as any)?.characterCount?.words?.() ?? countWords(rawMarkdown)
  const readingTimeMin = Math.max(1, Math.ceil(wordCount / 200))
  const isNoteLoading = isRenaming || readyNoteKey !== activeNote.fullPath || activeNoteKeyRef.current !== activeNote.fullPath
  const resolvedHoverNote = hoverPreview
    ? resolveWikiLinkTarget(hoverPreview.targetName, allNotes)
    : undefined
  const resolvedHoverMeta = resolvedHoverNote
    ? vaultIndex[resolvedHoverNote.relativePath]
    : undefined
  const currentSideNotes = sideNotes.notes.filter((note) => note.sourcePath === activeNote.relativePath)
  const visibleCurrentSideNotes = editor
    ? currentSideNotes.filter((note) => {
      if (note.detached) return false
      const range = resolveEditorAnchor(editor.state.doc, note.anchor)
      if (range.status !== 'attached') return false
      return isSourceMode || foldedHeadingsContainingRange(
        editor.state.doc,
        headingFoldKey.getState(editor.state) ?? new Set(),
        range.from,
        range.to
      ).length === 0
    })
    : []
  const hasAttachedSideNotes = visibleCurrentSideNotes.length > 0
  const sideNotesAreCompact = compactSideNotes || manuallyCompactSideNotes
  const visibleSideNotes = sideNotes.notes.filter((note) => (sideFilter === 'vault' || note.sourcePath === activeNote.relativePath) && `${note.body} ${note.anchor.quote} ${note.sourcePath}`.toLocaleLowerCase().includes(sideSearch.toLocaleLowerCase()))

  const maxWidthClass =
    settings.pageWidth === 'standard'
      ? 'max-w-3xl'
      : settings.pageWidth === 'wide'
        ? 'max-w-5xl'
        : 'max-w-full'

  return (
    <div className={`flex-1 flex flex-col min-w-0 h-full overflow-hidden ${settings.canvasStyle === 'paper' ? 'bg-surface-canvas' : 'bg-surface-bg'}`}>
      {/* Top Rich WYSIWYG Toolbar (inspired by reference image) */}
      <EditorToolbar
        editor={sideEditor ?? editor}
        isSourceMode={isSourceMode && !sideEditor}
        onToggleSourceMode={handleToggleSourceMode}
        isZenMode={isZenMode}
        onToggleZenMode={onToggleZenMode}
        onOpenWikiLinkPicker={handleOpenWikiPickerFromToolbar}
        onOpenHelpModal={onOpenHelpModal}
        baseFontSize={settings.baseFontSize}
        onChangeBaseFontSize={(newSize) => onUpdateSettings({ baseFontSize: newSize })}
      />
      <div className="flex items-center justify-end gap-1 border-b border-surface-border px-2 py-1">
        {hasAttachedSideNotes && <IconButton
          size="sm"
          isActive={sideNotesAreCompact}
          disabled={compactSideNotes}
          tooltip={compactSideNotes
            ? 'Observações recolhidas por falta de espaço'
            : manuallyCompactSideNotes ? 'Expandir observações' : 'Recolher observações para ícones'}
          icon={sideNotesAreCompact ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          onClick={() => {
            const collapsed = !manuallyCompactSideNotes
            setManuallyCompactSideNotes(collapsed)
            saveNoteViewState(vaultPath, activeNote.relativePath, { sideNotesCollapsed: collapsed })
          }}
        />}
        <Button size="xs" variant="ghost" leftIcon={<MessageSquarePlus className="h-4 w-4" />} onMouseDown={(event) => event.preventDefault()} onClick={() => void createSideAnnotation()}>Adicionar observação</Button>
      </div>
      {sideNotes.error && <div role="alert" className="border-b border-surface-border px-3 py-2 text-xs text-content-primary">{sideNotes.error}</div>}

      {/* Scrollable Document Canvas */}
      <div className="flex flex-1 min-h-0 min-w-0">
      <div className="relative flex-1 min-h-0">
      {isNoteLoading && (
        <div role="status" aria-label={isRenaming ? 'Renomeando nota' : 'Carregando nota'} className="absolute inset-0 z-10 flex items-center justify-center bg-surface-bg">
          <RefreshCw aria-hidden="true" className="h-5 w-5 animate-spin text-accent" />
        </div>
      )}
      <div
        ref={documentScrollRef}
        onScroll={(event) => {
          if (scrollNoteKeyRef.current === activeNote.fullPath) {
            const scrollTop = event.currentTarget.scrollTop
            queueScrollPositionSave(activeNote.relativePath, scrollTop)
          }
        }}
        aria-busy={isNoteLoading}
        className={`h-full overflow-y-auto ${
          settings.canvasStyle === 'paper' ? 'px-6 py-6 md:px-10 md:py-8' : 'px-0 py-0'
        }`}
      >
        <div className="flex min-h-full justify-center">
        {hasAttachedSideNotes && !sideNotesAreCompact && <div aria-hidden="true" className="w-56 shrink-0" />}
        <div
          style={
            {
              fontFamily: getEditorFontStack(settings),
              '--editor-font-size': `${settings.baseFontSize}px`,
              '--editor-line-height': String(settings.lineHeight),
              '--editor-paragraph-spacing': `${settings.paragraphSpacing}em`,
              '--editor-letter-spacing': `${settings.letterSpacing}em`,
              '--editor-word-spacing': `${settings.wordSpacing}em`
            } as React.CSSProperties
          }
          className={`relative w-full min-w-0 transition-all duration-200 ${maxWidthClass} ${
            settings.canvasStyle === 'paper'
              ? 'bg-surface-bg border border-surface-border rounded-lg px-8 py-8 md:px-14 md:py-10 min-h-full'
              : 'bg-surface-bg px-8 py-8 md:px-14 md:py-10 min-h-full'
          }`}
        >
          <SideNoteLane notes={visibleCurrentSideNotes} editor={editor} extensions={editorExtensions} sourceMode={isSourceMode} sourceRef={sourceRef} compact={sideNotesAreCompact} onFocusEditor={setSideEditor} onDisposeEditor={disposeSideEditor} onSave={(id, body) => sideNotes.update(id, { body })} />
          {/* The file name is the note title; it is not part of the Markdown body. */}
          <div className="flex items-center gap-4 pb-3 mb-6 border-b border-surface-border/60">
            <div className="flex items-center gap-2 text-xs text-content-muted min-w-0 flex-1">
              <FolderOpen className="w-3.5 h-3.5 text-accent shrink-0" />
              <span className="truncate">{activeNote.relativePath}</span>
            </div>

          </div>

          <h1 className="mb-5">
            <Textarea
              ref={titleInputRef}
              rows={1}
              wrap="soft"
              aria-label="Título da nota"
              title="Renomear nota"
              value={noteTitleInput}
              disabled={isRenaming}
              onChange={(e) => setNoteTitleInput(e.target.value.replace(/[\r\n]+/g, ' '))}
              onBlur={async () => {
                if (cancelTitleEditRef.current) {
                  cancelTitleEditRef.current = false
                  setNoteTitleInput(activeNote.name)
                  return
                }
                const title = noteTitleInput.trim()
                if (!title || title === activeNote.name) {
                  setNoteTitleInput(activeNote.name)
                  return
                }
                setIsRenaming(true)
                try {
                  await flushPendingSave()
                  const renamed = await onRenameNote(activeNote.relativePath, title)
                  if (!renamed) setNoteTitleInput(activeNote.name)
                } catch {
                  setNoteTitleInput(activeNote.name)
                  window.alert('Não foi possível salvar a nota antes de renomeá-la.')
                } finally {
                  setIsRenaming(false)
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  e.currentTarget.blur()
                } else if (e.key === 'Escape') {
                  e.stopPropagation()
                  cancelTitleEditRef.current = true
                  e.currentTarget.blur()
                }
              }}
              style={{ overflowWrap: 'anywhere' }}
              className="block w-full min-h-[1.25em] resize-none overflow-hidden whitespace-pre-wrap break-words border border-transparent bg-transparent px-0 py-1 text-[2rem] font-bold leading-tight tracking-tight text-content-primary hover:border-surface-border focus:border-accent focus:bg-surface-secondary focus:ring-0"
            />
          </h1>

          {/* Editor Surface: WYSIWYG vs Raw Markdown Source */}
          {isSourceMode ? (
            <textarea
              ref={sourceRef}
              onFocus={() => setSideEditor(null)}
              onContextMenu={(event) => { event.preventDefault(); setSourceMenu({ x: event.clientX, y: event.clientY }) }}
              value={rawMarkdown}
              disabled={isRenaming}
              onChange={handleRawMarkdownChange}
              onKeyDown={(e) => {
                const nativeEvent = e.nativeEvent
                const blockAction = blockShortcut(nativeEvent)
                if (blockAction) {
                  e.preventDefault()
                  const textarea = e.currentTarget
                  const result = moveMarkdownLines(textarea.value, textarea.selectionStart, textarea.selectionEnd, blockAction.direction, blockAction.duplicate)
                  if (result) {
                    const selectionDirection = textarea.selectionDirection
                    updateRawMarkdown(result.value)
                    window.requestAnimationFrame(() => {
                      if (document.activeElement === textarea) textarea.setSelectionRange(result.start, result.end, selectionDirection)
                    })
                  }
                  return
                }
                if (
                  matchesShortcut(nativeEvent, getShortcutKey(settings, 'quickTools')) ||
                  (nativeEvent.shiftKey && nativeEvent.key === 'F10') ||
                  nativeEvent.key === 'ContextMenu'
                ) {
                  e.preventDefault()
                  handleOpenQuickToolsAtCaret()
                  return
                }
                if (matchesShortcut(nativeEvent, getShortcutKey(settings, 'toggleSourceMode'))) {
                  e.preventDefault()
                  handleToggleSourceMode()
                  return
                }
                if (matchesShortcut(nativeEvent, getShortcutKey(settings, 'toggleZenMode'))) {
                  e.preventDefault()
                  onToggleZenMode()
                  return
                }
                if (matchesShortcut(nativeEvent, getShortcutKey(settings, 'saveNote'))) {
                  e.preventDefault()
                  void flushPendingSave().catch(() => {})
                  return
                }
                const inlineKey = inlineFormattingKey(nativeEvent)
                if (inlineKey) {
                  const textarea = e.currentTarget
                  const wrapped = wrapMarkdownSelection(textarea.value, textarea.selectionStart, textarea.selectionEnd, inlineKey)
                  if (wrapped) {
                    e.preventDefault()
                    updateRawMarkdown(wrapped.value)
                    window.requestAnimationFrame(() => {
                      if (document.activeElement === textarea) textarea.setSelectionRange(wrapped.start, wrapped.end)
                    })
                  }
                }
              }}
              spellCheck={settings.spellcheck}
              placeholder="Escreva em Markdown puro..."
              style={{ lineHeight: 'var(--editor-line-height, 1.7)', letterSpacing: 'var(--editor-letter-spacing, 0em)', wordSpacing: 'var(--editor-word-spacing, 0em)' }}
              className="w-full min-h-[620px] bg-transparent text-content-primary font-mono text-sm focus:outline-none resize-none"
            />
          ) : (
            <div
              onMouseDownCapture={(event) => {
                const target = event.target as HTMLElement
                if (event.button === 0 && editor?.view.dom.contains(target) && !target.closest('[contenteditable="false"], button, input, textarea, select')) setSideEditor(null)
              }}
              onClick={(event) => {
                handleEditorClick(event)
                const target = event.target as HTMLElement
                if (!editor || event.button !== 0 || event.defaultPrevented || !editor.view.dom.contains(target) || target.closest('[contenteditable="false"], button, input, textarea, select')) return
                const previousFocus = document.activeElement
                const point = { left: event.clientX, top: event.clientY }
                if (focusRecoveryFrameRef.current !== null) window.cancelAnimationFrame(focusRecoveryFrameRef.current)
                focusRecoveryFrameRef.current = window.requestAnimationFrame(() => {
                  focusRecoveryFrameRef.current = null
                  recoverEditorFocusAfterClick(editor, point, previousFocus)
                })
              }}
              onContextMenu={(e) => {
                e.preventDefault()
                setHoverPreview(null)
                if (!editor) return

                const targetEl = e.target as HTMLElement | null
                const isCodeDom = Boolean(
                  targetEl?.closest('code, pre, .code-block-pre, .code-block-wrapper')
                )
                const clickPos = editor.view.posAtCoords({ left: e.clientX, top: e.clientY })
                const pos = clickPos?.pos ?? editor.state.selection.from
                savedSelectionRef.current = editor.state.selection.empty ? { from: pos, to: pos } : { from: editor.state.selection.from, to: editor.state.selection.to }
                const inCode = isCodeDom || isPosInsideCode(editor, pos)

                if (inCode) {
                  setSpellSuggestions(null)
                  setTargetWordRange(null)
                } else {
                  let wordInfo: { from: number; to: number; word: string } | null = null

                  // If user has an active single-word selection, prioritize it
                  if (editor.state.selection.from !== editor.state.selection.to) {
                    const selFrom = editor.state.selection.from
                    const selTo = editor.state.selection.to
                    const rawSel = editor.state.doc.textBetween(selFrom, selTo, ' ').trim()
                    const clean = rawSel.replace(/^[\s.,;:!?()[\]{}"'`]+|[\s.,;:!?()[\]{}"'`]+$/g, '')
                    if (clean && !clean.includes(' ')) {
                      wordInfo = { from: selFrom, to: selTo, word: clean }
                    }
                  }

                  // Fallback: detect word under cursor coordinates
                  if (!wordInfo && typeof clickPos?.pos === 'number') {
                    wordInfo = getWordRangeAtPos(editor.state.doc, clickPos.pos)
                  }

                  if (wordInfo) {
                    const cleanWord = wordInfo.word.replace(
                      /^[\s.,;:!?()[\]{}"'`]+|[\s.,;:!?()[\]{}"'`]+$/g,
                      ''
                    )
                    const isIgnored = Boolean(settings.ignoredWords?.includes(cleanWord))
                    let isMisspelled = false
                    try {
                      isMisspelled =
                        !isIgnored && Boolean(window.electronAPI?.isWordMisspelled?.(cleanWord))
                    } catch {
                      isMisspelled = false
                    }
                    const nativeList = isMisspelled
                      ? window.electronAPI?.getWordSuggestions?.(cleanWord) || []
                      : []
                    const fallbackList = isMisspelled
                      ? generateFallbackSuggestions(cleanWord)
                      : []
                    const combinedList = mergeSpellSuggestions(
                      cleanWord,
                      nativeList,
                      fallbackList
                    )

                    setTargetWordRange(wordInfo)
                    setSpellSuggestions({
                      misspelledWord: cleanWord,
                      suggestions: combinedList,
                      isMisspelled
                    })
                    requestEnhancedSpellSuggestions(cleanWord)

                    // Select the word in the editor for clear visual feedback and precise action target
                    if (editor.state.selection.from === editor.state.selection.to) {
                      editor.commands.setTextSelection({ from: wordInfo.from, to: wordInfo.to })
                    }
                  } else {
                    setSpellSuggestions(null)
                    setTargetWordRange(null)
                  }
                }

                setContextMenuPos({ x: e.clientX, y: e.clientY, trigger: 'contextmenu' })
              }}
              onAuxClick={(e) => {
                if (e.button === 1) {
                  handleEditorClick(e)
                }
              }}
              onMouseMove={handleEditorMouseMove}
              onMouseLeave={handleEditorMouseOut}
              spellCheck={settings.spellcheck}
            >
              <EditorContent editor={editor} />
            </div>
          )}
        </div>
        </div>
        <div aria-hidden="true" className="shrink-0" style={{ height: bottomScrollSpace }} />
      </div>
      </div>
      {observationsPanelTarget && createPortal(<div ref={sideNotesPanelRef} tabIndex={-1} aria-label="Consulta de observações" className="flex flex-1 min-h-0 flex-col">
        <div className="space-y-2 p-2"><Input value={sideSearch} onChange={(event) => setSideSearch(event.target.value)} placeholder="Buscar observações" aria-label="Buscar observações" /><div className="flex gap-1"><Button size="xs" variant={sideFilter === 'current' ? 'primary' : 'ghost'} onClick={() => setSideFilter('current')}>Nota atual</Button><Button size="xs" variant={sideFilter === 'vault' ? 'primary' : 'ghost'} onClick={() => setSideFilter('vault')}>Todo o cofre</Button></div></div>
        <div className="flex-1 space-y-1 overflow-y-auto p-2">{visibleSideNotes.length === 0 && <p className="p-2 text-xs text-content-muted">Nenhuma observação encontrada.</p>}{visibleSideNotes.map((note) => {
          const sourceNote = allNotes.find((item) => item.relativePath === note.sourcePath)
          const sourceExists = Boolean(sourceNote)
          const sourceName = sourceNote?.name || note.sourcePath.replace(/\\/g, '/').split('/').pop()?.replace(/\.md$/i, '') || note.sourcePath
          const orphan = note.detached || !sourceExists || (note.sourcePath === activeNote.relativePath && editor && resolveEditorAnchor(editor.state.doc, note.anchor).status !== 'attached')
          const navigate = (): void => {
            setSelectedSideNote(note.id)
            if (sourceExists) {
              setSideNoteNavigation({ id: note.id, path: note.sourcePath })
              if (note.sourcePath !== activeNote.relativePath) onOpenNoteByPath(note.sourcePath)
            }
          }
          return <div key={note.id} className="min-w-0 overflow-hidden rounded-sm border border-surface-border p-2">
            <div className="flex min-w-0 items-center gap-1">
              <SelectionButton type="button" className="min-w-0 flex-1 truncate rounded-sm px-1 py-1 text-left text-xs font-semibold text-content-secondary hover:bg-surface-tertiary hover:text-content-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40" title={note.sourcePath} onClick={navigate}>{sourceName}</SelectionButton>
              <IconButton size="xs" tooltip="Editar observação no painel" icon={<Pencil className="h-3 w-3" />} onClick={() => setEditingSideNote((current) => current === note.id ? null : note.id)} />
              <IconButton size="xs" tooltip="Vincular à seleção da nota atual" icon={<Link2 className="h-3 w-3" />} onMouseDown={(event) => event.preventDefault()} onClick={() => {
                const anchor = getSideNoteAnchor()
                if (anchor) { sideNotes.update(note.id, { anchor, sourcePath: activeNote.relativePath, detached: false }); setSelectedSideNote(note.id) }
                else window.alert('Selecione primeiro o trecho ao qual deseja vincular esta observação.')
              }} />
              <IconButton size="xs" tooltip="Excluir observação" icon={<Trash2 className="h-3 w-3" />} onClick={() => setSideNoteToDelete(note.id)} />
            </div>
            <div role="button" tabIndex={0} aria-label={`Ir para a observação em ${note.sourcePath}: ${note.body || note.anchor.quote}`} onClick={navigate} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); navigate() } }} className="group min-w-0 cursor-pointer overflow-hidden rounded-sm px-1 py-1 text-xs text-content-secondary hover:bg-surface-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40">
              <SideNotePreview content={note.body} fallback={note.anchor.quote} extensions={editorExtensions} />
            </div>
            {orphan && <p className="px-2 text-xs text-content-muted">Vínculo não localizado</p>}
            {(editingSideNote === note.id || (selectedSideNote === note.id && (orphan || note.sourcePath !== activeNote.relativePath))) && <div className="mt-2 border-t border-surface-border px-2 pt-2"><SideNoteCard minimal note={note} extensions={editorExtensions} attached={!orphan} onFocusEditor={setSideEditor} onDisposeEditor={disposeSideEditor} onSave={(body) => sideNotes.update(note.id, { body })} onNavigate={() => {}} onRelink={() => {}} onDelete={() => {}} /></div>}
          </div>
        })}</div>
      </div>, observationsPanelTarget)}
      {sideNoteToDelete && <SideNoteDeleteDialog fallbackFocus={sideNotesPanelRef} onCancel={() => setSideNoteToDelete(null)} onConfirm={async () => {
        await sideNotes.remove(sideNoteToDelete)
        setSideNoteToDelete(null)
      }} />}
      </div>

      {/* Inline Standard Link [Text](url) Editor Bar when cursor is on a link */}
      {activeLinkEdit && editor && (
        <div
          style={{
            top: Math.min(activeLinkEdit.position.top, window.innerHeight - 56),
            left: Math.min(Math.max(12, activeLinkEdit.position.left), window.innerWidth - 360)
          }}
          className="fixed z-40 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-surface-border bg-surface-bg/98 backdrop-blur-md shadow-xl animate-in fade-in zoom-in-95 duration-100"
        >
          <Link2 className="w-3.5 h-3.5 text-accent shrink-0" />
          <Input
            type="text"
            value={activeLinkEdit.href}
            onChange={(e) => {
              const nextHref = e.target.value
              setActiveLinkEdit((prev) => (prev ? { ...prev, href: nextHref } : null))
              editor
                .chain()
                .extendMarkRange('link')
                .updateAttributes('link', { href: nextHref })
                .run()
            }}
            placeholder="https://..."
            title="Edite a URL do link diretamente (o texto do link pode ser editado no próprio documento)"
            className="w-56 text-xs px-2 py-1 rounded-md bg-surface-secondary border border-surface-border text-content-primary focus:outline-none focus:border-accent"
          />
          {activeLinkEdit.href && (
            <IconButton
              size="sm"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => window.electronAPI.openExternal(activeLinkEdit.href)}
              tooltip="Abrir link no navegador (ou Ctrl+Clique)"
              icon={<ExternalLink className="w-3.5 h-3.5" />}
            />
          )}
          <IconButton
            variant="danger"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              editor.chain().focus().extendMarkRange('link').unsetLink().run()
              setActiveLinkEdit(null)
            }}
            tooltip="Remover link"
            icon={<Unlink className="w-3.5 h-3.5" />}
          />
        </div>
      )}

      {/* Right-Click & Selection Quick Text Tools Context Menu (Windows style with submenus) */}
      {contextMenuPos && editor && (
        <EditorContextMenu
          editor={editor}
          position={contextMenuPos}
          onClose={() => { setContextMenuPos(null); savedSelectionRef.current = null }}
          targetWordRange={targetWordRange}
          spellSuggestions={spellSuggestions}
          ignoredWords={settings.ignoredWords}
          isInsideCode={editor ? isPosInsideCode(editor, targetWordRange?.from) : false}
          onClearSpellSuggestions={() => {
            setSpellSuggestions(null)
            setTargetWordRange(null)
          }}
          onAddIgnoredWord={handleAddIgnoredWord}
          onOpenWikiLinkPicker={handleOpenWikiPickerFromToolbar}
          onCreateSideNote={() => void createSideAnnotation()}
        />
      )}
      {sourceMenu && <div role="menu" className="fixed z-50 rounded-sm border border-surface-border bg-surface-bg p-1 shadow-lg" style={{ left: sourceMenu.x, top: sourceMenu.y }} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setSourceMenu(null) }}><Button role="menuitem" size="xs" variant="ghost" onMouseDown={(event) => event.preventDefault()} onClick={() => { void createSideAnnotation(); setSourceMenu(null) }} leftIcon={<MessageSquarePlus className="h-4 w-4" />}>Adicionar observação</Button></div>}

      {/* [[WikiLink]] Autocomplete Popover */}
      {wikiSuggest && wikiSuggest.open && (
        <WikiLinkSuggestion
          query={wikiSuggest.query}
          initialAlias={wikiSuggest.initialAlias}
          position={wikiSuggest.position}
          notes={allNotes}
          onSelect={handleSelectWikiSuggestion}
          onClose={() => setWikiSuggest(null)}
        />
      )}

      {/* [[WikiLink]] Hover Preview Card */}
      {hoverPreview && (
        <WikiLinkHoverPreview
          targetName={hoverPreview.targetName}
          position={hoverPreview.position}
          resolvedNote={resolvedHoverNote}
          noteMeta={resolvedHoverMeta}
          onOpenNote={(target, openInNewTab) => {
            setHoverPreview(null)
            hoveredWikiLinkRef.current = null
            onNavigateWikiLink(target, openInNewTab)
          }}
          onMouseEnter={() => {
            isMouseOverPreviewRef.current = true
            if (hoverTimeoutRef.current) window.clearTimeout(hoverTimeoutRef.current)
          }}
          onMouseLeave={() => {
            isMouseOverPreviewRef.current = false
            if (hoverTimeoutRef.current) window.clearTimeout(hoverTimeoutRef.current)
            hoverTimeoutRef.current = window.setTimeout(() => {
              setHoverPreview(null)
            }, 180)
          }}
          onClose={() => {
            isMouseOverPreviewRef.current = false
            hoveredWikiLinkRef.current = null
            setHoverPreview(null)
          }}
        />
      )}

      {/* Bottom Status Bar (inspired by TinyMCE / Obsidian status bar in reference image) */}
      <div className="editor-status-bar h-7 px-4 bg-surface-bg border-t border-surface-border flex items-center justify-between text-[11px] text-content-muted select-none shrink-0">
        <div className="flex min-w-0 items-center gap-3 overflow-hidden whitespace-nowrap">
          <span className="font-mono text-content-secondary">{activeNodePath}</span>
          <span className="hidden sm:inline text-surface-border">|</span>
          <span className="hidden sm:inline">
            Digite <code className="px-1 py-0.5 rounded bg-surface-secondary text-accent">[[</code> para conectar notas
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <span className="editor-status-secondary flex items-center gap-1.5 text-content-secondary">
            {saveStatus === 'typing' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-amber-500 font-medium">Modificado (salvando em 2s...)</span>
              </>
            ) : saveStatus === 'saving' ? (
              <>
                <RefreshCw className="w-3 h-3 text-accent animate-spin" />
                <span className="text-accent font-medium">Salvando no disco...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                <span>Salvo no disco</span>
              </>
            )}
          </span>
          <span className="editor-status-secondary flex items-center gap-1">
            <Clock className="w-3 h-3" />~{readingTimeMin} min de leitura
          </span>
          <span className="font-medium text-content-primary">{wordCount} palavras</span>
          {pomodoroControl}
        </div>
      </div>
    </div>
  )
}
