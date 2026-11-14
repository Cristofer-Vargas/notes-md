export type PomodoroPhase = 'focus' | 'shortBreak' | 'longBreak'
export type PomodoroStatus = 'idle' | 'running' | 'paused'
export interface PomodoroNote { vaultPath: string; vaultName: string; relativePath: string; name: string }
export interface PomodoroContext { vaultPath: string; vaultName: string; activePath: string | null; notes: Array<{ relativePath: string; name: string }> }
export interface PomodoroSettings { focus: number; shortBreak: number; longBreak: number; longBreakEvery: number; continuous: boolean; notifications: boolean; sound: boolean }
export type PomodoroEventType = 'start' | 'pause' | 'resume' | 'complete' | 'cancel' | 'reset' | 'skip'
export type PomodoroEventReason = 'user' | 'automatic' | 'suspend' | 'shutdown' | 'recovery'
export interface PomodoroEvent { type: PomodoroEventType; at: number; timezone: string; utcOffsetMinutes: number; reason: PomodoroEventReason }
export interface PomodoroInterval { start: number; end: number }
export interface PomodoroSession { id: string; startedAt: number; endedAt: number; elapsedMs: number; outcome: 'completed' | 'interrupted' | 'skipped'; vaultPath: string; vaultName: string; note: PomodoroNote | null; phase?: PomodoroPhase; plannedMs?: number | null; cyclePosition?: number | null; initialNote?: PomodoroNote | null; initialVaultName?: string; settingsSnapshot?: PomodoroSettings | null; events?: PomodoroEvent[]; intervals?: PomodoroInterval[]; detailStatus?: 'complete' | 'legacy'; source?: 'debug' }
export type PomodoroDebugAction = { type: 'sessions'; count: number; minutes: number } | { type: 'xp'; xp: number } | { type: 'complete' } | { type: 'clear' }
export interface PomodoroAchievement { id: string; label: string; unlocked: boolean; current: number; target: number; unit: 'sessions' | 'hours' }
export interface PomodoroConstellation { completed: number; stars: number; totalStars: number; starXp: number; starCost: number; xpToNextStar: number }
export interface PomodoroReward { sessionId: string; xp: number; levelUp: boolean; achievements: string[]; starsRevealed: number; constellationsCompleted: number }
export interface PomodoroProgress { xp: number; level: number; levelXp: number; nextLevelXp: number; completedSessions: number; focusMs: number; achievements: PomodoroAchievement[]; constellation: PomodoroConstellation; lastReward: PomodoroReward | null }
export interface PomodoroState { phase: PomodoroPhase; status: PomodoroStatus; remainingMs: number; durationMs: number; startedAt: number | null; elapsedMs: number; segmentStartedAt: number | null; completedInCycle: number; vaultPath: string; vaultName: string; note: PomodoroNote | null; settings: PomodoroSettings; historyVersion: number; progress: PomodoroProgress; storageError?: string }
export const DEFAULT_POMODORO_SETTINGS: PomodoroSettings = { focus: 25, shortBreak: 5, longBreak: 15, longBreakEvery: 4, continuous: false, notifications: true, sound: true }
export type PomodoroAction = 'start' | 'pause' | 'resume' | 'cancel' | 'reset' | 'skip'
