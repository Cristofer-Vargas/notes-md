import React from 'react'
import {
  CheckCircle2,
  Download,
  FolderOpen,
  Info,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Terminal
} from 'lucide-react'
import type { AppRuntimeInfo, AppUpdatePhase, AppUpdateState } from '../../../../shared/appUpdate'
import { Badge, Button, type BadgeVariant } from '../ui'
import appLogo from '../../assets/logo.png'

interface AppUpdatesSectionProps {
  runtimeInfo: AppRuntimeInfo | null
  updateState: AppUpdateState | null
  isCheckingUpdates: boolean
  onCheckUpdates: () => void
  onDownloadUpdate: () => void
  onInstallUpdate: () => void
  onOpenFolder: (targetPath: string) => void
}

function getUpdateStatusBadge(phase?: AppUpdatePhase): {
  label: string
  variant: BadgeVariant
} {
  switch (phase) {
    case 'checking':
      return { label: 'Verificando', variant: 'accent' }
    case 'available':
      return { label: 'Disponível', variant: 'accent' }
    case 'downloading':
      return { label: 'Baixando', variant: 'accent' }
    case 'downloaded':
      return { label: 'Pronta para instalar', variant: 'success' }
    case 'not-available':
      return { label: 'Atualizado', variant: 'success' }
    case 'unsupported-dev':
      return { label: 'Modo Dev', variant: 'warning' }
    case 'error':
      return { label: 'Aviso', variant: 'warning' }
    default:
      return { label: 'Pronto', variant: 'default' }
  }
}

