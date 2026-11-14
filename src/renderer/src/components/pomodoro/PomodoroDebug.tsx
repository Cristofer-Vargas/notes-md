import React, { useEffect, useState } from 'react'
import type { PomodoroDebugAction } from '../../../../shared/pomodoro'
import { Button, Input } from '../ui'

export function PomodoroDebug(): React.ReactElement | null {
  const [enabled, setEnabled] = useState(false)
  const [count, setCount] = useState(1)
  const [minutes, setMinutes] = useState(25)
  const [xp, setXp] = useState(25)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  useEffect(() => { let mounted = true; void window.electronAPI.getAppRuntimeInfo().then((info) => { if (mounted) setEnabled(info.environment === 'dev' && !info.isPackaged) }).catch(() => {}); return () => { mounted = false } }, [])
  if (!enabled) return null
  const run = async (action: PomodoroDebugAction): Promise<void> => {
    setBusy(true); setMessage('')
    try { await window.electronAPI.debugPomodoro(action); setMessage(action.type === 'clear' ? 'Dados de teste removidos.' : 'Alteração de teste aplicada.') }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível aplicar a alteração de teste.') }
    finally { setBusy(false) }
  }
  return <details className="border border-surface-border bg-surface-secondary p-3 text-xs text-content-primary">
    <summary className="cursor-pointer font-semibold">Ferramentas de teste · DEV</summary>
    <div className="mt-3 space-y-3"><p className="text-content-muted">Os dados simulados afetam os relatórios e o progresso do perfil de desenvolvimento.</p>
      <div className="grid grid-cols-2 gap-2"><label className="space-y-1 text-content-secondary"><span>Sessões (1–100)</span><Input type="number" min={1} max={100} value={count} onChange={(event) => setCount(Number(event.target.value))} /></label><label className="space-y-1 text-content-secondary"><span>Minutos (1–180)</span><Input type="number" min={1} max={180} value={minutes} onChange={(event) => setMinutes(Number(event.target.value))} /></label></div>
      <Button variant="secondary" size="xs" disabled={busy} onClick={() => void run({ type: 'sessions', count, minutes })}>Adicionar sessões concluídas</Button>
      <div className="flex items-end gap-2"><label className="min-w-0 flex-1 space-y-1 text-content-secondary"><span>XP (1–10000)</span><Input type="number" min={1} max={10000} value={xp} onChange={(event) => setXp(Number(event.target.value))} /></label><Button variant="secondary" size="xs" disabled={busy} onClick={() => void run({ type: 'xp', xp })}>Adicionar XP</Button></div>
      <div className="flex flex-wrap gap-2"><Button variant="secondary" size="xs" disabled={busy} onClick={() => void run({ type: 'complete' })}>Concluir etapa atual</Button><Button variant="danger" size="xs" disabled={busy} onClick={() => void run({ type: 'clear' })}>Remover dados de teste</Button></div>
      {message && <p role="status" className="text-content-secondary">{message}</p>}
    </div>
  </details>
}
