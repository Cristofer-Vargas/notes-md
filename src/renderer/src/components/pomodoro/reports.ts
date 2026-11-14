import type { PomodoroSession } from '../../../../shared/pomodoro'

export interface PomodoroReportFilters { outcome: string; vault: string; note: string; from: string; to: string }
export function filterPomodoroSessions(history: PomodoroSession[], filters: PomodoroReportFilters): PomodoroSession[] {
  return history.filter((h) => (filters.outcome === 'all' || h.outcome === filters.outcome) && (filters.vault === 'all' || h.vaultPath === filters.vault) && (filters.note === 'all' || `${h.note?.vaultPath}\u0000${h.note?.relativePath}` === filters.note) && (!filters.from || h.endedAt >= new Date(`${filters.from}T00:00:00`).getTime()) && (!filters.to || h.endedAt < new Date(`${filters.to}T23:59:59.999`).getTime() + 1))
}
export function groupPomodoroSessions(history: PomodoroSession[], period: string): Array<[string, number]> {
  const groups = new Map<string, number>()
  for (const item of history) {
    const date = new Date(item.endedAt)
    if (period === 'week') { date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - ((date.getDay() + 6) % 7)) }
    const key = period === 'month' ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    groups.set(key, (groups.get(key) || 0) + item.elapsedMs)
  }
  return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b)).slice(-12)
}
