import type { SetActivity } from '@xhayper/discord-rpc'
import type {
  DiscordPresenceContext,
  DiscordPresenceSettings
} from '../shared/discordPresence'

const MAX_ACTIVITY_TEXT_LENGTH = 128

function normalizeActivityText(value: string, fallback: string): string {
  const normalized = value.replace(/\s+/g, ' ').trim().slice(0, MAX_ACTIVITY_TEXT_LENGTH)
  return normalized.length >= 2 ? normalized : fallback
}

function appendContext(baseText: string, contextText: string | null): string {
  if (!contextText) return normalizeActivityText(baseText, 'Notes-MD')
  return normalizeActivityText(`${baseText}: ${contextText}`, baseText)
}

export function buildDiscordPresenceActivity(
  settings: DiscordPresenceSettings,
  context: DiscordPresenceContext,
  sessionStartedAt: number,
  isIdle: boolean
): SetActivity {
  const activeText = normalizeActivityText(settings.activeText, 'Editando uma nota')
  const idleText = normalizeActivityText(settings.idleText, 'Inativo')
  const details = isIdle
    ? idleText
    : appendContext(activeText, settings.showNoteTitle ? context.noteName : null)
  const state = settings.showVaultName && context.vaultName
    ? normalizeActivityText(`Cofre: ${context.vaultName}`, 'Notes-MD')
    : undefined

  return {
    name: 'Notes-MD',
    details,
    state,
    startTimestamp: settings.showElapsedTime ? new Date(sessionStartedAt) : undefined,
    largeImageKey: settings.largeImageKey || undefined,
    largeImageText: settings.largeImageKey
      ? normalizeActivityText(settings.largeImageText, 'Notes-MD')
      : undefined,
    instance: false
  }
}
