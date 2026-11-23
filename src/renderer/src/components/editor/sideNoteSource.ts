import { resolveSideNoteAnchor, type SideNoteAnchor } from '../../../../shared/sideNotes'

/** Locate visible text in Markdown while retaining offsets into the original source. */
export function findSideNoteInSource(source: string, anchor: SideNoteAnchor): { from: number; to: number } | null {
  const direct = source.indexOf(anchor.quote)
  if (direct >= 0 && source.indexOf(anchor.quote, direct + 1) < 0) return { from: direct, to: direct + anchor.quote.length }
  const positions: number[] = []
  let visible = ''
  for (let i = 0; i < source.length; i++) {
    if ('*_~`'.includes(source[i])) continue
    positions.push(i)
    visible += source[i]
  }
  const strip = (value: string) => value.replace(/[*_~`]/g, '')
  const result = resolveSideNoteAnchor(visible, { quote: strip(anchor.quote), prefix: strip(anchor.prefix), suffix: strip(anchor.suffix) })
  if (result.status !== 'attached') return null
  const from = positions[result.from]
  const last = positions[result.to - 1]
  return from === undefined || last === undefined ? null : { from, to: last + 1 }
}
