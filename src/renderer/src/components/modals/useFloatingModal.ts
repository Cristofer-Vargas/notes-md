import { useState, useEffect, useRef, useCallback, CSSProperties } from 'react'

export type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

export interface FloatingModalGeometry {
  x: number
  y: number
  width: number
  height: number
  isMaximized: boolean
}

export interface UseFloatingModalOptions {
  isOpen: boolean
  initialWidth: number
  initialHeight: number
  minWidth?: number
  minHeight?: number
  storageKey?: string
}

export interface UseFloatingModalReturn {
  geometry: FloatingModalGeometry
  isDragging: boolean
  isResizing: boolean
  isMaximized: boolean
  modalStyle: CSSProperties
  headerDragProps: {
    onMouseDown: (e: React.MouseEvent) => void
    onDoubleClick: () => void
    className: string
  }
  handleStartResize: (direction: ResizeDirection, e: React.MouseEvent) => void
  toggleMaximize: () => void
  resetToCenter: () => void
}

export function useFloatingModal({
  isOpen,
  initialWidth,
  initialHeight,
  minWidth = 420,
  minHeight = 320,
  storageKey
}: UseFloatingModalOptions): UseFloatingModalReturn {
  const [geometry, setGeometry] = useState<FloatingModalGeometry>(() => {
    if (storageKey) {
      try {
        const raw = localStorage.getItem(storageKey)
        if (raw) {
          const parsed = JSON.parse(raw)
          return {
            x: typeof parsed.x === 'number' ? parsed.x : 40,
            y: typeof parsed.y === 'number' ? parsed.y : 40,
            width: typeof parsed.width === 'number' ? parsed.width : initialWidth,
            height: typeof parsed.height === 'number' ? parsed.height : initialHeight,
            isMaximized: Boolean(parsed.isMaximized)
          }
        }
      } catch {
        // ignore
      }
    }

    const w = Math.min(initialWidth, typeof window !== 'undefined' ? window.innerWidth - 32 : initialWidth)
    const h = Math.min(initialHeight, typeof window !== 'undefined' ? window.innerHeight - 32 : initialHeight)
    const x = typeof window !== 'undefined' ? Math.max(16, Math.round((window.innerWidth - w) / 2)) : 40
    const y = typeof window !== 'undefined' ? Math.max(16, Math.round((window.innerHeight - h) / 2)) : 40

    return {
      x,
      y,
      width: w,
      height: h,
      isMaximized: false
    }
  })

  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const prevGeometryRef = useRef<Omit<FloatingModalGeometry, 'isMaximized'> | null>(null)

  // Re-center if coordinates are off-screen upon opening
  useEffect(() => {
    if (!isOpen) return

    setGeometry((prev) => {
      const screenW = window.innerWidth
      const screenH = window.innerHeight

      const validW = Math.max(minWidth, Math.min(screenW - 32, prev.width))
      const validH = Math.max(minHeight, Math.min(screenH - 32, prev.height))

      // If window was placed completely off-screen, center it
      let validX = prev.x
      let validY = prev.y

      if (validX + validW < 60 || validX > screenW - 60 || validY > screenH - 60 || validY < 0) {
        validX = Math.max(16, Math.round((screenW - validW) / 2))
        validY = Math.max(16, Math.round((screenH - validH) / 2))
      }

      return {
        ...prev,
        x: validX,
        y: validY,
        width: validW,
        height: validH
      }
    })
  }, [isOpen, minWidth, minHeight])

  // Persist geometry to localStorage when drag or resize completes
  useEffect(() => {
    if (!storageKey || !isOpen || isDragging || isResizing) return
    try {
      localStorage.setItem(storageKey, JSON.stringify(geometry))
    } catch {
      // ignore
    }
  }, [storageKey, isOpen, isDragging, isResizing, geometry])

  // Dragging logic (Window Moving)
  const handleHeaderMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0 || geometry.isMaximized) return

      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.closest('button') ||
          target.closest('input') ||
          target.closest('select') ||
          target.closest('textarea') ||
          target.closest('[data-no-drag]'))
      ) {
        return
      }

      e.preventDefault()
      setIsDragging(true)

      const startMouseX = e.clientX
      const startMouseY = e.clientY
      const startX = geometry.x
      const startY = geometry.y

      const handleMouseMove = (moveEvent: MouseEvent): void => {
        const dx = moveEvent.clientX - startMouseX
        const dy = moveEvent.clientY - startMouseY

        const newX = Math.max(8, Math.min(window.innerWidth - geometry.width - 8, startX + dx))
        const newY = Math.max(8, Math.min(window.innerHeight - 50, startY + dy))

        setGeometry((prev) => ({ ...prev, x: newX, y: newY }))
      }

      const handleMouseUp = (): void => {
        setIsDragging(false)
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }

      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    },
    [geometry.isMaximized, geometry.x, geometry.y, geometry.width]
  )

  // Resizing logic
  const handleStartResize = useCallback(
    (direction: ResizeDirection, e: React.MouseEvent) => {
      if (e.button !== 0 || geometry.isMaximized) return
      e.preventDefault()
      e.stopPropagation()
      setIsResizing(true)

      const startMouseX = e.clientX
      const startMouseY = e.clientY
      const startX = geometry.x
      const startY = geometry.y
      const startW = geometry.width
      const startH = geometry.height

      const handleMouseMove = (moveEvent: MouseEvent): void => {
        const dx = moveEvent.clientX - startMouseX
        const dy = moveEvent.clientY - startMouseY

        let newW = startW
        let newH = startH
        let newX = startX
        let newY = startY

        // Horizontal resize
        if (direction.includes('e')) {
          newW = Math.max(minWidth, Math.min(window.innerWidth - startX - 8, startW + dx))
        } else if (direction.includes('w')) {
          const potentialW = startW - dx
          const clampedW = Math.max(minWidth, Math.min(startX + startW - 8, potentialW))
          newW = clampedW
          newX = startX + (startW - clampedW)
        }

        // Vertical resize
        if (direction.includes('s')) {
          newH = Math.max(minHeight, Math.min(window.innerHeight - startY - 8, startH + dy))
        } else if (direction.includes('n')) {
          const potentialH = startH - dy
          const clampedH = Math.max(minHeight, Math.min(startY + startH - 8, potentialH))
          newH = clampedH
          newY = startY + (startH - clampedH)
        }

        setGeometry({
          x: newX,
          y: newY,
          width: newW,
          height: newH,
          isMaximized: false
        })
      }

      const handleMouseUp = (): void => {
        setIsResizing(false)
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }

      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    },
    [geometry.isMaximized, geometry.x, geometry.y, geometry.width, geometry.height, minWidth, minHeight]
  )

  // Maximize / Restore logic
  const toggleMaximize = useCallback(() => {
    setGeometry((prev) => {
      if (prev.isMaximized) {
        const restored = prevGeometryRef.current || {
          x: Math.max(16, (window.innerWidth - initialWidth) / 2),
          y: Math.max(16, (window.innerHeight - initialHeight) / 2),
          width: initialWidth,
          height: initialHeight
        }
        return {
          ...restored,
          isMaximized: false
        }
      } else {
        prevGeometryRef.current = {
          x: prev.x,
          y: prev.y,
          width: prev.width,
          height: prev.height
        }
        return {
          x: 16,
          y: 16,
          width: Math.max(minWidth, window.innerWidth - 32),
          height: Math.max(minHeight, window.innerHeight - 32),
          isMaximized: true
        }
      }
    })
  }, [initialWidth, initialHeight, minWidth, minHeight])

  const resetToCenter = useCallback(() => {
    const w = Math.min(initialWidth, window.innerWidth - 32)
    const h = Math.min(initialHeight, window.innerHeight - 32)
    const x = Math.max(16, Math.round((window.innerWidth - w) / 2))
    const y = Math.max(16, Math.round((window.innerHeight - h) / 2))
    setGeometry({
      x,
      y,
      width: w,
      height: h,
      isMaximized: false
    })
  }, [initialWidth, initialHeight])

  const modalStyle: CSSProperties = geometry.isMaximized
    ? {
        position: 'fixed',
        left: '16px',
        top: '16px',
        width: 'calc(100vw - 32px)',
        height: 'calc(100vh - 32px)',
        maxWidth: 'none',
        maxHeight: 'none',
        transition: isResizing || isDragging ? 'none' : 'all 150ms cubic-bezier(0.16, 1, 0.3, 1)'
      }
    : {
        position: 'fixed',
        left: `${geometry.x}px`,
        top: `${geometry.y}px`,
        width: `${geometry.width}px`,
        height: `${geometry.height}px`,
        maxWidth: 'none',
        maxHeight: 'none',
        transition: isResizing || isDragging ? 'none' : undefined
      }

  return {
    geometry,
    isDragging,
    isResizing,
    isMaximized: geometry.isMaximized,
    modalStyle,
    headerDragProps: {
      onMouseDown: handleHeaderMouseDown,
      onDoubleClick: toggleMaximize,
      className: geometry.isMaximized
        ? 'select-none cursor-default'
        : isDragging
          ? 'select-none cursor-grabbing'
          : 'select-none cursor-grab'
    },
    handleStartResize,
    toggleMaximize,
    resetToCenter
  }
}
