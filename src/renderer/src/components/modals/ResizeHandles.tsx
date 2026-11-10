import React from 'react'
import type { ResizeDirection } from './useFloatingModal'

interface ResizeHandlesProps {
  onStartResize: (direction: ResizeDirection, e: React.MouseEvent) => void
  disabled?: boolean
}

export const ResizeHandles: React.FC<ResizeHandlesProps> = ({ onStartResize, disabled = false }) => {
  if (disabled) return null

  return (
    <>
      {/* 4 Edges */}
      <div
        onMouseDown={(e) => onStartResize('n', e)}
        title="Redimensionar superior"
        className="absolute -top-1 left-3 right-3 h-2 cursor-n-resize hover:bg-accent/30 transition-colors z-30 select-none"
      />
      <div
        onMouseDown={(e) => onStartResize('s', e)}
        title="Redimensionar inferior"
        className="absolute -bottom-1 left-3 right-3 h-2 cursor-s-resize hover:bg-accent/30 transition-colors z-30 select-none"
      />
      <div
        onMouseDown={(e) => onStartResize('w', e)}
        title="Redimensionar esquerda"
        className="absolute -left-1 top-3 bottom-3 w-2 cursor-w-resize hover:bg-accent/30 transition-colors z-30 select-none"
      />
      <div
        onMouseDown={(e) => onStartResize('e', e)}
        title="Redimensionar direita"
        className="absolute -right-1 top-3 bottom-3 w-2 cursor-e-resize hover:bg-accent/30 transition-colors z-30 select-none"
      />

      {/* 4 Corners */}
      <div
        onMouseDown={(e) => onStartResize('nw', e)}
        title="Redimensionar canto superior esquerdo"
        className="absolute -top-1.5 -left-1.5 w-4 h-4 cursor-nw-resize hover:bg-accent/40 rounded-tl-lg transition-colors z-30 select-none"
      />
      <div
        onMouseDown={(e) => onStartResize('ne', e)}
        title="Redimensionar canto superior direito"
        className="absolute -top-1.5 -right-1.5 w-4 h-4 cursor-ne-resize hover:bg-accent/40 rounded-tr-lg transition-colors z-30 select-none"
      />
      <div
        onMouseDown={(e) => onStartResize('sw', e)}
        title="Redimensionar canto inferior esquerdo"
        className="absolute -bottom-1.5 -left-1.5 w-4 h-4 cursor-sw-resize hover:bg-accent/40 rounded-bl-lg transition-colors z-30 select-none"
      />
      <div
        onMouseDown={(e) => onStartResize('se', e)}
        title="Redimensionar canto inferior direito"
        className="absolute -bottom-1 -right-1 w-5 h-5 cursor-se-resize flex items-end justify-end p-1 group/grip z-30 select-none"
      >
        {/* Subtle diagonal grip indicator */}
        <svg
          className="w-2.5 h-2.5 text-content-muted/60 group-hover/grip:text-accent transition-colors"
          viewBox="0 0 10 10"
          fill="currentColor"
        >
          <circle cx="8" cy="8" r="1" />
          <circle cx="4.5" cy="8" r="1" />
          <circle cx="8" cy="4.5" r="1" />
          <circle cx="1" cy="8" r="1" />
          <circle cx="4.5" cy="4.5" r="1" />
          <circle cx="8" cy="1" r="1" />
        </svg>
      </div>
    </>
  )
}
