import type { PomodoroSession } from '../../../../shared/pomodoro'

export interface AnalyticsFilters { from: string; to: string; vault: string; note: string; phase: string; outcome: string; period: 'day' | 'week' | 'month' }
export type TimelineSeries = 'completed' | 'interrupted' | 'shortBreak' | 'longBreak'
export type TimelineBucket = Record<TimelineSeries, number>
export interface AnalyticsResult { sessions: PomodoroSession[]; durations: Map<string, number>; timeline: Map<string, TimelineBucket>; hours: Map<string, number>; notes: Map<string, number>; vaults: Map<string, number>; outcomes: Map<string, number>; breaks: Map<string, number>; focusMs: number; completedMs: number; interruptedMs: number; breakMs: number; legacyCount: number }

export function analyzePomodoro(history: PomodoroSession[], f: AnalyticsFilters): AnalyticsResult {
  const start = f.from ? new Date(`${f.from}T00:00:00`).getTime() : -Infinity
  const endDate = f.to ? new Date(`${f.to}T00:00:00`) : null
  if (endDate) endDate.setDate(endDate.getDate() + 1)
  const end = endDate?.getTime() ?? Infinity
  const result: AnalyticsResult = { sessions: [], durations: new Map(), timeline: new Map(), hours: new Map(), notes: new Map(), vaults: new Map(), outcomes: new Map(), breaks: new Map(), focusMs: 0, completedMs: 0, interruptedMs: 0, breakMs: 0, legacyCount: 0 }
  const add = (map: Map<string, number>, key: string, value: number): void => { map.set(key, (map.get(key) ?? 0) + value) }
  for (const item of history) {
    const phase = item.phase ?? 'focus'
    if ((f.phase !== 'all' && phase !== f.phase) || (f.outcome !== 'all' && item.outcome !== f.outcome) || (f.vault !== 'all' && item.vaultPath !== f.vault) || (f.note === 'unlinked' ? Boolean(item.note) : f.note !== 'all' && `${item.note?.vaultPath}\u0000${item.note?.relativePath}` !== f.note)) continue
    const legacy = item.detailStatus === 'legacy' || !item.intervals
    const segments = (item.intervals ?? []).map((i) => ({ start: Math.max(i.start, start), end: Math.min(i.end, end) })).filter((i) => i.end > i.start)
    const within = item.endedAt >= start && item.endedAt < end
    if (!segments.length && !within) continue
    const known = (item.intervals ?? []).reduce((sum, i) => sum + Math.max(0, i.end - i.start), 0)
    const ms = segments.reduce((sum, i) => sum + i.end - i.start, 0) + (legacy && within ? Math.max(0, item.elapsedMs - known) : 0)
    result.sessions.push(item)
    if (legacy) result.legacyCount++
    if (phase === 'focus') {
      result.focusMs += ms
      if (item.outcome === 'completed') result.completedMs += ms
      else result.interruptedMs += ms
      add(result.outcomes, item.outcome === 'completed' ? 'Concluído' : 'Interrompido', ms)
      const vaultLabel = item.vaultPath ? `${item.vaultName || 'Cofre'} (${item.vaultPath})` : 'Sem cofre'
      add(result.notes, item.note ? `${item.note.relativePath} · ${vaultLabel}` : 'Sem nota', ms); add(result.vaults, vaultLabel, ms)
    } else { result.breakMs += ms; add(result.breaks, phase === 'shortBreak' ? 'Pausa curta' : 'Pausa longa', ms) }
    for (const segment of segments) {
      let cursor = segment.start
      while (cursor < segment.end) {
        const date = new Date(cursor)
        const untilNextHour = (60 - date.getMinutes()) * 60000 - date.getSeconds() * 1000 - date.getMilliseconds()
        const next = Math.min(segment.end, cursor + untilNextHour)
        const time = next - cursor; const hour = `${String(date.getHours()).padStart(2, '0')}h`
        if (phase === 'focus') add(result.hours, hour, time)
        if (f.period === 'week') date.setDate(date.getDate() - ((date.getDay() + 6) % 7))
        const key = f.period === 'month' ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
        const bucket = result.timeline.get(key) ?? { completed: 0, interrupted: 0, shortBreak: 0, longBreak: 0 }
        const series: TimelineSeries = phase === 'focus' ? (item.outcome === 'completed' ? 'completed' : 'interrupted') : phase
        bucket[series] += time
        result.timeline.set(key, bucket)
        if (phase === 'focus') add(result.durations, key, time)
        cursor = next
      }
    }
  }
  return result
}
