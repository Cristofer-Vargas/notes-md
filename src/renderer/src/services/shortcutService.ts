import type { AppSettings, CustomShortcutsMap, ShortcutActionId } from '../types/app'

export interface ShortcutDefinition {
  id: ShortcutActionId
  label: string
  description: string
  category: 'Geral' | 'Navegação' | 'Editor'
  defaultKey: string
}

export const SHORTCUT_DEFINITIONS: ShortcutDefinition[] = [
  // Geral
  {
    id: 'quickSwitcher',
    label: 'Quick Switcher (Busca Global)',
    description: 'Localiza e abre qualquer nota no cofre em milissegundos',
    category: 'Geral',
    defaultKey: 'Ctrl+P'
  },
  {
    id: 'newNote',
    label: 'Nova Nota Markdown',
    description: 'Cria uma nova nota vazia na raiz ou na pasta selecionada',
    category: 'Geral',
    defaultKey: 'Ctrl+N'
  },
  {
    id: 'openSettings',
    label: 'Abrir Configurações',
    description: 'Abre o painel de temas, tipografia, ortografia e preferências',
    category: 'Geral',
    defaultKey: 'Ctrl+,'
  },
  {
    id: 'saveNote',
    label: 'Salvar no Disco Imediatamente',
    description: 'Grava qualquer alteração pendente da nota imediatamente no disco',
    category: 'Geral',
    defaultKey: 'Ctrl+S'
  },

  // Navegação
  {
    id: 'nextTab',
    label: 'Próxima Guia',
    description: 'Alterna para a próxima aba aberta no painel ativo',
    category: 'Navegação',
    defaultKey: 'Ctrl+Tab'
  },
  {
    id: 'prevTab',
    label: 'Guia Anterior',
    description: 'Alterna para a aba anterior no painel ativo',
    category: 'Navegação',
    defaultKey: 'Ctrl+Shift+Tab'
  },
  {
    id: 'closeTab',
    label: 'Fechar Guia Ativa',
    description: 'Fecha a nota atualmente aberta no painel selecionado',
    category: 'Navegação',
    defaultKey: 'Ctrl+W'
  },
  {
    id: 'toggleLeftSidebar',
    label: 'Alternar Barra Esquerda (Arquivos)',
    description: 'Oculta ou reabre o explorador de notas e pastas',
    category: 'Navegação',
    defaultKey: 'Ctrl+B'
  },
  {
    id: 'toggleRightSidebar',
    label: 'Alternar Painel Direito (Links e Sumário)',
    description: 'Oculta ou reabre conexões, backlinks e estrutura de tópicos',
    category: 'Navegação',
    defaultKey: 'Ctrl+Shift+B'
  },

  // Editor
  {
    id: 'quickTools',
    label: 'Ferramentas Rápidas & Ortografia',
    description: 'Abre sugestões ortográficas e formatação rápida na palavra sob o cursor',
    category: 'Editor',
    defaultKey: 'Alt+Enter'
  },
  {
    id: 'toggleZenMode',
    label: 'Modo Zen (Foco Total)',
    description: 'Oculta barras laterais para leitura e escrita sem distrações',
    category: 'Editor',
    defaultKey: 'F11'
  },
  {
    id: 'toggleSourceMode',
    label: 'Alternar Visual (WYSIWYG) / Markdown Puro',
    description: 'Troca instantaneamente entre o editor visual e o código markdown bruto',
    category: 'Editor',
    defaultKey: 'Ctrl+/'
  },
  {
    id: 'insertWikiLink',
    label: 'Conectar Nota [[WikiLink]]',
    description: 'Abre o autocompletar para criar links para outras notas',
    category: 'Editor',
    defaultKey: 'Ctrl+K'
  }
]

export const DEFAULT_SHORTCUTS: Record<ShortcutActionId, string> = SHORTCUT_DEFINITIONS.reduce(
  (acc, def) => {
    acc[def.id] = def.defaultKey
    return acc
  },
  {} as Record<ShortcutActionId, string>
)

/**
 * Retrieves the configured shortcut string for a given action, falling back to its default.
 */
export function getShortcutKey(settings: AppSettings, actionId: ShortcutActionId): string {
  return settings.shortcuts?.[actionId] || DEFAULT_SHORTCUTS[actionId] || ''
}

/**
 * Formats a shortcut string (e.g. "Ctrl+Shift+Tab") into individual tokens for UI badges.
 */
export function formatShortcutDisplay(shortcutStr: string): string[] {
  if (!shortcutStr) return []
  return shortcutStr.split('+').map((p) => p.trim())
}

/**
 * Normalizes a key string representation (e.g. "Escape" -> "Esc", " " -> "Space").
 */
function normalizeKeyName(key: string): string {
  if (key === ' ') return 'Space'
  if (key === 'Escape') return 'Esc'
  if (key === 'ArrowUp') return 'Up'
  if (key === 'ArrowDown') return 'Down'
  if (key === 'ArrowLeft') return 'Left'
  if (key === 'ArrowRight') return 'Right'
  if (/^[a-z]$/i.test(key)) return key.toUpperCase()
  return key
}

/**
 * Converts a browser KeyboardEvent into a canonical shortcut string representation (e.g. "Ctrl+Shift+P").
 * Returns null if only modifier keys are pressed without a primary action key.
 */
export function parseKeyboardEventToShortcut(e: KeyboardEvent): string | null {
  const isModifierKeyOnly = ['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)
  if (isModifierKeyOnly) return null

  const parts: string[] = []
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl')
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')

  const normalized = normalizeKeyName(e.key)
  parts.push(normalized)

  return parts.join('+')
}

/**
 * Tests whether a browser KeyboardEvent matches a canonical shortcut string.
 */
export function matchesShortcut(e: KeyboardEvent, targetShortcut: string): boolean {
  if (!targetShortcut) return false

  const parts = targetShortcut.split('+').map((p) => p.trim())
  const wantsCtrl = parts.includes('Ctrl')
  const wantsAlt = parts.includes('Alt')
  const wantsShift = parts.includes('Shift')

  const nonModifiers = parts.filter((p) => !['Ctrl', 'Alt', 'Shift', 'Meta'].includes(p))
  if (nonModifiers.length === 0) return false
  const targetKey = nonModifiers[0]

  const hasCtrl = e.ctrlKey || e.metaKey
  const hasAlt = e.altKey
  const hasShift = e.shiftKey

  if (wantsCtrl !== hasCtrl) return false
  if (wantsAlt !== hasAlt) return false
  if (wantsShift !== hasShift) return false

  const eventNormalized = normalizeKeyName(e.key)

  // Direct case-insensitive match
  if (eventNormalized.toLowerCase() === targetKey.toLowerCase()) {
    return true
  }

  // Handle aliases like Esc/Escape
  if (
    (targetKey.toLowerCase() === 'esc' && e.key === 'Escape') ||
    (targetKey.toLowerCase() === 'space' && e.key === ' ')
  ) {
    return true
  }

  return false
}

/**
 * Finds which action (if any) is currently using a given shortcut string.
 */
export function findShortcutConflict(
  shortcuts: CustomShortcutsMap | undefined,
  targetActionId: ShortcutActionId,
  candidateKey: string
): ShortcutDefinition | null {
  if (!candidateKey) return null

  for (const def of SHORTCUT_DEFINITIONS) {
    if (def.id === targetActionId) continue
    const activeKey = shortcuts?.[def.id] || def.defaultKey
    if (activeKey.toLowerCase() === candidateKey.toLowerCase()) {
      return def
    }
  }

  return null
}
