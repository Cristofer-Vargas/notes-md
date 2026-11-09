import React, { useEffect, useState } from 'react'
import { Search, FileText, PlusCircle, Link2 } from 'lucide-react'
import type { VaultNoteData } from '../../../../preload/index.d'
import type { IndexedNoteMeta } from '../../types/app'

interface QuickSwitcherModalProps {
  isOpen: boolean
  notes: VaultNoteData[]
  vaultIndex: Record<string, IndexedNoteMeta>
  onSelectNote: (relativePath: string, openInNewTab?: boolean) => void
  onCreateNewNoteWithTitle: (title: string, openInNewTab?: boolean) => void
  onClose: () => void
}

export const QuickSwitcherModal: React.FC<QuickSwitcherModalProps> = ({
  isOpen,
  notes,
  vaultIndex,
  onSelectNote,
  onCreateNewNoteWithTitle,
  onClose
}) => {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
    }
  }, [isOpen])

  if (!isOpen) return null

  const normalized = query.trim().toLowerCase()
  const filtered = notes.filter(
    (n) =>
      n.name.toLowerCase().includes(normalized) ||
      n.relativePath.toLowerCase().includes(normalized) ||
      n.content.toLowerCase().includes(normalized)
  )

  const exactExists = notes.some((n) => n.name.toLowerCase() === normalized)
  const canCreate = normalized.length > 0 && !exactExists
  const totalCount = filtered.length + (canCreate ? 1 : 0)

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (totalCount > 0 ? (prev + 1) % totalCount : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (totalCount > 0 ? (prev - 1 + totalCount) % totalCount : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const openInNewTab = e.ctrlKey || e.metaKey
      if (selectedIndex < filtered.length) {
        onSelectNote(filtered[selectedIndex].relativePath, openInNewTab)
        onClose()
      } else if (canCreate) {
        onCreateNewNoteWithTitle(query.trim(), openInNewTab)
        onClose()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-start justify-center pt-20 p-4 animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-surface-bg border border-surface-border shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-border bg-surface-secondary">
          <Search className="w-4 h-4 text-accent shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
            placeholder="Buscar nota por título ou conteúdo, ou digite um novo nome para criar..."
            autoFocus
            className="w-full bg-transparent text-sm text-content-primary placeholder:text-content-muted focus:outline-none"
          />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-surface-tertiary text-content-muted">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.map((note, idx) => {
            const isSelected = idx === selectedIndex
            const meta = vaultIndex[note.relativePath]
            return (
              <button
                key={note.relativePath}
                type="button"
                onMouseEnter={() => setSelectedIndex(idx)}
                onClick={() => {
                  onSelectNote(note.relativePath, false)
                  onClose()
                }}
                onMouseDown={(e) => {
                  if (e.button === 1) e.preventDefault()
                }}
                onAuxClick={(e) => {
                  if (e.button === 1) {
                    e.preventDefault()
                    e.stopPropagation()
                    onSelectNote(note.relativePath, true)
                    onClose()
                  }
                }}
                title={`${note.name}\nClique esquerdo: abrir nesta guia • Botão do meio ou Ctrl+Enter: abrir em nova guia`}
                className={`w-full flex items-start justify-between gap-3 p-2.5 rounded-xl text-left transition-colors cursor-pointer select-none ${
                  isSelected
                    ? 'bg-accent text-white'
                    : 'text-content-primary hover:bg-surface-secondary'
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <FileText
                    className={`w-4 h-4 mt-0.5 shrink-0 ${
                      isSelected ? 'text-white' : 'text-accent'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold truncate">{note.name}</div>
                    <div
                      className={`text-[11px] line-clamp-1 mt-0.5 ${
                        isSelected ? 'text-white/85' : 'text-content-secondary'
                      }`}
                    >
                      {meta?.excerpt || note.relativePath}
                    </div>
                  </div>
                </div>

                {meta && (
                  <div
                    className={`flex items-center gap-1 text-[10px] shrink-0 px-2 py-0.5 rounded-full ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-surface-tertiary text-content-muted'
                    }`}
                  >
                    <Link2 className="w-3 h-3" />
                    <span>{meta.backlinks.length}</span>
                  </div>
                )}
              </button>
            )
          })}

          {canCreate && (
            <button
              type="button"
              onMouseEnter={() => setSelectedIndex(filtered.length)}
              onClick={() => {
                onCreateNewNoteWithTitle(query.trim(), false)
                onClose()
              }}
              onMouseDown={(e) => {
                if (e.button === 1) e.preventDefault()
              }}
              onAuxClick={(e) => {
                if (e.button === 1) {
                  e.preventDefault()
                  e.stopPropagation()
                  onCreateNewNoteWithTitle(query.trim(), true)
                  onClose()
                }
              }}
              title={`Criar nova nota\nClique esquerdo: abrir nesta guia • Botão do meio ou Ctrl+Enter: abrir em nova guia`}
              className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left transition-colors cursor-pointer select-none ${
                selectedIndex === filtered.length
                  ? 'bg-accent text-white'
                  : 'text-accent hover:bg-surface-secondary'
              }`}
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <div className="text-xs font-semibold">
                Criar nova nota Markdown: &ldquo;{query.trim()}.md&rdquo;
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
