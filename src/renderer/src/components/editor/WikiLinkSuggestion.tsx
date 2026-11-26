import React, { useEffect, useMemo, useState } from 'react'
import { FileText, PlusCircle, Link2, Tag } from 'lucide-react'
import type { VaultNoteData } from '../../../../preload/index.d'
import { Button, Input } from '../ui'
import { extractWikiLinks, normalizeNoteKey, resolveWikiLinkTarget } from '../../services/noteIndexer'

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

  const missingWikiLinks = useMemo(() => {
    const targets = new Map<string, string>()
    for (const note of notes) {
      for (const link of extractWikiLinks(note.content)) {
        const target = link.target.trim()
        const key = normalizeNoteKey(target)
        if (key && !targets.has(key) && !resolveWikiLinkTarget(target, notes)) {
          targets.set(key, target)
        }
      }
    }
    return Array.from(targets.values())
  }, [notes])

  const filteredMissingWikiLinks = missingWikiLinks
    .filter((target) => target.toLowerCase().includes(normalizedQuery))
    .slice(0, 8)

  const exactMatchExists = notes.some(
    (n) => n.name.toLowerCase() === normalizedQuery && normalizedQuery.length > 0
  )
  const exactMissingLinkExists = missingWikiLinks.some(
    (target) => normalizeNoteKey(target) === normalizeNoteKey(rawNoteQuery)
  )
  const canCreateNew = normalizedQuery.length > 0 && !exactMatchExists && !exactMissingLinkExists
  const totalItems = filteredNotes.length + filteredMissingWikiLinks.length + (canCreateNew ? 1 : 0)
  const selectSuggestion = (index: number): void => {
    const target =
      filteredNotes[index]?.name ??
      filteredMissingWikiLinks[index - filteredNotes.length] ??
      (canCreateNew && index === filteredNotes.length + filteredMissingWikiLinks.length
        ? rawNoteQuery.trim()
        : undefined)

    if (target) onSelect(target, effectiveAlias || undefined)
  }

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
        if (totalItems === 0) return
        e.preventDefault()
        e.stopPropagation()
        selectSuggestion(Math.min(selectedIndex, totalItems - 1))
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
    selectSuggestion,
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
        <span className="text-[11px] text-content-muted">↑↓ • Tab/Enter</span>
      </div>

      {/* Optional Alias Input (or automatic via | pipe) */}
      <div className="px-2.5 py-1.5 bg-surface-secondary/50 border-b border-surface-border flex items-center gap-2">
        <Tag className="w-3.5 h-3.5 text-accent shrink-0" />
        <Input
          type="text"
          value={inlineAlias ? inlineAlias : customAlias}
          disabled={ Boolean(inlineAlias) }
          onChange={(e) => setCustomAlias(e.target.value)}
          onMouseDown={(e) => e.stopPropagation()}
          placeholder="Texto de exibição / Alias (ou digite |Nota)"
          className="bg-transparent border-0 rounded-none px-0 py-0 focus:border-transparent focus:ring-0"
        />
      </div>

      <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5">
        {filteredNotes.map((note, idx) => {
          const isSelected = idx === selectedIndex
          const folder = note.relativePath.includes('/')
            ? note.relativePath.slice(0, note.relativePath.lastIndexOf('/'))
            : 'Raiz do Vault'

          return (
            <Button
              key={note.relativePath}
              type="button"
              variant={isSelected ? 'primary' : 'ghost'}
              size="sm"
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setSelectedIndex(idx)}
              onClick={() => selectSuggestion(idx)}
              className={`w-full min-w-0 justify-start gap-2.5 px-2.5 py-2 rounded-lg text-left ${
                isSelected ? 'text-white' : 'text-content-primary hover:bg-surface-secondary'
              } [&>span:last-child]:flex [&>span:last-child]:min-w-0 [&>span:last-child]:flex-1`}
              leftIcon={
                <FileText className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-accent'}`} />
              }
            >
              <span className="block min-w-0 flex-1">
                <span className="block text-sm font-medium truncate">
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
                </span>
                <span
                  className={`block text-[11px] truncate ${
                    isSelected ? 'text-white/80' : 'text-content-muted'
                  }`}
                >
                  {folder}
                </span>
              </span>
            </Button>
          )
        })}

        {filteredMissingWikiLinks.map((target, index) => {
          const itemIndex = filteredNotes.length + index
          const isSelected = itemIndex === selectedIndex

          return (
            <Button
              key={normalizeNoteKey(target)}
              type="button"
              variant={isSelected ? 'primary' : 'ghost'}
              size="sm"
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setSelectedIndex(itemIndex)}
              onClick={() => selectSuggestion(itemIndex)}
              className={`w-full min-w-0 justify-start gap-2.5 px-2.5 py-2 rounded-lg text-left ${
                isSelected ? 'text-white' : 'text-content-primary hover:bg-surface-secondary'
              } [&>span:last-child]:flex [&>span:last-child]:min-w-0 [&>span:last-child]:flex-1`}
              leftIcon={<Link2 className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-accent'}`} />}
            >
              <span className="block min-w-0 flex-1">
                <span className="block text-sm font-medium truncate">
                  {target}
                  {effectiveAlias && (
                    <span className={`ml-1.5 text-xs font-normal ${isSelected ? 'text-white/90' : 'text-accent'}`}>
                      → &ldquo;{effectiveAlias}&rdquo;
                    </span>
                  )}
                </span>
                <span className={`block text-[11px] ${isSelected ? 'text-white/80' : 'text-content-muted'}`}>
                  Link existente sem nota criada
                </span>
              </span>
            </Button>
          )
        })}

        {canCreateNew && (
          <Button
            type="button"
            variant={selectedIndex === filteredNotes.length + filteredMissingWikiLinks.length ? 'primary' : 'ghost'}
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onMouseEnter={() => setSelectedIndex(filteredNotes.length + filteredMissingWikiLinks.length)}
            onClick={() => selectSuggestion(filteredNotes.length + filteredMissingWikiLinks.length)}
            className={`w-full min-w-0 justify-start gap-2.5 px-2.5 py-2 rounded-lg text-left ${
              selectedIndex === filteredNotes.length + filteredMissingWikiLinks.length
                ? 'text-white'
                : 'text-accent hover:bg-surface-secondary'
            } [&>span:last-child]:flex [&>span:last-child]:min-w-0 [&>span:last-child]:flex-1`}
            leftIcon={<PlusCircle className="w-4 h-4" />}
          >
            <span className="block min-w-0 flex-1">
              <span className="block text-sm font-medium truncate">
                Criar link para &ldquo;{rawNoteQuery.trim()}&rdquo;
                {effectiveAlias ? ` (${effectiveAlias})` : ''}
              </span>
              <span
                className={`text-[11px] ${
                  selectedIndex === filteredNotes.length + filteredMissingWikiLinks.length ? 'text-white/80' : 'text-content-muted'
                }`}
              >
                A nota será criada automaticamente ao abrir
              </span>
            </span>
          </Button>
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
