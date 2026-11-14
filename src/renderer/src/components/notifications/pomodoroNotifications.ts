import type { PomodoroReward } from '../../../../shared/pomodoro'

export interface NotificationContent { title: string; message: string }

export function pomodoroRewardNotification(reward: PomodoroReward, level: number): NotificationContent | null {
  const details = [
    reward.levelUp ? `Nível ${level} alcançado` : '',
    reward.starsRevealed ? `${reward.starsRevealed} ${reward.starsRevealed === 1 ? 'estrela revelada' : 'estrelas reveladas'}` : '',
    reward.constellationsCompleted ? `${reward.constellationsCompleted} ${reward.constellationsCompleted === 1 ? 'constelação concluída' : 'constelações concluídas'}` : '',
    ...reward.achievements.map((name) => `Conquista: ${name}`)
  ].filter(Boolean)
  return details.length ? { title: 'Progresso no Pomodoro', message: [`+${reward.xp} XP`, ...details].join(' · ') } : null
}
