import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AudioLines, Check, Circle, LoaderCircle, Mic, Pause, Play, Square, X } from 'lucide-react'
import { createMp3Encoder } from 'wasm-media-encoders'
import { Button, IconButton, Input } from '../ui'
import { useContextMenuPosition } from '../ui/useContextMenuPosition'
import { AudioWaveform, createAudioWaveform, serializeAudioWaveform } from './AudioWaveform'

export interface AudioRecorderMotionAnchor {
  origin: { left: number; top: number; width: number; height: number }
  target: { x: number; y: number }
}

interface AudioRecorderDialogProps {
  open: boolean
  vaultPath: string
  noteName: string
  suggestedTitle: string | null
  motionAnchor: AudioRecorderMotionAnchor | null
  onClose: () => void
  onSaved: (relativePath: string, title: string, durationSeconds: number, waveform: string) => boolean
}

type RecorderStatus = 'idle' | 'requesting' | 'recording' | 'paused' | 'processing' | 'saving' | 'ready' | 'inserted'
type FlightPhase = 'recording' | 'loading'

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0')
  const remainder = (seconds % 60).toString().padStart(2, '0')
  return `${minutes}:${remainder}`
}

async function convertRecordingToMp3(blob: Blob): Promise<{ blob: Blob; waveform: number[] }> {
  const audioContext = new AudioContext()
  try {
    const audioBuffer = await audioContext.decodeAudioData(await blob.arrayBuffer())
    const waveform = createAudioWaveform(audioBuffer)
    const channels = audioBuffer.numberOfChannels > 1 ? 2 : 1
    const encoder = await createMp3Encoder()
    encoder.configure({ channels, sampleRate: audioBuffer.sampleRate, bitrate: 128 })

    const channelData = Array.from({ length: channels }, (_, channel) => audioBuffer.getChannelData(channel))
    const output: Uint8Array[] = []
    const chunkSize = 16_384
    for (let offset = 0; offset < audioBuffer.length; offset += chunkSize) {
      const samples = channelData.map((data) => data.subarray(offset, Math.min(offset + chunkSize, audioBuffer.length)))
      const encoded = encoder.encode(samples)
      if (encoded.length > 0) output.push(encoded.slice())
      if (offset > 0 && offset % (chunkSize * 8) === 0) {
        await new Promise<void>((resolve) => window.setTimeout(resolve, 0))
      }
    }

    const finalChunk = encoder.finalize()
    if (finalChunk.length > 0) output.push(finalChunk.slice())
    return { blob: new Blob(output, { type: 'audio/mpeg' }), waveform }
  } finally {
    await audioContext.close()
  }
}

