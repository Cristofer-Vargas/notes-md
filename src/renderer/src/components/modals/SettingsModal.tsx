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
  AlertTriangle
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
import { Button, IconButton, Badge, Input } from '../ui'
import {
  SHORTCUT_DEFINITIONS,
  formatShortcutDisplay,
  parseKeyboardEventToShortcut,
  getShortcutKey,
  findShortcutConflict
} from '../../services/shortcutService'
import { cn } from '../../utils/cn'

interface SettingsModalProps {
  isOpen: boolean
  settings: AppSettings
  onUpdateSettings: (partial: Partial<AppSettings>) => void
  onClose: () => void
  isStandalone?: boolean
}

type SettingsTab = 'appearance' | 'typography' | 'spellcheck' | 'shortcuts'

const THEME_OPTIONS: Array<{ id: ThemeMode; label: string; desc: string; icon: React.ReactNode }> =
  [
    {
      id: 'light',
      label: 'Claro (Clean Paper)',
      desc: 'Visual limpo e moderno inspirado em documentos reais',
      icon: <Sun className="w-4 h-4" />
    },
    {
      id: 'dark',
      label: 'Escuro (Dracula VS Code)',
      desc: 'Inspirado no tema Dracula do VS Code: tons aveludados, baixo contraste e sem fadiga visual',
      icon: <Moon className="w-4 h-4" />
    },
    {
      id: 'sepia',
      label: 'Sépia Editorial',
      desc: 'Tom quente ideal para sessões longas de leitura e escrita',
      icon: <BookOpen className="w-4 h-4" />
    }
  ]

const ACCENT_OPTIONS: Array<{ id: AccentPreset; label: string; hex: string; darkHex: string }> = [
  { id: 'purple', label: 'Roxo Dracula', hex: '#7c3aed', darkHex: '#bd93f9' },
  { id: 'blue', label: 'Azul / Ciano', hex: '#2563eb', darkHex: '#8be9fd' },
  { id: 'emerald', label: 'Verde Esmeralda', hex: '#059669', darkHex: '#50fa7b' },
  { id: 'amber', label: 'Âmbar / Laranja', hex: '#d97706', darkHex: '#ffb86c' },
  { id: 'rose', label: 'Rosa Carmesim', hex: '#e11d48', darkHex: '#ff79c6' }
]

const FONT_OPTIONS: Array<{ id: FontFamilyPreset; label: string; sample: string }> = [
  { id: 'sans', label: 'Sans-Serif Moderna (Inter)', sample: 'Abc 123' },
  { id: 'serif', label: 'Serifada Editorial (Georgia)', sample: 'Abc 123' },
  { id: 'mono', label: 'Monoespaçada (JetBrains Mono)', sample: 'Abc 123' }
]

