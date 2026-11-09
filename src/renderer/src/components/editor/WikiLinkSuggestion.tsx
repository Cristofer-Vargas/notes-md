import React, { useEffect, useState } from 'react'
import { FileText, PlusCircle, Link2, Tag } from 'lucide-react'
import type { VaultNoteData } from '../../../../preload/index.d'

interface WikiLinkSuggestionProps {
  query: string
  initialAlias?: string
  position: { top: number; left: number }
  notes: VaultNoteData[]
  onSelect: (targetNoteTitle: string, alias?: string) => void
  onClose: () => void
}

export const WikiLinkSuggestion: React.FC<WikiLinkSuggestionProps> = ({
  query,
  initialAlias = '',
  position,
  notes,
  onSelect,
  onClose
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [customAlias, setCustomAlias] = useState(initialAlias)

  // Support Obsidian syntax [[Nota|Apelido directly while typing
  const pipeIndex = query.indexOf('|')
  const rawNoteQuery = pipeIndex >= 0 ? query.slice(0, pipeIndex) : query
  const inlineAlias = pipeIndex >= 0 ? query.slice(pipeIndex + 1) : ''
  const effectiveAlias = (inlineAlias || customAlias).trim()

  const normalizedQuery = rawNoteQuery.trim().toLowerCase()
  const filteredNotes = notes
    .filter(
      (n) =>
        n.name.toLowerCase().includes(normalizedQuery) ||
        n.relativePath.toLowerCase().includes(normalizedQuery)
    )
    .slice(0, 8)

  const exactMatchExists = notes.some(
    (n) => n.name.toLowerCase() === normalizedQuery && normalizedQuery.length > 0
  )
  const canCreateNew = normalizedQuery.length > 0 && !exactMatchExists
  const totalItems = filteredNotes.length + (canCreateNew ? 1 : 0)

  useEffect(() => {
    setSelectedIndex(0)
  }, [rawNoteQuery])

  useEffect(() => {
    if (initialAlias) {
      setCustomAlias(initialAlias)
    }
  }, [initialAlias])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        e.stopPropagation()
        setSelectedIndex((prev) => (totalItems > 0 ? (prev + 1) % totalItems : 0))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        e.stopPropagation()
        setSelectedIndex((prev) => (totalItems > 0 ? (prev - 1 + totalItems) % totalItems : 0))
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        e.stopPropagation()
        if (selectedIndex < filteredNotes.length) {
          onSelect(filteredNotes[selectedIndex].name, effectiveAlias || undefined)
        } else if (canCreateNew) {
          onSelect(rawNoteQuery.trim(), effectiveAlias || undefined)
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [
    filteredNotes,
    selectedIndex,
    totalItems,
    canCreateNew,
    rawNoteQuery,
    effectiveAlias,
    onSelect,
    onClose
  ])

  return (
    <div
      style={{
        top: Math.min(position.top + 24, window.innerHeight - 360),
        left: Math.min(position.left, window.innerWidth - 340)
      }}
      className="fixed z-50 w-84 rounded-xl border border-surface-border bg-surface-bg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
    >
      <div className="flex items-center justify-between px-3 py-2 bg-surface-secondary border-b border-surface-border text-xs font-medium text-content-secondary">
        <span className="flex items-center gap-1.5">
          <Link2 className="w-3.5 h-3.5 text-accent" />
          Vincular Nota [[Nota|Alias]]
        </span>
        <span className="text-[11px] text-content-muted">↑↓ • Enter</span>
      </div>

      {/* Optional Alias Input (or automatic via | pipe) */}
      <div className="px-2.5 py-1.5 bg-surface-secondary/50 border-b border-surface-border flex items-center gap-2">
        <Tag className="w-3.5 h-3.5 text-accent shrink-0" />
        <input
          type="text"
          value={inlineAlias ? inlineAlias : customAlias}
          disabled={ Boolean(inlineAlias) }
          onChange={(e) => setCustomAlias(e.target.value)}
          onMouseDown={(e) => e.stopPropagation()}
          placeholder="Texto de exibição / Alias (ou digite |Nota)"
          className="w-full bg-transparent text-xs text-content-primary placeholder:text-content-muted focus:outline-none"
        />
      </div>

      <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5">
        {filteredNotes.map((note, idx) => {
          const isSelected = idx === selectedIndex
          const folder = note.relativePath.includes('/')
            ? note.relativePath.slice(0, note.relativePath.lastIndexOf('/'))
            : 'Raiz do Vault'

          return (
            <button
              key={note.relativePath}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setSelectedIndex(idx)}
              onClick={() => onSelect(note.name, effectiveAlias || undefined)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
                isSelected
                  ? 'bg-accent text-white'
                  : 'text-content-primary hover:bg-surface-secondary'
              }`}
            >
              <FileText
                className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-accent'}`}
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">
                  {note.name}
                  {effectiveAlias && (
                    <span
                      className={`ml-1.5 text-xs font-normal ${
                        isSelected ? 'text-white/90' : 'text-accent'
                      }`}
                    >
                      → &ldquo;{effectiveAlias}&rdquo;
                    </span>
                  )}
                </div>
                <div
                  className={`text-[11px] truncate ${
                    isSelected ? 'text-white/80' : 'text-content-muted'
                  }`}
                >
                  {folder}
                </div>
              </div>
            </button>
          )
        })}

        {canCreateNew && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onMouseEnter={() => setSelectedIndex(filteredNotes.length)}
            onClick={() => onSelect(rawNoteQuery.trim(), effectiveAlias || undefined)}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
              selectedIndex === filteredNotes.length
                ? 'bg-accent text-white'
                : 'text-accent hover:bg-surface-secondary'
            }`}
          >
            <PlusCircle className="w-4 h-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">
                Criar link para &ldquo;{rawNoteQuery.trim()}&rdquo;
                {effectiveAlias ? ` (${effectiveAlias})` : ''}
              </div>
              <div
                className={`text-[11px] ${
                  selectedIndex === filteredNotes.length ? 'text-white/80' : 'text-content-muted'
                }`}
              >
                A nota será criada automaticamente ao abrir
              </div>
            </div>
          </button>
        )}

        {totalItems === 0 && (
          <div className="px-3 py-4 text-center text-xs text-content-muted">
            Digite o nome de uma nota para vincular...
          </div>
        )}
      </div>
    </div>
  )
}
