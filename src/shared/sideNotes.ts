/** Metadata stored with an independent Markdown side note. */
export interface SideNoteAnchor {
  quote: string
  prefix: string
  suffix: string
}

export interface SideNote {
  id: string
  sourcePath: string
  anchor: SideNoteAnchor
  detached?: boolean
  body: string
  createdAt: number
  updatedAt: number
  /** Content hash for optimistic concurrency; not written into the Markdown metadata. */
  revision?: string
}

export type SideNoteAnchorResolution =
  | { status: 'attached'; from: number; to: number }
  | { status: 'missing' | 'ambiguous' }

const CONTEXT_LENGTH = 48

export function createSideNoteAnchor(text: string, from: number, to: number): SideNoteAnchor | null {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to > text.length || from >= to) return null
  const quote = text.slice(from, to)
  if (!quote.trim()) return null
  return { quote, prefix: text.slice(Math.max(0, from - CONTEXT_LENGTH), from), suffix: text.slice(to, to + CONTEXT_LENGTH) }
}

/** Never silently attach a repeated quote without enough matching context. */
export function resolveSideNoteAnchor(text: string, anchor: SideNoteAnchor): SideNoteAnchorResolution {
  if (!anchor.quote) return { status: 'missing' }
  const candidates: Array<{ from: number; score: number }> = []
  let from = 0
  while ((from = text.indexOf(anchor.quote, from)) !== -1) {
    const before = text.slice(Math.max(0, from - anchor.prefix.length), from)
    const after = text.slice(from + anchor.quote.length, from + anchor.quote.length + anchor.suffix.length)
    let score = 0
    for (let i = 1; i <= Math.min(before.length, anchor.prefix.length) && before[before.length - i] === anchor.prefix[anchor.prefix.length - i]; i++) score++
    for (let i = 0; i < Math.min(after.length, anchor.suffix.length) && after[i] === anchor.suffix[i]; i++) score++
    candidates.push({ from, score })
    from++
  }
  if (!candidates.length) return { status: 'missing' }
  const minimumContext = Math.min(8, anchor.prefix.length + anchor.suffix.length)
  if (candidates.length === 1) {
    if (candidates[0].score < minimumContext) return { status: 'ambiguous' }
    return { status: 'attached', from: candidates[0].from, to: candidates[0].from + anchor.quote.length }
  }
  candidates.sort((a, b) => b.score - a.score)
  if (candidates[0].score < Math.max(1, minimumContext) || candidates[0].score === candidates[1].score) return { status: 'ambiguous' }
  return { status: 'attached', from: candidates[0].from, to: candidates[0].from + anchor.quote.length }
}
