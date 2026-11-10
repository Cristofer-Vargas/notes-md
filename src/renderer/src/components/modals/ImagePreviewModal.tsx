import React, { useEffect, useState } from 'react'
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  FolderOpen,
  Image as ImageIcon,
  Loader2,
  Maximize2,
  Minimize2
} from 'lucide-react'
import { IconButton } from '../ui/IconButton'
import { useFloatingModal } from './useFloatingModal'
import { ResizeHandles } from './ResizeHandles'
import { cn } from '../../utils/cn'

interface ImagePreviewModalProps {
  isOpen: boolean
  fileName: string
  relativePath: string
  vaultPath: string
  onClose: () => void
  onOpenInExplorer?: (subRelPath?: string) => void
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  isOpen,
  fileName,
  relativePath,
  vaultPath,
  onClose,
  onOpenInExplorer
}) => {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [fileSize, setFileSize] = useState<number | null>(null)
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null)
  const [zoom, setZoom] = useState<number>(1)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const {
    modalStyle,
    isMaximized,
    isResizing,
    headerDragProps,
    handleStartResize,
    toggleMaximize
  } = useFloatingModal({
    isOpen,
    initialWidth: 840,
    initialHeight: 600,
    minWidth: 440,
    minHeight: 340,
    storageKey: 'notes-md:image-preview-geometry'
  })

  useEffect(() => {
    if (!isOpen || !relativePath) {
      setDataUrl(null)
      setDimensions(null)
      setZoom(1)
      setIsLoading(false)
      setLoadError(null)
      return
    }

    let isMounted = true
    setIsLoading(true)
    setLoadError(null)
    setZoom(1)

    window.electronAPI
      .readImageBase64(vaultPath, relativePath)
      .then((res) => {
        if (!isMounted) return
        if (res && res.dataUrl) {
          setDataUrl(res.dataUrl)
          setFileSize(res.size)
        } else {
          setLoadError('Não foi possível carregar a imagem.')
        }
      })
      .catch((err) => {
        if (!isMounted) return
        setLoadError(err?.message || 'Erro ao carregar arquivo de imagem.')
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [isOpen, relativePath, vaultPath])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === '+' || e.key === '=') {
        setZoom((prev) => Math.min(4, prev + 0.25))
      } else if (e.key === '-') {
        setZoom((prev) => Math.max(0.25, prev - 0.25))
      } else if (e.key === '0') {
        setZoom(1)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div
        style={modalStyle}
        className="rounded-2xl bg-surface-bg border border-surface-border shadow-2xl flex flex-col overflow-hidden select-none animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <ResizeHandles onStartResize={handleStartResize} disabled={isMaximized} />

        {/* Header Bar (Draggable) */}
        <div
          {...headerDragProps}
          className={cn(
            'flex items-center justify-between px-4 py-3 border-b border-surface-border bg-surface-secondary/70 transition-colors',
            headerDragProps.className
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1 pointer-events-none pr-3">
            <div className="w-7 h-7 rounded-lg bg-accent-soft text-accent flex items-center justify-center shrink-0">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-content-primary truncate">{fileName}</h3>
              <div className="flex items-center gap-2 text-[11px] text-content-muted truncate">
                <span className="truncate">{relativePath}</span>
                {fileSize !== null && (
                  <>
                    <span>•</span>
                    <span>{formatSize(fileSize)}</span>
                  </>
                )}
                {dimensions && (
                  <>
                    <span>•</span>
                    <span>
                      {dimensions.width} × {dimensions.height} px
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick Toolbar */}
          <div className="flex items-center gap-1 shrink-0" data-no-drag>
            {/* Zoom Controls */}
            <div className="flex items-center gap-0.5 px-1 py-0.5 rounded-lg bg-surface-tertiary border border-surface-border/60 text-xs text-content-secondary mr-1">
              <IconButton
                variant="ghost"
                size="xs"
                onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
                tooltip="Reduzir zoom (-)"
                icon={<ZoomOut className="w-3.5 h-3.5" />}
              />
              <span className="px-1 text-[11px] font-mono min-w-[38px] text-center select-none font-semibold text-content-primary">
                {Math.round(zoom * 100)}%
              </span>
              <IconButton
                variant="ghost"
                size="xs"
                onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
                tooltip="Aumentar zoom (+)"
                icon={<ZoomIn className="w-3.5 h-3.5" />}
              />
              <IconButton
                variant="ghost"
                size="xs"
                onClick={() => setZoom(1)}
                tooltip="Redefinir zoom (100%)"
                icon={<RotateCcw className="w-3.5 h-3.5" />}
              />
            </div>

            {onOpenInExplorer && (
              <IconButton
                variant="ghost"
                size="sm"
                onClick={() => onOpenInExplorer(relativePath)}
                tooltip="Mostrar arquivo no Windows Explorer"
                icon={<FolderOpen className="w-4 h-4" />}
              />
            )}

            <IconButton
              variant="ghost"
              size="sm"
              onClick={toggleMaximize}
              tooltip={isMaximized ? 'Restaurar janela' : 'Maximizar janela'}
              icon={isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            />

            <IconButton
              variant="danger"
              size="sm"
              onClick={onClose}
              tooltip="Fechar (Esc)"
              icon={<X className="w-4 h-4" />}
            />
          </div>
        </div>

        {/* Image Canvas / Viewport */}
        <div className="flex-1 min-h-0 w-full overflow-hidden flex items-center justify-center p-3 bg-surface-canvas/80 relative">
          {isLoading ? (
            <div className="flex flex-col items-center gap-2 text-content-muted">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
              <span className="text-xs font-medium">Carregando imagem...</span>
            </div>
          ) : loadError ? (
            <div className="p-6 text-center text-rose-500 text-xs max-w-sm">
              <p className="font-semibold">{loadError}</p>
            </div>
          ) : dataUrl ? (
            <div className="w-full h-full flex items-center justify-center overflow-auto">
              <img
                src={dataUrl}
                alt={fileName}
                style={{
                  transform: zoom !== 1 ? `scale(${zoom})` : undefined,
                  transformOrigin: 'center center',
                  transition: isResizing ? 'none' : 'transform 100ms ease-out'
                }}
                onLoad={(e) => {
                  const img = e.currentTarget
                  setDimensions({ width: img.naturalWidth, height: img.naturalHeight })
                }}
                className="w-full h-full object-contain select-none shadow-none transition-transform"
              />
            </div>
          ) : null}
        </div>

        {/* Footer info bar */}
        <div className="px-4 py-2 border-t border-surface-border bg-surface-secondary/50 flex items-center justify-between text-[11px] text-content-muted">
          <span>Janela flutuante redimensionável</span>
          <span>Dica: Use <strong>+</strong> / <strong>-</strong> para zoom ou arraste as bordas para redimensionar</span>
        </div>
      </div>
    </div>
  )
}
