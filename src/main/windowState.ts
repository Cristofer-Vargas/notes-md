import fs from 'fs'
import path from 'path'
import { screen, type BrowserWindow, type Rectangle } from 'electron'

export interface WindowState {
  width: number
  height: number
  x?: number
  y?: number
  isMaximized: boolean
}

const DEFAULT_WINDOW_STATE: WindowState = {
  width: 1400,
  height: 900,
  isMaximized: false
}

export function loadWindowState(stateFilePath: string): WindowState {
  try {
    if (!fs.existsSync(stateFilePath)) {
      return { ...DEFAULT_WINDOW_STATE }
    }
    const raw = fs.readFileSync(stateFilePath, 'utf-8')
    const parsed = JSON.parse(raw) as Partial<WindowState>

    const width =
      typeof parsed.width === 'number' && parsed.width >= 600
        ? parsed.width
        : DEFAULT_WINDOW_STATE.width
    const height =
      typeof parsed.height === 'number' && parsed.height >= 450
        ? parsed.height
        : DEFAULT_WINDOW_STATE.height
    const isMaximized = Boolean(parsed.isMaximized)

    const state: WindowState = { width, height, isMaximized }

    if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
      if (isPositionVisibleOnAnyDisplay({ x: parsed.x, y: parsed.y, width, height })) {
        state.x = parsed.x
        state.y = parsed.y
      }
    }

    return state
  } catch {
    return { ...DEFAULT_WINDOW_STATE }
  }
}

export function saveWindowState(stateFilePath: string, state: WindowState): void {
  try {
    fs.mkdirSync(path.dirname(stateFilePath), { recursive: true })
    fs.writeFileSync(stateFilePath, JSON.stringify(state, null, 2), 'utf-8')
  } catch {
    // Ignore write errors on exit
  }
}

function isPositionVisibleOnAnyDisplay(bounds: Rectangle): boolean {
  try {
    const displays = screen.getAllDisplays()
    if (!displays || displays.length === 0) return true

    return displays.some((display) => {
      const area = display.workArea
      return (
        bounds.x + bounds.width > area.x + 50 &&
        bounds.x < area.x + area.width - 50 &&
        bounds.y + bounds.height > area.y + 50 &&
        bounds.y < area.y + area.height - 50
      )
    })
  } catch {
    return true
  }
}

export function trackWindowState(window: BrowserWindow, stateFilePath: string): void {
  let saveTimer: NodeJS.Timeout | null = null

  const captureCurrentState = (): void => {
    if (window.isDestroyed()) return
    try {
      const isMaximized = window.isMaximized()
      const normalBounds = window.getNormalBounds()
      saveWindowState(stateFilePath, {
        width: normalBounds.width,
        height: normalBounds.height,
        x: normalBounds.x,
        y: normalBounds.y,
        isMaximized
      })
    } catch {
      // ignore
    }
  }

  const scheduleSave = (): void => {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(captureCurrentState, 250)
  }

  window.on('resize', scheduleSave)
  window.on('move', scheduleSave)
  window.on('maximize', captureCurrentState)
  window.on('unmaximize', captureCurrentState)
  window.on('close', () => {
    if (saveTimer) clearTimeout(saveTimer)
    captureCurrentState()
  })
}
