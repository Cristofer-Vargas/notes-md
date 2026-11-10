import { Client } from '@xhayper/discord-rpc'
import {
  DEFAULT_DISCORD_PRESENCE_SETTINGS,
  isValidDiscordApplicationId,
  normalizeDiscordPresenceSettings,
  type DiscordPresenceContext,
  type DiscordPresenceSettings,
  type DiscordPresenceStatus
} from '../shared/discordPresence'
import { buildDiscordPresenceActivity } from './discordPresenceActivity'

const IDLE_POLL_INTERVAL_MS = 10_000
const RECONNECT_DELAY_MS = 15_000
const ACTIVITY_UPDATE_DELAY_MS = 180

interface DiscordPresenceServiceOptions {
  getSystemIdleTime: () => number
  onStatusChange: (status: DiscordPresenceStatus) => void
}

export class DiscordPresenceService {
  private settings = { ...DEFAULT_DISCORD_PRESENCE_SETTINGS }
  private context: DiscordPresenceContext = { vaultName: null, noteName: null }
  private status: DiscordPresenceStatus = {
    state: 'disabled',
    message: 'Presença do Discord desativada.',
    updatedAt: Date.now()
  }
  private client: Client | null = null
  private connectionGeneration = 0
  private sessionStartedAt: number | null = null
  private isIdle = false
  private idleTimer: NodeJS.Timeout | null = null
  private reconnectTimer: NodeJS.Timeout | null = null
  private activityUpdateTimer: NodeJS.Timeout | null = null

  constructor(private readonly options: DiscordPresenceServiceOptions) {}

  public getStatus(): DiscordPresenceStatus {
    return { ...this.status }
  }

  public async configure(settings: DiscordPresenceSettings): Promise<DiscordPresenceStatus> {
    const previousSettings = this.settings
    const nextSettings = normalizeDiscordPresenceSettings(settings)
    const wasEnabled = previousSettings.enabled
    const applicationChanged = previousSettings.applicationId !== nextSettings.applicationId

    this.settings = nextSettings

    if (!nextSettings.enabled) {
      await this.stop(true)
      this.setStatus('disabled', 'Presença do Discord desativada.')
      return this.getStatus()
    }

    if (!wasEnabled || this.sessionStartedAt === null) {
      this.sessionStartedAt = Date.now()
    }

    if (!isValidDiscordApplicationId(nextSettings.applicationId)) {
      await this.disconnectClient()
      this.stopRuntimeTimers()
      this.setStatus(
        'configuration-required',
        'Informe um ID de aplicação do Discord válido para conectar.'
      )
      return this.getStatus()
    }

    this.startIdleMonitor()
    this.refreshIdleState()

    if (applicationChanged && this.client) {
      await this.disconnectClient()
    }

    if (!this.client) {
      void this.connect()
    } else {
      this.scheduleActivityUpdate()
    }

    return this.getStatus()
  }

  public updateContext(context: DiscordPresenceContext): DiscordPresenceStatus {
    this.context = {
      vaultName: this.cleanContextValue(context.vaultName),
      noteName: this.cleanContextValue(context.noteName)
    }
    this.scheduleActivityUpdate()
    return this.getStatus()
  }

  public reconnect(): DiscordPresenceStatus {
    if (!this.settings.enabled) {
      this.setStatus('disabled', 'Ative a presença do Discord antes de reconectar.')
      return this.getStatus()
    }

    if (!isValidDiscordApplicationId(this.settings.applicationId)) {
      this.setStatus(
        'configuration-required',
        'Informe um ID de aplicação do Discord válido para conectar.'
      )
      return this.getStatus()
    }

    this.clearReconnectTimer()
    void this.disconnectClient().then(() => this.connect())
    return this.getStatus()
  }

  public async shutdown(): Promise<void> {
    await this.stop(false)
  }

