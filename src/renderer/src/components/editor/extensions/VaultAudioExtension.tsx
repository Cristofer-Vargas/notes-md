import React, { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Node } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { AlertCircle, AudioLines, Link2Off, Pause, Play, Trash2 } from 'lucide-react'
import { fixWebmDuration } from '@fix-webm-duration/fix'
import { Button, IconButton } from '../../ui'
import { SelectionButton } from '../../ui/SelectionButton'
import { useContextMenuPosition } from '../../ui/useContextMenuPosition'
import { AudioWaveform, decodeAudioWaveform, parseAudioWaveform } from '../AudioWaveform'

interface VaultAudioOptions {
  getVaultPath: () => string
}

const escapeHtmlAttribute = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function blobFromDataUrl(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(',')
  const mime = /^data:([^;]+)/i.exec(dataUrl)?.[1] || 'application/octet-stream'
  const binary = atob(dataUrl.slice(comma + 1))
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return new Blob([bytes], { type: mime })
}

interface AudioContextMenuPosition {
  x: number
  y: number
}

const VaultAudioView: React.FC<NodeViewProps & { getVaultPath: () => string }> = ({ node, getVaultPath, deleteNode, editor, getPos }) => {
  const [source, setSource] = useState<string | null>(null)
  const [missing, setMissing] = useState(false)
  const [preloaded, setPreloaded] = useState(false)
  const [duration, setDuration] = useState<number | null>(null)
  const [bufferPercent, setBufferPercent] = useState(0)
  const [decodedWaveform, setDecodedWaveform] = useState<number[] | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [contextMenu, setContextMenu] = useState<AudioContextMenuPosition | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteAnimating, setDeleteAnimating] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const contextMenuRef = useRef<HTMLDivElement | null>(null)
  const deleteCancelRef = useRef<HTMLButtonElement | null>(null)
  const deleteRequestStartedRef = useRef(false)
  const deleteTitleId = useId()
  const deleteDescriptionId = useId()
  const relativePath = String(node.attrs.src || '')
  const title = String(node.attrs.title || 'Gravação de áudio')
  const recordedDuration = Number(node.attrs.duration)
  const savedWaveform = parseAudioWaveform(node.attrs.waveform)
  const waveform = savedWaveform ?? decodedWaveform

  useContextMenuPosition(contextMenuRef, contextMenu)

  useEffect(() => {
    if (!contextMenu) return
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const frame = window.requestAnimationFrame(() => contextMenuRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus())
    const onMouseDown = (event: MouseEvent): void => {
      if (!(event.target instanceof Element) || !contextMenuRef.current?.contains(event.target)) setContextMenu(null)
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        setContextMenu(null)
        previousFocus?.focus({ preventScroll: true })
      }
    }
    window.addEventListener('mousedown', onMouseDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('keydown', onKeyDown)
      window.cancelAnimationFrame(frame)
    }
  }, [contextMenu])

  useEffect(() => {
    if (confirmDelete) deleteCancelRef.current?.focus({ preventScroll: true })
  }, [confirmDelete])

  const removeFromNote = (): void => {
    setContextMenu(null)
    deleteNode()
  }

  const deleteAudioFile = (): void => {
    if (deleting) return
    setDeleting(true)
    setDeleteError(null)
    setConfirmDelete(false)
    deleteRequestStartedRef.current = false
    audioRef.current?.pause()
    setDeleteAnimating(true)
  }

  const completeAudioDeletion = async (): Promise<void> => {
    if (!deleteAnimating || deleteRequestStartedRef.current) return
    deleteRequestStartedRef.current = true
    try {
      const deleteVaultAudio = window.electronAPI?.deleteVaultAudio
      if (typeof deleteVaultAudio !== 'function') {
        throw new Error('Feche e abra o Notes MD para carregar a atualização antes de excluir o áudio.')
      }
      await deleteVaultAudio(getVaultPath(), relativePath)
      setDeleting(false)
      setDeleteAnimating(false)
      deleteNode()
    } catch (cause) {
      setDeleting(false)
      setDeleteAnimating(false)
      deleteRequestStartedRef.current = false
      setDeleteError(cause instanceof Error ? cause.message : 'Não foi possível excluir o arquivo de áudio do cofre.')
    }
  }

  useEffect(() => {
    setDuration(Number.isFinite(recordedDuration) && recordedDuration > 0 ? recordedDuration : null)
  }, [recordedDuration])

  useEffect(() => {
    let active = true
    setDecodedWaveform(null)
    if (!source || savedWaveform) return () => { active = false }
    void decodeAudioWaveform(source).then((peaks) => {
      if (active) setDecodedWaveform(peaks)
    }).catch(() => {
      if (active) setDecodedWaveform(null)
    })
    return () => { active = false }
  }, [source, node.attrs.waveform])

  useEffect(() => {
    let active = true
    let temporaryUrl: string | null = null
    setSource(null)
    setMissing(false)
    setPreloaded(false)
    setBufferPercent(0)
    setCurrentTime(0)
    setIsPlaying(false)
    void window.electronAPI.readVaultAudioBase64(getVaultPath(), relativePath).then(async (audio) => {
      if (!active) return
      if (!audio) { setMissing(true); return }
      const isWebm = /audio\/webm/i.test(audio.dataUrl.slice(0, 48))
      if (isWebm && Number.isFinite(recordedDuration) && recordedDuration > 0) {
        const rawBlob = blobFromDataUrl(audio.dataUrl)
        const fixedBlob = await fixWebmDuration(rawBlob, recordedDuration * 1000, { logger: false })
        temporaryUrl = URL.createObjectURL(fixedBlob)
        if (!active) { URL.revokeObjectURL(temporaryUrl); return }
        setSource(temporaryUrl)
      } else {
        setSource(audio.dataUrl)
      }
    }).catch(() => {
      if (active) setMissing(true)
    })
    return () => {
      active = false
      if (temporaryUrl) URL.revokeObjectURL(temporaryUrl)
    }
  }, [getVaultPath, relativePath, recordedDuration])

  const formatDuration = (seconds: number): string => {
    const wholeSeconds = Math.max(0, Math.floor(seconds))
    const hours = Math.floor(wholeSeconds / 3600)
    const minutes = Math.floor((wholeSeconds % 3600) / 60).toString().padStart(hours > 0 ? 2 : 1, '0')
    const remainder = (wholeSeconds % 60).toString().padStart(2, '0')
    return hours > 0 ? `${hours}:${minutes}:${remainder}` : `${minutes}:${remainder}`
  }

  const togglePlayback = (): void => {
    const audio = audioRef.current
    if (!audio || !preloaded) return
    if (audio.paused) void audio.play().catch(() => setMissing(true))
    else audio.pause()
  }

  const seek = (nextTime: number): void => {
    const audio = audioRef.current
    if (!audio || duration === null) return
    const clamped = Math.max(0, Math.min(duration, nextTime))
    audio.currentTime = clamped
    setCurrentTime(clamped)
  }

  return (
    <NodeViewWrapper className="my-3" data-vault-audio-src={relativePath}>
      <div
        contentEditable={false}
        aria-busy={deleting}
        className="relative flex items-center gap-3 overflow-hidden rounded-sm border border-surface-border bg-surface-secondary/50 px-3 py-2.5"
        onContextMenu={(event) => {
          event.preventDefault()
          event.stopPropagation()
          if (deleting) return
          const position = getPos()
          if (typeof position === 'number') editor.commands.setNodeSelection(position)
          setContextMenu({ x: event.clientX, y: event.clientY })
        }}
      >
        <span className={`audio-playback-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-accent-soft text-accent ${isPlaying ? 'audio-playback-icon-active' : ''}`} aria-hidden="true">
          <AudioLines className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="mb-1 truncate text-xs font-medium text-content-primary" title={title}>{title}</div>
          {source ? <>
            <audio
              ref={audioRef}
              className="hidden"
              preload="auto"
              src={source}
              onLoadedMetadata={(event) => {
                const mediaDuration = event.currentTarget.duration
                if (Number.isFinite(mediaDuration) && mediaDuration > 0) setDuration(mediaDuration)
              }}
              onDurationChange={(event) => {
                const mediaDuration = event.currentTarget.duration
                if (Number.isFinite(mediaDuration) && mediaDuration > 0) setDuration(mediaDuration)
              }}
              onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={(event) => { event.currentTarget.currentTime = 0; setIsPlaying(false); setCurrentTime(0) }}
              onProgress={(event) => {
                const media = event.currentTarget
                if (!media.buffered.length) return
                const bufferedUntil = media.buffered.end(media.buffered.length - 1)
                const totalDuration = Number.isFinite(media.duration) ? media.duration : recordedDuration
                if (Number.isFinite(totalDuration) && totalDuration > 0) {
                  const percent = Math.min(100, Math.round((bufferedUntil / totalDuration) * 100))
                  setBufferPercent(percent)
                  if (percent >= 100) setPreloaded(true)
                }
              }}
              onCanPlayThrough={() => { setBufferPercent(100); setPreloaded(true) }}
              onError={() => setMissing(true)}
            />
            {preloaded ? <div className="flex min-w-0 items-center gap-2">
              <IconButton
                size="sm"
                variant="accent-soft"
                tooltip={isPlaying ? 'Pausar áudio' : 'Reproduzir áudio'}
                icon={isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                onClick={togglePlayback}
              />
              <AudioWaveform
                peaks={waveform}
                currentTime={currentTime}
                duration={duration ?? 0}
                disabled={duration === null}
                label={`Posição do áudio: ${formatDuration(currentTime)} de ${duration === null ? 'duração desconhecida' : formatDuration(duration)}`}
                onSeek={seek}
              />
              <span className="shrink-0 font-mono text-[10px] tabular-nums text-content-muted">
                {formatDuration(currentTime)} / {duration === null ? '--:--' : formatDuration(duration)}
              </span>
            </div> : <div className="space-y-1.5" role="status" aria-live="polite">
              <div className="text-[10px] text-content-muted">{preloaded ? 'Duração indisponível' : 'Preparando áudio para reprodução…'}</div>
              {!preloaded && <div className="h-1 overflow-hidden rounded-sm bg-surface-tertiary" aria-label={`Áudio carregado: ${bufferPercent}%`}>
                <div className="h-full bg-accent transition-[width] duration-200" style={{ width: `${bufferPercent}%` }} />
              </div>}
              {duration !== null && <div className="text-[10px] text-content-muted">Duração total {formatDuration(duration)}</div>}
            </div>}
          </>
            : missing ? <div className="flex items-center gap-1.5 text-xs text-content-muted"><AlertCircle className="h-3.5 w-3.5" />Arquivo de áudio indisponível</div>
              : <div className="h-8 animate-pulse rounded-sm bg-surface-tertiary" />}
          {deleteError && <p role="alert" className="mt-1.5 text-[11px] text-rose-500">{deleteError}</p>}
        </div>
        {deleteAnimating && <div className="audio-delete-sweep" role="status" aria-label="Excluindo áudio">
          <div className="audio-delete-sweep-fill bg-gradient-to-r from-rose-500/25 to-rose-500/15" onAnimationEnd={() => void completeAudioDeletion()} />
          <span className="audio-delete-sweep-icon bg-rose-500 text-white shadow-lg shadow-rose-500/35"><Trash2 className="h-4 w-4" /></span>
        </div>}
      </div>
      {contextMenu && createPortal(
        <div
          ref={contextMenuRef}
          role="menu"
          aria-label="Ações do áudio"
          style={{ top: 8, left: 8, width: 224 }}
          className="app-context-menu fixed z-[150] overflow-y-auto border border-surface-border bg-surface-bg p-1.5 shadow-xl select-none"
          onContextMenu={(event) => event.preventDefault()}
          onKeyDown={(event) => {
            if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
            const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'))
            if (!items.length) return
            const index = items.indexOf(document.activeElement as HTMLButtonElement)
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : event.key === 'ArrowDown' ? (index + 1) % items.length : (index - 1 + items.length) % items.length
            event.preventDefault()
            event.stopPropagation()
            items[next].focus()
          }}
        >
          <div className="mb-1 flex items-center gap-2 border-b border-surface-border px-2.5 py-2">
            <AudioLines className="h-3.5 w-3.5 shrink-0 text-accent" />
            <div className="min-w-0">
              <div className="truncate text-[11px] font-semibold text-content-primary">{title}</div>
              <div className="text-[10px] text-content-muted">Ações da gravação</div>
            </div>
          </div>
          <SelectionButton
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-left text-xs text-content-primary hover:bg-surface-secondary"
            onMouseDown={(event) => event.preventDefault()}
            onClick={removeFromNote}
          >
            <Link2Off className="h-3.5 w-3.5 text-content-muted" />
            Remover da nota
          </SelectionButton>
          <SelectionButton
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-left text-xs text-rose-500 hover:bg-surface-secondary"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => { setContextMenu(null); setConfirmDelete(true); setDeleteError(null) }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Excluir áudio do cofre
          </SelectionButton>
        </div>,
        document.body
      )}
      {confirmDelete && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-surface-bg/80 p-4" onMouseDown={(event) => { if (!deleting && event.target === event.currentTarget) setConfirmDelete(false) }}>
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={deleteTitleId}
            aria-describedby={deleteDescriptionId}
            className="w-full max-w-sm space-y-4 border border-surface-border bg-surface-bg p-5 shadow-xl"
            onKeyDown={(event) => {
              if (event.key === 'Escape' && !deleting) { event.preventDefault(); event.stopPropagation(); setConfirmDelete(false) }
              if (event.key === 'Tab' && !event.shiftKey && document.activeElement === deleteCancelRef.current) { event.preventDefault(); event.currentTarget.querySelector<HTMLButtonElement>('button:last-child')?.focus() }
              if (event.key === 'Tab' && event.shiftKey && document.activeElement === event.currentTarget.querySelector<HTMLButtonElement>('button:last-child')) { event.preventDefault(); deleteCancelRef.current?.focus() }
            }}
          >
            <h2 id={deleteTitleId} className="text-sm font-semibold text-content-primary">Excluir áudio do cofre?</h2>
            <p id={deleteDescriptionId} className="text-xs text-content-secondary">“{title}” será removido do cofre e desta nota. Quando disponível, poderá ser recuperado pela lixeira do sistema.</p>
            {deleteError && <p role="alert" className="text-xs text-rose-500">{deleteError}</p>}
            <div className="flex justify-end gap-2">
              <Button ref={deleteCancelRef} variant="ghost" disabled={deleting} onClick={() => setConfirmDelete(false)}>Cancelar</Button>
              <Button variant="danger" disabled={deleting} onClick={deleteAudioFile}>Excluir áudio</Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </NodeViewWrapper>
  )
}

export const VaultAudio = Node.create<VaultAudioOptions>({
  name: 'vaultAudio',
  group: 'block',
  atom: true,
  selectable: true,

  addOptions() {
    return { getVaultPath: () => '' }
  },

  addAttributes() {
    return {
      src: { default: null },
      title: { default: 'Gravação de áudio' },
      duration: {
        default: null,
        parseHTML: (element) => Number(element.getAttribute('data-duration')) || null,
        renderHTML: (attributes) => attributes.duration ? { 'data-duration': String(attributes.duration) } : {}
      },
      waveform: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-waveform'),
        renderHTML: (attributes) => attributes.waveform ? { 'data-waveform': String(attributes.waveform) } : {}
      }
    }
  },

  parseHTML() {
    return [{ tag: 'audio[data-notes-md-audio]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['audio', { ...HTMLAttributes, 'data-notes-md-audio': 'true', controls: 'controls' }]
  },

  addNodeView() {
    const getVaultPath = this.options.getVaultPath
    const Component: React.FC<NodeViewProps> = (props) => <VaultAudioView {...props} getVaultPath={getVaultPath} />
    return ReactNodeViewRenderer(Component)
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: { write: (value: string) => void; closeBlock: (node: ProseMirrorNode) => void }, node: ProseMirrorNode) {
          const src = escapeHtmlAttribute(String(node.attrs.src || ''))
          const title = escapeHtmlAttribute(String(node.attrs.title || 'Gravação de áudio'))
          const duration = Number(node.attrs.duration)
          const waveform = String(node.attrs.waveform || '')
          const durationAttribute = Number.isFinite(duration) && duration > 0 ? ` data-duration="${duration.toFixed(3)}"` : ''
          const waveformAttribute = parseAudioWaveform(waveform) ? ` data-waveform="${escapeHtmlAttribute(waveform)}"` : ''
          state.write(`<audio data-notes-md-audio="true" controls="controls" src="${src}" title="${title}"${durationAttribute}${waveformAttribute}></audio>`)
          state.closeBlock(node)
        },
        parse: {}
      }
    }
  }
})
