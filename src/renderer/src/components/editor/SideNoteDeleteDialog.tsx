import React, { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '../ui'

interface Props {
  onCancel: () => void
  onConfirm: () => Promise<void>
  fallbackFocus: React.RefObject<HTMLElement>
}

/** Keep confirmation inside the application and return focus when it closes. */
export function SideNoteDeleteDialog({ onCancel, onConfirm, fallbackFocus }: Props): React.ReactElement {
  const titleId = useId()
  const descriptionId = useId()
  const cancelRef = useRef<HTMLButtonElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    cancelRef.current?.focus({ preventScroll: true })
    return () => {
      window.requestAnimationFrame(() => {
        if (document.activeElement && document.activeElement !== document.body) return
        const target = opener?.isConnected ? opener : fallbackFocus.current
        if (target?.isConnected) target.focus({ preventScroll: true })
      })
    }
  }, [fallbackFocus])

  const confirm = async (): Promise<void> => {
    if (deleting) return
    setDeleting(true)
    try { await onConfirm() } finally { setDeleting(false) }
  }

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-surface-bg/80 p-4" onClick={(event) => { if (!deleting && event.target === event.currentTarget) onCancel() }}>
      <div role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} className="w-full max-w-sm space-y-4 rounded-sm border border-surface-border bg-surface-bg p-5 shadow-xl" onKeyDown={(event) => {
        if (event.key === 'Escape' && !deleting) { event.preventDefault(); event.stopPropagation(); onCancel() }
        if (event.key === 'Tab') {
          const target = event.shiftKey ? confirmRef.current : cancelRef.current
          if ((event.shiftKey && document.activeElement === cancelRef.current) || (!event.shiftKey && document.activeElement === confirmRef.current)) { event.preventDefault(); target?.focus() }
        }
      }}>
        <h2 id={titleId} className="text-sm font-semibold text-content-primary">Excluir observação?</h2>
        <p id={descriptionId} className="text-xs text-content-secondary">A observação será movida para a lixeira.</p>
        <div className="flex justify-end gap-2">
          <Button ref={cancelRef} variant="ghost" disabled={deleting} onClick={onCancel}>Cancelar</Button>
          <Button ref={confirmRef} variant="danger" disabled={deleting} isLoading={deleting} onClick={() => void confirm()}>Excluir</Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
