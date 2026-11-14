import { describe, expect, it } from 'vitest'
import type { PomodoroSession } from '../../../../../shared/pomodoro'
import { filterPomodoroSessions, groupPomodoroSessions } from '../reports'

describe('relatórios Pomodoro', () => {
  const history: PomodoroSession[] = [
    { id: '1', startedAt: 0, endedAt: new Date(2026, 10, 9, 10).getTime(), elapsedMs: 60000, outcome: 'completed', vaultPath: 'a', vaultName: 'A', note: { vaultPath: 'a', vaultName: 'A', relativePath: 'nota.md', name: 'nota' } },
    { id: '2', startedAt: 0, endedAt: new Date(2026, 10, 10, 10).getTime(), elapsedMs: 120000, outcome: 'interrupted', vaultPath: 'a', vaultName: 'A', note: null },
    { id: '3', startedAt: 0, endedAt: new Date(2026, 11, 1, 10).getTime(), elapsedMs: 60000, outcome: 'completed', vaultPath: 'b', vaultName: 'B', note: null }
  ]
  it('filtra por datas, cofre, nota e estado sem excluir sessões sem nota do cofre', () => {
    const base = { outcome: 'all', vault: 'a', note: 'all', from: '2026-11-09', to: '2026-11-10' }
    expect(filterPomodoroSessions(history, base)).toHaveLength(2)
    expect(filterPomodoroSessions(history, { ...base, outcome: 'interrupted' }).map((h) => h.id)).toEqual(['2'])
    expect(filterPomodoroSessions(history, { ...base, note: 'a\u0000nota.md' }).map((h) => h.id)).toEqual(['1'])
  })
  it('soma tempos por dia, semana e mês', () => {
    expect(groupPomodoroSessions(history, 'day')).toEqual([['2026-11-09', 60000], ['2026-11-10', 120000], ['2026-12-01', 60000]])
    expect(groupPomodoroSessions(history, 'week')[0]).toEqual(['2026-11-09', 180000])
    expect(groupPomodoroSessions(history, 'month')[0]).toEqual(['2026-11', 180000])
  })
})