const FONT_WEIGHT_OPTIONS: Array<{
  id: EditorFontWeightPreset
  label: string
  desc: string
  weight: number
}> = [
  { id: '200', label: 'Extra Fina (200)', desc: 'Padrão suave, leve e respirável', weight: 200 },
  { id: '300', label: 'Fina (300)', desc: 'Leve com traço sutilmente mais definido', weight: 300 },
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
  isStandalone = false
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance')
  const [newIgnoredWord, setNewIgnoredWord] = useState('')
  const [recordingActionId, setRecordingActionId] = useState<ShortcutActionId | null>(null)
  const [shortcutSearch, setShortcutSearch] = useState('')
  const [conflictNotice, setConflictNotice] = useState<{
    actionName: string
    candidateKey: string
  } | null>(null)

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

  const currentWeight = settings.editorFontWeight || '200'

  const content = (
    <div
      className={cn(
        'bg-surface-bg flex flex-col overflow-hidden select-none',
        isStandalone
          ? 'w-full h-full'
          : 'w-full max-w-3xl rounded-2xl border border-surface-border shadow-2xl h-[600px] max-h-[90vh]'
      )}
      onClick={isStandalone ? undefined : (e) => e.stopPropagation()}
    >
        {/* Header */}
        <div className="px-5 py-3.5 bg-surface-secondary border-b border-surface-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-accent-soft text-accent flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-content-primary">Configurações do Notes-MD</h2>
              <p className="text-[11px] text-content-muted">
                Personalize tema, tipografia, ortografia e atalhos rápidos do aplicativo.
              </p>
            </div>
          </div>
          <IconButton
            variant="ghost"
            size="sm"
            onClick={onClose}
            tooltip="Fechar Configurações (Esc)"
            icon={<X className="w-4 h-4" />}
          />
        </div>

        {/* Modal Body: Left Tab Navigation + Right Sector Content */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Left Sidebar Navigation */}
          <aside className="w-52 bg-surface-secondary/70 border-r border-surface-border p-2 space-y-1 shrink-0 select-none flex flex-col justify-between">
            <nav className="space-y-1">
              <button
                type="button"
                onClick={() => setActiveTab('appearance')}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-colors cursor-pointer',
                  activeTab === 'appearance'
                    ? 'bg-accent text-white shadow-xs'
                    : 'text-content-secondary hover:bg-surface-tertiary hover:text-content-primary'
                )}
              >
                <Palette className="w-4 h-4 shrink-0" />
                <span>Aparência & Tema</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('typography')}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-colors cursor-pointer',
                  activeTab === 'typography'
                    ? 'bg-accent text-white shadow-xs'
                    : 'text-content-secondary hover:bg-surface-tertiary hover:text-content-primary'
                )}
              >
                <Type className="w-4 h-4 shrink-0" />
                <span>Tipografia & Editor</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('spellcheck')}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-colors cursor-pointer',
                  activeTab === 'spellcheck'
                    ? 'bg-accent text-white shadow-xs'
                    : 'text-content-secondary hover:bg-surface-tertiary hover:text-content-primary'
                )}
              >
                <SpellCheck className="w-4 h-4 shrink-0" />
                <span>Ortografia & Idiomas</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('shortcuts')}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-colors cursor-pointer',
                  activeTab === 'shortcuts'
                    ? 'bg-accent text-white shadow-xs'
                    : 'text-content-secondary hover:bg-surface-tertiary hover:text-content-primary'
                )}
              >
                <Keyboard className="w-4 h-4 shrink-0" />
                <span>Atalhos de Teclado</span>
              </button>
            </nav>

            <div className="p-2 bg-surface-bg/60 rounded-xl border border-surface-border/60 text-[10px] text-content-muted leading-tight">
              Versão <span className="font-mono text-content-secondary">0.1.0-alpha.1</span>
              <br />
              Armazenamento local ativo
            </div>
          </aside>

          {/* Right Panel: Active Sector Content */}
          <main className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* 1. APARÊNCIA & TEMA */}
            {activeTab === 'appearance' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                {/* Theme Selection */}
                <section className="space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-content-muted">
                    <Palette className="w-3.5 h-3.5 text-accent" />
                    <span>Tema de Cores</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {THEME_OPTIONS.map((t) => {
                      const active = settings.theme === t.id
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => onUpdateSettings({ theme: t.id })}
                          className={cn(
                            'p-3 rounded-xl border text-left transition-all cursor-pointer',
                            active
                              ? 'border-accent bg-accent-soft ring-1 ring-accent'
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
                        </button>
                      )
                    })}
                  </div>
                </section>

                {/* Accent Color */}
                <section className="space-y-2.5">
                  <div className="text-xs font-bold uppercase tracking-wider text-content-muted">
                    Cor de Destaque (Links, Botões e Seleções)
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ACCENT_OPTIONS.map((a) => {
                      const active = settings.accent === a.id
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => onUpdateSettings({ accent: a.id })}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all cursor-pointer',
                            active
                              ? 'border-accent bg-accent-soft text-content-primary ring-1 ring-accent'
                              : 'border-surface-border bg-surface-secondary text-content-secondary hover:text-content-primary'
                          )}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                            style={{ backgroundColor: settings.theme === 'dark' ? a.darkHex : a.hex }}
                          />
                          <span>{a.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </section>

                {/* Document Canvas Style & Page Width */}
                <section className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-content-muted">
                    <Layout className="w-3.5 h-3.5 text-accent" />
                    <span>Layout do Documento</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-content-secondary">
                        Estilo da Folha
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {(
                          [
                            { id: 'paper', label: 'Folha Destacada' },
                            { id: 'flat', label: 'Contínuo (Flat)' }
                          ] as Array<{ id: CanvasStylePreset; label: string }>
                        ).map((c) => (
                          <button
                            key={c.id}
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
                          </button>
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
                          <button
                            key={w.id}
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
                          </button>
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
                    <span>Família de Fontes</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {FONT_OPTIONS.map((f) => {
                      const active = settings.fontFamily === f.id
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => onUpdateSettings({ fontFamily: f.id })}
                          className={cn(
                            'p-3 rounded-xl border text-left transition-all cursor-pointer',
                            active
                              ? 'border-accent bg-accent-soft ring-1 ring-accent'
                              : 'border-surface-border bg-surface-secondary hover:border-accent/40'
                          )}
                        >
                          <div className="text-sm font-bold text-content-primary mb-0.5">{f.sample}</div>
                          <div className="text-xs text-content-secondary">{f.label}</div>
                        </button>
                      )
                    })}
                  </div>
                </section>

                {/* Font Weight Configuration (Requested Feature) */}
                <section className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold uppercase tracking-wider text-content-muted">
                      Espessura do Texto das Notas (Font Weight)
                    </div>
                    <Badge variant="accent" size="sm">
                      Padrão 200 ativo
                    </Badge>
                  </div>
                  <p className="text-xs text-content-secondary leading-relaxed">
                    O texto padrão das notas fica mais leve e elegante, enquanto os títulos e termos em <strong>negrito</strong> permanecem destacados (600 a 800).
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {FONT_WEIGHT_OPTIONS.map((w) => {
                      const active = currentWeight === w.id
                      return (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => onUpdateSettings({ editorFontWeight: w.id })}
                          className={cn(
                            'p-3 rounded-xl border text-left transition-all cursor-pointer',
                            active
                              ? 'border-accent bg-accent-soft ring-1 ring-accent'
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
                        </button>
                      )
                    })}
                  </div>
                </section>

                {/* Font Size & Line Height */}
                <section className="space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-content-muted">
                    Dimensões do Texto
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3 rounded-xl bg-surface-secondary border border-surface-border space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-content-primary">Tamanho Base da Fonte</span>
                        <span className="font-bold text-accent">{settings.baseFontSize}px</span>
                      </div>
                      <input
                        type="range"
                        min={13}
                        max={22}
                        step={1}
                        value={settings.baseFontSize}
                        onChange={(e) => onUpdateSettings({ baseFontSize: Number(e.target.value) })}
                        className="w-full accent-[var(--accent-color)] cursor-pointer"
                      />
                    </div>

                    <div className="p-3 rounded-xl bg-surface-secondary border border-surface-border space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-content-primary">Espaçamento entre Linhas</span>
                        <span className="font-bold text-accent">{settings.lineHeight.toFixed(1)}</span>
                      </div>
                      <input
                        type="range"
                        min={1.4}
                        max={2.1}
                        step={0.1}
                        value={settings.lineHeight}
                        onChange={(e) => onUpdateSettings({ lineHeight: Number(e.target.value) })}
                        className="w-full accent-[var(--accent-color)] cursor-pointer"
                      />
                    </div>
                  </div>
                </section>

                {/* Interactive Live Sample Box */}
                <section className="p-3.5 rounded-xl bg-surface-secondary border border-surface-border space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-content-muted flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-accent" />
                    <span>Amostra Visual da Tipografia</span>
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
                    <button
                      type="button"
                      onClick={() => onUpdateSettings({ spellcheck: !settings.spellcheck })}
                      className={cn(
                        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden',
                        settings.spellcheck ? 'bg-accent' : 'bg-surface-tertiary'
                      )}
                    >
                      <span
                        className={cn(
                          'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out',
                          settings.spellcheck ? 'translate-x-4' : 'translate-x-0'
                        )}
                      />
                    </button>
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
                            <button
                              key={lang.id}
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
                                'flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer',
                                isSelected
                                  ? 'border-accent bg-accent-soft text-content-primary ring-1 ring-accent'
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
                            </button>
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
                            <button
                              type="button"
                              onClick={handleClearAllIgnoredWords}
                              className="text-[10px] text-rose-500 hover:text-rose-600 hover:underline cursor-pointer"
                            >
                              Limpar todas
                            </button>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <input
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
                            className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-surface-border bg-surface-secondary text-content-primary placeholder:text-content-muted focus:outline-hidden focus:border-accent"
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

                        <div className="p-2.5 rounded-xl bg-surface-secondary/60 border border-surface-border min-h-[52px] max-h-36 overflow-y-auto flex flex-wrap gap-1.5 items-center">
                          {settings.ignoredWords && settings.ignoredWords.length > 0 ? (
                            settings.ignoredWords.map((word) => (
                              <span
                                key={word}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-surface-bg border border-surface-border text-content-primary shadow-2xs group"
                              >
                                <span>{word}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveIgnoredWord(word)}
                                  title={`Remover "${word}" das palavras ignoradas`}
                                  className="text-content-muted hover:text-rose-500 rounded p-0.5 transition-colors cursor-pointer"
                                >
                                  <X className="w-3 h-3" />
                                </button>
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

            {/* 4. ATALHOS DE TECLADO (Personalizáveis) */}
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
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2 text-xs text-amber-500 animate-in fade-in">
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
                    <div className="p-3 rounded-xl bg-accent-soft border border-accent/40 flex items-center justify-between gap-2 text-xs text-accent animate-pulse">
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

                        <div className="divide-y divide-surface-border/60 border border-surface-border rounded-xl overflow-hidden bg-surface-secondary/40">
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
                                  <button
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
                                  </button>

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
                    <div className="p-8 text-center text-xs text-content-muted bg-surface-secondary/30 rounded-xl border border-dashed border-surface-border">
                      Nenhum atalho encontrado para &ldquo;{shortcutSearch}&rdquo;.
                    </div>
                  )}
                </div>
              </div>
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
