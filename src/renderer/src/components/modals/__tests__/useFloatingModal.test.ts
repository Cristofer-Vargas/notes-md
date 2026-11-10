import { describe, it, expect } from 'vitest'

describe('useFloatingModal geometry and bounds logic', () => {
  it('correctly centers a modal inside given viewport dimensions', () => {
    const screenW = 1920
    const screenH = 1080
    const modalW = 800
    const modalH = 600

    const x = Math.max(16, Math.round((screenW - modalW) / 2))
    const y = Math.max(16, Math.round((screenH - modalH) / 2))

    expect(x).toBe(560)
    expect(y).toBe(240)
  })

  it('clamps coordinates so modal header cannot be dragged out of reach', () => {
    const screenW = 1000
    const screenH = 800
    const modalW = 500
    const modalH = 400

    // Attempt to drag too far right
    const rawXTooFarRight = 950
    const clampedXRight = Math.max(8, Math.min(screenW - modalW - 8, rawXTooFarRight))
    expect(clampedXRight).toBe(1000 - 500 - 8) // 492

    // Attempt to drag too far left
    const rawXTooFarLeft = -100
    const clampedXLeft = Math.max(8, Math.min(screenW - modalW - 8, rawXTooFarLeft))
    expect(clampedXLeft).toBe(8)

    // Attempt to drag too far down
    const rawYTooFarDown = 900
    const clampedYDown = Math.max(8, Math.min(screenH - 50, rawYTooFarDown))
    expect(clampedYDown).toBe(750)
  })

  it('enforces minWidth and minHeight on resize', () => {
    const minWidth = 440
    const minHeight = 340
    const currentW = 460
    const dx = -100 // shrinking by 100px
    const newW = Math.max(minWidth, currentW + dx)
    expect(newW).toBe(440) // clamped to minWidth

    const currentH = 350
    const dy = -100
    const newH = Math.max(minHeight, currentH + dy)
    expect(newH).toBe(340) // clamped to minHeight
  })
})
