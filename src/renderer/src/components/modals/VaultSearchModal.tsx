import React, { useEffect, useMemo, useState } from 'react'
import { FileSearch, Search, X } from 'lucide-react'
import type { VaultNoteData } from '../../../../preload/index.d'
import { searchVault } from '../../services/vaultSearch'
import { IconButton, Input } from '../ui'
import { SelectionButton } from '../ui/SelectionButton'

interface Props {
  isOpen: boolean
  notes: VaultNoteData[]
  vaultName: string
  onSelectNote: (path: string, openInNewTab?: boolean) => void
  onClose: () => void
}

export function VaultSearchModal({ isOpen, notes, vaultName, onSelectNote, onClose }: Props): React.ReactElement | null {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const results = useMemo(() => searchVault(notes, query), [notes, query])

  useEffect(() => { if (isOpen) { setQuery(''); setSelected(0) } }, [isOpen])
  if (!isOpen) return null

  const openResult = (index: number, newTab = false): void => {
    if (!results[index]) return
    onSelectNote(results[index].note.relativePath, newTab)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-surface-bg/70 p-4 pt-16 backdrop-blur-xs" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="vault-search-title" className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-surface-border bg-surface-bg shadow-2xl" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => {
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose() }
        else if (event.key === 'ArrowDown' && results.length) { event.preventDefault(); setSelected((index) => (index + 1) % results.length) }
        else if (event.key === 'ArrowUp' && results.length) { event.preventDefault(); setSelected((index) => (index - 1 + results.length) % results.length) }
        else if (event.key === 'Enter') { event.preventDefault(); openResult(selected, event.ctrlKey || event.metaKey) }
      }}>
        <div className="flex items-center justify-between gap-3 border-b border-surface-border bg-surface-secondary px-4 py-3">
          <div className="min-w-0"><h2 id="vault-search-title" className="text-sm font-semibold text-content-primary">Pesquisar no cofre</h2><p className="truncate text-xs text-content-muted">{vaultName} · títulos, tags e conteúdo</p></div>
          <IconButton tooltip="Fechar pesquisa" icon={<X className="h-4 w-4" />} onClick={onClose} />
        </div>
        <div className="border-b border-surface-border p-3">
          <Input aria-label="Pesquisar em todas as notas" autoFocus value={query} onChange={(event) => { setQuery(event.target.value); setSelected(0) }} placeholder="Digite uma palavra ou #tag..." leftIcon={<Search className="h-4 w-4" />} />
          <p aria-live="polite" className="mt-2 text-[11px] text-content-muted">{query.trim() ? `${results.length} ${results.length === 1 ? 'nota encontrada' : 'notas encontradas'}` : 'Pesquise em todas as notas deste cofre.'}</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {query.trim() && results.length === 0 && <p className="p-4 text-center text-xs text-content-muted">Nenhuma ocorrência encontrada.</p>}
          {results.map((result, index) => (
            <SelectionButton key={result.note.relativePath} type="button" aria-label={`Abrir ${result.note.name}`} onMouseEnter={() => setSelected(index)} onClick={() => openResult(index)} onAuxClick={(event) => { if (event.button === 1) { event.preventDefault(); openResult(index, true) } }} className={`w-full rounded-lg p-3 text-left transition-colors ${index === selected ? 'bg-accent-soft text-content-primary' : 'text-content-secondary hover:bg-surface-secondary'}`}>
              <div className="flex items-start gap-2"><FileSearch className="mt-0.5 h-4 w-4 shrink-0 text-accent" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-1"><strong className="truncate text-xs text-content-primary">{result.note.name}</strong><span className="text-[10px] text-content-muted">{result.titleMatch ? 'Título' : ''}{result.titleMatch && result.occurrenceCount ? ' · ' : ''}{result.occurrenceCount ? `${result.occurrenceCount} ${result.occurrenceCount === 1 ? 'ocorrência' : 'ocorrências'}` : ''}</span></div><div className="truncate text-[10px] text-content-muted">{result.note.relativePath}</div>{result.matches.slice(0, 3).map((match) => <div key={match.line} className="mt-1 truncate text-[11px] text-content-secondary"><span className="mr-2 text-content-muted">{match.line}</span>{match.text}</div>)}{result.matches.length > 3 && <div className="mt-1 text-[10px] text-content-muted">+ {result.matches.length - 3} linhas com ocorrências</div>}</div></div>
            </SelectionButton>
          ))}
        </div>
        <div className="border-t border-surface-border px-4 py-2 text-[10px] text-content-muted">Use as setas para navegar, Enter para abrir e Ctrl+Enter para abrir em nova guia.</div>
      </div>
    </div>
  )
}
