import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Editor } from '@tiptap/react'
import type { Extensions } from '@tiptap/core'
import { MessageSquareText, X } from 'lucide-react'
import type { SideNote } from '../../../../shared/sideNotes'
import { IconButton } from '../ui'
import { SideNoteCard } from './SideNoteCard'

interface Props {
  note: SideNote
  extensions: Extensions
  onFocusEditor: (editor: Editor) => void
  onDisposeEditor: (editor: Editor) => void
  onSave: (body: string) => void
}

export function SideNotePopover({ note, extensions, onFocusEditor, onDisposeEditor, onSave }: Props): React.ReactElement {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<React.CSSProperties>({})
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!open) return
    const update = (): void => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return
      const width = Math.min(288, Math.max(0, window.innerWidth - 16))
      const left = Math.max(8, Math.min(rect.right + 8, window.innerWidth - width - 8))
      const height = popupRef.current?.offsetHeight ?? 160
      const top = Math.max(8, Math.min(rect.top, window.innerHeight - height - 8))
      setPosition({ left, top, width, maxHeight: Math.max(100, window.innerHeight - 16) })
    }
    update()
    const observer = new ResizeObserver(update)
    if (popupRef.current) observer.observe(popupRef.current)
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => { observer.disconnect(); window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true) }
  }, [open])

  useEffect(() => {
    if (!open) return
    const outside = (event: MouseEvent): void => {
      const target = event.target as HTMLElement | null
      if (target && !triggerRef.current?.contains(target) && !popupRef.current?.contains(target) && !target.closest('[data-editor-toolbar]')) setOpen(false)
    }
    const keydown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setOpen(false); triggerRef.current?.focus() }
    }
    window.addEventListener('mousedown', outside)
    window.addEventListener('keydown', keydown, true)
    return () => { window.removeEventListener('mousedown', outside); window.removeEventListener('keydown', keydown, true) }
  }, [open])

  return <>
    <IconButton ref={triggerRef} size="sm" variant="accent-soft" tooltip={`Abrir observação: ${note.anchor.quote.slice(0, 50)}`} aria-haspopup="dialog" aria-expanded={open} icon={<MessageSquareText className="h-4 w-4" />} onClick={() => setOpen((current) => !current)} />
    {open && createPortal(<div ref={popupRef} role="dialog" aria-label="Observação" style={position} className="fixed z-[100] overflow-y-auto rounded-sm border border-surface-border bg-surface-bg shadow-xl">
      <div className="flex items-center justify-between border-b border-surface-border px-2 py-1"><span className="text-xs font-semibold text-content-secondary">Observação</span><IconButton size="xs" tooltip="Fechar observação" icon={<X className="h-3 w-3" />} onClick={() => { setOpen(false); triggerRef.current?.focus() }} /></div>
      <div className="bg-accent-soft p-3"><SideNoteCard minimal autoFocus note={note} extensions={extensions} attached onFocusEditor={onFocusEditor} onDisposeEditor={onDisposeEditor} onSave={onSave} onNavigate={() => {}} onRelink={() => {}} onDelete={() => {}} /></div>
    </div>, document.body)}
  </>
}
