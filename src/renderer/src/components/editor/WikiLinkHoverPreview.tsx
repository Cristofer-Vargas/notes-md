import React, { useEffect, useMemo } from 'react'
import { FileText, Sparkles, ExternalLink, Link2, Clock, X, Plus } from 'lucide-react'
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
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import { FontSizeExtension } from './extensions/FontSizeExtension'
import { WikiLinkExtension } from './extensions/WikiLinkExtension'
import { CustomCodeBlock, lowlight } from './extensions/CustomCodeBlock'
import { preprocessMarkdownForEditor } from '../../services/noteIndexer'
import type { VaultNoteData } from '../../../../preload/index.d'
import type { IndexedNoteMeta } from '../../types/app'

interface WikiLinkHoverPreviewProps {
  targetName: string
  position: { top: number; left: number }
  resolvedNote?: VaultNoteData
  noteMeta?: IndexedNoteMeta
  onOpenNote: (targetName: string, openInNewTab?: boolean) => void
  onMouseEnter: () => void
  onMouseLeave: () => void
  onClose?: () => void
}

const NoteWysiwygContent: React.FC<{ content: string }> = ({ content }) => {
  const prepared = useMemo(() => preprocessMarkdownForEditor(content), [content])

  const previewEditor = useEditor({
    editable: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
        codeBlock: false
      }),
      CustomCodeBlock.configure({
        lowlight,
        defaultLanguage: 'plaintext'
      }),
      Markdown.configure({
        html: true,
        tightLists: true
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
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({ openOnClick: false }),
      Image,
      WikiLinkExtension
    ],
    content: prepared
  })

  useEffect(() => {
    if (previewEditor) {
      previewEditor.commands.setContent(prepared, false)
    }
  }, [previewEditor, prepared])

  return (
    <div className="preview-wysiwyg max-h-72 overflow-y-auto px-4 py-3 select-text bg-surface-bg/95">
      <EditorContent editor={previewEditor} />
    </div>
  )
}

export const WikiLinkHoverPreview: React.FC<WikiLinkHoverPreviewProps> = ({
  targetName,
  position,
  resolvedNote,
  noteMeta,
  onOpenNote,
  onMouseEnter,
  onMouseLeave,
  onClose
}) => {
  const previewWidth = 500
  const previewHeight = 360

  let safeTop = position.top + 10
  if (safeTop + previewHeight > window.innerHeight - 16) {
    safeTop = Math.max(16, position.top - previewHeight - 8)
  }

  const safeLeft = Math.min(
    Math.max(16, position.left - 20),
    window.innerWidth - previewWidth - 20
  )

  const readingTimeMin = noteMeta
    ? Math.max(1, Math.ceil(noteMeta.wordCount / 200))
    : 1

  return (
    <div
      style={{ top: safeTop, left: safeLeft, width: `${previewWidth}px` }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="fixed z-50 rounded-2xl border border-surface-border bg-surface-bg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 select-none flex flex-col"
    >
      {/* Top Window Bar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-surface-secondary border-b border-surface-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-accent-soft text-accent flex items-center justify-center shrink-0">
            <FileText className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-xs text-content-primary truncate">
              {resolvedNote ? resolvedNote.name : targetName}
            </div>
            {resolvedNote && (
              <div className="text-[10px] text-content-muted truncate">
                {resolvedNote.relativePath}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {resolvedNote ? (
            <>
              <button
                type="button"
                onClick={() => onOpenNote(resolvedNote.relativePath, false)}
                title="Abrir nota substituindo a guia atual (Clique esquerdo)"
                className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-surface-tertiary hover:bg-accent-soft hover:text-accent text-content-secondary transition-colors cursor-pointer"
              >
                <span>Abrir</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenNote(resolvedNote.relativePath, true)}
                title="Abrir nota em uma nova guia (Botão do meio)"
                className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-accent text-white hover:bg-accent-hover transition-colors shadow-2xs cursor-pointer"
              >
                <span>Nova Guia</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onOpenNote(targetName, false)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-accent text-white hover:bg-accent-hover transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Criar Nota</span>
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              title="Fechar preview (Esc)"
              className="p-1 rounded-md text-content-muted hover:text-content-primary hover:bg-surface-tertiary transition-colors ml-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Body: WYSIWYG Preview if note exists, or friendly creation prompt if unresolved */}
      {resolvedNote ? (
        <>
          <NoteWysiwygContent content={resolvedNote.content} />

          {/* Bottom Footer Info */}
          <div className="px-3.5 py-2 bg-surface-secondary/70 border-t border-surface-border flex items-center justify-between text-[10.5px] text-content-muted shrink-0">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-content-secondary" />
                ~{readingTimeMin} min
              </span>
              <span>•</span>
              <span>{noteMeta ? noteMeta.wordCount : 0} palavras</span>
              {noteMeta && noteMeta.backlinks.length > 0 && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-accent">
                    <Link2 className="w-3 h-3" />
                    {noteMeta.backlinks.length}{' '}
                    {noteMeta.backlinks.length === 1 ? 'backlink' : 'backlinks'}
                  </span>
                </>
              )}
            </div>
            <span className="text-[10px] text-content-muted italic">
              Ctrl + Hover (Estilo Obsidian)
            </span>
          </div>
        </>
      ) : (
        <div className="p-6 text-center space-y-3 bg-surface-bg">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-500">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="text-xs font-bold text-content-primary">
              Nota &ldquo;{targetName}&rdquo; não existe
            </div>
            <div className="text-[11px] text-content-secondary max-w-xs mx-auto">
              Esta nota foi referenciada via <code>[[{targetName}]]</code>, mas o arquivo ainda
              não foi criado.
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenNote(targetName, false)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent text-white hover:bg-accent-hover transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Criar &ldquo;{targetName}.md&rdquo; Agora</span>
          </button>
        </div>
      )}
    </div>
  )
}
