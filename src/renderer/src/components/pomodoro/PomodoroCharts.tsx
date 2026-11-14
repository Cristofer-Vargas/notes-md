import React from 'react'
import type { TimelineBucket, TimelineSeries } from './analytics'
import { useChartTooltip } from './ChartTooltip'

const series: Array<{ key: TimelineSeries; label: string; color: string }> = [
  { key: 'completed', label: 'Foco concluído', color: 'var(--pomodoro-chart-completed)' },
  { key: 'interrupted', label: 'Foco interrompido', color: 'var(--pomodoro-chart-interrupted)' },
  { key: 'shortBreak', label: 'Pausa curta', color: 'var(--pomodoro-chart-short)' },
  { key: 'longBreak', label: 'Pausa longa', color: 'var(--pomodoro-chart-long)' }
]

export function chartDuration(ms: number): string {
  if (ms > 0 && ms < 60000) return '< 1 min'
  const minutes = Math.round(ms / 60000)
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}min` : `${minutes} min`
}

function Grid({ max }: { max: number }): React.ReactElement {
  return <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex flex-col justify-between">
    {[4, 3, 2, 1, 0].map((step) => <div key={step} className="relative border-t border-dashed border-surface-border"><span className="absolute -left-11 -top-2 w-9 text-right text-[10px] tabular-nums text-content-muted">{max < 240000 ? ((max / 60000) * step / 4).toFixed(1) : Math.round((max / 60000) * step / 4)}</span></div>)}
  </div>
}

export function StackedTimeline({ data }: { data: Map<string, TimelineBucket> }): React.ReactElement {
  const detail = useChartTooltip()
  const values = Array.from(data.entries()).sort(([a], [b]) => a.localeCompare(b))
  const max = Math.max(60000, ...values.map(([, bucket]) => series.reduce((sum, item) => sum + bucket[item.key], 0)))
  return <section className="min-w-0 border border-surface-border bg-surface-secondary p-4 sm:p-5" aria-labelledby="pomodoro-evolution-title">
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><h2 id="pomodoro-evolution-title" className="text-sm font-semibold text-content-primary">Evolução das sessões</h2><p className="mt-1 text-xs text-content-secondary">Tempo efetivo por período · minutos</p></div><div className="flex flex-wrap gap-x-4 gap-y-1">{series.map((item) => <span key={item.key} className="flex items-center gap-1.5 text-[11px] text-content-secondary"><span aria-hidden="true" className="h-2.5 w-2.5 shrink-0" style={{ backgroundColor: item.color }} />{item.label}</span>)}</div></div>
    {values.length === 0 ? <div className="flex h-56 items-center justify-center border border-dashed border-surface-border text-xs text-content-muted">Nenhum intervalo detalhado para exibir.</div> : <>
      <div className="overflow-x-auto pb-2"><div style={{ minWidth: Math.max(420, values.length * 54) }} className="pl-11 pr-1 pt-3"><div className="relative h-52"><Grid max={max} /><div className="relative flex h-full items-end gap-2 px-1">{values.map(([label, bucket]) => {
        const total = series.reduce((sum, item) => sum + bucket[item.key], 0)
        const description = `${label}: ${series.map((item) => `${item.label} ${chartDuration(bucket[item.key])}`).join(', ')}`
        const show = (anchor: Element): void => detail.show({ anchor, title: label, items: series.map((item) => ({ label: item.label, value: chartDuration(bucket[item.key]), color: item.color })), total: chartDuration(total) })
        return <div key={label} className="group relative flex h-full min-w-0 flex-1 flex-col justify-end focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent" tabIndex={0} aria-label={description} aria-describedby={detail.id} onMouseEnter={(event) => show(event.currentTarget)} onMouseLeave={detail.hide} onFocus={(event) => show(event.currentTarget)} onBlur={detail.hide}>
          <div className="flex w-full flex-col-reverse overflow-hidden" style={{ height: `${total / max * 100}%` }}>{series.map((item, index) => bucket[item.key] > 0 && <div key={item.key} onMouseEnter={(event) => detail.highlight(index, event.currentTarget)} onMouseLeave={(event) => detail.highlight(undefined, event.currentTarget.parentElement?.parentElement ?? undefined)} style={{ height: `${bucket[item.key] / total * 100}%`, backgroundColor: item.color }} />)}</div>
          <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap text-[10px] text-content-muted">{label}</span>
        </div>
      })}</div></div><div className="h-6" /></div></div>
      <table className="sr-only"><caption>Evolução das sessões em minutos</caption><thead><tr><th>Período</th>{series.map((item) => <th key={item.key}>{item.label}</th>)}</tr></thead><tbody>{values.map(([label, bucket]) => <tr key={label}><th>{label}</th>{series.map((item) => <td key={item.key}>{chartDuration(bucket[item.key])}</td>)}</tr>)}</tbody></table>
      {detail.tooltip}
    </>}
  </section>
}

export function HourlyChart({ data }: { data: Map<string, number> }): React.ReactElement {
  const detail = useChartTooltip()
  const hours = Array.from({ length: 24 }, (_, hour) => ({ label: `${String(hour).padStart(2, '0')}h`, value: data.get(`${String(hour).padStart(2, '0')}h`) ?? 0 }))
  const max = Math.max(60000, ...hours.map((item) => item.value))
  return <section className="min-w-0 border border-surface-border bg-surface-secondary p-4 sm:p-5" aria-labelledby="pomodoro-hours-title"><h2 id="pomodoro-hours-title" className="text-sm font-semibold">Horários de foco</h2><p className="mt-1 text-xs text-content-secondary">Tempo registrado em cada hora do dia · minutos</p>
    {data.size === 0 ? <div className="flex h-40 items-center justify-center text-xs text-content-muted">Nenhum horário detalhado para exibir.</div> : <div className="overflow-x-auto"><div className="min-w-[440px] pl-11 pr-1 pt-5"><div className="relative h-36"><Grid max={max} /><div className="relative flex h-full items-end gap-1 px-1">{hours.map(({ label, value }, index) => {
      const show = (anchor: Element): void => detail.show({ anchor, title: label, items: [{ label: 'Tempo de foco', value: chartDuration(value), color: 'var(--accent-color)' }] })
      return <div key={label} className="relative flex h-full min-w-0 flex-1 items-end focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent" tabIndex={0} aria-label={`${label}: ${chartDuration(value)}`} aria-describedby={detail.id} onMouseEnter={(event) => show(event.currentTarget)} onMouseLeave={detail.hide} onFocus={(event) => show(event.currentTarget)} onBlur={detail.hide}><div className="w-full bg-accent" style={{ height: `${value / max * 100}%` }} />{index % 3 === 0 && <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 text-[10px] text-content-muted">{label}</span>}</div>
    })}</div></div><div className="h-6" /></div></div>}
    {data.size > 0 && <table className="sr-only"><caption>Foco por hora</caption><tbody>{hours.map(({ label, value }) => <tr key={label}><th>{label}</th><td>{chartDuration(value)}</td></tr>)}</tbody></table>}
    {detail.tooltip}
  </section>
}

export function OutcomeChart({ completed, interrupted }: { completed: number; interrupted: number }): React.ReactElement {
  const detail = useChartTooltip()
  const total = completed + interrupted
  const percent = total ? completed / total * 100 : 0
  const circumference = 2 * Math.PI * 44
  const items = [
    { label: 'Concluído', value: `${chartDuration(completed)} · ${Math.round(percent)}%`, color: 'var(--pomodoro-chart-completed)' },
    { label: 'Interrompido', value: `${chartDuration(interrupted)} · ${Math.round(100 - percent)}%`, color: 'var(--pomodoro-chart-interrupted)' }
  ]
  const show = (anchor: Element, active: number): void => detail.show({ anchor, title: 'Distribuição do foco', items, total: chartDuration(total), active })
  return <section className="min-w-0 border border-surface-border bg-surface-secondary p-4 sm:p-5" aria-labelledby="pomodoro-outcome-title"><h2 id="pomodoro-outcome-title" className="text-sm font-semibold">Distribuição do foco</h2><p className="mt-1 text-xs text-content-secondary">Tempo concluído e interrompido</p>
    {total === 0 ? <div className="flex h-40 items-center justify-center text-xs text-content-muted">Nenhuma sessão de foco no período.</div> : <div className="flex min-h-40 flex-wrap items-center justify-center gap-6 py-3"><div className="relative h-36 w-36 shrink-0"><svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-label="Distribuição do tempo de foco">
      {completed > 0 && <circle cx="50" cy="50" r="44" fill="none" stroke="var(--pomodoro-chart-completed)" strokeWidth="10" strokeDasharray={`${circumference * percent / 100} ${circumference}`} tabIndex={0} role="img" aria-label={`Concluído: ${items[0].value}`} aria-describedby={detail.id} onMouseEnter={(event) => show(event.currentTarget, 0)} onMouseLeave={detail.hide} onFocus={(event) => show(event.currentTarget, 0)} onBlur={detail.hide} />}
      {interrupted > 0 && <circle cx="50" cy="50" r="44" fill="none" stroke="var(--pomodoro-chart-interrupted)" strokeWidth="10" strokeDasharray={`${circumference * (100 - percent) / 100} ${circumference}`} strokeDashoffset={-circumference * percent / 100} tabIndex={0} role="img" aria-label={`Interrompido: ${items[1].value}`} aria-describedby={detail.id} onMouseEnter={(event) => show(event.currentTarget, 1)} onMouseLeave={detail.hide} onFocus={(event) => show(event.currentTarget, 1)} onBlur={detail.hide} />}
    </svg><div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-2xl font-semibold tabular-nums">{Math.round(percent)}%</span><span className="text-[10px] text-content-muted">concluído</span></div></div><div className="space-y-3 text-xs"><div className="flex items-center gap-2"><span aria-hidden="true" className="h-2.5 w-2.5" style={{ backgroundColor: 'var(--pomodoro-chart-completed)' }} /><span className="text-content-secondary">Concluído</span><strong>{chartDuration(completed)}</strong></div><div className="flex items-center gap-2"><span aria-hidden="true" className="h-2.5 w-2.5" style={{ backgroundColor: 'var(--pomodoro-chart-interrupted)' }} /><span className="text-content-secondary">Interrompido</span><strong>{chartDuration(interrupted)}</strong></div></div></div>}
    {detail.tooltip}
  </section>
}
