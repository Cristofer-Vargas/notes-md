export interface PreviewTextRect {
  top: number
  bottom: number
}

/** Avoid clipping through any text fragment at the bottom of a preview. */
export function getPreviewClipHeight(maxHeight: number, rects: PreviewTextRect[]): number {
  let boundary = maxHeight
  let changed = true
  while (changed) {
    changed = false
    for (const rect of rects) {
      if (rect.top < boundary && rect.bottom > boundary) {
        const next = Math.max(0, rect.top)
        if (next < boundary) { boundary = next; changed = true }
      }
    }
  }
  return Math.floor(boundary)
}
