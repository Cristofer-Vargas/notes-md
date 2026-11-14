import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PomodoroService } from '../pomodoroService'

describe('PomodoroService', () => {
  let dir: string
  let now: number
  let service: PomodoroService
  let notify: ReturnType<typeof vi.fn>
  beforeEach(() => { vi.useFakeTimers(); dir = mkdtempSync(join(process.cwd(), '.pomodoro-test-')); now = 1_000_000; notify = vi.fn(); service = new PomodoroService(join(dir, 'data.json'), vi.fn(), notify, () => now); service.configure({ focus: 1, shortBreak: 1, longBreak: 1, longBreakEvery: 2 }) })
  afterEach(() => { service.shutdown(); vi.useRealTimers(); rmSync(dir, { recursive: true, force: true }) })
  const advance = (ms: number): void => { now += ms; service.tick() }
  it('concede XP apenas por foco concluído e preserva o progresso ao excluir e reiniciar', () => {
    service.action('start'); advance(60_000)
    expect(service.getState().progress).toMatchObject({ xp: 1, level: 1, completedSessions: 1, focusMs: 60_000, lastReward: { xp: 1 } })
    expect(service.getState().progress.achievements.find((a) => a.id === 'sessions-1')?.unlocked).toBe(true)
    service.action('start'); advance(60_000)
    service.action('start'); advance(30_000); service.action('cancel')
    expect(service.getState().progress.xp).toBe(1)
    service.deleteHistory(0, now + 1)
    service.shutdown()
    service = new PomodoroService(join(dir, 'data.json'), vi.fn(), notify, () => now)
    expect(service.getHistory()).toHaveLength(0)
    expect(service.getState().progress).toMatchObject({ xp: 1, completedSessions: 1, lastReward: null })
  })
  it('recupera XP de sessão gravada antes de uma interrupção e não duplica ao reabrir', () => {
    const file = join(dir, 'data.json')
    service.action('start'); advance(60_000); service.shutdown()
    writeFileSync(`${file}.progress-v1.json`, JSON.stringify({ version: 1, entries: {} }))
    service = new PomodoroService(file, vi.fn(), notify, () => now)
    expect(service.getState().progress.xp).toBe(1)
    service.shutdown()
    service = new PomodoroService(file, vi.fn(), notify, () => now)
    expect(service.getState().progress).toMatchObject({ xp: 1, completedSessions: 1 })
  })
  it('inicia a coleção após a migração e mantém estrelas ao excluir histórico e reabrir', () => {
    const file = join(dir, 'data.json')
    service.action('start'); advance(60_000); service.shutdown()
    const archive = JSON.parse(readFileSync(`${file}.progress-v1.json`, 'utf8'))
    delete archive.constellationBaselineXp
    writeFileSync(`${file}.progress-v1.json`, JSON.stringify(archive))
    service = new PomodoroService(file, vi.fn(), notify, () => now)
    expect(service.getState().progress).toMatchObject({ xp: 1, constellation: { stars: 0, xpToNextStar: 25 } })
    service.action('skip'); service.configure({ focus: 25 }); service.action('start'); advance(25 * 60000)
    expect(service.getState().progress).toMatchObject({ xp: 26, constellation: { stars: 1 }, lastReward: { starsRevealed: 1 } })
    service.deleteHistory(0, now + 1); service.shutdown()
    service = new PomodoroService(file, vi.fn(), notify, () => now)
    expect(service.getState().progress).toMatchObject({ xp: 26, constellation: { stars: 1 } })
  })
  it('avança entre foco e pausas e reserva a pausa longa para o ciclo configurado', () => {
    service.action('start'); advance(60_000)
    expect(service.getState()).toMatchObject({ phase: 'shortBreak', status: 'idle', completedInCycle: 1 })
    expect(service.getHistory()).toHaveLength(1)
    service.action('start'); advance(60_000)
    expect(service.getState().phase).toBe('focus')
    service.action('start'); advance(60_000)
    expect(service.getState()).toMatchObject({ phase: 'longBreak', completedInCycle: 2 })
    service.action('skip')
    expect(service.getState()).toMatchObject({ phase: 'focus', completedInCycle: 0 })
    expect(notify).toHaveBeenCalledTimes(3)
  })
  it('pausa ao encerrar e recupera sem contabilizar o tempo fora do aplicativo', () => {
    service.action('start'); advance(15_000); service.shutdown(); now += 3_600_000
    service = new PomodoroService(join(dir, 'data.json'), vi.fn(), notify, () => now)
    expect(service.getState()).toMatchObject({ status: 'paused', remainingMs: 45_000 })
    service.action('resume'); advance(45_000)
    expect(service.getHistory()).toHaveLength(1)
    expect(service.getHistory()[0].elapsedMs).toBe(60_000)
  })
  it('registra interrupções uma vez e acompanha movimentação da nota e de sua pasta', () => {
    service.action('start', { vaultPath: 'cofre', vaultName: 'Cofre', relativePath: 'pasta/nota.md', name: 'nota' })
    advance(20_000); service.rename('cofre', 'pasta', 'outra'); service.action('cancel'); service.action('cancel')
    expect(service.getHistory()).toHaveLength(1)
    expect(service.getHistory()[0]).toMatchObject({ elapsedMs: 20_000, outcome: 'interrupted', note: { relativePath: 'outra/nota.md' } })
  })
  it('inicia a próxima etapa automaticamente apenas quando configurado', () => {
    service.configure({ continuous: true, notifications: false }); service.action('start'); advance(60_000)
    expect(service.getState()).toMatchObject({ phase: 'shortBreak', status: 'running' })
    expect(notify).not.toHaveBeenCalled()
  })
  it('guarda o cofre mesmo sem nota e aplica nova duração somente na próxima etapa', () => {
    service.action('start', null, { vaultPath: 'cofre', vaultName: 'Cofre' })
    service.configure({ focus: 2 })
    expect(service.getState().remainingMs).toBe(60_000)
    advance(60_000)
    expect(service.getHistory()[0]).toMatchObject({ vaultPath: 'cofre', vaultName: 'Cofre', note: null })
    service.action('skip')
    expect(service.getState().remainingMs).toBe(120_000)
  })
  it('recupera um estado em execução como pausado e não duplica uma conclusão', () => {
    service.action('start'); advance(10_000)
    const restored = new PomodoroService(join(dir, 'data.json'), vi.fn(), notify, () => now)
    expect(restored.getState()).toMatchObject({ status: 'paused', remainingMs: 50_000 })
    restored.action('resume'); now += 50_000; restored.tick(); restored.tick()
    expect(restored.getHistory()).toHaveLength(1)
    restored.shutdown()
  })
  it('registra eventos, intervalos, pausas e nomes originais após renomeação', () => {
    service.action('start', { vaultPath: 'cofre', vaultName: 'Cofre', relativePath: 'antes.md', name: 'antes' })
    advance(10_000); service.action('pause'); now += 5_000; service.action('resume'); advance(50_000)
    service.rename('cofre', 'antes.md', 'depois.md')
    const entry = service.getHistory()[0]
    expect(entry.events?.map((e) => e.type)).toEqual(['start', 'pause', 'resume', 'complete'])
    expect(entry.intervals).toHaveLength(2)
    expect(entry.initialNote?.relativePath).toBe('antes.md')
    expect(entry.note?.relativePath).toBe('depois.md')
    service.action('skip')
    expect(service.getHistory()[1]).toMatchObject({ phase: 'shortBreak', outcome: 'skipped' })
  })
  it('migra o histórico antigo com backup, sem inventar intervalos, e preserva a sessão ativa ao excluir', () => {
    service.shutdown()
    const file = join(dir, 'legacy.json')
    const legacy = { ...service.getState(), history: [{ id: 'old', startedAt: 100, endedAt: 200, elapsedMs: 100, outcome: 'completed', vaultPath: 'v', vaultName: 'V', note: null }] }
    writeFileSync(file, JSON.stringify(legacy))
    service = new PomodoroService(file, vi.fn(), notify, () => now)
    expect(existsSync(`${file}.v1.backup`)).toBe(true)
    expect(service.getHistory()[0]).toMatchObject({ id: 'old', detailStatus: 'legacy', plannedMs: null, intervals: [] })
    service.action('start'); now += 1000; service.tick()
    expect(service.deleteHistory(0, 300)).toBe(1)
    expect(service.getState().status).toBe('running')
    expect(service.getHistory()).toHaveLength(0)
    expect(JSON.parse(readFileSync(`${file}.v1.backup`, 'utf8')).history).toHaveLength(0)
    expect(JSON.parse(readFileSync(file, 'utf8')).history).toHaveLength(0)
  })
  it('distingue suspensão e fechamento e guarda configurações originais', () => {
    service.action('start'); now += 5000; service.action('pause', undefined, undefined, 'suspend')
    now += 2000; service.action('resume'); now += 5000; service.shutdown()
    service = new PomodoroService(join(dir, 'data.json'), vi.fn(), notify, () => now)
    service.action('resume'); now += 1000; service.action('cancel')
    const entry = service.getHistory()[0]
    expect(entry.settingsSnapshot?.focus).toBe(1)
    expect(entry.events?.filter((e) => e.type === 'pause').map((e) => e.reason)).toEqual(['suspend', 'shutdown'])
    expect(entry.events?.every((e) => typeof e.timezone === 'string' && Number.isFinite(e.utcOffsetMinutes))).toBe(true)
  })
  it('recupera após gravação da sessão sem duplicar registro ou repetir a etapa', () => {
    const file = join(dir, 'data.json')
    service.action('start'); advance(30_000)
    const oldSnapshot = readFileSync(`${file}.state-v2.json`, 'utf8')
    advance(30_000)
    writeFileSync(`${file}.state-v2.json`, oldSnapshot)
    const recovered = new PomodoroService(file, vi.fn(), notify, () => now)
    expect(recovered.getHistory()).toHaveLength(1)
    expect(recovered.getState()).toMatchObject({ phase: 'shortBreak', status: 'idle', completedInCycle: 1 })
    recovered.shutdown()
  })
  it('preserva arquivo inválido e sinaliza falha sem sobrescrever os dados', () => {
    const file = join(dir, 'broken.json'); const original = '{ invalid'
    writeFileSync(file, original)
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const broken = new PomodoroService(file, vi.fn(), notify, () => now)
    expect(broken.getState().storageError).toBeTruthy()
    broken.action('start'); broken.shutdown()
    expect(readFileSync(file, 'utf8')).toBe(original)
    expect(existsSync(`${file}.history-v2.json`)).toBe(false)
    log.mockRestore()
  })
})
