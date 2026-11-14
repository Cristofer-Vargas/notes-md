import { randomUUID } from 'crypto'
import { copyFileSync, existsSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'fs'
import type { PomodoroAction, PomodoroEventReason, PomodoroEventType, PomodoroNote, PomodoroPhase, PomodoroSession, PomodoroSettings, PomodoroState } from '../shared/pomodoro'
import { DEFAULT_POMODORO_SETTINGS } from '../shared/pomodoro'

interface Snapshot { version: 2; state: PomodoroState; active: PomodoroSession | null }
interface Archive { version: 2; sessions: PomodoroSession[] }

export class PomodoroService {
  private state: PomodoroState
  private active: PomodoroSession | null = null
  private history: PomodoroSession[] = []
  private timer: ReturnType<typeof setInterval> | null = null
  private readonly snapshotFile: string
  private readonly archiveFile: string
  private readonly backupFile: string
  constructor(private file: string, private changed: (state: PomodoroState) => void, private notify: (phase: PomodoroPhase, sound: boolean) => void, private now: () => number = Date.now) {
    this.snapshotFile = `${file}.state-v2.json`; this.archiveFile = `${file}.history-v2.json`; this.backupFile = `${file}.v1.backup`
    const settings = { ...DEFAULT_POMODORO_SETTINGS }
    this.state = { phase: 'focus', status: 'idle', remainingMs: settings.focus * 60000, durationMs: settings.focus * 60000, startedAt: null, elapsedMs: 0, segmentStartedAt: null, completedInCycle: 0, vaultPath: '', vaultName: '', note: null, settings, historyVersion: 0 }
    try { this.load() } catch (error) { this.fail(error) }
  }
  private write(file: string, value: unknown): void {
    const tmp = `${file}.tmp`; const data = JSON.stringify(value)
    writeFileSync(tmp, data, 'utf8')
    try { renameSync(tmp, file) } catch { writeFileSync(file, data, 'utf8'); try { unlinkSync(tmp) } catch { /* already removed */ } }
  }
  private load(): void {
    if (existsSync(this.archiveFile)) {
      const archive = JSON.parse(readFileSync(this.archiveFile, 'utf8')) as Archive
      if (archive.version !== 2 || !Array.isArray(archive.sessions)) throw new Error('Histórico Pomodoro inválido ou incompatível')
      this.history = archive.sessions
    } else if (existsSync(this.file)) {
      const old = JSON.parse(readFileSync(this.file, 'utf8')) as PomodoroState & { history?: PomodoroSession[] }
      if (!existsSync(this.backupFile)) copyFileSync(this.file, this.backupFile)
      this.history = (old.history || []).map((item) => ({ ...item, phase: 'focus', plannedMs: null, cyclePosition: null, initialNote: item.note ? { ...item.note } : null, initialVaultName: item.vaultName, settingsSnapshot: null, events: [], intervals: [], detailStatus: 'legacy' }))
      const { history: _history, ...oldState } = old
      this.state = { ...this.state, ...oldState, settings: { ...this.state.settings, ...old.settings }, historyVersion: 0 }
      if (this.state.startedAt !== null && this.state.status !== 'idle') this.active = this.makeSession('legacy')
      this.writeArchive()
      this.saveSnapshot()
    }
    if (existsSync(this.snapshotFile)) {
      const snapshot = JSON.parse(readFileSync(this.snapshotFile, 'utf8')) as Snapshot
      if (snapshot.version !== 2 || !snapshot.state) throw new Error('Estado Pomodoro inválido ou incompatível')
      this.state = { ...this.state, ...snapshot.state, settings: { ...DEFAULT_POMODORO_SETTINGS, ...snapshot.state.settings } }
      this.active = snapshot.active || null
    } else if (existsSync(this.file)) {
      const old = JSON.parse(readFileSync(this.file, 'utf8')) as PomodoroState & { history?: PomodoroSession[] }
      const { history: _history, ...oldState } = old
      this.state = { ...this.state, ...oldState, settings: { ...this.state.settings, ...old.settings }, historyVersion: 0 }
      if (this.state.startedAt !== null && this.state.status !== 'idle') this.active = this.makeSession('legacy')
    }
    if (this.active && this.history.some((item) => item.id === this.active!.id)) {
      const finished = this.history.find((item) => item.id === this.active!.id)!
      const lastEvent = finished.events?.[finished.events.length - 1]?.type
      const next: PomodoroPhase = finished.outcome === 'interrupted' ? (lastEvent === 'cancel' ? 'focus' : finished.phase ?? 'focus') : finished.phase === 'focus' ? (this.state.completedInCycle + 1 >= this.state.settings.longBreakEvery ? 'longBreak' : 'shortBreak') : 'focus'
      if (finished.phase === 'focus' && finished.outcome === 'completed') this.state.completedInCycle++
      if (finished.phase === 'longBreak' && finished.outcome !== 'interrupted') this.state.completedInCycle = 0
      if (lastEvent === 'cancel') { this.state.completedInCycle = 0; this.state.note = null }
      this.active = null; this.prepare(next)
    }
    if (this.state.status === 'running') {
      const checkpoint = this.state.segmentStartedAt ?? this.now()
      this.state.status = 'paused'; this.state.segmentStartedAt = null
      this.event('pause', 'recovery', checkpoint)
    }
    this.saveSnapshot()
  }
  getState(): PomodoroState { return structuredClone(this.state) }
  getHistory(): PomodoroSession[] { return structuredClone(this.history) }
  private fail(error: unknown): void {
    console.error('Falha ao acessar os dados do Pomodoro:', error)
    this.stopTimer()
    if (this.state.status === 'running') { this.state.status = 'paused'; this.state.segmentStartedAt = null }
    this.state.storageError = 'Não foi possível acessar o histórico do Pomodoro. Os arquivos existentes foram preservados; reinicie o aplicativo após verificar o armazenamento.'
    this.changed(this.getState())
  }
  private saveSnapshot(): void { this.write(this.snapshotFile, { version: 2, state: this.state, active: this.active } satisfies Snapshot) }
  private writeArchive(): void { this.write(this.archiveFile, { version: 2, sessions: this.history } satisfies Archive) }
  private emit(persist = true): void { if (persist) this.saveSnapshot(); this.changed(this.getState()) }
  private duration(phase: PomodoroPhase): number { return this.state.settings[phase] * 60000 }
  private event(type: PomodoroEventType, reason: PomodoroEventReason, at = this.now()): void {
    if (!this.active) return
    this.active.events ??= []
    this.active.events.push({ type, at, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', utcOffsetMinutes: -new Date(at).getTimezoneOffset(), reason })
  }
  private makeSession(detailStatus: 'complete' | 'legacy' = 'complete'): PomodoroSession {
    return { id: randomUUID(), phase: this.state.phase, startedAt: this.state.startedAt ?? this.now(), endedAt: 0, elapsedMs: this.state.elapsedMs, outcome: 'interrupted', vaultPath: this.state.vaultPath, vaultName: this.state.vaultName, initialVaultName: this.state.vaultName, note: this.state.note ? { ...this.state.note } : null, initialNote: this.state.note ? { ...this.state.note } : null, plannedMs: detailStatus === 'legacy' ? null : this.state.durationMs, cyclePosition: detailStatus === 'legacy' ? null : this.state.completedInCycle + 1, settingsSnapshot: detailStatus === 'legacy' ? null : { ...this.state.settings }, events: [], intervals: [], detailStatus }
  }
  private updateElapsed(): void {
    if (this.state.status !== 'running' || this.state.segmentStartedAt === null) return
    const now = this.now(); const start = this.state.segmentStartedAt; const used = Math.min(Math.max(0, now - start), this.state.remainingMs)
    if (used > 0 && this.active) { const intervals = this.active.intervals ??= []; const last = intervals[intervals.length - 1]; if (last && last.end === start) last.end = start + used; else intervals.push({ start, end: start + used }) }
    this.state.remainingMs -= used; this.state.elapsedMs += used; this.state.segmentStartedAt = now
  }
  tick(): void { if (this.state.status !== 'running' || this.state.storageError) return; try { this.updateElapsed(); if (this.state.remainingMs <= 0) { this.complete(); return }; this.emit() } catch (error) { this.fail(error) } }
  private startTimer(): void { if (!this.timer) { this.timer = setInterval(() => this.tick(), 1000); this.timer.unref?.() } }
  private stopTimer(): void { if (this.timer) clearInterval(this.timer); this.timer = null }
  private finish(outcome: PomodoroSession['outcome'], type: PomodoroEventType, reason: PomodoroEventReason): void {
    if (!this.active) return
    this.event(type, reason); this.active.endedAt = this.now(); this.active.elapsedMs = this.state.elapsedMs; this.active.outcome = outcome
    if (!this.history.some((item) => item.id === this.active!.id)) { this.history.push(this.active); this.writeArchive(); this.state.historyVersion++ }
    this.active = null
  }
  private prepare(phase: PomodoroPhase): void { this.state.phase = phase; this.state.status = 'idle'; this.state.durationMs = this.duration(phase); this.state.remainingMs = this.state.durationMs; this.state.elapsedMs = 0; this.state.startedAt = null; this.state.segmentStartedAt = null }
  private complete(): void {
    const phase = this.state.phase; this.stopTimer(); this.finish('completed', 'complete', 'automatic')
    if (phase === 'focus') this.state.completedInCycle++
    const next: PomodoroPhase = phase === 'focus' ? (this.state.completedInCycle >= this.state.settings.longBreakEvery ? 'longBreak' : 'shortBreak') : 'focus'
    if (phase === 'longBreak') this.state.completedInCycle = 0
    this.prepare(next); if (this.state.settings.continuous) this.begin('automatic'); this.emit()
    if (this.state.settings.notifications) this.notify(phase, this.state.settings.sound)
  }
  private begin(reason: PomodoroEventReason): void {
    const resume = this.state.status === 'paused'; this.state.status = 'running'; this.state.startedAt ??= this.now(); this.state.segmentStartedAt = this.now()
    if (!this.active) this.active = this.makeSession()
    this.event(resume ? 'resume' : 'start', reason); this.startTimer()
  }
  action(action: PomodoroAction, note?: PomodoroNote | null, vault?: { vaultPath: string; vaultName: string }, reason: PomodoroEventReason = 'user'): PomodoroState {
    if (this.state.storageError) return this.getState()
    try { return this.performAction(action, note, vault, reason) } catch (error) { this.fail(error); return this.getState() }
  }
  private performAction(action: PomodoroAction, note?: PomodoroNote | null, vault?: { vaultPath: string; vaultName: string }, reason: PomodoroEventReason = 'user'): PomodoroState {
    if (this.state.status === 'running' && this.state.segmentStartedAt !== null && this.now() - this.state.segmentStartedAt >= this.state.remainingMs) { this.tick(); return this.getState() }
    if (action === 'start' && this.state.status === 'idle') { if (this.state.phase === 'focus') { this.state.note = note ?? null; this.state.vaultPath = note?.vaultPath ?? vault?.vaultPath ?? ''; this.state.vaultName = note?.vaultName ?? vault?.vaultName ?? '' }; this.begin(reason) }
    else if (action === 'resume' && this.state.status === 'paused') this.begin(reason)
    else if (action === 'pause' && this.state.status === 'running') { this.updateElapsed(); this.stopTimer(); this.event('pause', reason); this.state.status = 'paused'; this.state.segmentStartedAt = null }
    else if ((action === 'cancel' || action === 'reset') && this.state.status !== 'idle') { this.updateElapsed(); this.stopTimer(); this.finish('interrupted', action, reason); const phase = this.state.phase; this.prepare(phase); if (action === 'cancel') { this.state.note = null; this.state.completedInCycle = 0; this.prepare('focus') } }
    else if (action === 'skip' && this.state.phase !== 'focus') { this.updateElapsed(); this.stopTimer(); if (!this.active) this.active = this.makeSession(); this.finish('skipped', 'skip', reason); if (this.state.phase === 'longBreak') this.state.completedInCycle = 0; this.prepare('focus') }
    this.emit(); return this.getState()
  }
  configure(input: Partial<PomodoroSettings>): PomodoroState {
    if (this.state.storageError) return this.getState()
    const next = { ...this.state.settings }
    for (const key of ['focus', 'shortBreak', 'longBreak', 'longBreakEvery'] as const) if (typeof input[key] === 'number' && Number.isFinite(input[key])) next[key] = Math.max(1, Math.min(key === 'longBreakEvery' ? 20 : 180, Math.round(input[key]!)))
    for (const key of ['continuous', 'notifications', 'sound'] as const) if (typeof input[key] === 'boolean') next[key] = input[key]!
    this.state.settings = next
    if (this.state.status === 'idle') { this.state.durationMs = this.duration(this.state.phase); this.state.remainingMs = this.state.durationMs }
    try { this.emit() } catch (error) { this.fail(error) }; return this.getState()
  }
  rename(vaultPath: string, oldPath: string, newPath: string): void {
    if (this.state.storageError) return
    const update = (note: PomodoroNote | null): void => { if (!note || note.vaultPath !== vaultPath) return; if (note.relativePath === oldPath || note.relativePath.startsWith(`${oldPath}/`)) { note.relativePath = newPath + note.relativePath.slice(oldPath.length); note.name = note.relativePath.split('/').pop()!.replace(/\.md$/i, '') } }
    update(this.state.note); if (this.active) update(this.active.note); this.history.forEach((item) => update(item.note)); try { this.writeArchive(); this.state.historyVersion++; this.emit() } catch (error) { this.fail(error) }
  }
  deleteHistory(from: number, to: number): number {
    if (this.state.storageError) throw new Error(this.state.storageError)
    if (!Number.isFinite(from) || !Number.isFinite(to) || from > to) throw new Error('Período inválido')
    const keep = (item: PomodoroSession): boolean => item.endedAt < from || item.endedAt >= to
    try {
      if (existsSync(this.backupFile)) { const backup = JSON.parse(readFileSync(this.backupFile, 'utf8')) as { history?: PomodoroSession[] }; if (Array.isArray(backup.history)) { backup.history = backup.history.filter(keep); this.write(this.backupFile, backup) } }
      if (existsSync(this.file)) { const legacy = JSON.parse(readFileSync(this.file, 'utf8')) as { history?: PomodoroSession[] }; if (Array.isArray(legacy.history)) { legacy.history = legacy.history.filter(keep); this.write(this.file, legacy) } }
      const count = this.history.length; const retained = this.history.filter(keep)
      this.write(this.archiveFile, { version: 2, sessions: retained } satisfies Archive)
      this.history = retained; this.state.historyVersion++; this.emit(); return count - retained.length
    } catch (error) { this.fail(error); throw error }
  }
  shutdown(): void { if (this.state.status === 'running') this.action('pause', undefined, undefined, 'shutdown'); if (this.state.status === 'running') this.action('pause', undefined, undefined, 'shutdown'); if (!this.state.storageError) { try { this.saveSnapshot() } catch (error) { this.fail(error) } }; this.stopTimer() }
}
