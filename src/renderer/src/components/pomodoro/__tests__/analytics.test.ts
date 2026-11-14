import { describe, expect, it } from 'vitest'
import type { PomodoroSession } from '../../../../../shared/pomodoro'
import { analyzePomodoro, type AnalyticsFilters } from '../analytics'

const filters: AnalyticsFilters = { from: '', to: '', vault: 'all', note: 'all', phase: 'all', outcome: 'all', period: 'day' }
describe('análise de sessões Pomodoro', () => {
  it('divide intervalos de foco entre dias e horas, sem contar pausas', () => {
    const start = new Date(2026, 10, 9, 23, 50).getTime(); const end = new Date(2026, 10, 10, 0, 10).getTime()
    const session: PomodoroSession = { id: 'a', phase: 'focus', startedAt: start, endedAt: end, elapsedMs: 1200000, outcome: 'completed', vaultPath: 'v', vaultName: 'V', note: null, detailStatus: 'complete', intervals: [{ start, end }] }
    const report = analyzePomodoro([session], filters)
    expect(report.focusMs).toBe(1200000)
    expect(report.durations.get('2026-11-09')).toBe(600000)
    expect(report.durations.get('2026-11-10')).toBe(600000)
    expect(report.hours.get('23h')).toBe(600000)
    expect(analyzePomodoro([session], { ...filters, from: '2026-11-10', to: '2026-11-10' }).focusMs).toBe(600000)
  })
  it('sinaliza sessões antigas e não inventa distribuição por horário', () => {
    const session: PomodoroSession = { id: 'old', startedAt: 1, endedAt: 2, elapsedMs: 1000, outcome: 'interrupted', vaultPath: 'v', vaultName: 'V', note: null, detailStatus: 'legacy', intervals: [] }
    const report = analyzePomodoro([session], filters)
    expect(report.focusMs).toBe(1000); expect(report.legacyCount).toBe(1); expect(report.hours.size).toBe(0)
    expect(analyzePomodoro([session], { ...filters, note: 'unlinked' }).sessions).toHaveLength(1)
  })
  it('empilha foco e pausas no período correto e respeita os filtros', () => {
    const start = new Date(2026, 10, 9, 23, 50).getTime(); const end = new Date(2026, 10, 10, 0, 10).getTime()
    const focus: PomodoroSession = { id: 'focus', phase: 'focus', startedAt: start, endedAt: end, elapsedMs: end - start, outcome: 'interrupted', vaultPath: 'v', vaultName: 'V', note: null, intervals: [{ start, end }] }
    const pause: PomodoroSession = { ...focus, id: 'pause', phase: 'shortBreak', outcome: 'completed' }
    const report = analyzePomodoro([focus, pause], filters)
    expect(report.timeline.get('2026-11-09')).toEqual({ completed: 0, interrupted: 600000, shortBreak: 600000, longBreak: 0 })
    expect(report.timeline.get('2026-11-10')).toEqual({ completed: 0, interrupted: 600000, shortBreak: 600000, longBreak: 0 })
    expect(analyzePomodoro([focus, pause], { ...filters, phase: 'shortBreak' }).timeline.get('2026-11-09')?.interrupted).toBe(0)
  })
})
