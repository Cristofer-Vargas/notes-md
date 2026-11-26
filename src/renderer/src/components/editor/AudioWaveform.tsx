import React, { useEffect, useRef, useState } from 'react'

const DEFAULT_BAR_COUNT = 56

export function parseAudioWaveform(value: unknown): number[] | null {
  if (typeof value !== 'string' || !/^\d+(,\d+)*$/.test(value)) return null
  const values = value.split(',').map((item) => Number(item))
  if (values.length < 8 || values.length > 128 || values.some((item) => !Number.isFinite(item) || item < 0 || item > 100)) return null
  return values.map((item) => Math.max(0.08, Math.min(1, item / 100)))
}

export function serializeAudioWaveform(peaks: number[]): string {
  return peaks.map((peak) => String(Math.max(0, Math.min(100, Math.round(peak * 100))))).join(',')
}

export function createAudioWaveform(audioBuffer: AudioBuffer, barCount = DEFAULT_BAR_COUNT): number[] {
  const channels = Array.from({ length: audioBuffer.numberOfChannels }, (_, channel) => audioBuffer.getChannelData(channel))
  const peakValues = Array.from({ length: barCount }, (_, bar) => {
    const start = Math.floor((bar / barCount) * audioBuffer.length)
    const end = Math.max(start + 1, Math.floor(((bar + 1) / barCount) * audioBuffer.length))
    const step = Math.max(1, Math.floor((end - start) / 128))
    let peak = 0
    for (let frame = start; frame < end; frame += step) {
      for (const channel of channels) {
        peak = Math.max(peak, Math.abs(channel[frame] || 0))
      }
    }
    return peak
  })
  const maxPeak = Math.max(...peakValues, 0.001)
  return peakValues.map((peak) => Math.max(0.1, Math.sqrt(peak / maxPeak)))
}

export async function decodeAudioWaveform(source: string): Promise<number[]> {
  const response = await fetch(source)
  if (!response.ok) throw new Error('Não foi possível carregar a forma de onda do áudio.')
  const data = await response.arrayBuffer()
  const context = new AudioContext()
  try {
    const audioBuffer = await context.decodeAudioData(data)
    return createAudioWaveform(audioBuffer)
  } finally {
    await context.close()
  }
}

interface AudioWaveformProps {
  peaks: number[] | null
  currentTime: number
  duration: number
  disabled?: boolean
  label: string
  onSeek: (time: number) => void
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({ peaks, currentTime, duration, disabled = false, label, onSeek }) => {
  const waveformRef = useRef<HTMLDivElement | null>(null)
  const values = peaks?.length ? peaks : Array.from({ length: DEFAULT_BAR_COUNT }, (_, index) => 0.16 + ((index * 17) % 9) / 100)
  const [containerWidth, setContainerWidth] = useState(240)
  useEffect(() => {
    const element = waveformRef.current
    if (!element) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) setContainerWidth(Math.round(entry.contentRect.width))
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  const visibleBarCount = Math.min(values.length, Math.max(16, Math.floor(containerWidth / 3)))
  const visibleValues = Array.from({ length: visibleBarCount }, (_, index) => {
    const start = Math.floor((index / visibleBarCount) * values.length)
    const end = Math.max(start + 1, Math.floor(((index + 1) / visibleBarCount) * values.length))
    return Math.max(...values.slice(start, end))
  })
  const progress = duration > 0 ? Math.max(0, Math.min(1, currentTime / duration)) : 0

  const seekToPointer = (clientX: number): void => {
    const bounds = waveformRef.current?.getBoundingClientRect()
    if (!bounds || duration <= 0 || disabled) return
    const ratio = Math.max(0, Math.min(1, (clientX - bounds.left) / bounds.width))
    onSeek(ratio * duration)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (disabled || duration <= 0) return
    let nextTime: number | null = null
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') nextTime = currentTime - Math.max(1, duration / 100)
    else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') nextTime = currentTime + Math.max(1, duration / 100)
    else if (event.key === 'Home') nextTime = 0
    else if (event.key === 'End') nextTime = duration
    if (nextTime === null) return
    event.preventDefault()
    onSeek(Math.max(0, Math.min(duration, nextTime)))
  }

  return (
    <div
      ref={waveformRef}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-valuenow={Math.round(currentTime)}
      aria-valuetext={`${Math.floor(currentTime)} de ${Math.floor(duration)} segundos`}
      aria-disabled={disabled}
      className={`audio-waveform ${disabled ? 'audio-waveform-disabled' : ''}`}
      style={{ gridTemplateColumns: `repeat(${visibleValues.length}, minmax(0, 1fr))` }}
      onPointerDown={(event) => {
        if (disabled) return
        event.preventDefault()
        event.currentTarget.setPointerCapture(event.pointerId)
        seekToPointer(event.clientX)
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) seekToPointer(event.clientX)
      }}
      onPointerUp={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
      }}
      onKeyDown={handleKeyDown}
    >
      {visibleValues.map((height, index) => (
        <span
          key={index}
          aria-hidden="true"
          className={`audio-waveform-bar ${index / visibleValues.length <= progress ? 'audio-waveform-bar-played' : 'audio-waveform-bar-upcoming'}`}
          style={{ height: `${Math.max(12, height * 100)}%` }}
        />
      ))}
      <span aria-hidden="true" className="audio-waveform-playhead" style={{ left: `${progress * 100}%` }} />
    </div>
  )
}
