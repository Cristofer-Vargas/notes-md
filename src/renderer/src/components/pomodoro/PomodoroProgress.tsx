import React, { useEffect, useRef, useState } from 'react'
import { Award, ChevronLeft, ChevronRight, Lock } from 'lucide-react'
import type { PomodoroProgress as Progress } from '../../../../shared/pomodoro'
import { IconButton } from '../ui'
import { constellationPattern } from './constellationPattern'

export function ProgressSummary({ progress }: { progress: Progress }): React.ReactElement {
  return <section aria-label="Progresso do Pomodoro" className="space-y-2 border border-surface-border bg-surface-secondary p-3">
    <div className="flex items-center justify-between gap-2 text-xs"><span className="flex items-center gap-1.5 font-semibold"><Award className="h-4 w-4 text-accent" /> Nível {progress.level}</span><span className="text-content-secondary">{progress.levelXp} / {progress.nextLevelXp} XP</span></div>
    <div role="progressbar" aria-label="Progresso até o próximo nível" aria-valuemin={0} aria-valuemax={progress.nextLevelXp} aria-valuenow={progress.levelXp} className="h-1.5 bg-surface-tertiary"><div className="h-full bg-accent" style={{ width: `${progress.levelXp / progress.nextLevelXp * 100}%` }} /></div>
    <p className="text-xs text-content-muted">{progress.nextLevelXp - progress.levelXp} XP para o próximo nível · {progress.xp} XP acumulados</p>
  </section>
}

function Constellation({ progress }: { progress: Progress }): React.ReactElement {
  const constellation = progress.constellation
  const currentNumber = constellation.completed + 1
  const [selected, setSelected] = useState(currentNumber)
  const previousCurrent = useRef(currentNumber)
  useEffect(() => {
    const previous = previousCurrent.current
    previousCurrent.current = currentNumber
    setSelected((value) => value === previous ? currentNumber : Math.min(value, currentNumber))
  }, [currentNumber])
  const number = Math.min(selected, currentNumber)
  const isCurrent = number === currentNumber
  const revealed = isCurrent ? constellation.stars : 5
  const points = constellationPattern(number)
  return <section aria-labelledby="constellation-title" className="space-y-3 border border-surface-border bg-surface-secondary p-3">
    <div className="flex items-center justify-between gap-2"><h3 id="constellation-title" className="text-sm font-semibold">Constelação {number}</h3><div className="flex items-center gap-1"><span className="text-xs text-content-muted">{revealed}/5 estrelas</span><IconButton size="xs" tooltip="Constelação anterior" disabled={number <= 1} icon={<ChevronLeft className="h-4 w-4" />} onClick={() => setSelected(number - 1)} /><IconButton size="xs" tooltip="Próxima constelação" disabled={isCurrent} icon={<ChevronRight className="h-4 w-4" />} onClick={() => setSelected(number + 1)} /></div></div>
    <svg viewBox="0 0 222 88" className="h-24 w-full" role="img" aria-label={`${revealed} de 5 estrelas reveladas na constelação ${number}`}>
      {points.slice(1).map(([x, y], index) => <line key={`line-${index}`} x1={points[index][0]} y1={points[index][1]} x2={x} y2={y} className={index + 1 < revealed ? 'stroke-accent' : 'stroke-content-muted'} strokeWidth="1" opacity={index + 1 < revealed ? 0.7 : 0.2} />)}
      {points.map(([x, y], index) => <g key={`star-${index}`} transform={`translate(${x} ${y})`} className={index < revealed ? 'text-accent' : 'text-content-muted'} opacity={index < revealed ? 1 : 0.35}><path d="M0 -8 L2.2 -2.2 L8 0 L2.2 2.2 L0 8 L-2.2 2.2 L-8 0 L-2.2 -2.2 Z" fill={index < revealed ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.2" /></g>)}
    </svg>
    {isCurrent ? <><div role="progressbar" aria-label="Progresso até a próxima estrela" aria-valuemin={0} aria-valuemax={constellation.starCost} aria-valuenow={constellation.starXp} className="h-1.5 bg-surface-tertiary"><div className="h-full bg-accent" style={{ width: `${constellation.starXp / constellation.starCost * 100}%` }} /></div><p className="text-xs text-content-secondary">{constellation.xpToNextStar} XP para a próxima estrela · {constellation.completed} {constellation.completed === 1 ? 'constelação concluída' : 'constelações concluídas'}</p></> : <p className="text-xs text-content-secondary">Constelação concluída · {constellation.completed} no total</p>}
  </section>
}

export function ProgressAchievements({ progress }: { progress: Progress }): React.ReactElement {
  return <section className="space-y-3" aria-labelledby="pomodoro-achievements-title"><div><h2 id="pomodoro-achievements-title" className="text-sm font-semibold">Níveis e conquistas</h2><p className="mt-1 text-xs text-content-muted">Seu progresso acumulado em todos os cofres, independentemente dos filtros.</p></div><ProgressSummary progress={progress} /><Constellation progress={progress} /><h3 className="text-sm font-semibold">Conquistas</h3><div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 170px), 1fr))' }}>{progress.achievements.map((item) => <div key={item.id} className="flex items-start gap-2 border border-surface-border bg-surface-secondary p-3"><span className={item.unlocked ? 'text-accent' : 'text-content-muted'}>{item.unlocked ? <Award className="h-4 w-4" /> : <Lock className="h-4 w-4" />}</span><div className="min-w-0"><p className="text-xs font-semibold">{item.label}</p><p className="mt-1 text-xs text-content-muted">{item.unlocked ? 'Conquistado' : `${Math.min(item.current, item.target)} / ${item.target} ${item.unit === 'hours' ? 'horas' : 'focos'}`}</p></div></div>)}</div></section>
}
