import React, { useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import type { Extensions } from '@tiptap/core'
import type { SideNote } from '../../../../shared/sideNotes'
import { SideNoteCard } from './SideNoteCard'
import { SideNotePopover } from './SideNotePopover'
import { resolveEditorAnchor } from './sideNoteAnchors'
import { layoutSideNotes } from './sideNoteLayout'
import { findSideNoteInSource } from './sideNoteSource'

interface Props {
  notes: SideNote[]
  editor: Editor | null
  extensions: Extensions
  sourceMode: boolean
  sourceRef: React.RefObject<HTMLTextAreaElement>
  compact: boolean
  onFocusEditor: (editor: Editor) => void
  onDisposeEditor: (editor: Editor) => void
  onSave: (id: string, body: string) => void
}

interface Position { top: number; height: number; textTop: number; documentLeft: number; attached: boolean }

/** Measure the actual painted range, including wrapped lines and multiple blocks. */
function visualRange(editor: Editor, from: number, to: number): { top: number; bottom: number } {
  const start = editor.view.domAtPos(from)
  const end = editor.view.domAtPos(to)
  const range = document.createRange()
  range.setStart(start.node, start.offset)
  range.setEnd(end.node, end.offset)
  const rects = Array.from(range.getClientRects()).filter((rect) => rect.height > 0 && rect.width > 0)
  if (rects.length) return { top: Math.min(...rects.map((rect) => rect.top)), bottom: Math.max(...rects.map((rect) => rect.bottom)) }
  const first = editor.view.coordsAtPos(from)
  const last = editor.view.coordsAtPos(to)
  return { top: first.top, bottom: last.bottom }
}

/** Mirror textarea layout to include wrapping when positioning source-mode markers. */
export function measureSideNoteSourceRange(input: HTMLTextAreaElement, note: SideNote): { top: number; bottom: number } | null {
  const match = findSideNoteInSource(input.value, note.anchor)
  if (!match) return null
  const style = getComputedStyle(input)
  const mirror = document.createElement('div')
  Object.assign(mirror.style, {
    position: 'fixed', visibility: 'hidden', pointerEvents: 'none', left: '0', top: '0',
    width: `${input.getBoundingClientRect().width}px`, boxSizing: style.boxSizing,
    font: style.font, lineHeight: style.lineHeight, letterSpacing: style.letterSpacing,
    wordSpacing: style.wordSpacing, padding: style.padding, border: style.border,
    whiteSpace: 'pre-wrap', overflowWrap: 'break-word'
  })
  mirror.append(document.createTextNode(input.value.slice(0, match.from)))
  const selection = document.createElement('span')
  selection.textContent = input.value.slice(match.from, match.to)
  mirror.append(selection)
  document.body.append(mirror)
  const rects = Array.from(selection.getClientRects()).filter((rect) => rect.height > 0)
  const top = input.getBoundingClientRect().top - input.scrollTop
  const result = rects.length ? { top: top + Math.min(...rects.map((rect) => rect.top)), bottom: top + Math.max(...rects.map((rect) => rect.bottom)) } : null
  mirror.remove()
  return result
}

export function SideNoteLane({ notes, editor, extensions, sourceMode, sourceRef, compact, onFocusEditor, onDisposeEditor, onSave }: Props): React.ReactElement | null {
  const lane = useRef<HTMLDivElement>(null)
  const [positions, setPositions] = useState<Record<string, Position>>({})
  useEffect(() => {
    if (!lane.current || !editor) return
    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        if (!lane.current || editor.isDestroyed) return
        const laneRect = lane.current.getBoundingClientRect()
        const documentLeft = (sourceMode && sourceRef.current ? sourceRef.current : editor.view.dom).getBoundingClientRect().left - laneRect.left - 10
        const next: Record<string, Position> = {}
        const ordered = notes.map((note) => {
          const range = resolveEditorAnchor(editor.state.doc, note.anchor)
          let bounds: { top: number; bottom: number } | null = null
          if (!note.detached && range.status === 'attached') {
            try { bounds = sourceMode && sourceRef.current ? measureSideNoteSourceRange(sourceRef.current, note) : visualRange(editor, range.from, range.to) } catch { /* document is being replaced */ }
          }
          return { note, bounds, target: bounds ? bounds.top - laneRect.top : 0 }
        })
        const layout = layoutSideNotes(ordered.flatMap(({ note, bounds, target }) => {
          if (!bounds) return []
          const card = lane.current?.querySelector<HTMLElement>(`[data-side-note-id="${note.id}"]`)
          return [{ id: note.id, top: target, height: Math.max(1, bounds.bottom - bounds.top), textHeight: card?.offsetHeight ?? 64, createdAt: note.createdAt }]
        }))
        for (const { note, bounds } of ordered) {
          if (!bounds) {
            next[note.id] = { top: 0, height: 0, textTop: 0, documentLeft, attached: false }
            continue
          }
          next[note.id] = { ...layout[note.id], documentLeft, attached: true }
        }
        setPositions((previous) => JSON.stringify(previous) === JSON.stringify(next) ? previous : next)
      })
    }
    const observer = new ResizeObserver(update)
    observer.observe(lane.current)
    observer.observe(editor.view.dom)
    if (sourceRef.current) observer.observe(sourceRef.current)
    lane.current.querySelectorAll<HTMLElement>('[data-side-note-id]').forEach((element) => observer.observe(element))
    editor.on('transaction', update)
    window.addEventListener('resize', update)
    sourceRef.current?.addEventListener('scroll', update)
    update()
    const source = sourceRef.current
    return () => { cancelAnimationFrame(frame); observer.disconnect(); editor.off('transaction', update); window.removeEventListener('resize', update); source?.removeEventListener('scroll', update) }
  }, [editor, notes, sourceMode, sourceRef, compact])
  if (!notes.length) return null
  return <aside ref={lane} aria-label="Observações da nota atual" className="pointer-events-none absolute left-0 top-0 h-0 w-full">
    {notes.map((note) => {
      const position = positions[note.id]
      if (position && !position.attached) return null
      return <React.Fragment key={note.id}>
        {position?.attached && <>
          <span aria-hidden="true" className="side-note-marker absolute" style={{ top: position.top, height: position.height, left: position.documentLeft }} />
        </>}
        <div data-side-note-id={note.id} className={compact ? 'pointer-events-auto absolute left-0' : 'pointer-events-auto absolute right-full w-56 pr-5'} style={{ top: position?.textTop ?? 0 }}>
          {compact ? <SideNotePopover note={note} extensions={extensions} onFocusEditor={onFocusEditor} onDisposeEditor={onDisposeEditor} onSave={(body) => onSave(note.id, body)} /> :
            <div className="rounded-sm bg-accent-soft p-2"><SideNoteCard minimal note={note} extensions={extensions} attached={Boolean(position?.attached)} onFocusEditor={onFocusEditor} onDisposeEditor={onDisposeEditor} onSave={(body) => onSave(note.id, body)} onRelink={() => {}} onDelete={() => {}} onNavigate={() => {}} /></div>}
        </div>
      </React.Fragment>
    })}
  </aside>
}
