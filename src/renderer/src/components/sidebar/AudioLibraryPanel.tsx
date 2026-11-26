import React, { useMemo, useState } from 'react'
import { AudioLines, ArrowUpRight, Link2Off } from 'lucide-react'
import type { VaultNoteData } from '../../../../preload/index.d'
import { Button, IconButton, Input } from '../ui'
import { SelectionButton } from '../ui/SelectionButton'
import { extractVaultAudioReferences, formatAudioDuration, removeVaultAudioReference, type VaultAudioReference } from '../../services/vaultAudioReferences'

interface AudioLibraryPanelProps {
  activeNote: VaultNoteData | null
  allNotes: VaultNoteData[]
  onNavigateAudio: (audio: VaultAudioReference) => void
  onSaveContent: (relativePath: string, newMarkdown: string) => Promise<void>
}

type AudioScope = 'current' | 'vault'

export const AudioLibraryPanel: React.FC<AudioLibraryPanelProps> = ({ activeNote, allNotes, onNavigateAudio, onSaveContent }) => {
  const [scope, setScope] = useState<AudioScope>('current')
  const [search, setSearch] = useState('')
  const [audioToRemove, setAudioToRemove] = useState<VaultAudioReference | null>(null)
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const references = useMemo(() => extractVaultAudioReferences(allNotes), [allNotes])
  const scopedReferences = useMemo(() => references.filter((audio) => scope === 'vault' || audio.sourcePath === activeNote?.relativePath), [references, scope, activeNote?.relativePath])
  const visibleReferences = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    return scopedReferences.filter((audio) => !query || `${audio.title} ${audio.sourceName} ${audio.sourcePath}`.toLocaleLowerCase().includes(query))
  }, [scopedReferences, search])

  const removeAudioReference = async (): Promise<void> => {
    if (!audioToRemove || removing) return
    const sourceNote = allNotes.find((note) => note.relativePath === audioToRemove.sourcePath)
    if (!sourceNote) { setError('A nota que contém este áudio não está disponível.'); return }
    const updatedContent = removeVaultAudioReference(sourceNote.content, audioToRemove.audioPath, audioToRemove.occurrence)
    if (updatedContent === sourceNote.content) { setError('Não foi possível localizar esta referência na nota.'); return }
    setRemoving(true)
    setError(null)
    try {
      await onSaveContent(sourceNote.relativePath, updatedContent)
      setAudioToRemove(null)
    } catch {
      setError('Não foi possível remover o áudio da nota. O arquivo continua salvo no cofre.')
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col select-text">
      <div className="space-y-2 border-b border-surface-border p-2">
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar áudios" aria-label="Buscar áudios" />
        <div className="flex gap-1">
          <Button size="xs" variant={scope === 'current' ? 'primary' : 'ghost'} disabled={!activeNote} onClick={() => setScope('current')}>Nota atual</Button>
          <Button size="xs" variant={scope === 'vault' ? 'primary' : 'ghost'} onClick={() => setScope('vault')}>Todo o cofre</Button>
        </div>
      </div>

      {visibleReferences.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-4 text-center text-xs text-content-muted">
          {scope === 'current' && !activeNote ? 'Abra uma nota ou escolha todo o cofre.' : 'Nenhum áudio encontrado.'}
        </div>
      ) : (
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
          {visibleReferences.map((audio) => (
            <div key={audio.id} className="group min-w-0 border border-surface-border p-2">
              <div className="flex min-w-0 items-start gap-1">
                <SelectionButton
                  type="button"
                  className="flex min-w-0 flex-1 items-start gap-2 rounded-sm px-1 py-1 text-left hover:bg-surface-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                  title={`Abrir ${audio.title} na nota ${audio.sourceName}`}
                  onClick={() => onNavigateAudio(audio)}
                >
                  <AudioLines className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-content-primary">{audio.title}</span>
                    <span className="mt-0.5 block truncate text-[10px] text-content-muted">{audio.sourceName} · {formatAudioDuration(audio.duration)}</span>
                  </span>
                </SelectionButton>
                <IconButton size="xs" tooltip="Abrir áudio na nota" icon={<ArrowUpRight className="h-3 w-3" />} onClick={() => onNavigateAudio(audio)} />
                <IconButton size="xs" tooltip="Remover áudio desta nota" icon={<Link2Off className="h-3 w-3" />} onClick={() => { setAudioToRemove(audio); setError(null) }} />
              </div>
              {audioToRemove?.id === audio.id && (
                <div className="mt-2 space-y-2 border-t border-surface-border px-1 pt-2">
                  <p className="text-[10px] text-content-secondary">O player será removido de “{audio.sourceName}”. O arquivo continuará no cofre.</p>
                  <div className="flex justify-end gap-1.5">
                    <Button size="xs" variant="ghost" disabled={removing} onClick={() => setAudioToRemove(null)}>Cancelar</Button>
                    <Button size="xs" variant="danger" disabled={removing} isLoading={removing} onClick={() => void removeAudioReference()}>Remover da nota</Button>
                  </div>
                  {error && <p role="alert" className="text-[10px] text-rose-500">{error}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
