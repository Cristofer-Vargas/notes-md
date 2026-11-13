import type { AppSettings } from '../types/app'
import {
  DEFAULT_DISCORD_PRESENCE_SETTINGS,
  normalizeDiscordPresenceSettings
} from '../../../shared/discordPresence'

export const SETTINGS_STORAGE_KEY = 'notes-md:settings:v1'

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  accent: 'lime',
  fontFamily: 'sans',
  editorFontWeight: '300',
  baseFontSize: 16,
  lineHeight: 1.7,
  pageWidth: 'wide',
  canvasStyle: 'flat',
  showLeftSidebar: true,
  showRightSidebar: true,
  spellcheck: true,
  spellcheckLanguages: ['pt-BR', 'en-US'],
  ignoredWords: [],
  shortcuts: {},
  discordPresence: DEFAULT_DISCORD_PRESENCE_SETTINGS
}

export function loadSettings(): AppSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (!saved) return DEFAULT_SETTINGS
    const parsed = JSON.parse(saved) as Partial<AppSettings>
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      discordPresence: normalizeDiscordPresenceSettings(parsed.discordPresence)
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Ignore storage errors
  }
}

export function applyThemeToDocument(settings: AppSettings): void {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', settings.theme)
  document.documentElement.setAttribute('data-accent', settings.accent)
  document.documentElement.classList.toggle('dark', settings.theme === 'dark')
  document.documentElement.style.setProperty(
    '--editor-font-weight',
    settings.editorFontWeight || '300'
  )
}
