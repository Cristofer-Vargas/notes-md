export interface SideNoteLayoutInput {
  id: string
  top: number
  height: number
  textHeight: number
  createdAt: number
}

export const SIDE_NOTE_LANE_WIDTH = 224

/** Collapse before the observation column would make the main page narrower. */
export function shouldCompactSideNotes(availableWidth: number, pageMaxWidth: number, laneWidth = SIDE_NOTE_LANE_WIDTH): boolean {
  const naturalPageWidth = Math.min(availableWidth, pageMaxWidth)
  return availableWidth < naturalPageWidth + laneWidth
}

/** Keep the markers on their ranges while separating observation text that overlaps. */
export function layoutSideNotes(items: SideNoteLayoutInput[]): Record<string, { top: number; height: number; textTop: number }> {
  let bottom = 0
  const result: Record<string, { top: number; height: number; textTop: number }> = {}
  for (const item of [...items].sort((a, b) => a.top - b.top || a.createdAt - b.createdAt)) {
    const textTop = Math.max(item.top, bottom)
    result[item.id] = { top: item.top, height: item.height, textTop }
    bottom = textTop + item.textHeight + 10
  }
  return result
}