export const AppUpdatesSection: React.FC<AppUpdatesSectionProps> = ({
  runtimeInfo,
  updateState,
  isCheckingUpdates,
  onCheckUpdates,
  onDownloadUpdate,
  onInstallUpdate,
  onOpenFolder
}) => {
  const isDev = runtimeInfo?.environment === 'dev'
  const statusBadge = getUpdateStatusBadge(updateState?.phase)
  const downloadPercent = updateState?.downloadPercent ?? 0

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="pb-2 border-b border-surface-border/60">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-content-muted">
          <Info className="w-3.5 h-3.5 text-accent" />
          <span>Sobre & Atualizações</span>
        </div>
        <p className="text-xs text-content-secondary mt-0.5">
          Informações da execução atual, isolamento Dev/Estável e atualização do executável.
        </p>
      </div>

      {/* Runtime Identity Card */}
      <section className="rounded-xl border border-surface-border bg-surface-secondary/50 p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img src={appLogo} alt="Notes-MD" className="app-logo w-10 h-10 object-contain shrink-0" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-content-primary">Notes-MD</h3>
                <Badge variant="default" size="sm">
                  v{runtimeInfo?.version || '...'}
                </Badge>
                <Badge
                  variant={isDev ? 'warning' : 'success'}
                  size="sm"
                  icon={
                    isDev ? (
                      <Terminal className="w-3 h-3" />
                    ) : (
                      <ShieldCheck className="w-3 h-3" />
                    )
                  }
                >
                  {isDev ? 'Modo Dev (Isolado)' : 'Executável Estável'}
                </Badge>
              </div>
              <p className="text-xs text-content-muted mt-0.5">
                {isDev
                  ? 'Instância de desenvolvimento isolada — pode rodar junto com a versão instalada.'
                  : 'Instância estável empacotada para uso diário.'}
              </p>
            </div>
          </div>
        </div>

        {runtimeInfo && (
          <div className="grid grid-cols-1 gap-2 pt-2 border-t border-surface-border/60 text-xs">
            <div className="flex items-center justify-between gap-2 rounded-lg bg-surface-bg/70 border border-surface-border/60 px-3 py-2">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-content-secondary">
                  Perfil de configurações (userData)
                </div>
                <div className="text-[11px] font-mono text-content-muted truncate select-text">
                  {runtimeInfo.userDataPath}
                </div>
              </div>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => onOpenFolder(runtimeInfo.userDataPath)}
                leftIcon={<FolderOpen className="w-3.5 h-3.5" />}
                className="shrink-0"
              >
                Abrir
              </Button>
            </div>

            <div className="flex items-center justify-between gap-2 rounded-lg bg-surface-bg/70 border border-surface-border/60 px-3 py-2">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-content-secondary">
                  Vault padrão deste ambiente
                </div>
                <div className="text-[11px] font-mono text-content-muted truncate select-text">
                  {runtimeInfo.defaultVaultDir}
                </div>
              </div>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => onOpenFolder(runtimeInfo.defaultVaultDir)}
                leftIcon={<FolderOpen className="w-3.5 h-3.5" />}
                className="shrink-0"
              >
                Abrir
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* Auto-Update Status & Actions */}
      <section className="rounded-xl border border-surface-border bg-surface-secondary/50 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-accent" />
            <span className="text-xs font-bold uppercase tracking-wider text-content-muted">
              Atualizações pelo GitHub Releases
            </span>
          </div>
          <Badge variant={statusBadge.variant} size="sm">
            {statusBadge.label}
          </Badge>
        </div>

        <p className="text-xs text-content-secondary leading-relaxed">
          {updateState?.message || 'Pronto para verificar novas versões do Notes-MD.'}
        </p>

        {updateState?.phase === 'downloading' && (
          <div className="space-y-1">
            <div className="h-2 w-full rounded-full bg-surface-bg overflow-hidden border border-surface-border">
              <div
                className="h-full bg-accent transition-all duration-200"
                style={{ width: `${downloadPercent}%` }}
              />
            </div>
            <div className="text-[11px] font-mono text-content-muted text-right">
              {downloadPercent}%
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button
            variant="secondary"
            size="sm"
            onClick={onCheckUpdates}
            isLoading={isCheckingUpdates || updateState?.phase === 'checking'}
            disabled={isDev || updateState?.phase === 'downloading'}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Verificar atualizações
          </Button>

          {(updateState?.phase === 'available' ||
            (updateState?.phase === 'error' && Boolean(updateState?.availableVersion))) && (
            <Button
              variant="primary"
              size="sm"
              onClick={onDownloadUpdate}
              leftIcon={<Download className="w-3.5 h-3.5" />}
            >
              Baixar v{updateState.availableVersion}
            </Button>
          )}

          {updateState?.phase === 'downloaded' && (
            <Button
              variant="primary"
              size="sm"
              onClick={onInstallUpdate}
              leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
            >
              Instalar e reiniciar
            </Button>
          )}

          {updateState?.phase === 'installing' && (
            <Button
              variant="primary"
              size="sm"
              disabled
              isLoading
              leftIcon={<RotateCcw className="w-3.5 h-3.5 animate-spin" />}
            >
              Instalando e reiniciando...
            </Button>
          )}
        </div>
      </section>

      {/* Automatic Sync, Local Update & Parallel Dev Guide */}
      <section className="rounded-xl border border-accent/30 bg-accent-soft p-4 space-y-2 text-xs">
        <div className="flex items-center gap-2 font-bold text-accent">
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Atualização automática e execução paralela</span>
        </div>
        <ul className="space-y-1.5 text-content-secondary list-disc pl-4 leading-relaxed">
          <li>
            No executável instalado, o Notes-MD verifica novas releases do GitHub automaticamente ao iniciar, ao focar a janela e a cada 30 minutos, baixando as alterações em segundo plano.
          </li>
          <li>
            Commits semânticos feitos com{' '}
            <code className="px-1.5 py-0.5 rounded bg-surface-bg border border-surface-border font-mono text-[11px]">
              npm run commit
            </code>{' '}
            e enviados à branch{' '}
            <code className="px-1.5 py-0.5 rounded bg-surface-bg border border-surface-border font-mono text-[11px]">
              main
            </code>{' '}
            publicam novas versões automaticamente via GitHub Actions.
          </li>
          <li>
            Para gerar uma build local manualmente, execute{' '}
            <code className="px-1.5 py-0.5 rounded bg-surface-bg border border-surface-border font-mono text-[11px]">
              npm run dist:win
            </code>{' '}
            e use o instalador em{' '}
            <code className="px-1.5 py-0.5 rounded bg-surface-bg border border-surface-border font-mono text-[11px]">
              release/Notes-MD-Setup-{'<versão>'}.exe
            </code>
            .
          </li>
          <li>
            Para testar recursos novos com o aplicativo estável já aberto, execute{' '}
            <code className="px-1.5 py-0.5 rounded bg-surface-bg border border-surface-border font-mono text-[11px]">
              npm run dev
            </code>{' '}
            — o modo Dev usa perfil e janela separados.
          </li>
        </ul>
      </section>
    </div>
  )
}
