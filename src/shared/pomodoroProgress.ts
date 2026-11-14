import type { PomodoroAchievement, PomodoroProgress, PomodoroSession } from './pomodoro'

export interface ProgressEntry { xp: number; focusMs: number }
export interface ProgressArchive { version: 1; entries: Record<string, ProgressEntry>; constellationBaselineXp?: number }

export function progressEntry(session: PomodoroSession): ProgressEntry | null {
  if ((session.phase ?? 'focus') !== 'focus' || session.outcome !== 'completed') return null
  const focusMs = Number.isFinite(session.elapsedMs) ? Math.max(0, session.elapsedMs) : 0
  return { xp: Math.floor(focusMs / 60000), focusMs }
}

export function calculateProgress(entries: Record<string, ProgressEntry>, constellationBaselineXp = 0): PomodoroProgress {
  const values = Object.values(entries)
  const xp = values.reduce((sum, entry) => sum + entry.xp, 0)
  const focusMs = values.reduce((sum, entry) => sum + entry.focusMs, 0)
  const level = Math.floor((1 + Math.sqrt(1 + 8 * xp / 100)) / 2)
  const levelXp = xp - 50 * level * (level - 1)
  const nextLevelXp = 100 * level
  const targets = (current: number): number[] => {
    const recurring = Math.floor(current / 100) * 100
    return [...new Set([1, 10, 50, 100, ...(recurring >= 200 ? [recurring] : []), ...(current >= 100 ? [Math.max(200, recurring + 100)] : [])])]
  }
  const achievements: PomodoroAchievement[] = [
    ...targets(values.length).map((target) => ({ id: `sessions-${target}`, label: target === 1 ? 'Primeiro foco' : `${target} focos concluídos`, unlocked: values.length >= target, current: values.length, target, unit: 'sessions' as const })),
    ...targets(Math.floor(focusMs / 3600000)).map((target) => ({ id: `hours-${target}`, label: `${target} ${target === 1 ? 'hora' : 'horas'} de foco`, unlocked: focusMs >= target * 3600000, current: Math.floor(focusMs / 3600000), target, unit: 'hours' as const }))
  ]
  const collectionXp = Math.max(0, xp - constellationBaselineXp)
  const spent = (count: number): number => 12.5 * count * (count + 9)
  let completed = Math.max(0, Math.floor((Math.sqrt(81 + 0.32 * collectionXp) - 9) / 2))
  while (spent(completed + 1) <= collectionXp) completed++
  while (spent(completed) > collectionXp) completed--
  const starCost = 25 + 5 * completed
  const remaining = collectionXp - spent(completed)
  const stars = Math.floor(remaining / starCost)
  const starXp = remaining - stars * starCost
  const constellation = { completed, stars, totalStars: completed * 5 + stars, starXp, starCost, xpToNextStar: starCost - starXp }
  return { xp, level, levelXp, nextLevelXp, completedSessions: values.length, focusMs, achievements, constellation, lastReward: null }
}
