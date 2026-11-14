/** Stable, bounded shapes generated from the constellation number. */
export function constellationPattern(number: number): Array<[number, number]> {
  let seed = Math.imul(number, 0x9e3779b1) >>> 0
  return Array.from({ length: 5 }, (_, index): [number, number] => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    const x = 24 + index * 43 + (seed % 9) - 4
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return [x, 17 + seed % 54]
  })
}
