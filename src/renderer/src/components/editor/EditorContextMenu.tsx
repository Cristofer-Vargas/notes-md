import React, { useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Highlighter,
  Type,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Pilcrow,
  MessageSquareQuote,
  Code2,
  List,
  ListOrdered,
  CheckSquare,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Table as TableIcon,
  FileSymlink,
  Minus,
  RemoveFormatting,
  Scissors,
  Copy,
  ClipboardPaste,
  ChevronRight,
  Plus,
  Trash2,
  CaseSensitive,
  Workflow,
  Check,
  EyeOff,
  Sparkles
} from 'lucide-react'
import { HIGHLIGHT_COLORS, TEXT_COLORS } from './EditorToolbar'
import { generateFallbackSuggestions } from '../../services/spellcheckService'

export interface EditorContextMenuPosition {
  x: number
  y: number
  selectionBottom?: number
  trigger?: 'contextmenu' | 'selection'
}

interface EditorContextMenuProps {
  editor: Editor | null
  position: EditorContextMenuPosition | null
  targetWordRange?: { from: number; to: number; word: string } | null
  spellSuggestions?: {
    misspelledWord: string
    suggestions: string[]
  } | null
  ignoredWords?: string[]
  isInsideCode?: boolean
  onClearSpellSuggestions?: () => void
  onAddIgnoredWord?: (word: string) => void
  onClose: () => void
  onOpenWikiLinkPicker: () => void
}

type SubmenuId =
  | null
  | 'format'
  | 'headings'
  | 'colors'
  | 'lists'
  | 'insert'
  | 'table'

