import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from 'tiptap-markdown'
import Underline from '@tiptap/extension-underline'
import Highlight from '@tiptap/extension-highlight'
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
import { WikiLinkSuggestion } from './WikiLinkSuggestion'
import { WikiLinkHoverPreview } from './WikiLinkHoverPreview'
import { CustomCodeBlock, lowlight } from './extensions/CustomCodeBlock'
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
import { getShortcutKey, matchesShortcut } from '../../services/shortcutService'
import type { VaultNoteData } from '../../../../preload/index.d'
import type { AppSettings, IndexedNoteMeta } from '../../types/app'
import { CheckCircle2, Clock, ExternalLink, FolderOpen, Link2, RefreshCw, Sparkles, Unlink } from 'lucide-react'
import appLogo from '../../assets/logo.png'

interface MarkdownEditorProps {
  activeNote: VaultNoteData | null
  allNotes: VaultNoteData[]
  vaultIndex: Record<string, IndexedNoteMeta>
  settings: AppSettings
  onUpdateSettings: (partial: Partial<AppSettings>) => void
  onSaveContent: (relativePath: string, newMarkdown: string) => void
  onRenameActiveNote: (newTitle: string) => void
  onNavigateWikiLink: (targetTitle: string, openInNewTab?: boolean) => void
  isZenMode: boolean
  onToggleZenMode: () => void
  onOpenHelpModal: () => void
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  activeNote,
  allNotes,
  vaultIndex,
  settings,
  onUpdateSettings,
  onSaveContent,
  onRenameActiveNote,
  onNavigateWikiLink,
  isZenMode,
  onToggleZenMode,
  onOpenHelpModal
}) => {
  const [isSourceMode, setIsSourceMode] = useState(false)
  const [rawMarkdown, setRawMarkdown] = useState('')
  const [noteTitleInput, setNoteTitleInput] = useState('')
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
  const isInternalUpdateRef = useRef(false)
  const lastSavedMarkdownRef = useRef<string>('')
  const lastInternalEditTimeRef = useRef<number>(0)
  const allNotesRef = useRef<VaultNoteData[]>(allNotes)
  allNotesRef.current = allNotes

  
  const flushPendingSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }
    const ed = editorRef.current
    if (ed && activeNotePathRef.current) {
      try {
        const raw = (ed.storage as any).markdown.getMarkdown() as string
        const cleanMd = postprocessMarkdownFromEditor(raw)
        if (cleanMd !== lastSavedMarkdownRef.current) {
          lastSavedMarkdownRef.current = cleanMd
          lastInternalEditTimeRef.current = Date.now()
          setRawMarkdown(cleanMd)
          setSaveStatus('saving')
          onSaveContentRef.current(activeNotePathRef.current, cleanMd)
          window.setTimeout(() => setSaveStatus('saved'), 350)
        } else {
          setSaveStatus('saved')
        }
      } catch {
        // ignore
      }
    }
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

  const editor = useEditor({
    extensions: [
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
      Markdown.configure({
        html: true,
        tightLists: true,
        transformPastedText: true,
        transformCopiedText: true
      }),
      Underline,
      Highlight.configure({ multicolor: true }),
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
    content: '',
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

      saveTimeoutRef.current = window.setTimeout(() => {
        if (!activeNotePathRef.current) return
        try {
          const rawSerialized = (ed.storage as any).markdown.getMarkdown() as string
          const cleanMd = postprocessMarkdownFromEditor(rawSerialized)
          lastSavedMarkdownRef.current = cleanMd
          lastInternalEditTimeRef.current = Date.now()
          setRawMarkdown(cleanMd)
          setSaveStatus('saving')
          onSaveContentRef.current(activeNotePathRef.current, cleanMd)
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
      handleKeyDown: (_view, event) => {
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
          flushPendingSave()
          return true
        }
        return false
      }
    }
  })

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
      flushPendingSave()
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
      flushPendingSave()
      activeNotePathRef.current = null
      lastSavedMarkdownRef.current = ''
      setRawMarkdown('')
      setNoteTitleInput('')
      return
    }

    if (activeNotePathRef.current !== activeNote.relativePath) {
      flushPendingSave()
      activeNotePathRef.current = activeNote.relativePath
      lastSavedMarkdownRef.current = activeNote.content
      setNoteTitleInput(activeNote.name)
      setRawMarkdown(activeNote.content)
      setWikiSuggest(null)
      setHoverPreview(null)
      setContextMenuPos(null)
      setActiveLinkEdit(null)

      if (editor) {
        isInternalUpdateRef.current = true
        const prepared = preprocessMarkdownForEditor(activeNote.content)
        editor.commands.setContent(prepared, false)
        isInternalUpdateRef.current = false
      }
      return
    }

    // Same note path: check if name or external content changed on disk
    setNoteTitleInput((prev) => (prev !== activeNote.name ? activeNote.name : prev))

    const isExternalModification =
      activeNote.content !== lastSavedMarkdownRef.current &&
      Date.now() - lastInternalEditTimeRef.current > 600

    if (isExternalModification) {
      lastSavedMarkdownRef.current = activeNote.content
      setRawMarkdown(activeNote.content)
      if (editor) {
        isInternalUpdateRef.current = true
        const prepared = preprocessMarkdownForEditor(activeNote.content)
        editor.commands.setContent(prepared, false)
        isInternalUpdateRef.current = false
      }
    }
  }, [activeNote, editor])

  // Update visual styling of existing vs non-existing [[WikiLinks]] in DOM
  useEffect(() => {
    if (!editor) return
    syncWikiLinkMissingClasses(editor.view.dom)
  }, [editor, rawMarkdown, allNotes, syncWikiLinkMissingClasses])

  const handleSelectWikiSuggestion = useCallback(
    (targetNoteTitle: string, alias?: string) => {
      if (!editor) return
      if (wikiSuggest) {
        editor
          .chain()
          .focus()
          .deleteRange({ from: wikiSuggest.rangeFrom, to: wikiSuggest.rangeTo })
          .insertWikiLink({ target: targetNoteTitle, alias })
          .run()
      } else {
        editor.chain().focus().insertWikiLink({ target: targetNoteTitle, alias }).run()
      }
      setWikiSuggest(null)
    },
    [editor, wikiSuggest]
  )

  const handleOpenWikiPickerFromToolbar = (): void => {
    if (!editor) return
    const { from, to, $from } = editor.state.selection
    const coords = editor.view.coordsAtPos(from)

    // If text is selected, use the selected text as initialAlias and replace the selection range
    if (from !== to) {
      const selectedText = editor.state.doc
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
    if (!editor) return
    if (isSourceMode) {
      // Switching from Raw Markdown back to WYSIWYG
      isInternalUpdateRef.current = true
      editor.commands.setContent(preprocessMarkdownForEditor(rawMarkdown), false)
      isInternalUpdateRef.current = false
      setIsSourceMode(false)
    } else {
      // Switching from WYSIWYG to Raw Markdown
      const serialized = (editor.storage as any).markdown.getMarkdown() as string
      setRawMarkdown(postprocessMarkdownFromEditor(serialized))
      setIsSourceMode(true)
    }
  }

  const handleRawMarkdownChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    const nextMd = e.target.value
    setRawMarkdown(nextMd)
    setSaveStatus('typing')

    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = window.setTimeout(() => {
      if (activeNotePathRef.current) {
        lastSavedMarkdownRef.current = nextMd
        lastInternalEditTimeRef.current = Date.now()
        setSaveStatus('saving')
        onSaveContentRef.current(activeNotePathRef.current, nextMd)
        window.setTimeout(() => setSaveStatus('saved'), 350)
      }
    }, 2000)
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
            alt="Notes-MD"
            className="w-full h-full object-contain select-none pointer-events-none drop-shadow-xs"
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
  const resolvedHoverNote = hoverPreview
    ? resolveWikiLinkTarget(hoverPreview.targetName, allNotes)
    : undefined
  const resolvedHoverMeta = resolvedHoverNote
    ? vaultIndex[resolvedHoverNote.relativePath]
    : undefined

  const maxWidthClass =
    settings.pageWidth === 'standard'
      ? 'max-w-3xl'
      : settings.pageWidth === 'wide'
        ? 'max-w-5xl'
        : 'max-w-full'

  const fontClass =
    settings.fontFamily === 'serif'
      ? 'font-serif'
      : settings.fontFamily === 'mono'
        ? 'font-mono'
        : 'font-sans'

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full bg-surface-canvas overflow-hidden">
      {/* Top Rich WYSIWYG Toolbar (inspired by reference image) */}
      <EditorToolbar
        editor={editor}
        isSourceMode={isSourceMode}
        onToggleSourceMode={handleToggleSourceMode}
        isZenMode={isZenMode}
        onToggleZenMode={onToggleZenMode}
        onOpenWikiLinkPicker={handleOpenWikiPickerFromToolbar}
        onOpenHelpModal={onOpenHelpModal}
        baseFontSize={settings.baseFontSize}
        onChangeBaseFontSize={(newSize) => onUpdateSettings({ baseFontSize: newSize })}
      />

      {/* Scrollable Document Canvas */}
      <div
        className={`flex-1 overflow-y-auto ${
          settings.canvasStyle === 'paper' ? 'px-6 py-6 md:px-10 md:py-8' : 'px-0 py-0'
        }`}
      >
        <div
          style={
            {
              '--editor-font-size': `${settings.baseFontSize}px`,
              '--editor-line-height': String(settings.lineHeight)
            } as React.CSSProperties
          }
          className={`mx-auto transition-all duration-200 ${maxWidthClass} ${fontClass} ${
            settings.canvasStyle === 'paper'
              ? 'bg-surface-bg border border-surface-border rounded-xl document-paper-shadow px-8 py-8 md:px-14 md:py-10 min-h-full'
              : 'bg-surface-bg px-8 py-8 md:px-14 md:py-10 min-h-full'
          }`}
        >
          {/* Document Header: Breadcrumb & Editable Note Title */}
          <div className="flex items-center justify-between gap-2 pb-4 mb-5 border-b border-surface-border/70">
            <div className="flex items-center gap-2 text-xs text-content-muted min-w-0 flex-1">
              <FolderOpen className="w-3.5 h-3.5 text-accent shrink-0" />
              <span className="truncate">{activeNote.relativePath}</span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <input
                type="text"
                value={noteTitleInput}
                onChange={(e) => setNoteTitleInput(e.target.value)}
                onBlur={() => {
                  if (noteTitleInput.trim() && noteTitleInput.trim() !== activeNote.name) {
                    onRenameActiveNote(noteTitleInput.trim())
                  } else {
                    setNoteTitleInput(activeNote.name)
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    ;(e.target as HTMLInputElement).blur()
                  }
                }}
                title="Renomear arquivo da nota (atualiza todos os [[WikiLinks]] automaticamente)"
                className="text-right text-xs font-medium px-2 py-1 rounded-md bg-transparent hover:bg-surface-secondary focus:bg-surface-secondary border border-transparent focus:border-accent text-content-secondary focus:text-content-primary focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Editor Surface: WYSIWYG vs Raw Markdown Source */}
          {isSourceMode ? (
            <textarea
              value={rawMarkdown}
              onChange={handleRawMarkdownChange}
              onKeyDown={(e) => {
                const nativeEvent = e.nativeEvent
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
                  flushPendingSave()
                  return
                }
              }}
              spellCheck={settings.spellcheck}
              placeholder="Escreva em Markdown puro..."
              className="w-full min-h-[620px] bg-transparent text-content-primary font-mono text-sm leading-relaxed focus:outline-none resize-none"
            />
          ) : (
            <div
              onClick={handleEditorClick}
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
          <input
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
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => window.electronAPI.openExternal(activeLinkEdit.href)}
              title="Abrir link no navegador (ou Ctrl+Clique)"
              className="p-1.5 rounded-md text-accent hover:bg-accent-soft transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              editor.chain().focus().extendMarkRange('link').unsetLink().run()
              setActiveLinkEdit(null)
            }}
            title="Remover link"
            className="p-1.5 rounded-md text-rose-500 hover:bg-rose-500/10 transition-colors"
          >
            <Unlink className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Right-Click & Selection Quick Text Tools Context Menu (Windows style with submenus) */}
      {contextMenuPos && editor && (
        <EditorContextMenu
          editor={editor}
          position={contextMenuPos}
          onClose={() => setContextMenuPos(null)}
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
        />
      )}

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
      <div className="h-7 px-4 bg-surface-bg border-t border-surface-border flex items-center justify-between text-[11px] text-content-muted select-none shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-mono text-content-secondary">{activeNodePath}</span>
          <span className="hidden sm:inline text-surface-border">|</span>
          <span className="hidden sm:inline">
            Digite <code className="px-1 py-0.5 rounded bg-surface-secondary text-accent">[[</code> para conectar notas
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-content-secondary">
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
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />~{readingTimeMin} min de leitura
          </span>
          <span className="font-medium text-content-primary">{wordCount} palavras</span>
        </div>
      </div>
    </div>
  )
}
