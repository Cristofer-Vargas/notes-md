import React, { useEffect, useState } from 'react'
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ExternalLink,
  FolderOpen,
  Image as ImageIcon,
  Loader2,
  Maximize2
} from 'lucide-react'

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] bg-surface-bg border border-surface-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border bg-surface-secondary/70">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
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
          <div className="flex items-center gap-1 shrink-0">
            {/* Zoom Controls */}
            <div className="flex items-center gap-0.5 px-1 py-0.5 rounded-lg bg-surface-tertiary border border-surface-border/60 text-xs text-content-secondary mr-2">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
                title="Reduzir zoom (-)"
                className="p-1 rounded hover:bg-surface-bg hover:text-content-primary transition-colors"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-1 text-[11px] font-mono min-w-[38px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
                title="Aumentar zoom (+)"
                className="p-1 rounded hover:bg-surface-bg hover:text-content-primary transition-colors"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoom(1)}
                title="Redefinir zoom (100%)"
                className="p-1 rounded hover:bg-surface-bg hover:text-content-primary transition-colors ml-0.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {onOpenInExplorer && (
              <button
                type="button"
                onClick={() => onOpenInExplorer(relativePath)}
                title="Mostrar arquivo no Windows Explorer"
                className="p-1.5 rounded-lg text-content-secondary hover:bg-surface-tertiary hover:text-content-primary transition-colors"
              >
                <FolderOpen className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              title="Fechar (Esc)"
              className="p-1.5 rounded-lg text-content-secondary hover:bg-rose-500/10 hover:text-rose-500 transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Image Canvas / Viewport */}
        <div className="flex-1 min-h-[380px] max-h-[75vh] overflow-auto flex items-center justify-center p-6 bg-surface-canvas/70 relative">
          {isLoading ? (
            <div className="flex flex-col items-center gap-2 text-content-muted">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
              <span className="text-xs">Carregando imagem...</span>
            </div>
          ) : loadError ? (
            <div className="p-6 text-center text-rose-500 text-xs max-w-sm">
              <p className="font-semibold">{loadError}</p>
            </div>
          ) : dataUrl ? (
            <div className="flex items-center justify-center transition-transform duration-100 ease-out">
              <img
                src={dataUrl}
                alt={fileName}
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: 'center center',
                  maxHeight: '65vh',
                  maxWidth: '100%'
                }}
                onLoad={(e) => {
                  const img = e.currentTarget
                  setDimensions({ width: img.naturalWidth, height: img.naturalHeight })
                }}
                className="object-contain transition-transform select-none shadow-none"
              />
            </div>
          ) : null}
        </div>

        {/* Footer info note */}
        <div className="px-4 py-2 border-t border-surface-border bg-surface-secondary/50 flex items-center justify-between text-[11px] text-content-muted">
          <span>Modo de visualização rápida de mídia</span>
          <span>Dica: Use <strong>+</strong> e <strong>-</strong> para zoom ou <strong>Esc</strong> para fechar</span>
        </div>
      </div>
    </div>
  )
}