export const EditorContextMenu: React.FC<EditorContextMenuProps> = ({
  editor,
  position,
  targetWordRange,
  spellSuggestions,
  ignoredWords,
  isInsideCode = false,
  onClearSpellSuggestions,
  onAddIgnoredWord,
  onClose,
  onOpenWikiLinkPicker
}) => {
  const [activeSubmenu, setActiveSubmenu] = useState<SubmenuId>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setActiveSubmenu(null)
  }, [position])

  useEffect(() => {
    if (!position) return
    const handleMouseDown = (e: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [position, onClose])

  if (!editor || !position) return null

  const selectedText =
    editor.state.selection.from !== editor.state.selection.to
      ? editor.state.doc
          .textBetween(editor.state.selection.from, editor.state.selection.to, ' ')
          .trim()
      : ''

  const rawWord =
    spellSuggestions?.misspelledWord ||
    targetWordRange?.word ||
    (selectedText && !selectedText.includes(' ') ? selectedText : '')

  const activeWord = rawWord.replace(/^[\s.,;:!?()[\]{}"'`]+|[\s.,;:!?()[\]{}"'`]+$/g, '')
  const isIgnored = Boolean(activeWord && ignoredWords?.includes(activeWord))

  const rawSuggestions = spellSuggestions?.suggestions || []
  const nativeSuggestions = activeWord
    ? window.electronAPI?.getWordSuggestions?.(activeWord) || []
    : []
  const fallbackSuggestions = activeWord ? generateFallbackSuggestions(activeWord) : []
  const combinedSuggestions = Array.from(
    new Set([...rawSuggestions, ...nativeSuggestions, ...fallbackSuggestions])
  ).filter((s) => s.toLowerCase() !== activeWord.toLowerCase())

  const isMisspelledByApi = activeWord
    ? Boolean(window.electronAPI?.isWordMisspelled?.(activeWord))
    : false

  const hasTypo = Boolean(
    activeWord &&
      activeWord.length >= 2 &&
      !isIgnored &&
      !isInsideCode &&
      (isMisspelledByApi ||
        combinedSuggestions.length > 0 ||
        nativeSuggestions.length > 0 ||
        Boolean(spellSuggestions?.misspelledWord))
  )

  const showSpellSection = Boolean(activeWord && activeWord.length >= 2 && !isInsideCode)

  const handleApplySuggestion = (sug: string): void => {
    let replaced = false

    // 1. If we have the exact document range from right-click
    if (targetWordRange && targetWordRange.from < targetWordRange.to) {
      editor
        .chain()
        .focus()
        .insertContentAt({ from: targetWordRange.from, to: targetWordRange.to }, sug)
        .run()
      replaced = true
    }

    // 2. If range was not exact, search in current selection or document text nodes
    if (!replaced && activeWord) {
      const { from, to } = editor.state.selection
      const sel = editor.state.doc.textBetween(from, to, ' ').trim()
      if (sel === activeWord) {
        editor.chain().focus().insertContentAt({ from, to }, sug).run()
        replaced = true
      } else {
        editor.state.doc.descendants((node, pos) => {
          if (replaced || !node.isText || !node.text) return
          const idx = node.text.indexOf(activeWord)
          if (idx !== -1) {
            const start = pos + idx
            const end = start + activeWord.length
            editor.chain().focus().insertContentAt({ from: start, to: end }, sug).run()
            replaced = true
          }
        })
      }
    }

    // 3. Inform Electron native spellchecker
    window.electronAPI?.replaceMisspelling?.(sug)?.catch?.(() => {})

    onClearSpellSuggestions?.()
    onClose()
  }

  const handleAddWordToDict = (word: string): void => {
    const clean = word.trim()
    if (!clean) return
    onAddIgnoredWord?.(clean)
    window.electronAPI?.addWordToDictionary(clean).catch(() => {})
    onClearSpellSuggestions?.()
    onClose()
  }

  const handleIgnoreWord = (word: string): void => {
    const clean = word.trim()
    if (!clean) return
    onAddIgnoredWord?.(clean)
    window.electronAPI?.addWordToDictionary(clean).catch(() => {})
    onClearSpellSuggestions?.()
    onClose()
  }

  const menuWidth = 248
  const menuHeight = 360
  const openSubmenuOnLeft = position.x + menuWidth + 230 > window.innerWidth
  const safeLeft = Math.min(Math.max(8, position.x), window.innerWidth - menuWidth - 12)

  let computedTop = position.y
  if (position.trigger === 'selection') {
    const aboveTop = position.y - menuHeight - 10
    if (aboveTop >= 52) {
      computedTop = aboveTop
    } else {
      computedTop = Math.min(
        (position.selectionBottom ?? position.y + 24) + 10,
        window.innerHeight - menuHeight - 12
      )
    }
  }
  const safeTop = Math.min(Math.max(8, computedTop), window.innerHeight - menuHeight - 12)

  const runAction = (fn: () => void): void => {
    fn()
    onClose()
  }

  const transformSelectedCase = (mode: 'upper' | 'lower' | 'capitalize'): void => {
    const { from, to } = editor.state.selection
    if (from === to) {
      onClose()
      return
    }
    const selectedText = editor.state.doc.textBetween(from, to, ' ')
    let transformed = selectedText
    if (mode === 'upper') transformed = selectedText.toUpperCase()
    if (mode === 'lower') transformed = selectedText.toLowerCase()
    if (mode === 'capitalize') {
      transformed = selectedText.replace(/\b\w/g, (c) => c.toUpperCase())
    }
    editor.chain().focus().insertContentAt({ from, to }, transformed).run()
    onClose()
  }

  const handleCopy = async (): Promise<void> => {
    const { from, to } = editor.state.selection
    if (from !== to) {
      const text = editor.state.doc.textBetween(from, to, '\n')
      await navigator.clipboard.writeText(text)
    }
    onClose()
  }

  const handleCut = async (): Promise<void> => {
    const { from, to } = editor.state.selection
    if (from !== to) {
      const text = editor.state.doc.textBetween(from, to, '\n')
      await navigator.clipboard.writeText(text)
      editor.chain().focus().deleteSelection().run()
    }
    onClose()
  }

  const handlePaste = async (): Promise<void> => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) {
        editor.chain().focus().insertContent(text).run()
      }
    } catch {
      // ignore clipboard error
    }
    onClose()
  }

  const submenuPositionClass = openSubmenuOnLeft
    ? 'right-full mr-1 top-0'
    : 'left-full ml-1 top-0'

  return (
    <div
      ref={menuRef}
      style={{ top: safeTop, left: safeLeft, width: menuWidth }}
      onContextMenu={(e) => e.preventDefault()}
      className="fixed z-50 rounded-xl border border-surface-border bg-surface-bg/98 backdrop-blur-md shadow-2xl p-1.5 select-none animate-in fade-in zoom-in-95 duration-100"
    >
      {/* Seção de Ortografia e Dicionário */}
      {showSpellSection && (
        <div
          className={`mb-1.5 p-1.5 rounded-lg border transition-colors ${
            hasTypo
              ? 'bg-rose-500/10 border-rose-500/25'
              : 'bg-surface-secondary border-surface-border/70'
          }`}
        >
          <div
            className={`px-1 py-0.5 text-[10px] font-bold flex items-center justify-between ${
              hasTypo ? 'text-rose-500' : 'text-content-secondary'
            }`}
          >
            <span className="flex items-center gap-1.5 truncate">
              <Sparkles
                className={`w-3.5 h-3.5 shrink-0 ${hasTypo ? 'text-rose-500' : 'text-accent'}`}
              />
              <span className="truncate">Ortografia: &ldquo;{activeWord}&rdquo;</span>
            </span>
            {isIgnored && (
              <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/15 text-amber-500 font-medium shrink-0 ml-1">
                Ignorada
              </span>
            )}
          </div>

          <div className="space-y-0.5 mt-1">
            {combinedSuggestions.length > 0 ? (
              combinedSuggestions.slice(0, 5).map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleApplySuggestion(sug)}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs font-medium text-content-primary hover:bg-emerald-500/15 hover:text-emerald-700 dark:hover:text-emerald-300 text-left transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="truncate font-semibold">{sug}</span>
                  </div>
                  <span className="text-[10px] text-content-muted group-hover:text-emerald-600 dark:group-hover:text-emerald-400 font-normal shrink-0 ml-1">
                    Corrigir
                  </span>
                </button>
              ))
            ) : hasTypo ? (
              <div className="px-2 py-1 text-[11px] text-content-muted italic">
                Nenhuma sugestão automática
              </div>
            ) : null}

            <div
              className={`pt-1 mt-1 grid grid-cols-2 gap-1 ${
                combinedSuggestions.length > 0 || hasTypo ? 'border-t border-surface-border/60' : ''
              }`}
            >
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleAddWordToDict(activeWord)}
                title="Adicionar termo ao dicionário permanente"
                className="flex items-center justify-center gap-1 px-1.5 py-1 rounded text-[10.5px] font-medium text-content-secondary hover:text-content-primary hover:bg-surface-secondary text-center transition-colors"
              >
                <Plus className="w-3 h-3 text-accent shrink-0" />
                <span>+ Dicionário</span>
              </button>

              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleIgnoreWord(activeWord)}
                title="Ignorar esta palavra para não sublinhar como erro"
                className="flex items-center justify-center gap-1 px-1.5 py-1 rounded text-[10.5px] font-medium text-content-secondary hover:text-content-primary hover:bg-surface-secondary text-center transition-colors"
              >
                <EyeOff className="w-3 h-3 text-amber-500 shrink-0" />
                <span>Ignorar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Quick Mini-Bar (1-Click Basic Formatting) */}
      <div className="flex items-center justify-between gap-0.5 px-1 py-1 mb-1 rounded-lg bg-surface-secondary border border-surface-border/60">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => runAction(() => editor.chain().focus().toggleBold().run())}
          title="Negrito (Ctrl+B)"
          className={`p-1.5 rounded-md transition-colors ${
            editor.isActive('bold')
              ? 'bg-accent text-white'
              : 'text-content-secondary hover:bg-surface-tertiary hover:text-content-primary'
          }`}
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => runAction(() => editor.chain().focus().toggleItalic().run())}
          title="Itálico (Ctrl+I)"
          className={`p-1.5 rounded-md transition-colors ${
            editor.isActive('italic')
              ? 'bg-accent text-white'
              : 'text-content-secondary hover:bg-surface-tertiary hover:text-content-primary'
          }`}
        >
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => runAction(() => editor.chain().focus().toggleUnderline().run())}
          title="Sublinhado (Ctrl+U)"
          className={`p-1.5 rounded-md transition-colors ${
            editor.isActive('underline')
              ? 'bg-accent text-white'
              : 'text-content-secondary hover:bg-surface-tertiary hover:text-content-primary'
          }`}
        >
          <UnderlineIcon className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => runAction(() => editor.chain().focus().toggleStrike().run())}
          title="Tachado"
          className={`p-1.5 rounded-md transition-colors ${
            editor.isActive('strike')
              ? 'bg-accent text-white'
              : 'text-content-secondary hover:bg-surface-tertiary hover:text-content-primary'
          }`}
        >
          <Strikethrough className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() =>
            runAction(() => editor.chain().focus().toggleHighlight({ color: '#fef08a' }).run())
          }
          title="Destacar texto (Marca-texto)"
          className={`p-1.5 rounded-md transition-colors ${
            editor.isActive('highlight')
              ? 'bg-amber-300 text-slate-900'
              : 'text-content-secondary hover:bg-surface-tertiary hover:text-content-primary'
          }`}
        >
          <Highlighter className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => runAction(() => editor.chain().focus().unsetAllMarks().clearNodes().run())}
          title="Limpar Formatação"
          className="p-1.5 rounded-md text-content-secondary hover:bg-surface-tertiary hover:text-content-primary transition-colors"
        >
          <RemoveFormatting className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 1. Submenu: Formatar Texto ▸ */}
      <div
        className="relative"
        onMouseEnter={() => setActiveSubmenu('format')}
      >
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setActiveSubmenu((prev) => (prev === 'format' ? null : 'format'))}
          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
            activeSubmenu === 'format'
              ? 'bg-accent-soft text-accent font-medium'
              : 'text-content-primary hover:bg-surface-secondary'
          }`}
        >
          <span className="flex items-center gap-2">
            <Type className="w-3.5 h-3.5 text-accent" />
            <span>Formatar Texto</span>
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-content-muted" />
        </button>

        {activeSubmenu === 'format' && (
          <div
            className={`absolute ${submenuPositionClass} w-52 rounded-xl border border-surface-border bg-surface-bg shadow-2xl p-1.5 space-y-0.5 z-50`}
          >
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => runAction(() => editor.chain().focus().toggleBold().run())}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-content-primary hover:bg-surface-secondary"
            >
              <span className="flex items-center gap-2">
                <Bold className="w-3.5 h-3.5 text-accent" /> Negrito
              </span>
              <span className="text-[10px] text-content-muted">Ctrl+B</span>
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => runAction(() => editor.chain().focus().toggleItalic().run())}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-content-primary hover:bg-surface-secondary"
            >
              <span className="flex items-center gap-2">
                <Italic className="w-3.5 h-3.5 text-accent" /> Itálico
              </span>
              <span className="text-[10px] text-content-muted">Ctrl+I</span>
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => runAction(() => editor.chain().focus().toggleUnderline().run())}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-content-primary hover:bg-surface-secondary"
            >
              <span className="flex items-center gap-2">
                <UnderlineIcon className="w-3.5 h-3.5 text-accent" /> Sublinhado
              </span>
              <span className="text-[10px] text-content-muted">Ctrl+U</span>
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => runAction(() => editor.chain().focus().toggleStrike().run())}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-content-primary hover:bg-surface-secondary"
            >
              <Strikethrough className="w-3.5 h-3.5 text-accent" /> Tachado
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => runAction(() => editor.chain().focus().toggleCode().run())}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-content-primary hover:bg-surface-secondary"
            >
              <Code2 className="w-3.5 h-3.5 text-accent" /> Código Inline
            </button>
            <div className="h-px bg-surface-border my-1" />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => transformSelectedCase('upper')}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-content-primary hover:bg-surface-secondary"
            >
              <CaseSensitive className="w-3.5 h-3.5 text-accent" /> MAIÚSCULAS
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => transformSelectedCase('lower')}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-content-primary hover:bg-surface-secondary"
            >
              <CaseSensitive className="w-3.5 h-3.5 text-accent" /> minúsculas
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => transformSelectedCase('capitalize')}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-content-primary hover:bg-surface-secondary"
            >
              <CaseSensitive className="w-3.5 h-3.5 text-accent" /> Capitalizar Palavras
            </button>
          </div>
        )}
      </div>

      {/* 2. Submenu: Títulos e Blocos ▸ */}
      <div
        className="relative"
        onMouseEnter={() => setActiveSubmenu('headings')}
      >
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setActiveSubmenu((prev) => (prev === 'headings' ? null : 'headings'))}
          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
            activeSubmenu === 'headings'
              ? 'bg-accent-soft text-accent font-medium'
              : 'text-content-primary hover:bg-surface-secondary'
          }`}
        >
          <span className="flex items-center gap-2">
            <Heading1 className="w-3.5 h-3.5 text-accent" />
            <span>Títulos e Blocos</span>
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-content-muted" />
        </button>

        {activeSubmenu === 'headings' && (
          <div
            className={`absolute ${submenuPositionClass} w-52 rounded-xl border border-surface-border bg-surface-bg shadow-2xl p-1.5 space-y-0.5 z-50`}
          >
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => runAction(() => editor.chain().focus().setParagraph().run())}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-content-primary hover:bg-surface-secondary"
            >
              <Pilcrow className="w-3.5 h-3.5 text-accent" /> Parágrafo Normal
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() =>
                runAction(() => editor.chain().focus().toggleHeading({ level: 1 }).run())
              }
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold text-content-primary hover:bg-surface-secondary"
            >
              <Heading1 className="w-3.5 h-3.5 text-accent" /> Título 1 (H1)
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() =>
                runAction(() => editor.chain().focus().toggleHeading({ level: 2 }).run())
              }
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-content-primary hover:bg-surface-secondary"
            >
              <Heading2 className="w-3.5 h-3.5 text-accent" /> Título 2 (H2)
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() =>
                runAction(() => editor.chain().focus().toggleHeading({ level: 3 }).run())
              }
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-content-primary hover:bg-surface-secondary"
            >
              <Heading3 className="w-3.5 h-3.5 text-accent" /> Título 3 (H3)
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() =>
                runAction(() => editor.chain().focus().toggleHeading({ level: 4 }).run())
              }
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-content-primary hover:bg-surface-secondary"
            >
              <Heading4 className="w-3.5 h-3.5 text-accent" /> Título 4 (H4)
            </button>
            <div className="h-px bg-surface-border my-1" />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => runAction(() => editor.chain().focus().toggleBlockquote().run())}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-content-primary hover:bg-surface-secondary"
            >
              <MessageSquareQuote className="w-3.5 h-3.5 text-accent" /> Citação (Blockquote)
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => runAction(() => editor.chain().focus().toggleCodeBlock().run())}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-content-primary hover:bg-surface-secondary"
            >
              <Code2 className="w-3.5 h-3.5 text-accent" /> Bloco de Código
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() =>
                runAction(() => editor.chain().focus().setCodeBlock({ language: 'mermaid' }).run())
              }
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-emerald-400 hover:bg-surface-secondary font-medium"
            >
              <Workflow className="w-3.5 h-3.5 text-emerald-400" /> Diagrama Mermaid (Obsidian)
            </button>
          </div>
        )}
      </div>

      {/* 3. Submenu: Destaques e Cores ▸ */}
      <div
        className="relative"
        onMouseEnter={() => setActiveSubmenu('colors')}
      >
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setActiveSubmenu((prev) => (prev === 'colors' ? null : 'colors'))}
          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
            activeSubmenu === 'colors'
              ? 'bg-accent-soft text-accent font-medium'
              : 'text-content-primary hover:bg-surface-secondary'
          }`}
        >
          <span className="flex items-center gap-2">
            <Highlighter className="w-3.5 h-3.5 text-accent" />
            <span>Destaques e Cores</span>
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-content-muted" />
        </button>

        {activeSubmenu === 'colors' && (
          <div
            className={`absolute ${submenuPositionClass} w-56 rounded-xl border border-surface-border bg-surface-bg shadow-2xl p-2 space-y-2 z-50`}
          >
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-content-muted px-1 mb-1">
                Marca-texto (Highlight)
              </div>
              <div className="grid grid-cols-3 gap-1">
                {HIGHLIGHT_COLORS.map((h) => (
                  <button
                    key={h.color}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() =>
                      runAction(() =>
                        editor.chain().focus().toggleHighlight({ color: h.color }).run()
                      )
                    }
                    title={h.name}
                    className="h-6 rounded border border-black/10 text-[11px] font-bold text-slate-900 hover:scale-105 transition-transform"
                    style={{ backgroundColor: h.color }}
                  >
                    Aa
                  </button>
                ))}
              </div>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => runAction(() => editor.chain().focus().unsetHighlight().run())}
                className="w-full mt-1 py-1 text-[11px] text-content-secondary hover:bg-surface-secondary rounded"
              >
                Remover destaque
              </button>
            </div>

            <div className="h-px bg-surface-border" />

            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-content-muted px-1 mb-1">
                Cor da Fonte
              </div>
              <div className="space-y-0.5">
                {TEXT_COLORS.map((item) => (
                  <button
                    key={item.name}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() =>
                      runAction(() => {
                        if (item.color) {
                          editor.chain().focus().setColor(item.color).run()
                        } else {
                          editor.chain().focus().unsetColor().run()
                        }
                      })
                    }
                    className="w-full flex items-center gap-2 px-2 py-1 rounded text-xs text-content-primary hover:bg-surface-secondary"
                  >
                    <span
                      className="w-3 h-3 rounded-full border border-surface-border"
                      style={{ backgroundColor: item.color || 'var(--text-primary)' }}
                    />
                    <span>{item.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Submenu: Listas e Alinhamento ▸ */}
      <div
        className="relative"
        onMouseEnter={() => setActiveSubmenu('lists')}
      >
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setActiveSubmenu((prev) => (prev === 'lists' ? null : 'lists'))}
          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
            activeSubmenu === 'lists'
              ? 'bg-accent-soft text-accent font-medium'
              : 'text-content-primary hover:bg-surface-secondary'
          }`}
        >
          <span className="flex items-center gap-2">
            <List className="w-3.5 h-3.5 text-accent" />
            <span>Listas e Alinhamento</span>
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-content-muted" />
        </button>

        {activeSubmenu === 'lists' && (
          <div
            className={`absolute ${submenuPositionClass} w-52 rounded-xl border border-surface-border bg-surface-bg shadow-2xl p-1.5 space-y-0.5 z-50`}
          >
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => runAction(() => editor.chain().focus().toggleBulletList().run())}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-content-primary hover:bg-surface-secondary"
            >
              <List className="w-3.5 h-3.5 text-accent" /> Lista com Marcadores
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => runAction(() => editor.chain().focus().toggleOrderedList().run())}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-content-primary hover:bg-surface-secondary"
            >
              <ListOrdered className="w-3.5 h-3.5 text-accent" /> Lista Numerada
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => runAction(() => editor.chain().focus().toggleTaskList().run())}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-content-primary hover:bg-surface-secondary"
            >
              <CheckSquare className="w-3.5 h-3.5 text-accent" /> Checklist de Tarefas
            </button>
            <div className="h-px bg-surface-border my-1" />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => runAction(() => editor.chain().focus().setTextAlign('left').run())}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-content-primary hover:bg-surface-secondary"
            >
              <AlignLeft className="w-3.5 h-3.5 text-accent" /> Alinhar à Esquerda
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => runAction(() => editor.chain().focus().setTextAlign('center').run())}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-content-primary hover:bg-surface-secondary"
            >
              <AlignCenter className="w-3.5 h-3.5 text-accent" /> Centralizar
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => runAction(() => editor.chain().focus().setTextAlign('right').run())}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-content-primary hover:bg-surface-secondary"
            >
              <AlignRight className="w-3.5 h-3.5 text-accent" /> Alinhar à Direita
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => runAction(() => editor.chain().focus().setTextAlign('justify').run())}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-content-primary hover:bg-surface-secondary"
            >
              <AlignJustify className="w-3.5 h-3.5 text-accent" /> Justificar
            </button>
          </div>
        )}
      </div>

      {/* 5. Submenu: Inserir / Tabelas ▸ */}
      <div
        className="relative"
        onMouseEnter={() => setActiveSubmenu('insert')}
      >
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setActiveSubmenu((prev) => (prev === 'insert' ? null : 'insert'))}
          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
            activeSubmenu === 'insert'
              ? 'bg-accent-soft text-accent font-medium'
              : 'text-content-primary hover:bg-surface-secondary'
          }`}
        >
          <span className="flex items-center gap-2">
            <TableIcon className="w-3.5 h-3.5 text-accent" />
            <span>Inserir e Tabelas</span>
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-content-muted" />
        </button>

        {activeSubmenu === 'insert' && (
          <div
            className={`absolute ${submenuPositionClass} w-56 rounded-xl border border-surface-border bg-surface-bg shadow-2xl p-1.5 space-y-0.5 z-50`}
          >
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() =>
                runAction(() =>
                  editor
                    .chain()
                    .focus()
                    .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                    .run()
                )
              }
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-content-primary hover:bg-surface-secondary"
            >
              <Plus className="w-3.5 h-3.5 text-accent" /> Inserir Tabela (3×3)
            </button>
            {editor.isActive('table') && (
              <>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => runAction(() => editor.chain().focus().addRowAfter().run())}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-content-secondary hover:bg-surface-secondary"
                >
                  + Adicionar Linha Abaixo
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => runAction(() => editor.chain().focus().addColumnAfter().run())}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-content-secondary hover:bg-surface-secondary"
                >
                  + Adicionar Coluna à Direita
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => runAction(() => editor.chain().focus().deleteRow().run())}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-content-secondary hover:bg-surface-secondary"
                >
                  − Remover Linha Atual
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => runAction(() => editor.chain().focus().deleteColumn().run())}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-content-secondary hover:bg-surface-secondary"
                >
                  − Remover Coluna Atual
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => runAction(() => editor.chain().focus().deleteTable().run())}
                  className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-rose-500 hover:bg-rose-500/10"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Excluir Tabela
                </button>
              </>
            )}
            <div className="h-px bg-surface-border my-1" />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => runAction(() => editor.chain().focus().setHorizontalRule().run())}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-content-primary hover:bg-surface-secondary"
            >
              <Minus className="w-3.5 h-3.5 text-accent" /> Linha Divisória (---)
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => runAction(() => editor.chain().focus().toggleCodeBlock().run())}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-content-primary hover:bg-surface-secondary"
            >
              <Code2 className="w-3.5 h-3.5 text-accent" /> Bloco de Código
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() =>
                runAction(() => editor.chain().focus().setCodeBlock({ language: 'mermaid' }).run())
              }
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-emerald-400 hover:bg-surface-secondary font-medium"
            >
              <Workflow className="w-3.5 h-3.5 text-emerald-400" /> Diagrama Mermaid (Obsidian)
            </button>
          </div>
        )}
      </div>

      {/* Direct Action: Conectar Nota [[WikiLink]] */}
      <button
        type="button"
        onMouseEnter={() => setActiveSubmenu(null)}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => runAction(onOpenWikiLinkPicker)}
        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-accent hover:bg-accent-soft transition-colors"
      >
        <span className="flex items-center gap-2">
          <FileSymlink className="w-3.5 h-3.5" />
          <span>Conectar Nota [[WikiLink]]</span>
        </span>
        <span className="text-[10px] opacity-75">[[</span>
      </button>

      <div className="h-px bg-surface-border my-1" />

      {/* Clipboard Actions */}
      <button
        type="button"
        onMouseEnter={() => setActiveSubmenu(null)}
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleCut}
        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-content-primary hover:bg-surface-secondary transition-colors"
      >
        <span className="flex items-center gap-2">
          <Scissors className="w-3.5 h-3.5 text-content-muted" />
          <span>Recortar</span>
        </span>
        <span className="text-[10px] text-content-muted">Ctrl+X</span>
      </button>
      <button
        type="button"
        onMouseEnter={() => setActiveSubmenu(null)}
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleCopy}
        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-content-primary hover:bg-surface-secondary transition-colors"
      >
        <span className="flex items-center gap-2">
          <Copy className="w-3.5 h-3.5 text-content-muted" />
          <span>Copiar</span>
        </span>
        <span className="text-[10px] text-content-muted">Ctrl+C</span>
      </button>
      <button
        type="button"
        onMouseEnter={() => setActiveSubmenu(null)}
        onMouseDown={(e) => e.preventDefault()}
        onClick={handlePaste}
        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-content-primary hover:bg-surface-secondary transition-colors"
      >
        <span className="flex items-center gap-2">
          <ClipboardPaste className="w-3.5 h-3.5 text-content-muted" />
          <span>Colar</span>
        </span>
        <span className="text-[10px] text-content-muted">Ctrl+V</span>
      </button>
    </div>
  )
}
