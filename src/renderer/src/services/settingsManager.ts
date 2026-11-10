import type { AppSettings } from '../types/app'

export const SETTINGS_STORAGE_KEY = 'notes-md:settings:v1'

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  accent: 'blue',
  fontFamily: 'sans',
  editorFontWeight: '200',
  baseFontSize: 16,
  lineHeight: 1.7,
  pageWidth: 'standard',
  canvasStyle: 'paper',
  showLeftSidebar: true,
  showRightSidebar: true,
  spellcheck: true,
  spellcheckLanguages: ['pt-BR', 'en-US'],
  ignoredWords: [],
  shortcuts: {}
}

export function loadSettings(): AppSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY)
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS
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
    settings.editorFontWeight || '200'
  )
}
