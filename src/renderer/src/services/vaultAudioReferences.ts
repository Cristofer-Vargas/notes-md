import type { VaultNoteData } from '../../../preload/index.d'

export interface VaultAudioReference {
  id: string
  sourcePath: string
  sourceName: string
  audioPath: string
  title: string
  duration: number | null
  occurrence: number
}

export interface VaultAudioNavigationTarget {
  sourcePath: string
  audioPath: string
  occurrence: number
  requestId: number
}

const AUDIO_TAG = /<audio\b[^>]*data-notes-md-audio[^>]*>(?:\s*<\/audio>)?/gi

function readAttribute(tag: string, name: string): string | null {
  const match = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag)
  const raw = match?.[1] ?? match?.[2] ?? match?.[3]
  if (raw === undefined) return null
  return raw.replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
}

function forEachAudioTag(markdown: string, visit: (tag: string, offset: number) => void): void {
  let inFence: { marker: '`' | '~'; length: number } | null = null
  let offset = 0
  for (const line of markdown.match(/[^\n]*\n|[^\n]+$/g) ?? []) {
    const fence = /^\s*(`{3,}|~{3,})/.exec(line)
    if (fence) {
      const marker = fence[1][0] as '`' | '~'
      if (!inFence) inFence = { marker, length: fence[1].length }
      else if (marker === inFence.marker && fence[1].length >= inFence.length) inFence = null
    } else if (!inFence) {
      AUDIO_TAG.lastIndex = 0
      for (const match of line.matchAll(AUDIO_TAG)) visit(match[0], offset + match.index)
    }
    offset += line.length
  }
}

export function extractVaultAudioReferences(notes: VaultNoteData[]): VaultAudioReference[] {
  const references: VaultAudioReference[] = []
  for (const note of notes) {
    const occurrences = new Map<string, number>()
    forEachAudioTag(note.content, (tag) => {
      const audioPath = readAttribute(tag, 'src')
      if (!audioPath?.startsWith('.notes-md/audio/') || audioPath.split('/').includes('..')) return
      const occurrence = occurrences.get(audioPath) ?? 0
      occurrences.set(audioPath, occurrence + 1)
      const parsedDuration = Number(readAttribute(tag, 'data-duration'))
      references.push({
        id: `${note.relativePath}\u0000${audioPath}\u0000${occurrence}`,
        sourcePath: note.relativePath,
        sourceName: note.name,
        audioPath,
        title: readAttribute(tag, 'title') || 'Gravação de áudio',
        duration: Number.isFinite(parsedDuration) && parsedDuration > 0 ? parsedDuration : null,
        occurrence
      })
    })
  }
  return references
}

export function findVaultAudioReferenceOffset(markdown: string, audioPath: string, occurrence: number): number | null {
  let found = 0
  let offset: number | null = null
  forEachAudioTag(markdown, (tag, tagOffset) => {
    if (readAttribute(tag, 'src') !== audioPath) return
    if (found++ === occurrence) offset = tagOffset
  })
  return offset
}

export function removeVaultAudioReference(markdown: string, audioPath: string, occurrence: number): string {
  let found = 0
  const lines = markdown.match(/[^\n]*\n|[^\n]+$/g) ?? []
  let inFence: { marker: '`' | '~'; length: number } | null = null
  return lines.map((line) => {
    const fence = /^\s*(`{3,}|~{3,})/.exec(line)
    if (fence) {
      const marker = fence[1][0] as '`' | '~'
      if (!inFence) inFence = { marker, length: fence[1].length }
      else if (marker === inFence.marker && fence[1].length >= inFence.length) inFence = null
      return line
    }
    if (inFence) return line

    AUDIO_TAG.lastIndex = 0
    return line.replace(AUDIO_TAG, (tag) => {
      if (readAttribute(tag, 'src') !== audioPath) return tag
      if (found++ !== occurrence) return tag
      return ''
    })
  }).join('')
}

export function formatAudioDuration(seconds: number | null): string {
  if (seconds === null) return 'Duração desconhecida'
  const whole = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(whole / 3600)
  const minutes = Math.floor((whole % 3600) / 60).toString().padStart(hours > 0 ? 2 : 1, '0')
  const remainder = (whole % 60).toString().padStart(2, '0')
  return hours > 0 ? `${hours}:${minutes}:${remainder}` : `${minutes}:${remainder}`
}
