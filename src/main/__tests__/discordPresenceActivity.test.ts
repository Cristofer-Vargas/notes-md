import { describe, expect, it } from 'vitest'
import {
  DEFAULT_DISCORD_PRESENCE_SETTINGS,
  normalizeDiscordPresenceSettings
} from '../../shared/discordPresence'
import { buildDiscordPresenceActivity } from '../discordPresenceActivity'

describe('Discord Rich Presence', () => {
  it('oculta nomes privados por padrão e mantém o tempo da sessão', () => {
    const startedAt = Date.now() - 30_000
    const activity = buildDiscordPresenceActivity(
      DEFAULT_DISCORD_PRESENCE_SETTINGS,
      { vaultName: 'Trabalho', noteName: 'Plano confidencial' },
      startedAt,
      false
    )

    expect(activity.details).toBe('Editando uma nota')
    expect(activity.state).toBeUndefined()
    expect(activity.startTimestamp).toEqual(new Date(startedAt))
  })

  it('exibe apenas os metadados autorizados pelo usuário', () => {
    const settings = {
      ...DEFAULT_DISCORD_PRESENCE_SETTINGS,
      showNoteTitle: true,
      showVaultName: true
    }
    const activity = buildDiscordPresenceActivity(
      settings,
      { vaultName: 'Estudos', noteName: 'Arquitetura' },
      1_000,
      false
    )

    expect(activity.details).toBe('Editando uma nota: Arquitetura')
    expect(activity.state).toBe('Cofre: Estudos')
  })

  it('muda somente o estado durante a inatividade e preserva o cronômetro', () => {
    const startedAt = Date.now() - 120_000
    const active = buildDiscordPresenceActivity(
      DEFAULT_DISCORD_PRESENCE_SETTINGS,
      { vaultName: null, noteName: null },
      startedAt,
      false
    )
    const idle = buildDiscordPresenceActivity(
      DEFAULT_DISCORD_PRESENCE_SETTINGS,
      { vaultName: null, noteName: null },
      startedAt,
      true
    )

    expect(idle.details).toBe('Inativo')
    expect(idle.startTimestamp).toEqual(active.startTimestamp)
  })

  it('normaliza limites configuráveis antes de enviar dados ao Discord', () => {
    const settings = normalizeDiscordPresenceSettings({
      idleTimeoutMinutes: 999,
      activeText: '  Escrevendo   agora  '
    })

    expect(settings.idleTimeoutMinutes).toBe(120)
    expect(settings.activeText).toBe('Escrevendo   agora')
  })
})
