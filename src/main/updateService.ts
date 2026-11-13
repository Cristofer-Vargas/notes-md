import type { AppUpdateState } from '../shared/appUpdate'

export interface UpdaterUpdateInfo {
  version: string
  releaseDate?: string
}

export interface UpdaterProgressInfo {
  percent: number
}

export interface AutoUpdaterLike {
  autoDownload: boolean
  autoInstallOnAppQuit: boolean
  allowPrerelease: boolean
  on(event: 'checking-for-update', listener: () => void): unknown
  on(event: 'update-available', listener: (info: UpdaterUpdateInfo) => void): unknown
  on(event: 'update-not-available', listener: (info: UpdaterUpdateInfo) => void): unknown
  on(event: 'download-progress', listener: (progress: UpdaterProgressInfo) => void): unknown
  on(event: 'update-downloaded', listener: (info: UpdaterUpdateInfo) => void): unknown
  on(event: 'error', listener: (error: Error) => void): unknown
  checkForUpdates(): Promise<unknown>
  downloadUpdate(): Promise<unknown>
  quitAndInstall(isSilent?: boolean, isForceRunAfter?: boolean): void
}

export interface AppUpdateServiceOptions {
  isPackaged: boolean
  currentVersion: string
  onStateChange: (state: AppUpdateState) => void
  loadAutoUpdater?: () => Promise<AutoUpdaterLike>
}

export function extractAutoUpdater(mod: unknown): AutoUpdaterLike {
  const anyMod = mod as any
  const candidate =
    anyMod?.autoUpdater ||
    anyMod?.default?.autoUpdater ||
    (typeof anyMod?.checkForUpdates === 'function' ? anyMod : undefined) ||
    (typeof anyMod?.default?.checkForUpdates === 'function' ? anyMod.default : undefined)

  if (!candidate || typeof candidate.checkForUpdates !== 'function') {
    throw new Error(
      'Não foi possível inicializar o autoUpdater: instância válida não encontrada nas exportações de electron-updater.'
    )
  }

  return candidate as AutoUpdaterLike
}

async function defaultLoadAutoUpdater(): Promise<AutoUpdaterLike> {
  let mod: unknown
  try {
    mod = await import('electron-updater')
  } catch (importErr) {
    try {
      // Fallback para ambientes CommonJS
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      mod = require('electron-updater')
    } catch {
      throw importErr
    }
  }
  return extractAutoUpdater(mod)
}

function isUnavailableOrOfflineError(rawMessage: string): boolean {
  const normalized = rawMessage.toLowerCase()
  return (
    normalized.includes('404') ||
    normalized.includes('no published versions') ||
    normalized.includes('cannot find latest.yml') ||
    normalized.includes('enotfound') ||
    normalized.includes('econnrefused') ||
    normalized.includes('etimedout') ||
    normalized.includes('err_internet_disconnected') ||
    normalized.includes('net::err_')
  )
}

const DEFAULT_STARTUP_DELAY_MS = 5_000
const DEFAULT_POLL_INTERVAL_MS = 30 * 60 * 1_000
const DEFAULT_FOCUS_COOLDOWN_MS = 15 * 60 * 1_000

export class AppUpdateService {
  private state: AppUpdateState
  private updaterPromise: Promise<AutoUpdaterLike> | null = null
  private lastCheckSilent = false
  private lastCheckTriggeredAt = 0
  private focusCooldownMs = DEFAULT_FOCUS_COOLDOWN_MS
  private startupTimer: NodeJS.Timeout | null = null
  private pollTimer: NodeJS.Timeout | null = null

  constructor(private readonly options: AppUpdateServiceOptions) {
    this.state = options.isPackaged
      ? {
          phase: 'idle',
          currentVersion: options.currentVersion,
          message: 'Pronto para verificar atualizações.'
        }
      : {
          phase: 'unsupported-dev',
          currentVersion: options.currentVersion,
          message:
            'Executando em modo Dev isolado. As atualizações automáticas ficam ativas apenas no executável instalado.'
        }
  }

  public getState(): AppUpdateState {
    return { ...this.state }
  }

  public startAutoCheck(options?: {
    startupDelayMs?: number
    intervalMs?: number
    focusCooldownMs?: number
  }): void {
    if (!this.options.isPackaged) return
    this.stopAutoCheck()

    const startupDelayMs = options?.startupDelayMs ?? DEFAULT_STARTUP_DELAY_MS
    const intervalMs = options?.intervalMs ?? DEFAULT_POLL_INTERVAL_MS
    this.focusCooldownMs = options?.focusCooldownMs ?? DEFAULT_FOCUS_COOLDOWN_MS

    this.startupTimer = setTimeout(() => {
      this.startupTimer = null
      void this.checkForUpdates({ silentIfUnavailable: true })
    }, startupDelayMs)
    this.startupTimer.unref?.()

    if (intervalMs > 0) {
      this.pollTimer = setInterval(() => {
        void this.checkForUpdates({ silentIfUnavailable: true })
      }, intervalMs)
      this.pollTimer.unref?.()
    }
  }

  public stopAutoCheck(): void {
    if (this.startupTimer) {
      clearTimeout(this.startupTimer)
      this.startupTimer = null
    }
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
  }

