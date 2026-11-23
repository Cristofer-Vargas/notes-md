import React, { useEffect, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import type { Extensions } from '@tiptap/core'
import { preprocessMarkdownForEditor } from '../../services/noteIndexer'
import { getPreviewClipHeight, type PreviewTextRect } from './sideNotePreviewLayout'

interface Props {
  content: string
  fallback: string
  extensions: Extensions
}

/** Render with the same schema as the editable observation, without making it editable. */
export function SideNotePreview({ content, fallback, extensions }: Props): React.ReactElement {
  const viewportRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [overflowing, setOverflowing] = useState(false)
  const [clipHeight, setClipHeight] = useState<number | null>(null)
  const preview = useEditor({
    extensions,
    editable: false,
    content: preprocessMarkdownForEditor(content)
  })

  useEffect(() => {
    if (preview && !preview.isDestroyed) preview.commands.setContent(preprocessMarkdownForEditor(content), false)
  }, [content, preview])

  useEffect(() => {
    const viewport = viewportRef.current
    const body = contentRef.current
    if (!viewport || !body) return
    let frame = 0
    const update = (): void => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        const maxHeight = parseFloat(getComputedStyle(viewport).maxHeight)
        const exceeds = Number.isFinite(maxHeight) && viewport.scrollHeight > maxHeight
        setOverflowing(exceeds)
        if (!exceeds) { setClipHeight(null); return }
        const top = viewport.getBoundingClientRect().top
        const rects: PreviewTextRect[] = []
        const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT)
        while (walker.nextNode()) {
          const range = document.createRange()
          range.selectNodeContents(walker.currentNode)
          for (const rect of Array.from(range.getClientRects())) {
            if (rect.height > 0 && rect.width > 0) rects.push({ top: rect.top - top, bottom: rect.bottom - top })
          }
        }
        setClipHeight(getPreviewClipHeight(maxHeight, rects))
      })
    }
    const observer = new ResizeObserver(update)
    observer.observe(viewport)
    observer.observe(body)
    update()
    return () => { observer.disconnect(); window.cancelAnimationFrame(frame) }
  }, [content, fallback, preview])

  return <div ref={(element) => element?.setAttribute('inert', '')} aria-hidden="true" className="side-note-preview preview-wysiwyg pointer-events-none relative min-w-0">
    <div ref={viewportRef} className="max-h-24 overflow-hidden" style={clipHeight === null ? undefined : { height: clipHeight }}>
      <div ref={contentRef}>{content.trim() ? <EditorContent editor={preview} /> : <span className="block break-words">{fallback}</span>}</div>
    </div>
    {overflowing && <span className="absolute bottom-0 right-0 bg-surface-secondary px-1 font-semibold text-content-secondary group-hover:bg-surface-tertiary">…</span>}
  </div>
}
