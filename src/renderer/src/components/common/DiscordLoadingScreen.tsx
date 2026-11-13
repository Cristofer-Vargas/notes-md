import React, { useEffect, useState } from 'react'
import logoImg from '../../assets/logo.png'
import { Badge, Button } from '../ui'
import { Sparkles, Download, RotateCcw } from 'lucide-react'

const DISCORD_STYLE_TIPS = [
  'Conecte notas digitando [[ e selecionando a ideia desejada para criar um WikiLink.',
  'Pressione Ctrl + \\ para dividir o editor e visualizar duas notas lado a lado.',
  'Seus blocos de código com linguagem mermaid geram diagramas interativos instantaneamente.',
  'O Notes MD salva suas notas como arquivos .md locais: seus dados são 100% seus.',
  'Pressione Ctrl + P para abrir o Localizador Rápido e navegar entre notas em milissegundos.',
  'O corretor ortográfico nativo analisa português (Brasil) e inglês simultaneamente.',
  'Você pode personalizar o tema entre Dracula, Claro e Sépia nas Configurações.',
  'Conecte o Discord Rich Presence para mostrar a seus amigos no que você está trabalhando.'
]

export interface DiscordLoadingScreenProps {
  mode: 'startup' | 'update'
  title?: string
  subtitle?: string
  progress?: number
  version?: string
  onDismiss?: () => void
}

export const DiscordLoadingScreen: React.FC<DiscordLoadingScreenProps> = ({
  mode,
  title,
  subtitle,
  progress,
  version,
  onDismiss
}) => {
  const [tipIndex, setTipIndex] = useState(() => Math.floor(Math.random() * DISCORD_STYLE_TIPS.length))

  // Rotate tips periodically just like Discord
  useEffect(() => {
    const timer = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % DISCORD_STYLE_TIPS.length)
    }, 4500)
    return () => clearInterval(timer)
  }, [])

  const defaultTitle = mode === 'startup' ? 'Notes MD' : 'Atualizando o Notes MD'
  const isDeterminate = typeof progress === 'number' && !isNaN(progress)
  const clampedProgress = isDeterminate ? Math.max(0, Math.min(100, Math.round(progress))) : null

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-between p-8 bg-surface-bg select-none animate-in fade-in duration-300"
      style={{
        backgroundImage:
          'radial-gradient(circle at 50% 45%, var(--accent-soft, rgba(16, 185, 129, 0.12)) 0%, transparent 60%)'
      }}
    >
      {/* Top spacer */}
      <div className="w-full flex justify-end">
        {mode === 'update' && onDismiss && isDeterminate && clampedProgress !== 100 && (
          <Button variant="ghost" size="xs" onClick={onDismiss}>
            Continuar em segundo plano
          </Button>
        )}
      </div>

      {/* Central Hero: Discord-Style Floating Logo & Progress */}
      <div className="flex flex-col items-center max-w-sm w-full text-center space-y-6">
        {/* Animated Crystal Logo with Glow Aura */}
        <div className="relative flex items-center justify-center">
          <div className="absolute w-28 h-28 rounded-full bg-accent/25 blur-2xl animate-discord-glow" />
          <div className="relative z-10 w-24 h-24 flex items-center justify-center animate-discord-logo filter drop-shadow-xl">
            <img
              src={logoImg}
              alt="Notes MD Logo"
              className="w-full h-full object-contain pointer-events-none"
            />
          </div>
        </div>

        {/* Title & Version Pill */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-content-primary">
              {title || defaultTitle}
            </h1>
            {version && (
              <Badge variant="accent" size="sm">
                v{version}
              </Badge>
            )}
          </div>
          <p className="text-xs text-content-secondary max-w-xs transition-all duration-200">
            {subtitle || (mode === 'startup' ? 'Iniciando espaço de trabalho...' : 'Preparando atualização...')}
          </p>
        </div>

        {/* Progress Bar Container */}
        <div className="w-72 max-w-[85vw] space-y-2">
          <div className="w-full h-2 bg-surface-tertiary rounded-full overflow-hidden border border-surface-border/60 relative shadow-inner">
            {isDeterminate ? (
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 rounded-full transition-all duration-300 shadow-sm"
                style={{ width: `${clampedProgress}%` }}
              />
            ) : (
              <div className="h-full w-2/5 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full animate-discord-indeterminate shadow-sm" />
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-content-muted px-0.5">
            <span>
              {mode === 'startup'
                ? 'Carregando Vault'
                : clampedProgress === 100
                  ? 'Pronto para reiniciar'
                  : 'Sincronizando'}
            </span>
            <span>
              {isDeterminate ? `${clampedProgress}%` : mode === 'startup' ? 'Notes MD' : 'Aguarde...'}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Footer: Discord-Style Tips */}
      <div className="max-w-md w-full text-center space-y-1.5 px-4 pb-2">
        <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-accent tracking-wide uppercase">
          <Sparkles className="w-3 h-3" />
          <span>Você sabia?</span>
        </div>
        <p className="text-xs text-content-secondary/80 leading-relaxed min-h-[36px] flex items-center justify-center transition-opacity duration-300">
          {DISCORD_STYLE_TIPS[tipIndex]}
        </p>
      </div>
    </div>
  )
}