  public maybeCheckOnFocus(): void {
    if (!this.options.isPackaged) return
    if (
      this.state.phase === 'checking' ||
      this.state.phase === 'downloading' ||
      this.state.phase === 'downloaded'
    ) {
      return
    }
    if (Date.now() - this.lastCheckTriggeredAt < this.focusCooldownMs) {
      return
    }
    void this.checkForUpdates({ silentIfUnavailable: true })
  }

  public async checkForUpdates(options?: { silentIfUnavailable?: boolean }): Promise<AppUpdateState> {
    if (!this.options.isPackaged) {
      return this.getState()
    }

    if (
      this.state.phase === 'checking' ||
      this.state.phase === 'downloading' ||
      (options?.silentIfUnavailable && this.state.phase === 'downloaded')
    ) {
      return this.getState()
    }

    this.lastCheckTriggeredAt = Date.now()
    this.lastCheckSilent = Boolean(options?.silentIfUnavailable)

    try {
      const updater = await this.ensureUpdater()
      await updater.checkForUpdates()
    } catch (error) {
      this.handleUpdaterError(error)
    }

    return this.getState()
  }

  public async downloadUpdate(): Promise<AppUpdateState> {
    if (!this.options.isPackaged) {
      return this.getState()
    }

    if (this.state.phase !== 'available' && this.state.phase !== 'error') {
      return this.getState()
    }

    this.setState({
      ...this.state,
      phase: 'downloading',
      downloadPercent: 0,
      message: `Baixando atualização ${this.state.availableVersion || ''}...`.trim()
    })

    try {
      const updater = await this.ensureUpdater()
      await updater.downloadUpdate()
    } catch (error) {
      this.lastCheckSilent = false
      this.handleUpdaterError(error)
    }

    return this.getState()
  }

  public async installUpdate(): Promise<boolean> {
    if (!this.options.isPackaged || this.state.phase !== 'downloaded') {
      return false
    }

    const updater = await this.ensureUpdater()
    updater.quitAndInstall(false, true)
    return true
  }

  private async ensureUpdater(): Promise<AutoUpdaterLike> {
    if (!this.updaterPromise) {
      const loader = this.options.loadAutoUpdater || defaultLoadAutoUpdater
      this.updaterPromise = (async () => {
        const updater = await loader()
        if (!updater || typeof updater.checkForUpdates !== 'function') {
          throw new Error('Instância do autoUpdater retornou indefinida ou inválida.')
        }
        updater.autoDownload = true
        updater.autoInstallOnAppQuit = true
        updater.allowPrerelease = true
        this.bindEvents(updater)
        return updater
      })().catch((error) => {
        this.updaterPromise = null
        throw error
      })
    }
    return this.updaterPromise
  }

  private bindEvents(updater: AutoUpdaterLike): void {
    updater.on('checking-for-update', () => {
      this.setState({
        phase: 'checking',
        currentVersion: this.options.currentVersion,
        message: 'Verificando atualizações disponíveis...'
      })
    })

    updater.on('update-available', (info) => {
      this.lastCheckSilent = false
      this.setState({
        phase: 'available',
        currentVersion: this.options.currentVersion,
        availableVersion: info.version,
        releaseDate: info.releaseDate,
        message: `Nova versão ${info.version} encontrada. Baixando atualização em segundo plano...`,
        checkedAt: Date.now()
      })
    })

    updater.on('update-not-available', () => {
      this.lastCheckSilent = false
      this.setState({
        phase: 'not-available',
        currentVersion: this.options.currentVersion,
        message: 'Você já está na versão mais recente.',
        checkedAt: Date.now()
      })
    })

    updater.on('download-progress', (progress) => {
      const percent = Math.max(0, Math.min(100, Math.round(progress.percent || 0)))
      this.setState({
        ...this.state,
        phase: 'downloading',
        downloadPercent: percent,
        message: `Baixando atualização ${this.state.availableVersion || ''} (${percent}%)...`.trim()
      })
    })

    updater.on('update-downloaded', (info) => {
      this.setState({
        phase: 'downloaded',
        currentVersion: this.options.currentVersion,
        availableVersion: info.version,
        releaseDate: info.releaseDate,
        downloadPercent: 100,
        message: `Atualização ${info.version} pronta para instalar. Reinicie para aplicar.`,
        checkedAt: Date.now()
      })
    })

    updater.on('error', (error) => {
      this.handleUpdaterError(error)
    })
  }

  private handleUpdaterError(error: unknown): void {
    const rawMessage = error instanceof Error ? error.message : String(error || 'Erro desconhecido')

    if (this.lastCheckSilent && isUnavailableOrOfflineError(rawMessage)) {
      this.lastCheckSilent = false
      this.setState({
        phase: 'idle',
        currentVersion: this.options.currentVersion,
        message: 'Pronto para verificar atualizações.'
      })
      return
    }

    this.lastCheckSilent = false

    const friendlyMessage = isUnavailableOrOfflineError(rawMessage)
      ? 'Nenhuma release publicada encontrada no GitHub ou você está offline. Você também pode atualizar executando o novo instalador gerado localmente.'
      : `Não foi possível verificar atualizações: ${rawMessage}`

    this.setState({
      phase: 'error',
      currentVersion: this.options.currentVersion,
      availableVersion: this.state.availableVersion,
      message: friendlyMessage,
      checkedAt: Date.now()
    })
  }

  private setState(nextState: AppUpdateState): void {
    this.state = nextState
    this.options.onStateChange({ ...nextState })
  }
}
