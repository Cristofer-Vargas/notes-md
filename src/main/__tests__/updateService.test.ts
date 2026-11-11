import { describe, it, expect, vi } from 'vitest'
import { AppUpdateService, type AutoUpdaterLike } from '../updateService'
import type { AppUpdateState } from '../../shared/appUpdate'

function createMockUpdater() {
  const listeners = new Map<string, Array<(...args: any[]) => void>>()

  const updater: AutoUpdaterLike = {
    autoDownload: true,
    autoInstallOnAppQuit: false,
    allowPrerelease: false,
    on(event, listener) {
      const list = listeners.get(event) || []
      list.push(listener)
      listeners.set(event, list)
      return updater
    },
    checkForUpdates: vi.fn(async () => {}),
    downloadUpdate: vi.fn(async () => {}),
    quitAndInstall: vi.fn()
  }

  return {
    updater,
    emit(event: string, ...args: any[]) {
      for (const listener of listeners.get(event) || []) {
        listener(...args)
      }
    }
  }
}

describe('AppUpdateService', () => {
  it('permanece seguro e inativo em modo dev', async () => {
    const loadAutoUpdater = vi.fn()
    const service = new AppUpdateService({
      isPackaged: false,
      currentVersion: '0.2.0-alpha.1',
      onStateChange: vi.fn(),
      loadAutoUpdater
    })

    expect(service.getState().phase).toBe('unsupported-dev')
    const afterCheck = await service.checkForUpdates()
    expect(afterCheck.phase).toBe('unsupported-dev')
    expect(loadAutoUpdater).not.toHaveBeenCalled()
    expect(await service.installUpdate()).toBe(false)
  })

  it('percorre fluxo completo de verificação, download e instalação quando empacotado', async () => {
    const mock = createMockUpdater()
    const states: AppUpdateState[] = []

    const service = new AppUpdateService({
      isPackaged: true,
      currentVersion: '0.2.0-alpha.1',
      onStateChange: (state) => states.push(state),
      loadAutoUpdater: async () => mock.updater
    })

    mock.updater.checkForUpdates = vi.fn(async () => {
      mock.emit('checking-for-update')
      mock.emit('update-available', { version: '0.2.0-alpha.2', releaseDate: '2026-11-11' })
    })

    mock.updater.downloadUpdate = vi.fn(async () => {
      mock.emit('download-progress', { percent: 64.4 })
      mock.emit('update-downloaded', { version: '0.2.0-alpha.2', releaseDate: '2026-11-11' })
    })

    const checked = await service.checkForUpdates()
    expect(mock.updater.autoDownload).toBe(true)
    expect(mock.updater.allowPrerelease).toBe(true)
    expect(checked.phase).toBe('available')
    expect(checked.availableVersion).toBe('0.2.0-alpha.2')

    const downloaded = await service.downloadUpdate()
    expect(downloaded.phase).toBe('downloaded')
    expect(downloaded.downloadPercent).toBe(100)

    const installed = await service.installUpdate()
    expect(installed).toBe(true)
    expect(mock.updater.quitAndInstall).toHaveBeenCalledWith(false, true)
    expect(states.some((s) => s.phase === 'downloading' && s.downloadPercent === 64)).toBe(true)
  })

  it('oculta erro de release inexistente em checagem silenciosa mas informa em checagem manual', async () => {
    const mock = createMockUpdater()
    mock.updater.checkForUpdates = vi.fn(async () => {
      throw new Error('HttpError: 404 "Cannot find latest.yml"')
    })

    const service = new AppUpdateService({
      isPackaged: true,
      currentVersion: '0.2.0-alpha.1',
      onStateChange: vi.fn(),
      loadAutoUpdater: async () => mock.updater
    })

    const silentResult = await service.checkForUpdates({ silentIfUnavailable: true })
    expect(silentResult.phase).toBe('idle')

    const manualResult = await service.checkForUpdates({ silentIfUnavailable: false })
    expect(manualResult.phase).toBe('error')
    expect(manualResult.message).toContain('Nenhuma release publicada')
  })

  it('executa verificação automática periódica e ao focar respeitando cooldown', async () => {
    vi.useFakeTimers()
    try {
      const mock = createMockUpdater()
      const service = new AppUpdateService({
        isPackaged: true,
        currentVersion: '0.2.0-alpha.1',
        onStateChange: vi.fn(),
        loadAutoUpdater: async () => mock.updater
      })

      service.startAutoCheck({
        startupDelayMs: 5_000,
        intervalMs: 60_000,
        focusCooldownMs: 30_000
      })

      expect(mock.updater.checkForUpdates).not.toHaveBeenCalled()

      await vi.advanceTimersByTimeAsync(5_000)
      expect(mock.updater.checkForUpdates).toHaveBeenCalledTimes(1)

      // Focus immediately after startup check should respect cooldown
      service.maybeCheckOnFocus()
      expect(mock.updater.checkForUpdates).toHaveBeenCalledTimes(1)

      // After cooldown expires, focus triggers check
      await vi.advanceTimersByTimeAsync(35_000)
      service.maybeCheckOnFocus()
      await vi.advanceTimersByTimeAsync(0)
      expect(mock.updater.checkForUpdates).toHaveBeenCalledTimes(2)

      // Periodic poll fires on interval
      await vi.advanceTimersByTimeAsync(60_000)
      expect(mock.updater.checkForUpdates).toHaveBeenCalledTimes(3)

      // Once downloaded, silent polling and focus no longer re-check
      mock.emit('update-downloaded', { version: '0.2.0-alpha.2' })
      await vi.advanceTimersByTimeAsync(120_000)
      service.maybeCheckOnFocus()
      expect(mock.updater.checkForUpdates).toHaveBeenCalledTimes(3)

      service.stopAutoCheck()
    } finally {
      vi.useRealTimers()
    }
  })
})
