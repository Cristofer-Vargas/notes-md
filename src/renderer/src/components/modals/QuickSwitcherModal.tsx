import React, { useEffect, useMemo, useRef, useState } from 'react'
import { FileText, Folder, PlusCircle, Search, X } from 'lucide-react'
import type { VaultFileEntry, VaultNoteData } from '../../../../preload/index.d'
import { listVaultFolders, quickSuggestions, type QuickSuggestion } from '../../services/quickSwitcher'
import { IconButton, Input } from '../ui'
import { SelectionButton } from '../ui/SelectionButton'

interface QuickSwitcherModalProps {
  isOpen: boolean
  notes: VaultNoteData[]
  tree: VaultFileEntry[]
  onSelectNote: (relativePath: string, openInNewTab?: boolean) => void
  onCreateNote: (folder: string, title: string, openInNewTab: boolean) => void
  onClose: () => void
}

export const QuickSwitcherModal: React.FC<QuickSwitcherModalProps> = ({ isOpen, notes, tree, onSelectNote, onCreateNote, onClose }) => {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const resultsRef = useRef<HTMLDivElement>(null)
  const folders = useMemo(() => listVaultFolders(tree), [tree])
  const suggestions = useMemo(() => quickSuggestions(query, notes, folders), [query, notes, folders])
  const currentIndex = Math.min(selectedIndex, Math.max(0, suggestions.length - 1))

  useEffect(() => { if (isOpen) { setQuery(''); setSelectedIndex(0) } }, [isOpen])
  useEffect(() => { resultsRef.current?.querySelector<HTMLElement>('[data-selected="true"]')?.scrollIntoView({ block: 'nearest' }) }, [currentIndex, query])
  if (!isOpen) return null

  const complete = (item: QuickSuggestion): void => {
    if (item.kind === 'folder') setQuery(`${item.path}/`)
    else if (item.kind === 'note') setQuery(item.path.replace(/\.md$/i, ''))
    else return
    setSelectedIndex(0)
  }
  const activate = (item: QuickSuggestion | undefined, newTab: boolean): void => {
    if (!item) return
    if (item.kind === 'folder') { complete(item); return }
    if (item.kind === 'note') onSelectNote(item.path, newTab)
    else onCreateNote(item.folder, item.name, newTab)
    onClose()
  }

  return <div className="fixed inset-0 z-50 flex items-start justify-center bg-surface-bg/70 p-4 pt-20 backdrop-blur-xs" onClick={onClose}>
    <div role="dialog" aria-modal="true" aria-label="Busca rápida de notas e pastas" className="w-full max-w-xl overflow-hidden rounded-xl border border-surface-border bg-surface-bg shadow-2xl" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => {
      if (event.key === 'ArrowDown' && suggestions.length) { event.preventDefault(); setSelectedIndex((currentIndex + 1) % suggestions.length) }
      else if (event.key === 'ArrowUp' && suggestions.length) { event.preventDefault(); setSelectedIndex((currentIndex - 1 + suggestions.length) % suggestions.length) }
      else if (event.key === 'Tab' && !event.shiftKey && suggestions[currentIndex]?.kind !== 'create') { event.preventDefault(); const item = suggestions[currentIndex]; if (item) complete(item) }
      else if (event.key === 'Enter') { event.preventDefault(); activate(suggestions[currentIndex], event.ctrlKey || event.metaKey) }
      else if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose() }
    }}>
      <div className="flex items-center gap-2 border-b border-surface-border bg-surface-secondary p-3">
        <Input aria-label="Buscar nota ou pasta" autoFocus value={query} onChange={(event) => { setQuery(event.target.value); setSelectedIndex(0) }} placeholder="Buscar nota ou pasta..." leftIcon={<Search className="h-4 w-4" />} />
        <IconButton tooltip="Fechar busca" icon={<X className="h-4 w-4" />} onClick={onClose} />
      </div>
      <div ref={resultsRef} className="max-h-80 overflow-y-auto p-2">
        {suggestions.map((item, index) => {
          const selected = index === currentIndex
          const Icon = item.kind === 'folder' ? Folder : item.kind === 'note' ? FileText : PlusCircle
          return <SelectionButton key={`${item.kind}:${item.path}`} data-selected={selected} onMouseEnter={() => setSelectedIndex(index)} onClick={(event) => activate(item, event.ctrlKey || event.metaKey)} onAuxClick={(event) => { if (event.button === 1) { event.preventDefault(); activate(item, true) } }} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs ${selected ? 'bg-accent-soft text-content-primary' : 'text-content-secondary hover:bg-surface-secondary'}`}>
            <Icon className="h-4 w-4 shrink-0 text-accent" />
            <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{item.kind === 'create' ? `Criar nota: ${item.name}` : item.kind === 'folder' ? item.name : item.note.name}</span><span className="block truncate text-[10px] text-content-muted">{item.kind === 'folder' ? `${item.path}/` : item.path}</span></span>
            {item.kind === 'folder' && <span className="text-[10px] text-content-muted">Tab / Enter</span>}
          </SelectionButton>
        })}
        {suggestions.length === 0 && <p className="p-4 text-center text-xs text-content-muted">Nenhuma nota ou pasta encontrada. Verifique o caminho informado.</p>}
      </div>
      <div className="border-t border-surface-border px-4 py-2 text-[10px] text-content-muted">Tab completa · Enter abre ou cria · Ctrl+Enter abre em nova guia</div>
    </div>
  </div>
}
