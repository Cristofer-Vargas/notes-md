import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  loadSettings,
  saveSettings,
  applyThemeToDocument,
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY
} from '../settingsManager'
import type { AppSettings } from '../../types/app'

describe('settingsManager — Gerenciamento e Sincronização de Configurações Multi-Janela', () => {
  let store: Record<string, string> = {}
  const attributes: Record<string, string> = {}
  const styleProps: Record<string, string> = {}
  const classListSet = new Set<string>()

  beforeEach(() => {
    store = {}
    for (const k in attributes) delete attributes[k]
    for (const k in styleProps) delete styleProps[k]
    classListSet.clear()

    // Mock localStorage
    globalThis.localStorage = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value
      },
      removeItem: (key: string) => {
        delete store[key]
      },
      clear: () => {
        store = {}
      },
      key: (i: number) => Object.keys(store)[i] || null,
      length: Object.keys(store).length
    }

    // Mock document.documentElement
    // @ts-ignore
    globalThis.document = {
      documentElement: {
        setAttribute: (name: string, val: string) => {
          attributes[name] = val
        },
        getAttribute: (name: string) => attributes[name] || null,
        removeAttribute: (name: string) => {
          delete attributes[name]
        },
        classList: {
          contains: (cls: string) => classListSet.has(cls),
          add: (cls: string) => classListSet.add(cls),
          remove: (cls: string) => classListSet.delete(cls),
          toggle: (cls: string, force?: boolean) => {
            const shouldAdd = force !== undefined ? force : !classListSet.has(cls)
            if (shouldAdd) classListSet.add(cls)
            else classListSet.delete(cls)
            return shouldAdd
          }
        } as unknown as DOMTokenList,
        style: {
          setProperty: (prop: string, val: string) => {
            styleProps[prop] = val
          },
          getPropertyValue: (prop: string) => styleProps[prop] || ''
        } as unknown as CSSStyleDeclaration
      } as unknown as HTMLElement
    }
  })

  afterEach(() => {
    // @ts-ignore
    delete globalThis.localStorage
    // @ts-ignore
    delete globalThis.document
  })

  it('retorna DEFAULT_SETTINGS com padrões iniciais quando localStorage está vazio', () => {
    const settings = loadSettings()
    expect(settings).toEqual(DEFAULT_SETTINGS)
    expect(settings.theme).toBe('dark')
    expect(settings.pageWidth).toBe('wide')
    expect(settings.accent).toBe('emerald')
    expect(settings.editorFontWeight).toBe('300')
    expect(settings.discordPresence.enabled).toBe(true)
    expect(settings.discordPresence.showNoteTitle).toBe(true)
    expect(settings.discordPresence.applicationId).toBe('1569780500007096360')
  })

  it('persiste e recarrega configurações customizadas', () => {
    const custom: AppSettings = {
      ...DEFAULT_SETTINGS,
      theme: 'light',
      accent: 'purple',
      editorFontWeight: '400',
      baseFontSize: 18
    }

    saveSettings(custom)
    expect(localStorage.getItem(SETTINGS_STORAGE_KEY)).toContain('"theme":"light"')

    const loaded = loadSettings()
    expect(loaded.theme).toBe('light')
    expect(loaded.accent).toBe('purple')
    expect(loaded.editorFontWeight).toBe('400')
    expect(loaded.baseFontSize).toBe(18)
  })

  it('aplica tema, acento e classes semânticas no documentElement', () => {
    const darkSettings: AppSettings = {
      ...DEFAULT_SETTINGS,
      theme: 'dark',
      accent: 'emerald',
      editorFontWeight: '300'
    }

    applyThemeToDocument(darkSettings)

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(document.documentElement.getAttribute('data-accent')).toBe('emerald')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.style.getPropertyValue('--editor-font-weight')).toBe('300')
  })

  it('remove classe dark ao aplicar tema light ou sepia', () => {
    document.documentElement.classList.add('dark')

    const sepiaSettings: AppSettings = {
      ...DEFAULT_SETTINGS,
      theme: 'sepia',
      accent: 'amber'
    }

    applyThemeToDocument(sepiaSettings)

    expect(document.documentElement.getAttribute('data-theme')).toBe('sepia')
    expect(document.documentElement.getAttribute('data-accent')).toBe('amber')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})