export const AudioRecorderDialog: React.FC<AudioRecorderDialogProps> = ({ open, vaultPath, noteName, suggestedTitle, motionAnchor, onClose, onSaved }) => {
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const activeSegmentStartedAtRef = useRef<number | null>(null)
  const elapsedDurationMsRef = useRef(0)
  const meterContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const meterFrameRef = useRef<number | null>(null)
  const meterActiveRef = useRef(false)
  const lastMeterUpdateRef = useRef(0)
  const flightIdRef = useRef(0)
  const captureRequestRef = useRef(0)
  const closeTimerRef = useRef<number | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const previewAudioRef = useRef<HTMLAudioElement | null>(null)
  const [status, setStatus] = useState<RecorderStatus>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [recordingDurationMs, setRecordingDurationMs] = useState(0)
  const [title, setTitle] = useState('')
  const [recording, setRecording] = useState<Blob | null>(null)
  const [recordingWaveform, setRecordingWaveform] = useState<number[] | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0)
  const [previewDuration, setPreviewDuration] = useState(0)
  const [previewReady, setPreviewReady] = useState(false)
  const [previewPlaying, setPreviewPlaying] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [waveform, setWaveform] = useState<number[]>(() => Array.from({ length: 42 }, () => 0.08))
  const [error, setError] = useState<string | null>(null)
  const [flight, setFlight] = useState<{ id: number; phase: FlightPhase } | null>(null)
  const panelAnchor = useMemo(() => motionAnchor ? { x: motionAnchor.target.x, y: motionAnchor.target.y + 16 } : null, [motionAnchor])

  useContextMenuPosition(panelRef, panelAnchor)

  const stopMeter = (): void => {
    meterActiveRef.current = false
    if (meterFrameRef.current !== null) cancelAnimationFrame(meterFrameRef.current)
    meterFrameRef.current = null
    analyserRef.current?.disconnect()
    analyserRef.current = null
    const context = meterContextRef.current
    meterContextRef.current = null
    if (context && context.state !== 'closed') void context.close()
    setAudioLevel(0)
  }

  const runMeter = (): void => {
    const analyser = analyserRef.current
    if (!analyser || !meterActiveRef.current) return
    const values = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(values)
    const bins = values.slice(2, Math.min(48, values.length))
    const mean = bins.length ? bins.reduce((sum, value) => sum + value, 0) / bins.length : 0
    const level = Math.min(1, Math.max(0, Math.sqrt(mean / 255) * 1.55))
    const now = performance.now()
    if (now - lastMeterUpdateRef.current > 42) {
      lastMeterUpdateRef.current = now
      setAudioLevel((previous) => previous * 0.35 + level * 0.65)
      const nextBars = Array.from({ length: 42 }, (_, index) => {
        const binIndex = 2 + Math.floor((index / 42) * Math.max(1, Math.min(46, values.length - 2)))
        const energy = values[Math.min(binIndex, values.length - 1)] / 255
        return Math.max(0.08, Math.min(1, energy * 1.6 + level * 0.28))
      })
      setWaveform(nextBars)
    }
    meterFrameRef.current = requestAnimationFrame(runMeter)
  }

  const startMeter = async (stream: MediaStream): Promise<void> => {
    try {
      const context = new AudioContext()
      const analyser = context.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.72
      const source = context.createMediaStreamSource(stream)
      source.connect(analyser)
      await context.resume()
      if (recorderRef.current?.state !== 'recording' || streamRef.current !== stream) {
        await context.close()
        return
      }
      meterContextRef.current = context
      analyserRef.current = analyser
      meterActiveRef.current = true
      meterFrameRef.current = requestAnimationFrame(runMeter)
    } catch {
      // The recording continues if the device does not expose live amplitude data.
      stopMeter()
    }
  }

  const reset = (): void => {
    captureRequestRef.current += 1
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current)
    closeTimerRef.current = null
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = null
      recorder.stop()
    }
    stopMeter()
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    recorderRef.current = null
    chunksRef.current = []
    activeSegmentStartedAtRef.current = null
    elapsedDurationMsRef.current = 0
    setStatus('idle')
    setElapsed(0)
    setRecordingDurationMs(0)
    setRecording(null)
    setRecordingWaveform(null)
    setPreviewCurrentTime(0)
    setPreviewDuration(0)
    setPreviewReady(false)
    setPreviewPlaying(false)
    setWaveform(Array.from({ length: 42 }, () => 0.08))
    setFlight(null)
    setError(null)
  }

  useEffect(() => {
    if (!open) return
    setStatus('idle')
    setElapsed(0)
    setRecordingDurationMs(0)
    setRecording(null)
    setRecordingWaveform(null)
    setPreviewCurrentTime(0)
    setPreviewDuration(0)
    setPreviewReady(false)
    setPreviewPlaying(false)
    setWaveform(Array.from({ length: 42 }, () => 0.08))
    setError(null)
    setFlight(null)
    setTitle(suggestedTitle || noteName)
    return () => {
      if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
      const recorder = recorderRef.current
      if (recorder && recorder.state !== 'inactive') {
        recorder.ondataavailable = null
        recorder.onstop = null
        recorder.stop()
      }
      stopMeter()
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [open, noteName, suggestedTitle])

  useEffect(() => {
    if (status !== 'recording') return
    const timer = window.setInterval(() => {
      const activeStartedAt = activeSegmentStartedAtRef.current
      const currentDuration = elapsedDurationMsRef.current + (activeStartedAt === null ? 0 : performance.now() - activeStartedAt)
      setElapsed(Math.floor(currentDuration / 1000))
    }, 250)
    return () => window.clearInterval(timer)
  }, [status])

  useEffect(() => {
    if (!recording) { setPreviewUrl(null); return }
    const url = URL.createObjectURL(recording)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [recording])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && !['recording', 'paused', 'processing', 'saving', 'inserted'].includes(status)) {
        event.preventDefault()
        reset()
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, status, onClose])

  const getElapsedDurationMs = (): number => {
    const activeStartedAt = activeSegmentStartedAtRef.current
    if (activeStartedAt !== null) {
      elapsedDurationMsRef.current += Math.max(0, performance.now() - activeStartedAt)
      activeSegmentStartedAtRef.current = null
    }
    return elapsedDurationMsRef.current
  }

  const saveMp3 = async (mp3Blob: Blob, durationMs: number): Promise<void> => {
    setStatus('saving')
    setError(null)
    previewAudioRef.current?.pause()
    try {
      const saved = await window.electronAPI.saveVaultAudio(vaultPath, new Uint8Array(await mp3Blob.arrayBuffer()), 'audio/mpeg')
      const inserted = onSaved(saved.relativePath, title.trim() || 'Gravação de áudio', durationMs / 1000, serializeAudioWaveform(recordingWaveform ?? []))
      if (!inserted) {
        await window.electronAPI.deleteVaultAudio(vaultPath, saved.relativePath).catch(() => false)
        throw new Error('Não foi possível localizar o editor para inserir o áudio.')
      }
      setFlight(null)
      setStatus('inserted')
      closeTimerRef.current = window.setTimeout(() => {
        closeTimerRef.current = null
        reset()
        onClose()
      }, 700)
    } catch (cause) {
      setStatus('ready')
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar a gravação no cofre.')
    }
  }

  const startRecording = async (): Promise<void> => {
    const requestId = ++captureRequestRef.current
    setError(null)
    setStatus('requesting')
    setFlight({ id: ++flightIdRef.current, phase: 'recording' })
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        throw new Error('A gravação de áudio não está disponível neste dispositivo.')
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (captureRequestRef.current !== requestId) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }
      streamRef.current = stream
      const preferredTypes = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/webm', 'audio/mp4']
      const mimeType = preferredTypes.find((type) => MediaRecorder.isTypeSupported(type))
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      chunksRef.current = []
      elapsedDurationMsRef.current = 0
      activeSegmentStartedAtRef.current = performance.now()
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onstop = async () => {
        stopMeter()
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        const durationMs = getElapsedDurationMs()
        if (!blob.size) {
          setStatus('idle')
          setError('A gravação ficou vazia. Tente novamente.')
          streamRef.current?.getTracks().forEach((track) => track.stop())
          return
        }
        setStatus('processing')
        try {
          const converted = await convertRecordingToMp3(blob)
          if (!converted.blob.size) throw new Error('O arquivo MP3 ficou vazio.')
          setRecordingDurationMs(durationMs)
          setElapsed(Math.ceil(durationMs / 1000))
          setRecording(converted.blob)
          setRecordingWaveform(converted.waveform)
          setPreviewCurrentTime(0)
          setPreviewDuration(durationMs / 1000)
          setPreviewReady(false)
          setPreviewPlaying(false)
          setStatus('ready')
        } catch (cause) {
          setRecording(null)
          setStatus('idle')
          const reason = cause instanceof Error ? cause.message : ''
          setError(reason.toLowerCase().includes('fetch')
            ? 'O codificador MP3 não pôde ser carregado. Feche e abra o Notes MD e tente novamente.'
            : reason ? `Não foi possível preparar o áudio: ${reason}` : 'Não foi possível converter a gravação para MP3.')
        } finally {
          streamRef.current?.getTracks().forEach((track) => track.stop())
          streamRef.current = null
        }
      }
      recorder.onerror = () => {
        setError('Ocorreu um erro durante a gravação.')
        setStatus('idle')
        stopMeter()
        stream.getTracks().forEach((track) => track.stop())
      }
      recorderRef.current = recorder
      setElapsed(0)
      recorder.start(250)
      setStatus('recording')
      void startMeter(stream)
    } catch (cause) {
      if (captureRequestRef.current !== requestId) return
      setError(cause instanceof Error ? cause.message : 'Não foi possível acessar o microfone.')
      setStatus('idle')
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }

  useEffect(() => {
    if (open) void startRecording()
  }, [open])

  const finishRecording = (): void => {
    const recorder = recorderRef.current
    if (!recorder || recorder.state === 'inactive') return
    const duration = getElapsedDurationMs()
    setElapsed(Math.ceil(duration / 1000))
    setStatus('processing')
    setFlight({ id: ++flightIdRef.current, phase: 'loading' })
    meterActiveRef.current = false
    if (meterFrameRef.current !== null) cancelAnimationFrame(meterFrameRef.current)
    meterFrameRef.current = null
    recorder.stop()
  }

  const pauseRecording = (): void => {
    const recorder = recorderRef.current
    if (!recorder || recorder.state !== 'recording') return
    getElapsedDurationMs()
    recorder.pause()
    meterActiveRef.current = false
    if (meterFrameRef.current !== null) cancelAnimationFrame(meterFrameRef.current)
    meterFrameRef.current = null
    setStatus('paused')
  }

  const resumeRecording = (): void => {
    const recorder = recorderRef.current
    if (!recorder || recorder.state !== 'paused') return
    activeSegmentStartedAtRef.current = performance.now()
    recorder.resume()
    meterActiveRef.current = true
    meterFrameRef.current = requestAnimationFrame(runMeter)
    setStatus('recording')
  }

  const discardRecording = (): void => {
    reset()
    onClose()
  }

  const closeAndDiscard = (): void => {
    reset()
    onClose()
  }

  const togglePreviewPlayback = (): void => {
    const audio = previewAudioRef.current
    if (!audio || !previewReady) return
    if (audio.paused) void audio.play().catch(() => setError('Não foi possível reproduzir a prévia do áudio.'))
    else audio.pause()
  }

  const seekPreview = (nextTime: number): void => {
    const audio = previewAudioRef.current
    if (!audio || !previewReady) return
    const maxDuration = Number.isFinite(audio.duration) ? audio.duration : recordingDurationMs / 1000
    audio.currentTime = Math.max(0, Math.min(maxDuration, nextTime))
    setPreviewCurrentTime(audio.currentTime)
  }

  const isBusy = status === 'recording' || status === 'paused' || status === 'processing' || status === 'saving'
  const motionStyle = motionAnchor ? {
    left: motionAnchor.origin.left + motionAnchor.origin.width / 2 - 90,
    top: motionAnchor.origin.top + motionAnchor.origin.height / 2 - 22,
    '--flight-x': `${motionAnchor.target.x - (motionAnchor.origin.left + motionAnchor.origin.width / 2)}px`,
    '--flight-y': `${motionAnchor.target.y - (motionAnchor.origin.top + motionAnchor.origin.height / 2)}px`
  } as React.CSSProperties : undefined

  if (!open) return null
  return createPortal(
    <>
      {flight && motionAnchor && <>
        <div className="audio-insertion-target" style={{ left: motionAnchor.target.x - 12, top: motionAnchor.target.y - 12 }} aria-hidden="true" />
        <div
          key={flight.id}
          className={`audio-recorder-flight ${flight.phase === 'loading' ? 'audio-recorder-flight-loading' : ''}`}
          style={motionStyle}
          onAnimationEnd={() => setFlight((current) => current?.id === flight.id ? null : current)}
          aria-hidden="true"
        >
          <span className="audio-recorder-flight-icon">{flight.phase === 'loading' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <AudioLines className="h-4 w-4" />}</span>
          <span className="audio-recorder-flight-label">{flight.phase === 'loading' ? 'Inserindo áudio' : 'Áudio da nota'}</span>
        </div>
      </>}

      <div
        ref={panelRef}
        role="dialog"
        aria-labelledby="audio-recorder-title"
        style={{ top: 8, left: 8, width: Math.max(280, Math.min(380, window.innerWidth - 16)) }}
        className={`audio-recorder-dialog fixed z-[120] max-h-[calc(100vh-1rem)] overflow-y-auto border border-surface-border bg-surface-bg shadow-2xl ${status === 'processing' || status === 'saving' ? 'audio-recorder-dialog-processing' : ''}`}
      >
          <header className="flex items-center justify-between border-b border-surface-border px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-accent-soft text-accent"><AudioLines className="h-4 w-4" /></span>
              <div>
                <h2 id="audio-recorder-title" className="text-sm font-semibold text-content-primary">Nova gravação</h2>
                <p className="text-[11px] text-content-muted">Vinculada à nota {noteName}</p>
              </div>
            </div>
            <IconButton size="sm" tooltip="Fechar" icon={<X className="h-4 w-4" />} onClick={closeAndDiscard} disabled={isBusy || status === 'inserted'} />
          </header>

          <div className="space-y-4 p-4">
            <Input aria-label="Título da gravação" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Título da gravação" disabled={isBusy || status === 'inserted'} />

            <div className={`audio-capture-stage border border-surface-border bg-surface-secondary/40 px-4 py-5 ${status === 'recording' ? 'audio-capture-stage-live' : ''}`}>
              <div className="flex items-center justify-center gap-5">
                <div className={`audio-mic-orb ${status === 'recording' ? 'audio-mic-orb-live' : ''} ${status === 'processing' || status === 'saving' ? 'audio-mic-orb-loading' : ''} ${status === 'inserted' ? 'audio-mic-orb-done' : ''}`} style={{ '--audio-level': audioLevel } as React.CSSProperties}>
                  <span className="audio-mic-orb-halo" />
                  <span className="audio-mic-orb-core">
                    {status === 'requesting' || status === 'processing' || status === 'saving' ? <LoaderCircle className="h-5 w-5 animate-spin" /> : status === 'inserted' ? <Check className="h-5 w-5" /> : status === 'idle' || status === 'ready' ? <Mic className="h-5 w-5" /> : status === 'paused' ? <Pause className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </span>
                </div>
                <div className="text-center">
                  <div className={`font-mono text-3xl tabular-nums ${status === 'recording' ? 'text-accent' : 'text-content-primary'}`}>{formatDuration(elapsed)}</div>
                  <div className="mt-1 min-h-4 text-xs text-content-muted" role="status" aria-live="polite">
                    {status === 'requesting' ? 'Aguardando acesso ao microfone…' : status === 'recording' ? 'Gravando · voz detectada' : status === 'paused' ? 'Gravação pausada' : status === 'processing' ? 'Preparando a prévia…' : status === 'saving' ? 'Salvando e inserindo…' : status === 'ready' ? 'Ouça a prévia ou insira na nota' : status === 'inserted' ? 'Áudio adicionado à nota' : 'Grave um áudio para esta nota'}
                  </div>
                </div>
              </div>

              {(status === 'requesting' || status === 'recording' || status === 'paused' || status === 'processing') && (
                <div className={`audio-live-waveform ${status === 'recording' ? 'audio-live-waveform-active' : ''}`} aria-label="Nível de áudio capturado" role="img">
                  {waveform.map((height, index) => <span key={index} style={{ height: `${Math.max(8, height * 34)}px`, opacity: status === 'recording' ? 0.35 + height * 0.65 : 0.35 }} />)}
                </div>
              )}
            </div>

            {(status === 'ready' || status === 'saving' || status === 'inserted') && previewUrl && (
              <div className={`audio-preview-transfer ${status === 'saving' ? 'audio-preview-transfer-saving' : ''} ${status === 'inserted' ? 'audio-preview-transfer-inserted' : ''}`}>
                <audio
                  ref={previewAudioRef}
                  preload="auto"
                  style={{ display: 'none' }}
                  src={previewUrl}
                  onLoadedMetadata={(event) => {
                    const mediaDuration = event.currentTarget.duration
                    if (Number.isFinite(mediaDuration) && mediaDuration > 0) setPreviewDuration(mediaDuration)
                    setPreviewReady(true)
                  }}
                  onDurationChange={(event) => {
                    const mediaDuration = event.currentTarget.duration
                    if (Number.isFinite(mediaDuration) && mediaDuration > 0) setPreviewDuration(mediaDuration)
                  }}
                  onCanPlayThrough={() => setPreviewReady(true)}
                  onTimeUpdate={(event) => setPreviewCurrentTime(event.currentTarget.currentTime)}
                  onPlay={() => setPreviewPlaying(true)}
                  onPause={() => setPreviewPlaying(false)}
                  onEnded={() => { setPreviewCurrentTime(0); setPreviewPlaying(false) }}
                  onError={() => { setPreviewReady(false); setError('Não foi possível reproduzir a prévia do áudio.') }}
                />
                <div className="flex min-w-0 items-center gap-2 px-2.5 py-2">
                  <IconButton
                    size="sm"
                    variant="accent-soft"
                    tooltip={previewPlaying ? 'Pausar prévia' : 'Reproduzir prévia'}
                    disabled={!previewReady || status !== 'ready'}
                    icon={previewPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    onClick={togglePreviewPlayback}
                  />
                  <AudioWaveform
                    peaks={recordingWaveform}
                    currentTime={previewCurrentTime}
                    duration={previewDuration || recordingDurationMs / 1000}
                    disabled={!previewReady || status !== 'ready'}
                    label="Posição da prévia do áudio"
                    onSeek={seekPreview}
                  />
                  <span className="shrink-0 font-mono text-[10px] tabular-nums text-content-muted">
                    {formatDuration(Math.floor(previewCurrentTime))} / {formatDuration(Math.floor(previewDuration > 0 ? previewDuration : recordingDurationMs / 1000))}
                  </span>
                </div>
                {status === 'saving' && <div className="audio-preview-transfer-overlay"><LoaderCircle className="h-4 w-4 animate-spin" /><span>Inserindo na nota…</span></div>}
                {status === 'inserted' && <div className="audio-preview-transfer-overlay"><Check className="h-4 w-4" /><span>Áudio inserido</span></div>}
              </div>
            )}

            {error && <p role="alert" className="text-xs text-rose-500">{error}</p>}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button size="xs" variant="ghost" onClick={closeAndDiscard} disabled={isBusy || status === 'inserted'}>Cancelar</Button>
              <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5">
                {status === 'idle' && <Button size="xs" variant="primary" leftIcon={<Circle className="h-3.5 w-3.5 fill-current" />} onClick={() => void startRecording()}>Tentar novamente</Button>}
                {status === 'recording' && <>
                  <Button size="xs" variant="secondary" leftIcon={<Pause className="h-3.5 w-3.5" />} onClick={pauseRecording}>Pausar</Button>
                  <Button size="xs" variant="ghost" onClick={discardRecording}>Descartar</Button>
                  <Button size="xs" variant="danger" className="whitespace-nowrap" leftIcon={<Square className="h-3 w-3 fill-current" />} onClick={finishRecording}>Parar</Button>
                </>}
                {status === 'paused' && <>
                  <Button size="xs" variant="secondary" leftIcon={<Play className="h-3.5 w-3.5" />} onClick={resumeRecording}>Continuar</Button>
                  <Button size="xs" variant="ghost" onClick={discardRecording}>Descartar</Button>
                  <Button size="xs" variant="danger" className="whitespace-nowrap" leftIcon={<Square className="h-3 w-3 fill-current" />} onClick={finishRecording}>Parar</Button>
                </>}
                {status === 'processing' && <Button size="xs" variant="primary" disabled isLoading>Preparando prévia</Button>}
                {status === 'saving' && <Button size="xs" variant="primary" disabled leftIcon={<LoaderCircle className="h-3.5 w-3.5 animate-spin" />}>Inserindo</Button>}
                {status === 'ready' && <>
                  <Button size="xs" variant="ghost" onClick={closeAndDiscard}>Cancelar áudio</Button>
                  {recording && <Button size="xs" variant="primary" leftIcon={<Check className="h-3.5 w-3.5" />} onClick={() => void saveMp3(recording, recordingDurationMs)}>Inserir na nota</Button>}
                </>}
                {status === 'inserted' && <Button size="xs" variant="primary" disabled leftIcon={<Check className="h-3.5 w-3.5" />}>Adicionado</Button>}
              </div>
            </div>
          </div>
      </div>
    </>,
    document.body
  )
}
