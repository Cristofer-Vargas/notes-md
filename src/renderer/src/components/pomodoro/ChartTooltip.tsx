import React, { useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export interface ChartTooltipItem { label: string; value: string; color: string }
interface Detail { anchor: Element; title: string; items: ChartTooltipItem[]; active?: number; total?: string }

/** One shared tooltip per chart, shown for either pointer hover or keyboard focus. */
export function useChartTooltip(): {
  id: string
  show: (detail: Detail) => void
  hide: () => void
  highlight: (index?: number, anchor?: Element) => void
  tooltip: React.ReactNode
} {
  const id = useId()
  const [detail, setDetail] = useState<Detail | null>(null)
  const [position, setPosition] = useState({ left: 8, top: 8 })
  const tooltipRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!detail) return
    const update = (): void => {
      const anchor = detail.anchor.getBoundingClientRect()
      const panel = tooltipRef.current?.getBoundingClientRect()
      if (!panel) return
      const left = Math.max(8, Math.min(anchor.left + anchor.width / 2 - panel.width / 2, window.innerWidth - panel.width - 8))
      const above = anchor.top - panel.height - 8
      const top = Math.max(8, Math.min(above >= 8 ? above : anchor.bottom + 8, window.innerHeight - panel.height - 8))
      setPosition({ left, top })
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => { window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true) }
  }, [detail])

  return {
    id,
    show: setDetail,
    hide: () => setDetail(null),
    highlight: (active, anchor) => setDetail((current) => current ? { ...current, active, anchor: anchor ?? current.anchor } : null),
    tooltip: detail && createPortal(
      <div id={id} ref={tooltipRef} role="tooltip" style={position} className="pomodoro-charts pointer-events-none fixed z-[9999] w-60 max-w-[calc(100vw-16px)] border border-surface-border bg-surface-bg p-3 text-xs text-content-primary shadow-xl">
        <div className="mb-2 font-semibold">{detail.title}</div>
        <div className="space-y-1.5">{detail.items.map((item, index) => <div key={item.label} className={`flex items-center gap-2 ${detail.active === index ? 'font-semibold text-content-primary' : 'text-content-secondary'}`}><span aria-hidden="true" className="h-2.5 w-2.5 shrink-0" style={{ backgroundColor: item.color }} /><span className="min-w-0 flex-1 break-words">{item.label}</span><span className="shrink-0 tabular-nums">{item.value}</span></div>)}</div>
        {detail.total && <div className="mt-2 flex justify-between gap-3 border-t border-surface-border pt-2 font-semibold"><span>Total</span><span className="tabular-nums">{detail.total}</span></div>}
      </div>, document.body
    )
  }
}
