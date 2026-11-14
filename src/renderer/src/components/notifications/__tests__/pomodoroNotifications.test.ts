import { describe, expect, it } from 'vitest'
import type { PomodoroReward } from '../../../../../shared/pomodoro'
import { pomodoroRewardNotification } from '../pomodoroNotifications'

describe('notificações de recompensa do Pomodoro', () => {
  const base: PomodoroReward = { sessionId: 'session', xp: 25, levelUp: false, achievements: [], starsRevealed: 0, constellationsCompleted: 0 }
  it('não notifica sessões sem um novo marco', () => expect(pomodoroRewardNotification(base, 1)).toBeNull())
  it('apresenta todas as recompensas recebidas na sessão', () => {
    const message = pomodoroRewardNotification({ ...base, levelUp: true, starsRevealed: 2, constellationsCompleted: 1, achievements: ['Primeiro foco'] }, 2)?.message
    expect(message).toContain('+25 XP')
    expect(message).toContain('Nível 2 alcançado')
    expect(message).toContain('2 estrelas reveladas')
    expect(message).toContain('1 constelação concluída')
    expect(message).toContain('Conquista: Primeiro foco')
  })
})
