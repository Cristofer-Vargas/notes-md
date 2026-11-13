import React, { useState, useEffect, useMemo } from 'react'
import {
  X,
  Sun,
  Moon,
  BookOpen,
  Palette,
  Type,
  Layout,
  SpellCheck,
  Check,
  Plus,
  EyeOff,
  Keyboard,
  Sparkles,
  Sliders,
  RotateCcw,
  Search,
  AlertTriangle,
  Maximize2,
  Minimize2,
  Radio,
  ShieldCheck,
  Clock3,
  ExternalLink,
  RefreshCw,
  ImageIcon,
  PanelTop,
  Languages,
  TextCursorInput,
  CircleHelp
} from 'lucide-react'
import type {
  AccentPreset,
  AppSettings,
  CanvasStylePreset,
  EditorFontWeightPreset,
  FontFamilyPreset,
  PageWidthPreset,
  ShortcutActionId,
  ThemeMode
} from '../../types/app'
import { Button, IconButton, Badge, Input, Switch } from '../ui'
import { SelectionButton } from '../ui/SelectionButton'
import { RangeInput } from '../ui/RangeInput'
import {
  SHORTCUT_DEFINITIONS,
  formatShortcutDisplay,
  parseKeyboardEventToShortcut,
  getShortcutKey,
  findShortcutConflict
} from '../../services/shortcutService'
import { useFloatingModal } from './useFloatingModal'
import { ResizeHandles } from './ResizeHandles'
import { cn } from '../../utils/cn'
import {
  isValidDiscordApplicationId,
  type DiscordPresenceSettings,
  type DiscordPresenceStatus
} from '../../../../shared/discordPresence'
import type { AppRuntimeInfo, AppUpdateState } from '../../../../shared/appUpdate'
import { AppUpdatesSection } from './AppUpdatesSection'
import appLogo from '../../assets/logo.png'

interface SettingsModalProps {
  isOpen: boolean
  settings: AppSettings
  onUpdateSettings: (partial: Partial<AppSettings>) => void
  onClose: () => void
  isStandalone?: boolean
  initialTab?: SettingsTab
}

export type SettingsTab =
  | 'appearance'
  | 'typography'
  | 'spellcheck'
  | 'discord'
  | 'shortcuts'
  | 'updates'

const SETTINGS_SECTIONS: Array<{
  id: SettingsTab
  label: string
  icon: React.ReactNode
}> = [
  { id: 'appearance', label: 'Aparência', icon: <PanelTop className="w-4 h-4" /> },
  { id: 'typography', label: 'Editor', icon: <TextCursorInput className="w-4 h-4" /> },
  { id: 'spellcheck', label: 'Ortografia', icon: <Languages className="w-4 h-4" /> },
  { id: 'discord', label: 'Discord', icon: <Radio className="w-4 h-4" /> },
  { id: 'shortcuts', label: 'Atalhos', icon: <Keyboard className="w-4 h-4" /> },
  { id: 'updates', label: 'Sobre', icon: <CircleHelp className="w-4 h-4" /> }
]

function getDiscordStatusPresentation(status: DiscordPresenceStatus): {
  label: string
  variant: 'default' | 'accent' | 'success' | 'warning' | 'danger'
} {
  switch (status.state) {
    case 'connected':
      return { label: 'Conectado', variant: 'success' }
    case 'connecting':
      return { label: 'Conectando', variant: 'accent' }
    case 'configuration-required':
      return { label: 'Configuração necessária', variant: 'warning' }
    case 'disconnected':
      return { label: 'Desconectado', variant: 'warning' }
    case 'error':
      return { label: 'Erro', variant: 'danger' }
    default:
      return { label: 'Desativado', variant: 'default' }
  }
}

interface SettingToggleRowProps {
  title: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  icon?: React.ReactNode
}

const SettingToggleRow: React.FC<SettingToggleRowProps> = ({
  title,
  description,
  checked,
  onCheckedChange,
  disabled,
  icon
}) => (
  <div className="flex items-center justify-between gap-4 border-b border-surface-border py-3">
    <div className="flex items-start gap-2.5 min-w-0">
      {icon && <div className="mt-0.5 text-accent shrink-0">{icon}</div>}
      <div className="min-w-0">
        <div className="text-xs font-semibold text-content-primary">{title}</div>
        <p className="mt-0.5 text-[11px] leading-relaxed text-content-muted">
          {description}
        </p>
      </div>
    </div>
    <Switch
      checked={checked}
      onCheckedChange={onCheckedChange}
      label={title}
      disabled={disabled}
    />
  </div>
)

const THEME_OPTIONS: Array<{ id: ThemeMode; label: string; desc: string; icon: React.ReactNode }> =
  [
    {
      id: 'light',
      label: 'Claro',
      desc: 'Superfícies claras e contraste suave.',
      icon: <Sun className="w-4 h-4" />
    },
    {
      id: 'dark',
      label: 'Escuro',
      desc: 'A paleta Dracula para trabalhar com menos luz.',
      icon: <Moon className="w-4 h-4" />
    },
    {
      id: 'sepia',
      label: 'Sépia',
      desc: 'Tons quentes para leitura prolongada.',
      icon: <BookOpen className="w-4 h-4" />
    }
  ]

const ACCENT_OPTIONS: Array<{ id: AccentPreset; label: string; hex: string; darkHex: string }> = [
  { id: 'lime', label: 'Lima', hex: '#536614', darkHex: '#def855' },
  { id: 'purple', label: 'Roxo Dracula', hex: '#7c3aed', darkHex: '#bd93f9' },
  { id: 'blue', label: 'Azul / Ciano', hex: '#2563eb', darkHex: '#8be9fd' },
  { id: 'emerald', label: 'Verde Esmeralda', hex: '#059669', darkHex: '#50fa7b' },
  { id: 'amber', label: 'Âmbar / Laranja', hex: '#d97706', darkHex: '#ffb86c' },
  { id: 'rose', label: 'Rosa Carmesim', hex: '#e11d48', darkHex: '#ff79c6' }
]

