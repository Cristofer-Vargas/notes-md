import React, { useEffect, useRef } from 'react'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import type { Extensions } from '@tiptap/core'
import { Link2, Trash2 } from 'lucide-react'
import type { SideNote } from '../../../../shared/sideNotes'
import { postprocessMarkdownFromEditor, preprocessMarkdownForEditor } from '../../services/noteIndexer'
import { IconButton } from '../ui'

interface Props {
  note: SideNote
  extensions: Extensions
  attached: boolean
  onFocusEditor: (editor: Editor) => void
  onDisposeEditor: (editor: Editor) => void
  onSave: (body: string) => void
  onNavigate: () => void
  onRelink: () => void
  onDelete: () => void
  minimal?: boolean
  autoFocus?: boolean
}

export function SideNoteCard({ note, extensions, attached, onFocusEditor, onDisposeEditor, onSave, onNavigate, onRelink, onDelete, minimal = false, autoFocus = false }: Props): React.ReactElement {
  const saveRef = useRef(onSave)
  saveRef.current = onSave
  const timer = useRef<number | null>(null)
  const pending = useRef<string | null>(null)
  const editor = useEditor({
    extensions,
    content: preprocessMarkdownForEditor(note.body),
    autofocus: autoFocus ? 'end' : false,
    onFocus: ({ editor: current }) => onFocusEditor(current),
    onUpdate: ({ editor: current }) => {
      pending.current = postprocessMarkdownFromEditor((current.storage as any).markdown.getMarkdown())
      if (timer.current !== null) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => {
        if (pending.current !== null) saveRef.current(pending.current)
        pending.current = null
        timer.current = null
      }, 500)
    }
  })
  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current)
    if (pending.current !== null) saveRef.current(pending.current)
  }, [])
  useEffect(() => () => { if (editor) onDisposeEditor(editor) }, [editor, onDisposeEditor])
  useEffect(() => {
    if (editor && !editor.isFocused && pending.current === null && postprocessMarkdownFromEditor((editor.storage as any).markdown.getMarkdown()) !== note.body) editor.commands.setContent(preprocessMarkdownForEditor(note.body), false)
  }, [editor, note.body])

  return <section className={minimal ? 'side-note-card' : 'side-note-card border border-surface-border bg-surface-secondary shadow-sm'} aria-label="Observação">
    {!minimal && <header className="flex items-center justify-between gap-1 border-b border-surface-border px-2 py-1">
      <span className="truncate text-[10px] font-semibold text-content-secondary">{attached ? 'Observação' : 'Trecho não localizado'}</span>
      <span className="flex items-center">
        <IconButton size="xs" tooltip={attached ? 'Ir para o trecho' : 'Vincular à seleção atual'} icon={<Link2 className="h-3 w-3" />} onMouseDown={(event) => event.preventDefault()} onClick={attached ? onNavigate : onRelink} />
        <IconButton size="xs" tooltip="Excluir nota lateral" icon={<Trash2 className="h-3 w-3" />} onClick={onDelete} />
      </span>
    </header>}
    <EditorContent editor={editor} className={minimal ? 'side-note-editor text-xs' : 'side-note-editor px-2 py-1 text-xs'} />
  </section>
}