  private async connect(): Promise<void> {
    if (
      !this.settings.enabled ||
      !isValidDiscordApplicationId(this.settings.applicationId) ||
      this.client
    ) {
      return
    }

    const generation = ++this.connectionGeneration
    const client = new Client({ clientId: this.settings.applicationId })
    this.client = client
    this.setStatus('connecting', 'Conectando ao aplicativo do Discord...')

    client.on('ready', () => {
      if (!this.isCurrentClient(client, generation)) return
      this.clearReconnectTimer()
      this.setStatus('connected', 'Conectado ao Discord.')
      void this.publishActivity()
    })

    client.on('disconnected', () => {
      if (!this.isCurrentClient(client, generation)) return
      this.client = null
      this.setStatus(
        'disconnected',
        'Discord desconectado. Uma nova tentativa será feita automaticamente.'
      )
      this.scheduleReconnect()
    })

    try {
      await client.login()
    } catch {
      if (!this.isCurrentClient(client, generation)) return
      this.client = null
      this.setStatus(
        'disconnected',
        'Discord não encontrado. Abra o aplicativo para conectar automaticamente.'
      )
      try {
        await client.destroy()
      } catch {
        // The local Discord transport may already be closed.
      }
      this.scheduleReconnect()
    }
  }

  private async publishActivity(): Promise<void> {
    const client = this.client
    const sessionStartedAt = this.sessionStartedAt
    if (!client?.isConnected || !client.user || sessionStartedAt === null) return

    try {
      await client.user.setActivity(
        buildDiscordPresenceActivity(
          this.settings,
          this.context,
          sessionStartedAt,
          this.isIdle
        )
      )
    } catch {
      if (client !== this.client) return
      this.setStatus(
        'error',
        'Não foi possível atualizar a atividade. Tentando reconectar ao Discord.'
      )
      await this.disconnectClient()
      this.scheduleReconnect()
    }
  }

  private scheduleActivityUpdate(delay = ACTIVITY_UPDATE_DELAY_MS): void {
    if (!this.settings.enabled || !this.client?.isConnected) return
    if (this.activityUpdateTimer) clearTimeout(this.activityUpdateTimer)

    this.activityUpdateTimer = setTimeout(() => {
      this.activityUpdateTimer = null
      void this.publishActivity()
    }, delay)
    this.activityUpdateTimer.unref?.()
  }

  private startIdleMonitor(): void {
    if (this.idleTimer) return
    this.idleTimer = setInterval(() => this.refreshIdleState(), IDLE_POLL_INTERVAL_MS)
    this.idleTimer.unref?.()
  }

  private refreshIdleState(): void {
    let nextIdle = false
    if (this.settings.idleDetectionEnabled) {
      try {
        nextIdle =
          this.options.getSystemIdleTime() >= this.settings.idleTimeoutMinutes * 60
      } catch {
        nextIdle = false
      }
    }

    if (nextIdle === this.isIdle) return
    this.isIdle = nextIdle
    this.scheduleActivityUpdate(0)
  }

  private scheduleReconnect(): void {
    if (
      this.reconnectTimer ||
      !this.settings.enabled ||
      !isValidDiscordApplicationId(this.settings.applicationId)
    ) {
      return
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      void this.connect()
    }, RECONNECT_DELAY_MS)
    this.reconnectTimer.unref?.()
  }

  private clearReconnectTimer(): void {
    if (!this.reconnectTimer) return
    clearTimeout(this.reconnectTimer)
    this.reconnectTimer = null
  }

  private stopRuntimeTimers(): void {
    this.clearReconnectTimer()
    if (this.idleTimer) clearInterval(this.idleTimer)
    if (this.activityUpdateTimer) clearTimeout(this.activityUpdateTimer)
    this.idleTimer = null
    this.activityUpdateTimer = null
    this.isIdle = false
  }

  private async stop(resetSession: boolean): Promise<void> {
    this.stopRuntimeTimers()
    await this.disconnectClient(true)
    if (resetSession) this.sessionStartedAt = null
  }

  private async disconnectClient(clearActivity = false): Promise<void> {
    const client = this.client
    this.client = null
    this.connectionGeneration += 1
    if (!client) return

    if (clearActivity && client.isConnected && client.user) {
      try {
        await client.user.clearActivity()
      } catch {
        // Ignore shutdown cleanup failures.
      }
    }

    try {
      await client.destroy()
    } catch {
      // The transport can already be closed when Discord exits first.
    }
  }

  private isCurrentClient(client: Client, generation: number): boolean {
    return this.client === client && this.connectionGeneration === generation
  }

  private cleanContextValue(value: string | null): string | null {
    const cleanValue = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
    return cleanValue ? cleanValue.slice(0, 96) : null
  }

  private setStatus(
    state: DiscordPresenceStatus['state'],
    message: string
  ): void {
    if (this.status.state === state && this.status.message === message) return
    this.status = { state, message, updatedAt: Date.now() }
    this.options.onStatusChange(this.getStatus())
  }
}
