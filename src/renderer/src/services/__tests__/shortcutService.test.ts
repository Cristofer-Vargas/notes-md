import { describe, it, expect } from 'vitest'
import {
  SHORTCUT_DEFINITIONS,
  DEFAULT_SHORTCUTS,
  getShortcutKey,
  formatShortcutDisplay,
  parseKeyboardEventToShortcut,
  matchesShortcut,
  findShortcutConflict
} from '../shortcutService'
import type { AppSettings } from '../../types/app'

const mockSettings: AppSettings = {
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
  spellcheckLanguages: ['pt-BR'],
  ignoredWords: [],
  shortcuts: {
    quickSwitcher: 'Ctrl+Shift+O',
    newNote: 'Alt+N'
  }
}

describe('shortcutService', () => {
  it('retorna o atalho customizado quando definido ou o padrão se omitido', () => {
    expect(getShortcutKey(mockSettings, 'quickSwitcher')).toBe('Ctrl+Shift+O')
    expect(getShortcutKey(mockSettings, 'newNote')).toBe('Alt+N')
    expect(getShortcutKey(mockSettings, 'openSettings')).toBe('Ctrl+,')
  })

  it('formata adequadamente a string de atalho em array de badges', () => {
    expect(formatShortcutDisplay('Ctrl+Shift+P')).toEqual(['Ctrl', 'Shift', 'P'])
    expect(formatShortcutDisplay('Alt+Enter')).toEqual(['Alt', 'Enter'])
    expect(formatShortcutDisplay('F11')).toEqual(['F11'])
  })

  it('faz parse de KeyboardEvent para formato canônico de atalho', () => {
    const event1 = {
      key: 'p',
      ctrlKey: true,
      altKey: false,
      shiftKey: false,
      metaKey: false
    } as unknown as KeyboardEvent

    expect(parseKeyboardEventToShortcut(event1)).toBe('Ctrl+P')

    const event2 = {
      key: 'Enter',
      ctrlKey: false,
      altKey: true,
      shiftKey: false,
      metaKey: false
    } as unknown as KeyboardEvent

    expect(parseKeyboardEventToShortcut(event2)).toBe('Alt+Enter')

    // Ignora quando apenas a tecla modificadora isolada foi pressionada
    const modifierOnly = {
      key: 'Control',
      ctrlKey: true,
      altKey: false,
      shiftKey: false,
      metaKey: false
    } as unknown as KeyboardEvent

    expect(parseKeyboardEventToShortcut(modifierOnly)).toBeNull()
  })

  it('valida matchesShortcut com precisão de modificadores e teclas', () => {
    const ctrlP = {
      key: 'p',
      ctrlKey: true,
      altKey: false,
      shiftKey: false,
      metaKey: false
    } as unknown as KeyboardEvent

    expect(matchesShortcut(ctrlP, 'Ctrl+P')).toBe(true)
    expect(matchesShortcut(ctrlP, 'Ctrl+Shift+P')).toBe(false)
    expect(matchesShortcut(ctrlP, 'Alt+P')).toBe(false)

    const altEnter = {
      key: 'Enter',
      ctrlKey: false,
      altKey: true,
      shiftKey: false,
      metaKey: false
    } as unknown as KeyboardEvent

    expect(matchesShortcut(altEnter, 'Alt+Enter')).toBe(true)
    expect(matchesShortcut(altEnter, 'Ctrl+Enter')).toBe(false)
  })

  it('detecta conflitos entre atalhos existentes', () => {
    const conflict = findShortcutConflict(mockSettings.shortcuts, 'openSettings', 'Ctrl+Shift+O')
    expect(conflict).not.toBeNull()
    expect(conflict?.id).toBe('quickSwitcher')

    const noConflict = findShortcutConflict(mockSettings.shortcuts, 'openSettings', 'Ctrl+Alt+S')
    expect(noConflict).toBeNull()
  })
})
