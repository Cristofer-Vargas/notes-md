import React, { useState } from 'react'
import { X, Sun, Moon, BookOpen, Palette, Type, Layout, SpellCheck, Check, Plus, EyeOff } from 'lucide-react'
import type {
  AccentPreset,
  AppSettings,
  CanvasStylePreset,
  FontFamilyPreset,
  PageWidthPreset,
  ThemeMode
} from '../../types/app'

interface SettingsModalProps {
  isOpen: boolean
  settings: AppSettings
  onUpdateSettings: (partial: Partial<AppSettings>) => void
  onClose: () => void
}

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
  onClose
}) => {
  const [newIgnoredWord, setNewIgnoredWord] = useState('')

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

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-surface-bg border border-surface-border shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-surface-secondary border-b border-surface-border flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-content-primary">
              Personalização & Aparência
            </h2>
            <p className="text-xs text-content-secondary">
              Personalize temas, cores de destaque, tipografia e o layout da página em tempo real.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-content-secondary hover:bg-surface-tertiary hover:text-content-primary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* 1. Theme Selection */}
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
                    className={`p-3 rounded-xl border text-left transition-all ${
                      active
                        ? 'border-accent bg-accent-soft ring-1 ring-accent'
                        : 'border-surface-border bg-surface-secondary hover:border-accent/40'
                    }`}
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

          {/* 2. Accent Color */}
          <section className="space-y-2.5">
            <div className="text-xs font-bold uppercase tracking-wider text-content-muted">
              Cor de Destaque (Links, Botões e Destaques)
            </div>
            <div className="flex flex-wrap gap-2">
              {ACCENT_OPTIONS.map((a) => {
                const active = settings.accent === a.id
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => onUpdateSettings({ accent: a.id })}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                      active
                        ? 'border-accent bg-accent-soft text-content-primary ring-1 ring-accent'
                        : 'border-surface-border bg-surface-secondary text-content-secondary hover:text-content-primary'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full"
                      style={{ backgroundColor: settings.theme === 'dark' ? a.darkHex : a.hex }}
                    />
                    <span>{a.label}</span>
                  </button>
                )
              })}
            </div>
          </section>

          {/* 3. Typography */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-content-muted">
              <Type className="w-3.5 h-3.5 text-accent" />
              <span>Tipografia do Editor</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {FONT_OPTIONS.map((f) => {
                const active = settings.fontFamily === f.id
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => onUpdateSettings({ fontFamily: f.id })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      active
                        ? 'border-accent bg-accent-soft ring-1 ring-accent'
                        : 'border-surface-border bg-surface-secondary hover:border-accent/40'
                    }`}
                  >
                    <div className="text-sm font-bold text-content-primary mb-0.5">{f.sample}</div>
                    <div className="text-xs text-content-secondary">{f.label}</div>
                  </button>
                )
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
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

          {/* 4. Page & Canvas Layout */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-content-muted">
              <Layout className="w-3.5 h-3.5 text-accent" />
              <span>Layout da Página e Canvas</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-content-secondary">
                  Estilo do Documento
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
                      className={`py-2 px-3 rounded-lg border text-xs font-medium transition-colors ${
                        settings.canvasStyle === c.id
                          ? 'border-accent bg-accent-soft text-accent'
                          : 'border-surface-border bg-surface-secondary text-content-secondary'
                      }`}
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
                      className={`py-2 px-2 rounded-lg border text-xs font-medium transition-colors ${
                        settings.pageWidth === w.id
                          ? 'border-accent bg-accent-soft text-accent'
                          : 'border-surface-border bg-surface-secondary text-content-secondary'
                      }`}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* 5. Spellcheck & Languages */}
          <section className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-content-muted">
                <SpellCheck className="w-3.5 h-3.5 text-accent" />
                <span>Ortografia e Idiomas (Nativo Windows)</span>
              </div>
              <button
                type="button"
                onClick={() => onUpdateSettings({ spellcheck: !settings.spellcheck })}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  settings.spellcheck ? 'bg-accent' : 'bg-surface-tertiary'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    settings.spellcheck ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <p className="text-xs text-content-secondary leading-relaxed">
              Usa o motor ortográfico nativo do sistema operacional. Sublinha palavras com erros e oferece sugestões ao clicar com o botão direito. Você pode selecionar <strong>múltiplos idiomas simultaneamente</strong>.
            </p>

            {settings.spellcheck && (
              <div className="space-y-2 pt-1 animate-in fade-in duration-150">
                <div className="text-[11px] font-semibold text-content-muted uppercase tracking-wider">
                  Idiomas de Verificação Simultânea:
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
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-accent bg-accent-soft text-content-primary ring-1 ring-accent'
                            : 'border-surface-border bg-surface-secondary text-content-secondary hover:border-accent/40'
                        }`}
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
                          className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'bg-accent border-accent text-white'
                              : 'border-surface-border bg-surface-bg'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </button>
                    )
                  })}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-content-muted pt-1">
                  <span>💡</span>
                  <span>
                    Dica: Ao redigir em português com termos em inglês, ambos são validados sem falsos positivos!
                  </span>
                </div>

                {/* Palavras Ignoradas / Dicionário Personalizado */}
                <div className="pt-3 border-t border-surface-border/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-semibold text-content-muted uppercase tracking-wider flex items-center gap-1.5">
                      <EyeOff className="w-3.5 h-3.5 text-accent" />
                      <span>Palavras Ignoradas (Dicionário do Usuário)</span>
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

                  <p className="text-[11px] text-content-secondary leading-snug">
                    Palavras adicionadas aqui ou pelo clique direito do mouse não serão sublinhadas com erro ortográfico.
                  </p>

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
                      placeholder="Adicionar palavra para ignorar (ex: nomedaempresa)..."
                      className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-surface-border bg-surface-secondary text-content-primary placeholder:text-content-muted focus:outline-hidden focus:border-accent"
                    />
                    <button
                      type="button"
                      onClick={handleAddIgnoredWord}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-accent text-white hover:bg-accent-hover transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar</span>
                    </button>
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
                        Nenhuma palavra ignorada cadastrada. Digite acima ou clique em &ldquo;Ignorar&rdquo; no menu de contexto.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-surface-secondary border-t border-surface-border flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-accent text-white hover:bg-accent-hover transition-colors"
          >
            Concluído
          </button>
        </div>
      </div>
    </div>
  )
}
