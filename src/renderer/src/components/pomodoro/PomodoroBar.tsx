import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Timer } from 'lucide-react'
import type { PomodoroContext } from '../../../../shared/pomodoro'
import { Button } from '../ui'
import { formatPomodoroTime, PomodoroPanel, usePomodoro } from './PomodoroPanel'

export function PomodoroBar({ context }: { context: PomodoroContext }): React.ReactElement {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ right: 8, bottom: 36 })
  const state = usePomodoro()
  useEffect(() => { void window.electronAPI.setPomodoroContext(context) }, [context])
  useEffect(() => { if (!open) return; const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false) } }; window.addEventListener('keydown', onKey, true); return () => window.removeEventListener('keydown', onKey, true) }, [open])
  useEffect(() => {
    if (!open) return
    const update = (): void => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (rect) setPosition({ right: Math.max(8, window.innerWidth - rect.right), bottom: Math.max(8, window.innerHeight - rect.top + 4) })
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [open])
  return <div ref={triggerRef} className="shrink-0">
    {open && createPortal(<div style={position} className="fixed z-50 h-[min(600px,80vh)] w-[min(420px,95vw)] overflow-hidden border border-surface-border bg-surface-bg shadow-xl"><PomodoroPanel onClose={() => setOpen(false)} /></div>, document.body)}
    <Button size="xs" variant="ghost" aria-expanded={open} leftIcon={<Timer className="h-3.5 w-3.5" />} onClick={() => setOpen(!open)}>{state?.status === 'running' || state?.status === 'paused' ? formatPomodoroTime(state.remainingMs) : 'Pomodoro'}</Button>
  </div>
}
