import { describe, expect, it } from 'vitest'
import { constellationPattern } from '../constellationPattern'

describe('desenho das constelações', () => {
  it('gera cinco posições estáveis e diferentes entre constelações consecutivas', () => {
    const first = constellationPattern(1)
    expect(first).toEqual(constellationPattern(1))
    expect(first).toHaveLength(5)
    expect(first).not.toEqual(constellationPattern(2))
    for (const [x, y] of constellationPattern(10000)) {
      expect(x).toBeGreaterThanOrEqual(8)
      expect(x).toBeLessThanOrEqual(214)
      expect(y).toBeGreaterThanOrEqual(8)
      expect(y).toBeLessThanOrEqual(80)
    }
  })
})
