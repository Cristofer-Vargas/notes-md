export interface DiscordPresenceSettings {
  enabled: boolean
  applicationId: string
  activeText: string
  idleText: string
  showNoteTitle: boolean
  showVaultName: boolean
  showElapsedTime: boolean
  idleDetectionEnabled: boolean
  idleTimeoutMinutes: number
  largeImageKey: string
  largeImageText: string
}

export interface DiscordPresenceContext {
  vaultName: string | null
  noteName: string | null
}

export type DiscordPresenceConnectionState =
  | 'disabled'
  | 'configuration-required'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error'

export interface DiscordPresenceStatus {
  state: DiscordPresenceConnectionState
  message: string
  updatedAt: number
}

export const DEFAULT_DISCORD_PRESENCE_SETTINGS: DiscordPresenceSettings = {
  enabled: true,
  applicationId: '1569780500007096360',
  activeText: 'Editando uma nota',
  idleText: 'Inativo',
  showNoteTitle: true,
  showVaultName: false,
  showElapsedTime: true,
  idleDetectionEnabled: true,
  idleTimeoutMinutes: 5,
  largeImageKey: '',
  largeImageText: 'Notes-MD'
}

export function isValidDiscordApplicationId(applicationId: string): boolean {
  return /^\d{17,20}$/.test(applicationId.trim())
}

export function normalizeDiscordPresenceSettings(
  settings?: Partial<DiscordPresenceSettings> | null
): DiscordPresenceSettings {
  const source = settings || {}
  const timeout = Number(source.idleTimeoutMinutes)

  return {
    ...DEFAULT_DISCORD_PRESENCE_SETTINGS,
    ...source,
    applicationId: String(
      source.applicationId !== undefined
        ? source.applicationId
        : DEFAULT_DISCORD_PRESENCE_SETTINGS.applicationId
    ).trim(),
    activeText: String(source.activeText || DEFAULT_DISCORD_PRESENCE_SETTINGS.activeText)
      .trim()
      .slice(0, 96),
    idleText: String(source.idleText || DEFAULT_DISCORD_PRESENCE_SETTINGS.idleText)
      .trim()
      .slice(0, 96),
    idleTimeoutMinutes: Number.isFinite(timeout)
      ? Math.min(120, Math.max(1, Math.round(timeout)))
      : DEFAULT_DISCORD_PRESENCE_SETTINGS.idleTimeoutMinutes,
    largeImageKey: String(source.largeImageKey || '').trim().slice(0, 128),
    largeImageText: String(
      source.largeImageText || DEFAULT_DISCORD_PRESENCE_SETTINGS.largeImageText
    )
      .trim()
      .slice(0, 128)
  }
}