const FONT_OPTIONS: Array<{ id: FontFamilyPreset; label: string; sample: string }> = [
  { id: 'sans', label: 'Geist', sample: 'Abc 123' },
  { id: 'serif', label: 'Serifada Editorial (Georgia)', sample: 'Abc 123' },
  { id: 'mono', label: 'IBM Plex Mono', sample: 'Abc 123' }
]

const FONT_WEIGHT_OPTIONS: Array<{
  id: EditorFontWeightPreset
  label: string
  desc: string
  weight: number
}> = [
  { id: '200', label: 'Extra Fina (200)', desc: 'Suave, leve e respirável', weight: 200 },
  { id: '300', label: 'Fina (300)', desc: 'Padrão leve com traço bem definido', weight: 300 },
  { id: '400', label: 'Regular (400)', desc: 'Espessura clássica e encorpada', weight: 400 },
  { id: '500', label: 'Média (500)', desc: 'Traço firme para leitura com alto contraste', weight: 500 }
]

const SPELLCHECK_LANG_OPTIONS: Array<{ id: string; label: string; nativeName: string; flag: string }> = [
  { id: 'pt-BR', label: 'Português', nativeName: 'Brasil', flag: '🇧🇷' },
  { id: 'en-US', label: 'Inglês', nativeName: 'Estados Unidos', flag: '🇺🇸' },
  { id: 'pt-PT', label: 'Português', nativeName: 'Portugal', flag: '🇵🇹' },
  { id: 'en-GB', label: 'Inglês', nativeName: 'Reino Unido', flag: '🇬🇧' },
  { id: 'es', label: 'Espanhol', nativeName: 'Español', flag: '🇪🇸' },
  { id: 'fr', label: 'Francês', nativeName: 'Français', flag: '🇫🇷' },
  { id: 'de', label: 'Alemão', nativeName: 'Deutsch', flag: '🇩🇪' },
  { id: 'it', label: 'Italiano', nativeName: 'Italiano', flag: '🇮🇹' }
]

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  onUpdateSettings,
  onClose,
  isStandalone = false,
  initialTab = 'appearance'
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab)
  const [newIgnoredWord, setNewIgnoredWord] = useState('')
  const [recordingActionId, setRecordingActionId] = useState<ShortcutActionId | null>(null)
  const [shortcutSearch, setShortcutSearch] = useState('')
  const [discordStatus, setDiscordStatus] = useState<DiscordPresenceStatus>({
    state: 'disabled',
    message: 'Presença do Discord desativada.',
    updatedAt: Date.now()
  })
  const [isReconnectingDiscord, setIsReconnectingDiscord] = useState(false)
  const [runtimeInfo, setRuntimeInfo] = useState<AppRuntimeInfo | null>(null)
  const [updateState, setUpdateState] = useState<AppUpdateState | null>(null)
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false)
  const [conflictNotice, setConflictNotice] = useState<{
    actionName: string
    candidateKey: string
  } | null>(null)

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab)
    }
  }, [isOpen, initialTab])

  // Listen to keyboard events when recording a shortcut
  useEffect(() => {
    if (!recordingActionId) return

    const handleKeyDown = (e: KeyboardEvent): void => {
      e.preventDefault()
      e.stopPropagation()

      if (e.key === 'Escape') {
        setRecordingActionId(null)
        setConflictNotice(null)
        return
      }

      const parsedKey = parseKeyboardEventToShortcut(e)
      if (!parsedKey) {
        // Only modifier key was pressed (Control, Shift, Alt, etc.) — wait for full combination
        return
      }

      const conflict = findShortcutConflict(settings.shortcuts, recordingActionId, parsedKey)
      const nextShortcuts = { ...(settings.shortcuts || {}) }

      if (conflict) {
        // Rebind shortcut to current action and clear from conflicting action
        delete nextShortcuts[conflict.id]
        setConflictNotice({ actionName: conflict.label, candidateKey: parsedKey })
      } else {
        setConflictNotice(null)
      }

      nextShortcuts[recordingActionId] = parsedKey
      onUpdateSettings({ shortcuts: nextShortcuts })
      setRecordingActionId(null)
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [recordingActionId, settings.shortcuts, onUpdateSettings])

  useEffect(() => {
    if (!isOpen || !window.electronAPI) return

    let mounted = true
    window.electronAPI
      .getDiscordPresenceStatus()
      .then((status) => {
        if (mounted && status) setDiscordStatus(status)
      })
      .catch(() => {})

    const unsubscribe = window.electronAPI.onDiscordPresenceStatus((status) => {
      if (mounted) setDiscordStatus(status)
    })

    window.electronAPI
      .getAppRuntimeInfo?.()
      .then((info) => {
        if (mounted && info) setRuntimeInfo(info)
      })
      .catch(() => {})

    window.electronAPI
      .getAppUpdateState?.()
      .then((state) => {
        if (mounted && state) setUpdateState(state)
      })
      .catch(() => {})

    const unsubscribeUpdate = window.electronAPI.onAppUpdateStateChanged?.((state) => {
      if (mounted) setUpdateState(state)
    })

    return () => {
      mounted = false
      unsubscribe()
      unsubscribeUpdate?.()
    }
  }, [isOpen])

  const handleResetSingleShortcut = (actionId: ShortcutActionId): void => {
    const nextShortcuts = { ...(settings.shortcuts || {}) }
    delete nextShortcuts[actionId]
    onUpdateSettings({ shortcuts: nextShortcuts })
    setConflictNotice(null)
  }

  const handleResetAllShortcuts = (): void => {
    onUpdateSettings({ shortcuts: {} })
    setConflictNotice(null)
    setRecordingActionId(null)
  }

  const hasCustomShortcuts = Boolean(
    settings.shortcuts &&
      Object.keys(settings.shortcuts).some(
        (id) => settings.shortcuts?.[id as ShortcutActionId] !== undefined
      )
  )

  const filteredDefinitions = useMemo(() => {
    if (!shortcutSearch.trim()) return SHORTCUT_DEFINITIONS
    const q = shortcutSearch.toLowerCase().trim()
    return SHORTCUT_DEFINITIONS.filter((d) => {
      const activeKey = getShortcutKey(settings, d.id).toLowerCase()
      return (
        d.label.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        activeKey.includes(q) ||
        d.category.toLowerCase().includes(q)
      )
    })
  }, [shortcutSearch, settings])

  const {
    modalStyle,
    isMaximized,
    headerDragProps,
    handleStartResize,
    toggleMaximize
  } = useFloatingModal({
    isOpen,
    initialWidth: 800,
    initialHeight: 600,
    minWidth: 540,
    minHeight: 420,
    storageKey: 'notes-md:settings-modal-geometry'
  })

  if (!isOpen) return null

  const handleAddIgnoredWord = (): void => {
    const trimmed = newIgnoredWord.trim()
    if (!trimmed) return
    const current = settings.ignoredWords || []
    if (!current.includes(trimmed)) {
      const next = [...current, trimmed]
      onUpdateSettings({ ignoredWords: next })
      window.electronAPI?.addWordToDictionary(trimmed).catch(() => {})
    }
    setNewIgnoredWord('')
  }

  const handleRemoveIgnoredWord = (word: string): void => {
    const current = settings.ignoredWords || []
    const next = current.filter((w) => w !== word)
    onUpdateSettings({ ignoredWords: next })
    window.electronAPI?.removeWordFromDictionary(word).catch(() => {})
  }

  const handleClearAllIgnoredWords = (): void => {
    const current = settings.ignoredWords || []
    for (const w of current) {
      window.electronAPI?.removeWordFromDictionary(w).catch(() => {})
    }
    onUpdateSettings({ ignoredWords: [] })
  }

  const updateDiscordPresence = (partial: Partial<DiscordPresenceSettings>): void => {
    onUpdateSettings({
      discordPresence: {
        ...settings.discordPresence,
        ...partial
      }
    })
  }

  const handleReconnectDiscord = async (): Promise<void> => {
    setIsReconnectingDiscord(true)
    try {
      const status = await window.electronAPI?.reconnectDiscordPresence()
      if (status) setDiscordStatus(status)
    } finally {
      setIsReconnectingDiscord(false)
    }
  }

  const currentWeight = settings.editorFontWeight || '300'
  const discordSettings = settings.discordPresence
  const discordApplicationIdIsValid = isValidDiscordApplicationId(
    discordSettings.applicationId
  )
  const discordStatusPresentation = getDiscordStatusPresentation(discordStatus)

  const content = (
    <div
      style={isStandalone ? undefined : modalStyle}
      className={cn(
        'settings-window bg-surface-bg flex flex-col overflow-hidden select-none',
        isStandalone
          ? 'w-full h-full'
          : 'rounded-lg border border-surface-border shadow-xl'
      )}
      onClick={isStandalone ? undefined : (e) => e.stopPropagation()}
    >
      {!isStandalone && <ResizeHandles onStartResize={handleStartResize} disabled={isMaximized} />}

      {/* Header */}
      <div
        {...(isStandalone ? {} : headerDragProps)}
        className={cn(
          'px-5 py-3 bg-surface-secondary border-b border-surface-border flex items-center justify-between shrink-0 transition-colors',
          !isStandalone && headerDragProps.className
        )}
      >
        <div className="flex items-center gap-2.5 pointer-events-none min-w-0 flex-1">
          <img src={appLogo} alt="Notes-MD" className="app-logo w-7 h-7 object-contain shrink-0" />
          <div className="min-w-0 flex-1 pr-2">
              <h2 className="text-sm font-semibold text-content-primary truncate">Configurações</h2>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0" data-no-drag>
            {!isStandalone && (
            <IconButton
              variant="ghost"
              size="sm"
              onClick={toggleMaximize}
              tooltip={isMaximized ? 'Restaurar tamanho da janela' : 'Maximizar janela'}
              icon={isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            />
          )}
            <IconButton
              variant="ghost"
              size="sm"
              onClick={onClose}
              tooltip="Fechar Configurações (Esc)"
              icon={<X className="w-4 h-4" />}
            />
          </div>
        </div>

        {/* Modal Body: Left Tab Navigation + Right Sector Content */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Left Sidebar Navigation */}
          <aside className="settings-sidebar w-56 bg-surface-secondary border-r border-surface-border p-3 shrink-0 select-none flex flex-col justify-between">
            <nav aria-label="Seções das configurações" className="settings-nav">
              {SETTINGS_SECTIONS.map((section) => (
                <Button
                  key={section.id}
                  variant="ghost"
                  aria-current={activeTab === section.id ? 'page' : undefined}
                  onClick={() => setActiveTab(section.id)}
                  className="settings-nav-item"
                  leftIcon={section.icon}
                >
                  {section.label}
                </Button>
              ))}
            </nav>

            <div className="p-2.5 text-[11px] text-content-muted leading-tight space-y-1">
              <div className="flex items-center justify-between gap-1.5">
                <span>
                  Versão{' '}
                  <span className="font-mono text-content-secondary">
                    {runtimeInfo?.version || '0.2.0-alpha.1'}
                  </span>
                </span>
                <Badge
                  variant={runtimeInfo?.environment === 'dev' ? 'warning' : 'success'}
                  size="sm"
                >
                  {runtimeInfo?.environment === 'dev' ? 'DEV' : 'Estável'}
                </Badge>
              </div>
              <div>Armazenamento local ativo</div>
            </div>
          </aside>

          {/* Right Panel: Active Sector Content */}
          <main className="settings-content flex-1 min-w-0 overflow-y-auto px-6 py-6">
            {/* 1. APARÊNCIA & TEMA */}
            {activeTab === 'appearance' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                {/* Theme Selection */}
                <section className="space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-content-muted">
                    <Palette className="w-3.5 h-3.5 text-accent" />
                    <span>Tema</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {THEME_OPTIONS.map((t) => {
                      const active = settings.theme === t.id
                      return (
                        <SelectionButton
                          key={t.id}
                          aria-pressed={active}
                          type="button"
                          onClick={() => onUpdateSettings({ theme: t.id })}
                          className={cn(
                            'p-3 rounded-md border text-left transition-all cursor-pointer',
                            active
                              ? 'border-accent bg-accent-soft ring-1 ring-accent/50'
                              : 'border-surface-border bg-surface-secondary hover:border-accent/40'
                          )}
                        >
                          <div className="flex items-center gap-2 text-xs font-bold text-content-primary mb-1">
                            <span className={active ? 'text-accent' : 'text-content-secondary'}>
                              {t.icon}
                            </span>
                            <span>{t.label}</span>
                          </div>
                          <p className="text-[11px] text-content-secondary leading-snug">{t.desc}</p>
                        </SelectionButton>
                      )
                    })}
                  </div>
                </section>

                {/* Accent Color */}
                <section className="space-y-2.5">
                  <div className="text-xs font-bold uppercase tracking-wider text-content-muted">
                    Cor de destaque
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ACCENT_OPTIONS.map((a) => {
                      const active = settings.accent === a.id
                      return (
                        <SelectionButton
                          key={a.id}
                          aria-pressed={active}
                          type="button"
                          onClick={() => onUpdateSettings({ accent: a.id })}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 rounded-md border text-xs font-medium transition-all cursor-pointer',
                            active
                              ? 'border-accent bg-accent-soft text-content-primary ring-1 ring-accent/50'
                              : 'border-surface-border bg-surface-secondary text-content-secondary hover:text-content-primary'
                          )}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                            style={{ backgroundColor: settings.theme === 'dark' ? a.darkHex : a.hex }}
                          />
                          <span>{a.label}</span>
                        </SelectionButton>
                      )
                    })}
                  </div>
                </section>

                {/* Document Canvas Style & Page Width */}
                <section className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-content-muted">
                    <Layout className="w-3.5 h-3.5 text-accent" />
                    <span>Espaço de escrita</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-content-secondary">
                        Superfície do editor
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {(
                          [
                            { id: 'paper', label: 'Destacada' },
                            { id: 'flat', label: 'Contínua' }
                          ] as Array<{ id: CanvasStylePreset; label: string }>
                        ).map((c) => (
                          <SelectionButton
                            key={c.id}
                            aria-pressed={settings.canvasStyle === c.id}
                            type="button"
                            onClick={() => onUpdateSettings({ canvasStyle: c.id })}
                            className={cn(
                              'py-2 px-3 rounded-lg border text-xs font-medium transition-colors cursor-pointer',
                              settings.canvasStyle === c.id
                                ? 'border-accent bg-accent-soft text-accent'
                                : 'border-surface-border bg-surface-secondary text-content-secondary hover:bg-surface-tertiary'
                            )}
                          >
                            {c.label}
                          </SelectionButton>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-content-secondary">
                        Largura do Texto
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(
                          [
                            { id: 'standard', label: 'Padrão' },
                            { id: 'wide', label: 'Larga' },
                            { id: 'full', label: 'Total' }
                          ] as Array<{ id: PageWidthPreset; label: string }>
                        ).map((w) => (
                          <SelectionButton
                            key={w.id}
                            aria-pressed={settings.pageWidth === w.id}
                            type="button"
                            onClick={() => onUpdateSettings({ pageWidth: w.id })}
                            className={cn(
                              'py-2 px-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer',
                              settings.pageWidth === w.id
                                ? 'border-accent bg-accent-soft text-accent'
                                : 'border-surface-border bg-surface-secondary text-content-secondary hover:bg-surface-tertiary'
                            )}
                          >
                            {w.label}
                          </SelectionButton>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* 2. TIPOGRAFIA & EDITOR */}
            {activeTab === 'typography' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                {/* Font Family */}
                <section className="space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-content-muted">
                    <Type className="w-3.5 h-3.5 text-accent" />
                    <span>Fonte do editor</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {FONT_OPTIONS.map((f) => {
                      const active = settings.fontFamily === f.id
                      return (
                        <SelectionButton
                          key={f.id}
                          aria-pressed={active}
                          type="button"
                          onClick={() => onUpdateSettings({ fontFamily: f.id })}
                          className={cn(
                            'p-3 rounded-md border text-left transition-all cursor-pointer',
                            active
                              ? 'border-accent bg-accent-soft ring-1 ring-accent/50'
                              : 'border-surface-border bg-surface-secondary hover:border-accent/40'
                          )}
                        >
                          <div className={cn('text-sm font-bold text-content-primary mb-0.5', f.id === 'serif' ? 'font-serif' : f.id === 'mono' ? 'font-mono' : 'font-sans')}>{f.sample}</div>
                          <div className="text-xs text-content-secondary">{f.label}</div>
                        </SelectionButton>
                      )
                    })}
                  </div>
                </section>

                {/* Font Weight Configuration (Requested Feature) */}
                <section className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold uppercase tracking-wider text-content-muted">
                      Espessura do texto
                    </div>
                    <Badge variant="accent" size="sm">
                      Atual: {currentWeight} (Padrão 300)
                    </Badge>
                  </div>
                  <p className="text-xs text-content-secondary leading-relaxed">
                    O texto padrão das notas fica mais leve e elegante, enquanto os títulos e termos em <strong>negrito</strong> permanecem destacados (600 a 800).
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {FONT_WEIGHT_OPTIONS.map((w) => {
                      const active = currentWeight === w.id
                      return (
                        <SelectionButton
                          key={w.id}
                          aria-pressed={active}
                          type="button"
                          onClick={() => onUpdateSettings({ editorFontWeight: w.id })}
                          className={cn(
                            'p-3 rounded-md border text-left transition-all cursor-pointer',
                            active
                              ? 'border-accent bg-accent-soft ring-1 ring-accent/50'
                              : 'border-surface-border bg-surface-secondary hover:border-accent/40'
                          )}
                        >
                          <div
                            className="text-sm text-content-primary mb-0.5 flex items-center justify-between"
                            style={{ fontWeight: w.weight }}
                          >
                            <span>{w.label}</span>
                            {active && <Check className="w-4 h-4 text-accent" />}
                          </div>
                          <div className="text-[11px] text-content-muted">{w.desc}</div>
                        </SelectionButton>
                      )
                    })}
                  </div>
                </section>

                {/* Font Size & Line Height */}
                <section className="space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-content-muted">
                    Tamanho e espaçamento
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3 rounded-md bg-surface-secondary border border-surface-border space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-content-primary">Tamanho Base da Fonte</span>
                        <span className="font-bold text-accent">{settings.baseFontSize}px</span>
                      </div>
                      <RangeInput
                        min={13}
                        max={22}
                        step={1}
                        value={settings.baseFontSize}
                        onChange={(e) => onUpdateSettings({ baseFontSize: Number(e.target.value) })}
                        aria-label="Tamanho base da fonte"
                      />
                    </div>

                    <div className="p-3 rounded-md bg-surface-secondary border border-surface-border space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-content-primary">Espaçamento entre Linhas</span>
                        <span className="font-bold text-accent">{settings.lineHeight.toFixed(1)}</span>
                      </div>
                      <RangeInput
                        min={1.4}
                        max={2.1}
                        step={0.1}
                        value={settings.lineHeight}
                        onChange={(e) => onUpdateSettings({ lineHeight: Number(e.target.value) })}
                        aria-label="Espaçamento entre linhas"
                      />
                    </div>
                  </div>
                </section>

                {/* Interactive Live Sample Box */}
                <section className="p-3.5 rounded-md bg-surface-secondary border border-surface-border space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-content-muted flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-accent" />
                    <span>Prévia</span>
                  </div>
                  <div
                    className="p-3 rounded-lg bg-surface-bg border border-surface-border/80 text-content-primary leading-relaxed"
                    style={{
                      fontSize: `${settings.baseFontSize}px`,
                      lineHeight: settings.lineHeight,
                      fontWeight: Number(currentWeight)
                    }}
                  >
                    Este é um parágrafo de exemplo com a espessura selecionada ({currentWeight}). Você pode combinar texto suave com <strong>palavras em negrito para ênfase forte</strong> e termos em <em className="italic text-[var(--note-italic-color)]">itálico com cor sutil do tema</em> para conceitos interligados.
                  </div>
                </section>
              </div>
            )}

            {/* 3. ORTOGRAFIA & IDIOMAS */}
            {activeTab === 'spellcheck' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-content-muted">
                      <SpellCheck className="w-3.5 h-3.5 text-accent" />
                      <span>Corretor Ortográfico (Nativo Windows)</span>
                    </div>
                    <Switch
                      checked={settings.spellcheck}
                      onCheckedChange={(checked) => onUpdateSettings({ spellcheck: checked })}
                      label="Ativar corretor ortográfico"
                    />
                  </div>

                  <p className="text-xs text-content-secondary leading-relaxed">
                    Sublinha erros ortográficos em tempo real e oferece sugestões rápidas ao pressionar <kbd className="px-1.5 py-0.5 rounded bg-surface-tertiary font-mono text-[10px]">Alt+Enter</kbd> ou clicar com o botão direito. Suporta <strong>múltiplos idiomas simultaneamente</strong>.
                  </p>

                  {settings.spellcheck && (
                    <div className="space-y-4 pt-1">
                      <div className="text-[11px] font-semibold text-content-muted uppercase tracking-wider">
                        Idiomas Ativos de Verificação:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {SPELLCHECK_LANG_OPTIONS.map((lang) => {
                          const isSelected = settings.spellcheckLanguages?.includes(lang.id)
                          return (
                            <SelectionButton
                              key={lang.id}
                              aria-pressed={isSelected}
                              type="button"
                              onClick={() => {
                                const current = settings.spellcheckLanguages || []
                                let next: string[]
                                if (isSelected) {
                                  if (current.length <= 1) return
                                  next = current.filter((l) => l !== lang.id)
                                } else {
                                  next = [...current, lang.id]
                                }
                                onUpdateSettings({ spellcheckLanguages: next })
                              }}
                              className={cn(
                                'flex items-center justify-between p-2.5 rounded-md border text-left transition-all cursor-pointer',
                                isSelected
                                  ? 'border-accent bg-accent-soft text-content-primary ring-1 ring-accent/50'
                                  : 'border-surface-border bg-surface-secondary text-content-secondary hover:border-accent/40'
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-base select-none">{lang.flag}</span>
                                <div>
                                  <div className="text-xs font-semibold text-content-primary leading-tight">
                                    {lang.label}
                                  </div>
                                  <div className="text-[10px] text-content-muted">
                                    {lang.nativeName} ({lang.id})
                                  </div>
                                </div>
                              </div>
                              <div
                                className={cn(
                                  'w-4 h-4 rounded-md border flex items-center justify-center transition-colors',
                                  isSelected
                                    ? 'bg-accent border-accent text-white'
                                    : 'border-surface-border bg-surface-bg'
                                )}
                              >
                                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                            </SelectionButton>
                          )
                        })}
                      </div>

                      {/* Palavras Ignoradas */}
                      <div className="pt-3 border-t border-surface-border/60 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="text-[11px] font-semibold text-content-muted uppercase tracking-wider flex items-center gap-1.5">
                            <EyeOff className="w-3.5 h-3.5 text-accent" />
                            <span>Dicionário Pessoal (Palavras Ignoradas)</span>
                          </div>
                          {settings.ignoredWords && settings.ignoredWords.length > 0 && (
                            <SelectionButton
                              type="button"
                              onClick={handleClearAllIgnoredWords}
                              className="text-[10px] text-rose-500 hover:text-rose-600 hover:underline cursor-pointer"
                            >
                              Limpar todas
                            </SelectionButton>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Input
                            type="text"
                            value={newIgnoredWord}
                            onChange={(e) => setNewIgnoredWord(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                handleAddIgnoredWord()
                              }
                            }}
                            placeholder="Adicionar termo ao dicionário (ex: minhamarca)..."
                            className="flex-1"
                          />
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={handleAddIgnoredWord}
                            leftIcon={<Plus className="w-3.5 h-3.5" />}
                          >
                            Adicionar
                          </Button>
                        </div>

                        <div className="p-2.5 rounded-md bg-surface-secondary/60 border border-surface-border min-h-[52px] max-h-36 overflow-y-auto flex flex-wrap gap-1.5 items-center">
                          {settings.ignoredWords && settings.ignoredWords.length > 0 ? (
                            settings.ignoredWords.map((word) => (
                              <span
                                key={word}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-surface-bg border border-surface-border text-content-primary shadow-2xs group"
                              >
                                <span>{word}</span>
                                <SelectionButton
                                  type="button"
                                  onClick={() => handleRemoveIgnoredWord(word)}
                                  title={`Remover "${word}" das palavras ignoradas`}
                                  className="text-content-muted hover:text-rose-500 rounded p-0.5 transition-colors cursor-pointer"
                                >
                                  <X className="w-3 h-3" />
                                </SelectionButton>
                              </span>
                            ))
                          ) : (
                            <div className="text-[11px] text-content-muted italic py-1">
                              Nenhuma palavra no dicionário pessoal ainda.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              </div>
            )}

            {/* 4. DISCORD PRESENCE */}
            {activeTab === 'discord' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <section className="space-y-3">
                  <div className="flex items-start justify-between gap-4 rounded-md border border-surface-border bg-surface-secondary p-3.5">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent">
                        <Radio className="h-4.5 w-4.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-bold text-content-primary">
                            Discord Rich Presence
                          </h3>
                          <Badge variant={discordStatusPresentation.variant}>
                            {discordStatusPresentation.label}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-content-secondary">
                          Mostre no seu perfil do Discord que você está escrevendo no Notes-MD.
                          A integração é local e compartilha apenas os dados autorizados abaixo.
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={discordSettings.enabled}
                      onCheckedChange={(enabled) => updateDiscordPresence({ enabled })}
                      label="Ativar Discord Rich Presence"
                    />
                  </div>

                  <div className="flex flex-col gap-2 rounded-md border border-surface-border bg-surface-bg p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-content-primary">
                        Estado da conexão
                      </div>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-content-muted">
                        {discordStatus.message}
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      size="xs"
                      onClick={() => void handleReconnectDiscord()}
                      isLoading={isReconnectingDiscord}
                      disabled={!discordSettings.enabled || !discordApplicationIdIsValid}
                      leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
                      className="shrink-0"
                    >
                      Reconectar
                    </Button>
                  </div>
                </section>

                <section className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-content-muted">
                    <ShieldCheck className="h-3.5 w-3.5 text-accent" />
                    <span>Conexão e privacidade</span>
                  </div>

                  <div className="rounded-md border border-surface-border bg-surface-secondary/40 p-3 space-y-2.5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                      <label className="flex-1 min-w-0 space-y-1.5">
                        <span className="text-[11px] font-semibold text-content-secondary">
                          ID da aplicação Discord
                        </span>
                        <Input
                          value={discordSettings.applicationId}
                          onChange={(event) =>
                            updateDiscordPresence({
                              applicationId: event.target.value.replace(/\D/g, '').slice(0, 20)
                            })
                          }
                          placeholder="Ex.: 123456789012345678"
                          inputMode="numeric"
                          autoComplete="off"
                          error={
                            discordSettings.applicationId && !discordApplicationIdIsValid
                              ? 'Use o ID numérico de 17 a 20 dígitos.'
                              : undefined
                          }
                        />
                      </label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          window.electronAPI
                            ?.openExternal('https://discord.com/developers/applications')
                            .catch(() => {})
                        }
                        rightIcon={<ExternalLink className="h-3.5 w-3.5" />}
                        className="shrink-0"
                      >
                        Portal do Discord
                      </Button>
                    </div>
                    <p className="text-[11px] leading-relaxed text-content-muted">
                      Crie uma aplicação no portal, copie o <strong>Application ID</strong> e cole
                      aqui. Esse identificador é público; nenhum token ou senha é solicitado.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <SettingToggleRow
                      title="Mostrar título da nota"
                      description="Inclui o nome da nota atualmente aberta na atividade."
                      checked={discordSettings.showNoteTitle}
                      onCheckedChange={(showNoteTitle) =>
                        updateDiscordPresence({ showNoteTitle })
                      }
                      icon={<BookOpen className="h-3.5 w-3.5" />}
                    />
                    <SettingToggleRow
                      title="Mostrar nome do cofre"
                      description="Inclui o nome do espaço de trabalho atual."
                      checked={discordSettings.showVaultName}
                      onCheckedChange={(showVaultName) =>
                        updateDiscordPresence({ showVaultName })
                      }
                      icon={<ShieldCheck className="h-3.5 w-3.5" />}
                    />
                  </div>
                </section>

                <section className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-content-muted">
                    <Sparkles className="h-3.5 w-3.5 text-accent" />
                    <span>Textos e aparência</span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="space-y-1.5">
                      <span className="text-[11px] font-semibold text-content-secondary">
                        Texto durante a edição
                      </span>
                      <Input
                        value={discordSettings.activeText}
                        onChange={(event) =>
                          updateDiscordPresence({ activeText: event.target.value.slice(0, 96) })
                        }
                        placeholder="Editando uma nota"
                        maxLength={96}
                      />
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-[11px] font-semibold text-content-secondary">
                        Texto quando inativo
                      </span>
                      <Input
                        value={discordSettings.idleText}
                        onChange={(event) =>
                          updateDiscordPresence({ idleText: event.target.value.slice(0, 96) })
                        }
                        placeholder="Inativo"
                        maxLength={96}
                      />
                    </label>
                    <label className="space-y-1.5">
                      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-content-secondary">
                        <ImageIcon className="h-3.5 w-3.5 text-accent" />
                        Chave da imagem grande
                      </span>
                      <Input
                        value={discordSettings.largeImageKey}
                        onChange={(event) =>
                          updateDiscordPresence({ largeImageKey: event.target.value.slice(0, 128) })
                        }
                        placeholder="Ex.: notes-md"
                        maxLength={128}
                      />
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-[11px] font-semibold text-content-secondary">
                        Texto da imagem
                      </span>
                      <Input
                        value={discordSettings.largeImageText}
                        onChange={(event) =>
                          updateDiscordPresence({ largeImageText: event.target.value.slice(0, 128) })
                        }
                        placeholder="Notes-MD"
                        maxLength={128}
                        disabled={!discordSettings.largeImageKey}
                      />
                    </label>
                  </div>
                  <p className="text-[11px] leading-relaxed text-content-muted">
                    A chave da imagem deve corresponder a um recurso enviado na seção Rich
                    Presence da sua aplicação no portal do Discord. Deixe em branco para não usar imagem.
                  </p>
                </section>

                <section className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-content-muted">
                    <Clock3 className="h-3.5 w-3.5 text-accent" />
                    <span>Sessão e inatividade</span>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <SettingToggleRow
                      title="Mostrar tempo da sessão"
                      description="Exibe há quanto tempo o Notes-MD está em atividade."
                      checked={discordSettings.showElapsedTime}
                      onCheckedChange={(showElapsedTime) =>
                        updateDiscordPresence({ showElapsedTime })
                      }
                      icon={<Clock3 className="h-3.5 w-3.5" />}
                    />
                    <SettingToggleRow
                      title="Detectar inatividade"
                      description="Troca apenas o status; o cronômetro da sessão continua correndo."
                      checked={discordSettings.idleDetectionEnabled}
                      onCheckedChange={(idleDetectionEnabled) =>
                        updateDiscordPresence({ idleDetectionEnabled })
                      }
                      icon={<Radio className="h-3.5 w-3.5" />}
                    />
                  </div>

                  <label className="block max-w-xs space-y-1.5">
                    <span className="text-[11px] font-semibold text-content-secondary">
                      Considerar inativo depois de
                    </span>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={120}
                        value={discordSettings.idleTimeoutMinutes}
                        onChange={(event) =>
                          updateDiscordPresence({
                            idleTimeoutMinutes: Math.min(
                              120,
                              Math.max(1, Number(event.target.value) || 1)
                            )
                          })
                        }
                        disabled={!discordSettings.idleDetectionEnabled}
                        className="w-24"
                      />
                      <span className="text-xs text-content-muted">minutos</span>
                    </div>
                  </label>
                </section>

                <section className="rounded-md border border-accent/30 bg-accent-soft p-3.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-accent">
                    Prévia da atividade
                  </div>
                  <div className="mt-2 text-sm font-bold text-content-primary">Notes-MD</div>
                  <div className="mt-1 text-xs text-content-secondary">
                    {discordSettings.activeText || 'Editando uma nota'}
                    {discordSettings.showNoteTitle ? ': Minha nota' : ''}
                  </div>
                  {discordSettings.showVaultName && (
                    <div className="mt-0.5 text-xs text-content-muted">Cofre: Meu cofre</div>
                  )}
                  {discordSettings.showElapsedTime && (
                    <div className="mt-1.5 flex items-center gap-1 text-[11px] text-content-muted">
                      <Clock3 className="h-3 w-3" />
                      Tempo decorrido desde o início da sessão
                    </div>
                  )}
                </section>
              </div>
            )}

            {/* 5. ATALHOS DE TECLADO (Personalizáveis) */}
            {activeTab === 'shortcuts' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                {/* Header & Global Reset */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-surface-border/60">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-content-muted">
                      <Keyboard className="w-3.5 h-3.5 text-accent" />
                      <span>Personalização de Atalhos de Teclado</span>
                    </div>
                    <p className="text-xs text-content-secondary mt-0.5">
                      Clique sobre o atalho para gravar uma nova combinação de teclas desejada.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {hasCustomShortcuts && (
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={handleResetAllShortcuts}
                        leftIcon={<RotateCcw className="w-3 h-3 text-content-muted" />}
                      >
                        Restaurar Padrões
                      </Button>
                    )}
                  </div>
                </div>

                {/* Search Bar & Conflict Notice */}
                <div className="space-y-2">
                  <Input
                    value={shortcutSearch}
                    onChange={(e) => setShortcutSearch(e.target.value)}
                    placeholder="Pesquisar atalho por nome, tecla ou descrição..."
                    leftIcon={<Search className="w-3.5 h-3.5 text-content-muted" />}
                    className="text-xs py-1.5"
                  />

                  {conflictNotice && (
                    <div className="p-2.5 rounded-md bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2 text-xs text-amber-500 animate-in fade-in">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>
                          O atalho <strong>{conflictNotice.candidateKey}</strong> estava em uso por &ldquo;{conflictNotice.actionName}&rdquo; e foi transferido.
                        </span>
                      </div>
                      <IconButton
                        variant="ghost"
                        size="xs"
                        onClick={() => setConflictNotice(null)}
                        tooltip="Fechar aviso"
                        icon={<X className="w-3 h-3 text-amber-500" />}
                      />
                    </div>
                  )}

                  {recordingActionId && (
                    <div className="p-3 rounded-md bg-accent-soft border border-accent/40 flex items-center justify-between gap-2 text-xs text-accent animate-pulse">
                      <div className="flex items-center gap-2">
                        <Keyboard className="w-4 h-4 shrink-0" />
                        <span>
                          Gravando atalho para <strong>{SHORTCUT_DEFINITIONS.find((d) => d.id === recordingActionId)?.label}</strong>. Pressione a combinação de teclas agora...
                        </span>
                      </div>
                      <span className="text-[11px] font-mono opacity-80">(Esc para cancelar)</span>
                    </div>
                  )}
                </div>

                {/* Categorized Shortcuts List */}
                <div className="space-y-5">
                  {(['Geral', 'Navegação', 'Editor'] as const).map((category) => {
                    const items = filteredDefinitions.filter((d) => d.category === category)
                    if (items.length === 0) return null

                    return (
                      <div key={category} className="space-y-2">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-content-muted px-1">
                          {category === 'Geral' ? '🚀 Geral' : category === 'Navegação' ? '🧭 Navegação & Janelas' : '✍️ Editor & Ferramentas'}
                        </div>

                        <div className="divide-y divide-surface-border/60 border border-surface-border rounded-md overflow-hidden bg-surface-secondary/40">
                          {items.map((def) => {
                            const currentKey = getShortcutKey(settings, def.id)
                            const isCustom = Boolean(
                              settings.shortcuts?.[def.id] && settings.shortcuts[def.id] !== def.defaultKey
                            )
                            const isRecording = recordingActionId === def.id
                            const tokens = formatShortcutDisplay(currentKey)

                            return (
                              <div
                                key={def.id}
                                className={cn(
                                  'p-3 flex items-center justify-between text-xs transition-colors',
                                  isRecording ? 'bg-accent/15' : 'hover:bg-surface-secondary/70'
                                )}
                              >
                                <div className="space-y-0.5 pr-3 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-content-primary truncate">
                                      {def.label}
                                    </span>
                                    {isCustom && (
                                      <Badge variant="accent" size="sm">
                                        Personalizado
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-content-muted leading-relaxed line-clamp-1">
                                    {def.description}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <SelectionButton
                                    type="button"
                                    onClick={() => {
                                      setConflictNotice(null)
                                      setRecordingActionId(isRecording ? null : def.id)
                                    }}
                                    title={isRecording ? 'Pressione Esc para cancelar' : 'Clique para redefinir este atalho'}
                                    className={cn(
                                      'flex items-center gap-1 px-2.5 py-1 rounded-lg border font-mono text-[11px] transition-all cursor-pointer select-none',
                                      isRecording
                                        ? 'bg-accent text-white border-accent ring-2 ring-accent/40 shadow-xs'
                                        : isCustom
                                          ? 'bg-accent-soft text-accent border-accent/40 hover:border-accent hover:shadow-xs'
                                          : 'bg-surface-bg border-surface-border text-content-primary hover:border-accent/50 hover:bg-surface-tertiary'
                                    )}
                                  >
                                    {isRecording ? (
                                      <span className="flex items-center gap-1.5 font-sans font-semibold text-xs">
                                        <Keyboard className="w-3.5 h-3.5 animate-bounce" />
                                        <span>Gravando...</span>
                                      </span>
                                    ) : (
                                      tokens.map((token, idx) => (
                                        <React.Fragment key={token}>
                                          <span className="font-semibold">{token}</span>
                                          {idx < tokens.length - 1 && <span className="opacity-50">+</span>}
                                        </React.Fragment>
                                      ))
                                    )}
                                  </SelectionButton>

                                  {isCustom && !isRecording && (
                                    <IconButton
                                      variant="ghost"
                                      size="xs"
                                      onClick={() => handleResetSingleShortcut(def.id)}
                                      tooltip={`Restaurar padrão (${def.defaultKey})`}
                                      icon={<RotateCcw className="w-3.5 h-3.5 text-content-muted hover:text-content-primary" />}
                                    />
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}

                  {filteredDefinitions.length === 0 && (
                    <div className="p-8 text-center text-xs text-content-muted bg-surface-secondary/30 rounded-md border border-dashed border-surface-border">
                      Nenhum atalho encontrado para &ldquo;{shortcutSearch}&rdquo;.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 6. SOBRE & ATUALIZAÇÕES */}
            {activeTab === 'updates' && (
              <AppUpdatesSection
                runtimeInfo={runtimeInfo}
                updateState={updateState}
                isCheckingUpdates={isCheckingUpdates}
                onCheckUpdates={() => {
                  setIsCheckingUpdates(true)
                  window.electronAPI
                    ?.checkForAppUpdates?.()
                    .then((state) => {
                      if (state) setUpdateState(state)
                    })
                    .finally(() => setIsCheckingUpdates(false))
                }}
                onDownloadUpdate={() => {
                  window.electronAPI?.downloadAppUpdate?.().then((state) => {
                    if (state) setUpdateState(state)
                  })
                }}
                onInstallUpdate={() => {
                  window.electronAPI?.installAppUpdate?.().catch(() => {})
                }}
                onOpenFolder={(targetPath) => {
                  window.electronAPI?.openInExplorer?.(targetPath).catch(() => {})
                }}
              />
            )}
          </main>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-surface-secondary border-t border-surface-border flex justify-end shrink-0">
          <Button variant="primary" size="sm" onClick={onClose}>
            Concluído
          </Button>
        </div>
      </div>
    )

    if (isStandalone) {
      return content
    }

    return (
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        onClick={onClose}
      >
        {content}
      </div>
    )
}
