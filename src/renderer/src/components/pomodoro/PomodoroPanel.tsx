import React, { useEffect, useMemo, useRef, useState } from 'react'
import { BarChart3, ExternalLink, Pause, Pin, Play, RotateCcw, Settings2, SkipForward, Square, Timer, X } from 'lucide-react'
import type { PomodoroContext, PomodoroSession, PomodoroSettings, PomodoroState } from '../../../../shared/pomodoro'
import { Button, IconButton, Input, Switch } from '../ui'
import { SelectMenu } from '../ui/SelectMenu'
import { filterPomodoroSessions, groupPomodoroSessions } from './reports'
import { ProgressSummary } from './PomodoroProgress'

const emptyContext: PomodoroContext = { vaultPath: '', vaultName: '', activePath: null, notes: [] }
const phaseLabels = { focus: 'Foco', shortBreak: 'Pausa curta', longBreak: 'Pausa longa' }
export function formatPomodoroTime(ms: number): string { const seconds = Math.ceil(Math.max(0, ms) / 1000); return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}` }

export function usePomodoro(): PomodoroState | null {
  const [state, setState] = useState<PomodoroState | null>(null)
  useEffect(() => { let mounted = true; const off = window.electronAPI.onPomodoroState(setState); void window.electronAPI.getPomodoro().then((value) => { if (mounted && value) setState(value) }); return () => { mounted = false; off() } }, [])
  return state
}

export function PomodoroPanel({ floating = false, onClose }: { floating?: boolean; onClose?: () => void }): React.ReactElement {
  const state = usePomodoro()
  const [context, setContext] = useState<PomodoroContext>(emptyContext)
  const [selectedNote, setSelectedNote] = useState('')
  const [tab, setTab] = useState<'timer' | 'reports' | 'settings'>('timer')
  const [pinned, setPinned] = useState(false)
  const [period, setPeriod] = useState('day')
  const [outcome, setOutcome] = useState('all')
  const [vault, setVault] = useState('all')
  const [noteFilter, setNoteFilter] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [history, setHistory] = useState<PomodoroSession[]>([])
  const [rewardMessage, setRewardMessage] = useState('')
  const seenReward = useRef<string | null | undefined>(undefined)
  useEffect(() => {
    if (!state) return
    const reward = state.progress.lastReward
    if (seenReward.current === undefined && !reward) { seenReward.current = null; return }
    if (!reward || seenReward.current === reward.sessionId) return
    seenReward.current = reward.sessionId
    setRewardMessage([`+${reward.xp} XP`, reward.levelUp ? `Nível ${state.progress.level} alcançado` : '', reward.starsRevealed ? `${reward.starsRevealed} ${reward.starsRevealed === 1 ? 'estrela revelada' : 'estrelas reveladas'}` : '', reward.constellationsCompleted ? `${reward.constellationsCompleted} ${reward.constellationsCompleted === 1 ? 'constelação concluída' : 'constelações concluídas'}` : '', ...reward.achievements.map((name) => `Conquista: ${name}`)].filter(Boolean).join(' · '))
  }, [state?.progress.lastReward?.sessionId])
  useEffect(() => { let mounted = true; const off = window.electronAPI.onPomodoroContext(setContext); void window.electronAPI.getPomodoroContext().then((value) => { if (mounted && value) setContext(value) }); return () => { mounted = false; off() } }, [])
  useEffect(() => { setSelectedNote(context.activePath || '') }, [context.activePath, context.vaultPath])
  useEffect(() => { let mounted = true; if (state) void window.electronAPI.getPomodoroHistory().then((items) => { if (mounted) setHistory(items) }); return () => { mounted = false } }, [state?.historyVersion])
  const vaults = useMemo(() => Array.from(new Map(history.filter((h) => h.vaultPath).map((h) => [h.vaultPath, h.vaultName])).entries()), [history])
  const notes = useMemo(() => Array.from(new Map(history.filter((h) => h.note && (vault === 'all' || h.note.vaultPath === vault)).map((h) => [`${h.note!.vaultPath}\u0000${h.note!.relativePath}`, h.note!.name])).entries()), [history, vault])
  const filtered = filterPomodoroSessions(history.filter((h) => (h.phase ?? 'focus') === 'focus'), { outcome, vault, note: noteFilter, from, to })
  const bars = groupPomodoroSessions(filtered, period)
  const max = Math.max(1, ...bars.map(([, time]) => time))
  if (!state) return <div className="p-4 text-xs text-content-muted">Carregando Pomodoro...</div>
  const act = (action: Parameters<typeof window.electronAPI.pomodoroAction>[0]): void => {
    const selected = context.notes.find((n) => n.relativePath === selectedNote)
    const note = selected && context.vaultPath ? { vaultPath: context.vaultPath, vaultName: context.vaultName, relativePath: selected.relativePath, name: selected.name } : null
    void window.electronAPI.pomodoroAction(action, note)
  }
  const configure = (settings: Partial<PomodoroSettings>): void => { void window.electronAPI.configurePomodoro(settings) }
  return (
    <section aria-label="Pomodoro" className="flex h-full min-h-0 flex-col bg-surface-bg text-content-primary">
      <header className="flex items-center justify-between border-b border-surface-border px-4 py-2">
        <div className="flex items-center gap-2 text-sm font-semibold"><Timer className="h-4 w-4 text-accent" /> Pomodoro</div>
        <div className="flex items-center gap-1">
          {floating ? <IconButton size="xs" tooltip={pinned ? 'Desafixar janela' : 'Manter janela acima'} isActive={pinned} icon={<Pin className="h-3.5 w-3.5" />} onClick={() => { const next = !pinned; setPinned(next); void window.electronAPI.setPomodoroAlwaysOnTop(next) }} /> : <IconButton size="xs" tooltip="Abrir janela flutuante" icon={<ExternalLink className="h-3.5 w-3.5" />} onClick={() => { void window.electronAPI.openPomodoroWindow(); onClose?.() }} />}
          {onClose && <IconButton size="xs" tooltip="Fechar painel" icon={<X className="h-3.5 w-3.5" />} onClick={onClose} />}
        </div>
      </header>
      <nav aria-label="Seções do Pomodoro" className="flex gap-1 border-b border-surface-border px-3 py-2">
        {([['timer', 'Cronômetro', Timer], ['reports', 'Relatórios', BarChart3], ['settings', 'Configurações', Settings2]] as const).map(([id, label, Icon]) => <Button key={id} size="xs" variant={tab === id ? 'secondary' : 'ghost'} aria-current={tab === id ? 'page' : undefined} leftIcon={<Icon className="h-3.5 w-3.5" />} onClick={() => setTab(id)}>{label}</Button>)}
      </nav>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {state.storageError && <p role="alert" className="mb-3 border border-surface-border bg-surface-secondary p-2 text-xs text-content-primary">{state.storageError}</p>}
        {tab === 'timer' && <fieldset disabled={Boolean(state.storageError)} className="space-y-4">
          <ProgressSummary progress={state.progress} />
          {rewardMessage && <p role="status" className="text-center text-xs text-accent">{rewardMessage}</p>}
          <div className="text-center"><div className="text-xs font-semibold uppercase tracking-wide text-accent">{phaseLabels[state.phase]}</div><div role="timer" aria-label={`Tempo restante ${formatPomodoroTime(state.remainingMs)}`} className="my-3 font-mono text-5xl font-semibold tabular-nums">{formatPomodoroTime(state.remainingMs)}</div><div className="text-xs text-content-muted">{state.status === 'running' ? 'Em andamento' : state.status === 'paused' ? 'Pausado' : 'Pronto para começar'} · Ciclo {state.completedInCycle}/{state.settings.longBreakEvery}</div></div>
          <div className="flex justify-center gap-2">
            {state.status === 'idle' ? <Button variant="primary" leftIcon={<Play className="h-3.5 w-3.5" />} onClick={() => act('start')}>Iniciar</Button> : state.status === 'running' ? <Button variant="primary" leftIcon={<Pause className="h-3.5 w-3.5" />} onClick={() => act('pause')}>Pausar</Button> : <Button variant="primary" leftIcon={<Play className="h-3.5 w-3.5" />} onClick={() => act('resume')}>Continuar</Button>}
            {state.status !== 'idle' && <><IconButton tooltip="Reiniciar etapa" icon={<RotateCcw className="h-4 w-4" />} onClick={() => act('reset')} /><IconButton tooltip="Cancelar sessão" icon={<Square className="h-4 w-4" />} onClick={() => act('cancel')} /></>}
            {state.phase !== 'focus' && <IconButton tooltip="Pular pausa" icon={<SkipForward className="h-4 w-4" />} onClick={() => act('skip')} />}
          </div>
          {state.phase === 'focus' && state.status === 'idle' ? <div className="space-y-1.5"><div className="text-xs text-content-secondary">Nota para esta sessão</div><SelectMenu label="Nota para esta sessão" className="w-full" value={selectedNote} options={[{ value: '', label: 'Sem vínculo' }, ...context.notes.map((n) => ({ value: n.relativePath, label: n.name, hint: n.relativePath }))]} onChange={setSelectedNote} /></div> : state.note && <div className="truncate text-center text-xs text-content-secondary" title={state.note.relativePath}>Nota: {state.note.name}</div>}
        </fieldset>}
        {tab === 'settings' && <fieldset disabled={Boolean(state.storageError)} className="space-y-4"><p className="text-xs text-content-muted">Mudanças de duração entram em vigor na próxima etapa.</p>{([['focus', 'Foco (minutos)'], ['shortBreak', 'Pausa curta (minutos)'], ['longBreak', 'Pausa longa (minutos)'], ['longBreakEvery', 'Focos até a pausa longa']] as const).map(([key, label]) => <label key={key} className="flex items-center justify-between gap-3 text-xs text-content-secondary"><span>{label}</span><span className="w-20"><Input type="number" min={1} max={key === 'longBreakEvery' ? 20 : 180} key={`${key}-${state.settings[key]}`} defaultValue={state.settings[key]} onBlur={(e) => configure({ [key]: Number(e.target.value) })} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }} /></span></label>)}{([['continuous', 'Iniciar próxima etapa automaticamente'], ['notifications', 'Notificações ao concluir'], ['sound', 'Som nas notificações']] as const).map(([key, label]) => <div key={key} className="flex items-center justify-between gap-3 text-xs text-content-secondary"><span>{label}</span><Switch label={label} checked={state.settings[key]} onCheckedChange={(value) => configure({ [key]: value })} /></div>)}</fieldset>}
        {tab === 'reports' && <div className="space-y-3">
          <Button variant="secondary" className="w-full" onClick={() => { void window.electronAPI.openPomodoroReports(); onClose?.() }}>Abrir relatório completo</Button>
          <div className="grid grid-cols-2 gap-2 text-xs"><div className="border border-surface-border bg-surface-secondary p-2">Tempo de foco <strong className="block text-base text-content-primary">{Math.round(filtered.reduce((sum, h) => sum + h.elapsedMs, 0) / 60000)} min</strong></div><div className="border border-surface-border bg-surface-secondary p-2">Concluídos <strong className="block text-base text-content-primary">{filtered.filter((h) => h.outcome === 'completed').length}</strong></div></div>
          <div className="grid grid-cols-2 gap-2"><label className="text-xs text-content-secondary">De<Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label><label className="text-xs text-content-secondary">Até<Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label></div>
          <div className="grid grid-cols-2 gap-2"><SelectMenu className="w-full" label="Cofre" value={vault} options={[{ value: 'all', label: 'Todos os cofres' }, ...vaults.map(([value, label]) => ({ value, label }))]} onChange={(value) => { setVault(value); setNoteFilter('all') }} /><SelectMenu className="w-full" label="Nota" value={noteFilter} options={[{ value: 'all', label: 'Todas as notas' }, ...notes.map(([value, label]) => ({ value, label }))]} onChange={setNoteFilter} /><SelectMenu className="w-full" label="Estado" value={outcome} options={[{ value: 'all', label: 'Todos os estados' }, { value: 'completed', label: 'Concluídos' }, { value: 'interrupted', label: 'Interrompidos' }]} onChange={setOutcome} /><SelectMenu className="w-full" label="Agrupamento" value={period} options={[{ value: 'day', label: 'Por dia' }, { value: 'week', label: 'Por semana' }, { value: 'month', label: 'Por mês' }]} onChange={setPeriod} /></div>
          <div aria-label="Gráfico de tempo de foco" className="space-y-1">{bars.length ? bars.map(([label, value]) => <div key={label} className="flex items-center gap-2 text-[10px] text-content-muted"><span className="w-20 shrink-0">{label}</span><div className="h-2 flex-1 bg-surface-tertiary"><div className="h-full bg-accent" style={{ width: `${value / max * 100}%` }} /></div><span>{Math.round(value / 60000)} min</span></div>) : <p className="text-xs text-content-muted">Nenhuma sessão neste período.</p>}</div>
          <div className="space-y-1 border-t border-surface-border pt-2">{[...filtered].reverse().map((h) => <div key={h.id} className="flex justify-between gap-2 border-b border-surface-border py-2 text-xs"><div className="min-w-0"><div className="truncate">{h.note?.name || 'Sem nota'}</div><div className="text-content-muted">{new Date(h.endedAt).toLocaleString('pt-BR')} · {h.outcome === 'completed' ? 'Concluído' : 'Interrompido'}</div></div><span className="shrink-0 text-content-secondary">{Math.round(h.elapsedMs / 60000)} min</span></div>)}</div>
        </div>}
      </div>
    </section>
  )
}
