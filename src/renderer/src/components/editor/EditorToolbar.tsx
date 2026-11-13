import React, { useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { Input } from '../ui'
import { SelectionButton } from '../ui/SelectionButton'
import { BlockStyleSelect } from '../ui/BlockStyleSelect'
import {
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Highlighter,
  Palette,
  CaseSensitive,
  Link as LinkIcon,
  FileSymlink,
  Image as ImageIcon,
  Table as TableIcon,
  MessageSquareQuote,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  CheckSquare,
  Minus,
  RemoveFormatting,
  Code2,
  Workflow,
  FileCode,
  Maximize2,
  Minimize2,
  HelpCircle,
  ChevronDown,
  Plus,
  Trash2,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon
} from 'lucide-react'

interface EditorToolbarProps {
  editor: Editor | null
  isSourceMode: boolean
  onToggleSourceMode: () => void
  isZenMode: boolean
  onToggleZenMode: () => void
  onOpenWikiLinkPicker: () => void
  onOpenHelpModal: () => void
  baseFontSize: number
  onChangeBaseFontSize: (newSize: number) => void
}

export const HIGHLIGHT_COLORS = [
  { name: 'Amarelo Solar', color: '#fef08a' },
  { name: 'Laranja Quente', color: '#fed7aa' },
  { name: 'Rosa Coral', color: '#fecdd3' },
  { name: 'Verde Menta', color: '#bbf7d0' },
  { name: 'Azul Céu', color: '#bfdbfe' },
  { name: 'Lavanda', color: '#e9d5ff' }
]

export const TEXT_COLORS = [
  { name: 'Padrão', color: '' },
  { name: 'Azul Royal', color: '#2563eb' },
  { name: 'Roxo Obsidian', color: '#7c3aed' },
  { name: 'Esmeralda', color: '#059669' },
  { name: 'Âmbar', color: '#d97706' },
  { name: 'Carmesim', color: '#e11d48' },
  { name: 'Cinza Suave', color: '#64748b' }
]

interface ToolBtnProps {
  active?: boolean
  disabled?: boolean
  onClick: () => void
  title: string
  children: React.ReactNode
  className?: string
}

const ToolBtn: React.FC<ToolBtnProps> = ({
  active,
  disabled,
  onClick,
  title,
  children,
  className = ''
}) => (
  <SelectionButton
    type="button"
    disabled={disabled}
    onMouseDown={(e) => {
      // Prevent ProseMirror from losing selection/focus before click completes
      e.preventDefault()
    }}
    onClick={onClick}
    title={title}
    className={`p-1.5 rounded-sm text-xs font-medium transition-colors flex items-center justify-center ${
      active
        ? 'bg-accent-soft text-accent border border-accent-border'
        : 'text-content-secondary hover:bg-surface-tertiary hover:text-content-primary border border-transparent'
    } ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${className}`}
  >
    {children}
  </SelectionButton>
)

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  editor,
  isSourceMode,
  onToggleSourceMode,
  isZenMode,
  onToggleZenMode,
  onOpenWikiLinkPicker,
  onOpenHelpModal,
  baseFontSize,
  onChangeBaseFontSize
}) => {
  const [openDropdown, setOpenDropdown] = useState<
    null | 'highlight' | 'color' | 'typography' | 'align' | 'table' | 'link' | 'image'
  >(null)
  const [linkUrl, setLinkUrl] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const toolbarRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!openDropdown) return
    const handleOutsideMouseDown = (e: MouseEvent): void => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setOpenDropdown(null)
      }
    }
    window.addEventListener('mousedown', handleOutsideMouseDown)
    return () => window.removeEventListener('mousedown', handleOutsideMouseDown)
  }, [openDropdown])

  if (!editor) return null

  const toggleMenu = (menu: typeof openDropdown): void => {
    setOpenDropdown((prev) => (prev === menu ? null : menu))
  }

  const closeMenus = (): void => setOpenDropdown(null)

  const handleBlockChange = (value: string): void => {
    if (value === 'paragraph') {
      editor.chain().focus().setParagraph().run()
    } else if (value.startsWith('h')) {
      const level = Number(value.replace('h', '')) as 1 | 2 | 3 | 4 | 5 | 6
      editor.chain().focus().toggleHeading({ level }).run()
    } else if (value === 'blockquote') {
      editor.chain().focus().toggleBlockquote().run()
    } else if (value === 'mermaid') {
      editor.chain().focus().setCodeBlock({ language: 'mermaid' }).run()
    } else if (value === 'codeBlock') {
      editor.chain().focus().toggleCodeBlock().run()
    }
  }

  const transformSelectedCase = (mode: 'upper' | 'lower' | 'capitalize'): void => {
    const { from, to } = editor.state.selection
    if (from === to) {
      closeMenus()
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
    closeMenus()
  }

  const handleInsertLink = (e: React.FormEvent): void => {
    e.preventDefault()
    if (linkUrl.trim()) {
      const href =
        linkUrl.startsWith('http://') ||
        linkUrl.startsWith('https://') ||
        linkUrl.startsWith('mailto:')
          ? linkUrl.trim()
          : `https://${linkUrl.trim()}`
      editor.chain().focus().extendMarkRange('link').setLink({ href }).run()
    } else {
      editor.chain().focus().unsetLink().run()
    }
    setLinkUrl('')
    closeMenus()
  }

  const handleInsertImage = (e: React.FormEvent): void => {
    e.preventDefault()
    if (imageUrl.trim()) {
      editor.chain().focus().setImage({ src: imageUrl.trim() }).run()
    }
    setImageUrl('')
    closeMenus()
  }

  return (
    <div
      ref={toolbarRef}
      className="relative z-30 bg-surface-bg border-b border-surface-border px-3 py-1.5 flex flex-wrap items-center gap-1 select-none"
    >
      {/* Undo / Redo */}
      <ToolBtn
        onClick={() => editor.chain().focus().undo().run()}
        disabled={isSourceMode || !editor.can().undo()}
        title="Desfazer (Ctrl+Z)"
      >
        <Undo2 className="w-4 h-4" />
      </ToolBtn>
      <ToolBtn
        onClick={() => editor.chain().focus().redo().run()}
        disabled={isSourceMode || !editor.can().redo()}
        title="Refazer (Ctrl+Y)"
      >
        <Redo2 className="w-4 h-4" />
      </ToolBtn>

      <div className="h-5 w-px bg-surface-border mx-1" />

      {/* Block style */}
      <BlockStyleSelect
        disabled={isSourceMode}
          value={
            editor.isActive('heading', { level: 1 })
              ? 'h1'
              : editor.isActive('heading', { level: 2 })
                ? 'h2'
                : editor.isActive('heading', { level: 3 })
                  ? 'h3'
                  : editor.isActive('heading', { level: 4 })
                    ? 'h4'
                    : editor.isActive('heading', { level: 5 })
                      ? 'h5'
                      : editor.isActive('heading', { level: 6 })
                        ? 'h6'
                        : editor.isActive('blockquote')
                          ? 'blockquote'
                          : editor.isActive('codeBlock', { language: 'mermaid' })
                            ? 'mermaid'
                            : editor.isActive('codeBlock')
                              ? 'codeBlock'
                              : 'paragraph'
          }
        onChange={handleBlockChange}
      />

      {/* Font Size Stepper (like reference image "- 16px +") */}
      <div className="flex items-center bg-surface-secondary border border-surface-border rounded-sm h-7 px-1 ml-0.5">
        <SelectionButton
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onChangeBaseFontSize(Math.max(12, baseFontSize - 1))}
          title="Diminuir tamanho da fonte"
          className="px-1.5 text-xs font-semibold text-content-secondary hover:text-content-primary"
        >
          −
        </SelectionButton>
        <span className="px-1.5 text-[11px] font-medium text-content-primary min-w-[38px] text-center">
          {baseFontSize}px
        </span>
        <SelectionButton
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onChangeBaseFontSize(Math.min(24, baseFontSize + 1))}
          title="Aumentar tamanho da fonte"
          className="px-1.5 text-xs font-semibold text-content-secondary hover:text-content-primary"
        >
          +
        </SelectionButton>
      </div>

      <div className="h-5 w-px bg-surface-border mx-1" />

      {/* Basic Inline Formatting: B, I, U, S */}
      <ToolBtn
        disabled={isSourceMode}
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Negrito (Ctrl+B)"
      >
        <Bold className="w-4 h-4" />
      </ToolBtn>
      <ToolBtn
        disabled={isSourceMode}
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Itálico (Ctrl+I)"
      >
        <Italic className="w-4 h-4" />
      </ToolBtn>
      <ToolBtn
        disabled={isSourceMode}
        active={editor.isActive('underline')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        title="Sublinhado (Ctrl+U)"
      >
        <UnderlineIcon className="w-4 h-4" />
      </ToolBtn>
      <ToolBtn
        disabled={isSourceMode}
        active={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="Tachado"
      >
        <Strikethrough className="w-4 h-4" />
      </ToolBtn>

      {/* Text Color Dropdown */}
      <div className="relative">
        <ToolBtn
          disabled={isSourceMode}
          active={openDropdown === 'color'}
          onClick={() => toggleMenu('color')}
          title="Cor do Texto"
        >
          <Palette className="w-4 h-4" />
          <ChevronDown className="w-3 h-3 ml-0.5 opacity-70" />
        </ToolBtn>
        {openDropdown === 'color' && (
          <div className="absolute left-0 top-full mt-1.5 w-44 p-2 rounded-sm border border-surface-border bg-surface-bg shadow-xl z-50">
            <div className="text-[11px] font-semibold text-content-muted px-1 mb-1.5">
              Cor do Texto
            </div>
            <div className="space-y-1">
              {TEXT_COLORS.map((item) => (
                <SelectionButton
                  key={item.name}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    if (item.color) {
                      editor.chain().focus().setColor(item.color).run()
                    } else {
                      editor.chain().focus().unsetColor().run()
                    }
                    closeMenus()
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1 rounded-sm text-xs text-content-primary hover:bg-surface-secondary"
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-surface-border"
                    style={{ backgroundColor: item.color || 'var(--text-primary)' }}
                  />
                  <span>{item.name}</span>
                </SelectionButton>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Highlight / Marker Color Dropdown */}
      <div className="relative">
        <ToolBtn
          disabled={isSourceMode}
          active={editor.isActive('highlight') || openDropdown === 'highlight'}
          onClick={() => toggleMenu('highlight')}
          title="Marca-texto / Destaque Colorido"
        >
          <Highlighter className="w-4 h-4" />
          <ChevronDown className="w-3 h-3 ml-0.5 opacity-70" />
        </ToolBtn>
        {openDropdown === 'highlight' && (
          <div className="absolute left-0 top-full mt-1.5 w-48 p-2 rounded-sm border border-surface-border bg-surface-bg shadow-xl z-50">
            <div className="text-[11px] font-semibold text-content-muted px-1 mb-1.5">
              Cor de Destaque (Highlight)
            </div>
            <div className="grid grid-cols-3 gap-1.5 mb-2">
              {HIGHLIGHT_COLORS.map((h) => (
                <SelectionButton
                  key={h.color}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    editor.chain().focus().toggleHighlight({ color: h.color }).run()
                    closeMenus()
                  }}
                  title={h.name}
                  className="h-7 rounded-sm border border-black/10 flex items-center justify-center text-[11px] font-bold text-slate-900 hover:scale-105 transition-transform"
                  style={{ backgroundColor: h.color }}
                >
                  Aa
                </SelectionButton>
              ))}
            </div>
            <SelectionButton
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                editor.chain().focus().unsetHighlight().run()
                closeMenus()
              }}
              className="w-full py-1 text-xs text-content-secondary hover:text-content-primary hover:bg-surface-secondary rounded-sm"
            >
              Remover destaque
            </SelectionButton>
          </div>
        )}
      </div>

      {/* Dropdown de Estilização e Transformação de Texto (Sobrescrito, Subscrito, Caixa, etc.) */}
      <div className="relative">
        <ToolBtn
          disabled={isSourceMode}
          active={
            openDropdown === 'typography' ||
            editor.isActive('subscript') ||
            editor.isActive('superscript')
          }
          onClick={() => toggleMenu('typography')}
          title="Estilização e Transformação de Texto (Sobrescrito, Subscrito, Caixa, etc.)"
        >
          <CaseSensitive className="w-4 h-4" />
          <ChevronDown className="w-3 h-3 ml-0.5 opacity-70" />
        </ToolBtn>
        {openDropdown === 'typography' && (
          <div className="absolute left-0 top-full mt-1.5 w-52 p-1.5 rounded-sm border border-surface-border bg-surface-bg shadow-xl z-50 space-y-0.5 text-xs">
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-content-muted">
              Posição do Texto
            </div>
            <SelectionButton
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                editor.chain().focus().toggleSuperscript().run()
                closeMenus()
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-sm transition-colors ${
                editor.isActive('superscript')
                  ? 'bg-accent-soft text-accent font-medium'
                  : 'text-content-primary hover:bg-surface-secondary'
              }`}
            >
              <span className="flex items-center gap-2">
                <SuperscriptIcon className="w-3.5 h-3.5" />
                <span>Sobrescrito (x²)</span>
              </span>
              {editor.isActive('superscript') && (
                <span className="text-[10px] font-bold">Ativo</span>
              )}
            </SelectionButton>
            <SelectionButton
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                editor.chain().focus().toggleSubscript().run()
                closeMenus()
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-sm transition-colors ${
                editor.isActive('subscript')
                  ? 'bg-accent-soft text-accent font-medium'
                  : 'text-content-primary hover:bg-surface-secondary'
              }`}
            >
              <span className="flex items-center gap-2">
                <SubscriptIcon className="w-3.5 h-3.5" />
                <span>Subscrito (x₂)</span>
              </span>
              {editor.isActive('subscript') && <span className="text-[10px] font-bold">Ativo</span>}
            </SelectionButton>

            <div className="h-px bg-surface-border my-1" />

            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-content-muted">
              Transformar Caixa
            </div>
            <SelectionButton
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => transformSelectedCase('upper')}
              className="w-full text-left px-2.5 py-1.5 rounded-sm hover:bg-surface-secondary text-content-primary"
            >
              MAIÚSCULAS
            </SelectionButton>
            <SelectionButton
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => transformSelectedCase('lower')}
              className="w-full text-left px-2.5 py-1.5 rounded-sm hover:bg-surface-secondary text-content-primary"
            >
              minúsculas
            </SelectionButton>
            <SelectionButton
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => transformSelectedCase('capitalize')}
              className="w-full text-left px-2.5 py-1.5 rounded-sm hover:bg-surface-secondary text-content-primary"
            >
              Capitalizar Palavras
            </SelectionButton>

            <div className="h-px bg-surface-border my-1" />

            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-content-muted">
              Outros Efeitos
            </div>
            <SelectionButton
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                editor.chain().focus().toggleCode().run()
                closeMenus()
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-sm transition-colors ${
                editor.isActive('code')
                  ? 'bg-accent-soft text-accent font-medium'
                  : 'text-content-primary hover:bg-surface-secondary'
              }`}
            >
              <span className="flex items-center gap-2">
                <Code2 className="w-3.5 h-3.5 text-accent" />
                <span>Código Inline</span>
              </span>
              {editor.isActive('code') && <span className="text-[10px] font-bold">Ativo</span>}
            </SelectionButton>
            <SelectionButton
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                editor.chain().focus().unsetAllMarks().clearNodes().run()
                closeMenus()
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-sm hover:bg-surface-secondary text-content-secondary"
            >
              <RemoveFormatting className="w-3.5 h-3.5" />
              <span>Limpar Formatação</span>
            </SelectionButton>
          </div>
        )}
      </div>

      <div className="h-5 w-px bg-surface-border mx-1" />

      {/* Obsidian WikiLink [[Nota]] Button */}
      <SelectionButton
        type="button"
        disabled={isSourceMode}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onOpenWikiLinkPicker}
        title="Conectar a outra nota [[WikiLink]]"
        className="h-7 px-2 rounded-sm text-xs font-semibold flex items-center gap-1 bg-accent-soft text-accent border border-accent-border hover:bg-accent hover:text-white transition-colors disabled:opacity-40"
      >
        <FileSymlink className="w-3.5 h-3.5" />
        <span>[[Nota]]</span>
      </SelectionButton>

      {/* External Link */}
      <div className="relative">
        <ToolBtn
          disabled={isSourceMode}
          active={editor.isActive('link') || openDropdown === 'link'}
          onClick={() => {
            const prevUrl = editor.getAttributes('link').href || ''
            setLinkUrl(prevUrl)
            toggleMenu('link')
          }}
          title="Inserir Link Externo (URL)"
        >
          <LinkIcon className="w-4 h-4" />
        </ToolBtn>
        {openDropdown === 'link' && (
          <form
            onSubmit={handleInsertLink}
            className="absolute left-0 top-full mt-1.5 w-72 p-2.5 rounded-sm border border-surface-border bg-surface-bg shadow-xl z-50 space-y-2"
          >
            <div className="text-xs font-semibold text-content-primary">Inserir Link Web</div>
            <Input
              type="text"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://exemplo.com"
              autoFocus
              className="w-full px-2.5 py-1.5 text-xs rounded-sm bg-surface-secondary border border-surface-border text-content-primary focus:outline-none focus:border-accent"
            />
            <div className="flex justify-end gap-1.5">
              <SelectionButton
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  editor.chain().focus().unsetLink().run()
                  closeMenus()
                }}
                className="px-2 py-1 text-xs rounded-sm text-content-secondary hover:bg-surface-secondary"
              >
                Remover
              </SelectionButton>
              <SelectionButton
                type="submit"
                className="px-2.5 py-1 text-xs font-medium rounded-sm bg-accent text-white hover:bg-accent-hover"
              >
                Aplicar
              </SelectionButton>
            </div>
          </form>
        )}
      </div>

      {/* Insert Image */}
      <div className="relative">
        <ToolBtn
          disabled={isSourceMode}
          active={openDropdown === 'image'}
          onClick={() => toggleMenu('image')}
          title="Inserir Imagem"
        >
          <ImageIcon className="w-4 h-4" />
        </ToolBtn>
        {openDropdown === 'image' && (
          <form
            onSubmit={handleInsertImage}
            className="absolute left-0 top-full mt-1.5 w-72 p-2.5 rounded-sm border border-surface-border bg-surface-bg shadow-xl z-50 space-y-2"
          >
            <div className="text-xs font-semibold text-content-primary">Inserir Imagem (URL)</div>
            <Input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://... ou caminho da imagem"
              autoFocus
              className="w-full px-2.5 py-1.5 text-xs rounded-sm bg-surface-secondary border border-surface-border text-content-primary focus:outline-none focus:border-accent"
            />
            <div className="flex justify-end gap-1.5">
              <SelectionButton
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={closeMenus}
                className="px-2 py-1 text-xs rounded-sm text-content-secondary hover:bg-surface-secondary"
              >
                Cancelar
              </SelectionButton>
              <SelectionButton
                type="submit"
                className="px-2.5 py-1 text-xs font-medium rounded-sm bg-accent text-white hover:bg-accent-hover"
              >
                Inserir
              </SelectionButton>
            </div>
          </form>
        )}
      </div>

      {/* Table Menu */}
      <div className="relative">
        <ToolBtn
          disabled={isSourceMode}
          active={editor.isActive('table') || openDropdown === 'table'}
          onClick={() => toggleMenu('table')}
          title="Inserir ou Editar Tabela"
        >
          <TableIcon className="w-4 h-4" />
          <ChevronDown className="w-3 h-3 ml-0.5 opacity-70" />
        </ToolBtn>
        {openDropdown === 'table' && (
          <div className="absolute left-0 top-full mt-1.5 w-52 p-1.5 rounded-sm border border-surface-border bg-surface-bg shadow-xl z-50 space-y-0.5 text-xs">
            <SelectionButton
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                editor
                  .chain()
                  .focus()
                  .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                  .run()
                closeMenus()
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-sm hover:bg-surface-secondary text-content-primary font-medium"
            >
              <Plus className="w-3.5 h-3.5 text-accent" />
              Inserir Tabela (3×3)
            </SelectionButton>
            <div className="h-px bg-surface-border my-1" />
            <SelectionButton
              type="button"
              disabled={!editor.can().addRowAfter()}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                editor.chain().focus().addRowAfter().run()
                closeMenus()
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-sm hover:bg-surface-secondary text-content-secondary disabled:opacity-40"
            >
              + Adicionar Linha Abaixo
            </SelectionButton>
            <SelectionButton
              type="button"
              disabled={!editor.can().addColumnAfter()}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                editor.chain().focus().addColumnAfter().run()
                closeMenus()
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-sm hover:bg-surface-secondary text-content-secondary disabled:opacity-40"
            >
              + Adicionar Coluna à Direita
            </SelectionButton>
            <SelectionButton
              type="button"
              disabled={!editor.can().deleteRow()}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                editor.chain().focus().deleteRow().run()
                closeMenus()
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-sm hover:bg-surface-secondary text-content-secondary disabled:opacity-40"
            >
              − Remover Linha
            </SelectionButton>
            <SelectionButton
              type="button"
              disabled={!editor.can().deleteColumn()}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                editor.chain().focus().deleteColumn().run()
                closeMenus()
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-sm hover:bg-surface-secondary text-content-secondary disabled:opacity-40"
            >
              − Remover Coluna
            </SelectionButton>
            <SelectionButton
              type="button"
              disabled={!editor.can().deleteTable()}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                editor.chain().focus().deleteTable().run()
                closeMenus()
              }}
              className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm hover:bg-rose-500/10 text-rose-500 disabled:opacity-40"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Excluir Tabela
            </SelectionButton>
          </div>
        )}
      </div>

      {/* Blockquote & Horizontal Rule */}
      <ToolBtn
        disabled={isSourceMode}
        active={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        title="Citação (Blockquote)"
      >
        <MessageSquareQuote className="w-4 h-4" />
      </ToolBtn>
      <ToolBtn
        disabled={isSourceMode}
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Inserir Linha Divisória Horizontal (---)"
      >
        <Minus className="w-4 h-4" />
      </ToolBtn>

      <div className="h-5 w-px bg-surface-border mx-1" />

      {/* Dropdown de Alinhamento de Texto */}
      <div className="relative">
        <ToolBtn
          disabled={isSourceMode}
          active={openDropdown === 'align'}
          onClick={() => toggleMenu('align')}
          title="Alinhamento do Texto"
        >
          {editor.isActive({ textAlign: 'center' }) ? (
            <AlignCenter className="w-4 h-4 text-accent" />
          ) : editor.isActive({ textAlign: 'right' }) ? (
            <AlignRight className="w-4 h-4 text-accent" />
          ) : editor.isActive({ textAlign: 'justify' }) ? (
            <AlignJustify className="w-4 h-4 text-accent" />
          ) : (
            <AlignLeft className="w-4 h-4" />
          )}
          <ChevronDown className="w-3 h-3 ml-0.5 opacity-70" />
        </ToolBtn>
        {openDropdown === 'align' && (
          <div className="absolute left-0 top-full mt-1.5 w-48 p-1.5 rounded-sm border border-surface-border bg-surface-bg shadow-xl z-50 space-y-0.5 text-xs">
            <SelectionButton
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                editor.chain().focus().setTextAlign('left').run()
                closeMenus()
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-sm transition-colors ${
                editor.isActive({ textAlign: 'left' }) ||
                (!editor.isActive({ textAlign: 'center' }) &&
                  !editor.isActive({ textAlign: 'right' }) &&
                  !editor.isActive({ textAlign: 'justify' }))
                  ? 'bg-accent-soft text-accent font-medium'
                  : 'text-content-primary hover:bg-surface-secondary'
              }`}
            >
              <span className="flex items-center gap-2">
                <AlignLeft className="w-3.5 h-3.5" />
                <span>Alinhar à Esquerda</span>
              </span>
            </SelectionButton>
            <SelectionButton
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                editor.chain().focus().setTextAlign('center').run()
                closeMenus()
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-sm transition-colors ${
                editor.isActive({ textAlign: 'center' })
                  ? 'bg-accent-soft text-accent font-medium'
                  : 'text-content-primary hover:bg-surface-secondary'
              }`}
            >
              <span className="flex items-center gap-2">
                <AlignCenter className="w-3.5 h-3.5" />
                <span>Centralizar</span>
              </span>
            </SelectionButton>
            <SelectionButton
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                editor.chain().focus().setTextAlign('right').run()
                closeMenus()
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-sm transition-colors ${
                editor.isActive({ textAlign: 'right' })
                  ? 'bg-accent-soft text-accent font-medium'
                  : 'text-content-primary hover:bg-surface-secondary'
              }`}
            >
              <span className="flex items-center gap-2">
                <AlignRight className="w-3.5 h-3.5" />
                <span>Alinhar à Direita</span>
              </span>
            </SelectionButton>
            <SelectionButton
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                editor.chain().focus().setTextAlign('justify').run()
                closeMenus()
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-sm transition-colors ${
                editor.isActive({ textAlign: 'justify' })
                  ? 'bg-accent-soft text-accent font-medium'
                  : 'text-content-primary hover:bg-surface-secondary'
              }`}
            >
              <span className="flex items-center gap-2">
                <AlignJustify className="w-3.5 h-3.5" />
                <span>Justificar</span>
              </span>
            </SelectionButton>
          </div>
        )}
      </div>

      <div className="h-5 w-px bg-surface-border mx-1" />

      {/* Lists: Bullet, Ordered, Task Checklist */}
      <ToolBtn
        disabled={isSourceMode}
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Lista com Marcadores"
      >
        <List className="w-4 h-4" />
      </ToolBtn>
      <ToolBtn
        disabled={isSourceMode}
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Lista Numerada"
      >
        <ListOrdered className="w-4 h-4" />
      </ToolBtn>
      <ToolBtn
        disabled={isSourceMode}
        active={editor.isActive('taskList')}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        title="Lista de Tarefas / Checklist (- [ ])"
      >
        <CheckSquare className="w-4 h-4" />
      </ToolBtn>

      <div className="h-5 w-px bg-surface-border mx-1" />

      {/* Clear Formatting & Code Block */}
      <ToolBtn
        disabled={isSourceMode}
        onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
        title="Limpar Formatação (Tx)"
      >
        <RemoveFormatting className="w-4 h-4" />
      </ToolBtn>
      <ToolBtn
        disabled={isSourceMode}
        active={editor.isActive('codeBlock')}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        title="Inserir Bloco de Código (Sintaxe Colorida)"
      >
        <Code2 className="w-4 h-4" />
      </ToolBtn>
      <ToolBtn
        disabled={isSourceMode}
        active={editor.isActive('codeBlock', { language: 'mermaid' })}
        onClick={() => {
          if (editor.isActive('codeBlock', { language: 'mermaid' })) {
            editor.chain().focus().toggleCodeBlock().run()
          } else {
            editor.chain().focus().setCodeBlock({ language: 'mermaid' }).run()
          }
        }}
        title="Inserir Diagrama Mermaid (Estilo Obsidian)"
      >
        <Workflow className="w-4 h-4 text-accent" />
      </ToolBtn>

      {/* Right-aligned Mode Toggles: Raw Markdown Source, Zen Mode, Help */}
      <div className="ml-auto flex items-center gap-1">
        <SelectionButton
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onToggleSourceMode}
          title="Alternar entre Editor Visual (WYSIWYG) e Código Fonte Markdown (.md)"
          className={`h-7 px-2.5 rounded-sm text-xs font-medium flex items-center gap-1.5 transition-colors border ${
            isSourceMode
              ? 'bg-accent text-white border-accent'
              : 'bg-surface-secondary text-content-secondary border-surface-border hover:text-content-primary'
          }`}
        >
          <FileCode className="w-3.5 h-3.5" />
          <span>{isSourceMode ? 'Modo Markdown (.md)' : 'WYSIWYG'}</span>
        </SelectionButton>

        <SelectionButton
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onToggleZenMode}
          title={isZenMode ? 'Sair do Modo Foco' : 'Modo Foco / Tela Limpa'}
          className={`p-1.5 rounded-sm text-xs transition-colors ${
            isZenMode
              ? 'bg-accent-soft text-accent'
              : 'text-content-secondary hover:bg-surface-tertiary hover:text-content-primary'
          }`}
        >
          {isZenMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </SelectionButton>

        <SelectionButton
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onOpenHelpModal}
          title="Atalhos e Guia Markdown"
          className="p-1.5 rounded-sm text-xs text-content-secondary hover:bg-surface-tertiary hover:text-content-primary transition-colors"
        >
          <HelpCircle className="w-4 h-4" />
        </SelectionButton>
      </div>
    </div>
  )
}
