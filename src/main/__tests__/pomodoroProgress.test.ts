import { describe, expect, it } from 'vitest'
import { calculateProgress, progressEntry } from '../../shared/pomodoroProgress'
import type { PomodoroSession } from '../../shared/pomodoro'

describe('progressão Pomodoro', () => {
  it('aplica os limites de níveis e conquistas por tempo e sessões', () => {
    expect(calculateProgress({}).level).toBe(1)
    expect(calculateProgress({ a: { xp: 99, focusMs: 99 * 60000 } })).toMatchObject({ level: 1, levelXp: 99, nextLevelXp: 100 })
    expect(calculateProgress({ a: { xp: 100, focusMs: 100 * 60000 } })).toMatchObject({ level: 2, levelXp: 0, nextLevelXp: 200 })
    expect(calculateProgress({ a: { xp: 300, focusMs: 300 * 60000 } })).toMatchObject({ level: 3, levelXp: 0 })
    const entries = Object.fromEntries(Array.from({ length: 100 }, (_, i) => [String(i), { xp: 60, focusMs: 3600000 }]))
    const achievements = calculateProgress(entries).achievements
    expect(achievements.find((item) => item.id === 'sessions-100')?.unlocked).toBe(true)
    expect(achievements.find((item) => item.id === 'sessions-200')?.unlocked).toBe(false)
  })
  it('contabiliza somente minutos completos de sessões de foco concluídas, inclusive legadas', () => {
    const session: PomodoroSession = { id: 'a', startedAt: 0, endedAt: 1, elapsedMs: 119999, outcome: 'completed', vaultPath: '', vaultName: '', note: null }
    expect(progressEntry(session)).toEqual({ xp: 1, focusMs: 119999 })
    expect(progressEntry({ ...session, outcome: 'interrupted' })).toBeNull()
    expect(progressEntry({ ...session, phase: 'shortBreak' })).toBeNull()
  })
  it('avança estrelas e constelações em custos progressivos, descontando o marco inicial', () => {
    const at = (xp: number) => calculateProgress({ a: { xp, focusMs: xp * 60000 } }, 100).constellation
    expect(at(100)).toMatchObject({ completed: 0, stars: 0, xpToNextStar: 25 })
    expect(at(124)).toMatchObject({ stars: 0, xpToNextStar: 1 })
    expect(at(125)).toMatchObject({ stars: 1, totalStars: 1, xpToNextStar: 25 })
    expect(at(225)).toMatchObject({ completed: 1, stars: 0, totalStars: 5, xpToNextStar: 30 })
    expect(at(375)).toMatchObject({ completed: 2, stars: 0, totalStars: 10, xpToNextStar: 35 })
    expect(at(1000000).stars).toBeLessThan(5)
  })
  it('mostra o último marco recorrente e o próximo sem crescer indefinidamente', () => {
    const entries = Object.fromEntries(Array.from({ length: 350 }, (_, i) => [String(i), { xp: 60, focusMs: 3600000 }]))
    const progress = calculateProgress(entries)
    expect(progress.achievements.find((item) => item.id === 'sessions-300')?.unlocked).toBe(true)
    expect(progress.achievements.find((item) => item.id === 'sessions-400')?.unlocked).toBe(false)
    expect(progress.achievements.find((item) => item.id === 'hours-300')?.unlocked).toBe(true)
    expect(progress.achievements.length).toBeLessThanOrEqual(12)
  })
})
