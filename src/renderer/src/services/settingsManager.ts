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
  customFontFamily: '',
  editorFontWeight: '300',
  baseFontSize: 16,
  lineHeight: 1.7,
  paragraphSpacing: 0.55,
  letterSpacing: 0,
  wordSpacing: 0,
  pageWidth: 'wide',
  canvasStyle: 'flat',
  headingHighlightEnabled: true,
  showLeftSidebar: true,
  showRightSidebar: true,
  spellcheck: true,
  spellcheckLanguages: ['pt-BR', 'en-US'],
  ignoredWords: [],
  shortcuts: {},
  discordPresence: DEFAULT_DISCORD_PRESENCE_SETTINGS
}

const FONT_FAMILY_STACKS: Record<AppSettings['fontFamily'], string> = {
  sans: 'Geist, "Segoe UI", system-ui, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: '"IBM Plex Mono", Consolas, "Courier New", monospace'
}

export function getEditorFontStack(settings: Pick<AppSettings, 'fontFamily' | 'customFontFamily'>): string {
  const customFont = settings.customFontFamily?.replace(/[\u0000-\u001f\u007f]/g, '').trim()
  if (!customFont) return FONT_FAMILY_STACKS[settings.fontFamily]
  return `${JSON.stringify(customFont)}, ${FONT_FAMILY_STACKS[settings.fontFamily]}`
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
  document.documentElement.style.setProperty('--editor-font-family', getEditorFontStack(settings))
  document.documentElement.classList.toggle(
    'heading-highlights-disabled',
    settings.headingHighlightEnabled === false
  )
  document.documentElement.style.setProperty(
    '--editor-font-weight',
    settings.editorFontWeight || '300'
  )
}
