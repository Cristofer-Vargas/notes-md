import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  FolderOpen,
  Image as ImageIcon,
  Loader2,
  Maximize2,
  X,
  Sparkles,
  SunMedium
} from 'lucide-react'
import { IconButton } from '../components/ui/IconButton'
import { Badge } from '../components/ui/Badge'
import { loadSettings, applyThemeToDocument } from '../services/settingsManager'
import type { AppSettings } from '../types/app'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export const ImageViewerWindow: React.FC = () => {
  // Parse parameters from URL hash: #/image-viewer?vaultPath=...&relativePath=...&fileName=...
  const [params, setParams] = useState(() => {
    const hash = window.location.hash
    const queryIndex = hash.indexOf('?')
    const query = queryIndex !== -1 ? hash.slice(queryIndex + 1) : ''
    const sp = new URLSearchParams(query)
    return {
      vaultPath: sp.get('vaultPath') || '',
      relativePath: sp.get('relativePath') || '',
      fileName: sp.get('fileName') || 'Imagem'
    }
  })

  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [fileSize, setFileSize] = useState<number | null>(null)
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null)
  const [zoom, setZoom] = useState<number>(1)
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [bgMode, setBgMode] = useState<'canvas' | 'dark' | 'light' | 'checkered'>('canvas')

  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const panCurrentRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  // Initialize theme from settings
  useEffect(() => {
    const settings = loadSettings()
    applyThemeToDocument(settings)

    if (window.electronAPI?.onSettingsChanged) {
      const unsub = window.electronAPI.onSettingsChanged((updated: unknown) => {
        if (updated && typeof updated === 'object') {
          applyThemeToDocument(updated as AppSettings)
        }
      })
      return () => unsub()
    }
    return undefined
  }, [])

  // Sync document title
  useEffect(() => {
    document.title = `${params.fileName} — Notes MD Visualizador`
  }, [params.fileName])

  // Hash change listener (if route updates)
  useEffect(() => {
    const handleHashChange = (): void => {
      const hash = window.location.hash
      const queryIndex = hash.indexOf('?')
      const query = queryIndex !== -1 ? hash.slice(queryIndex + 1) : ''
      const sp = new URLSearchParams(query)
      setParams({
        vaultPath: sp.get('vaultPath') || '',
        relativePath: sp.get('relativePath') || '',
        fileName: sp.get('fileName') || 'Imagem'
      })
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  // Load image base64
  useEffect(() => {
    if (!params.vaultPath || !params.relativePath) {
      setIsLoading(false)
      setLoadError('Parâmetros de arquivo inválidos.')
      return
    }

    let isMounted = true
    setIsLoading(true)
    setLoadError(null)
    setZoom(1)
    setPan({ x: 0, y: 0 })

    window.electronAPI
      ?.readImageBase64(params.vaultPath, params.relativePath)
      .then((res) => {
        if (!isMounted) return
        if (res && res.dataUrl) {
          setDataUrl(res.dataUrl)
          setFileSize(res.size)
        } else {
          setLoadError('Não foi possível carregar a imagem do disco.')
        }
      })
      .catch((err) => {
        if (!isMounted) return
        setLoadError(err?.message || 'Erro ao ler arquivo de imagem.')
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [params.vaultPath, params.relativePath])

  const handleClose = useCallback(() => {
    if (window.electronAPI?.closeCurrentWindow) {
      window.electronAPI.closeCurrentWindow()
    } else {
      window.close()
    }
  }, [])

  const handleResetZoom = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [])

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(5, Math.round((z + 0.25) * 100) / 100))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom((z) => {
      const next = Math.max(0.25, Math.round((z - 0.25) * 100) / 100)
      if (next <= 1) setPan({ x: 0, y: 0 })
      return next
    })
  }, [])

  const handleOpenInExplorer = useCallback(() => {
    if (params.vaultPath && params.relativePath) {
      const full = `${params.vaultPath.replace(/[\\/]+$/, '')}/${params.relativePath.replace(/^[\\/]+/, '')}`
      window.electronAPI?.openInExplorer(full).catch(() => {})
    }
  }, [params.vaultPath, params.relativePath])

  const handleToggleBg = useCallback(() => {
    setBgMode((prev) => {
      if (prev === 'canvas') return 'dark'
      if (prev === 'dark') return 'light'
      if (prev === 'light') return 'checkered'
      return 'canvas'
    })
  }, [])

  // Wheel zoom handling
  const handleWheel = (e: React.WheelEvent): void => {
    e.preventDefault()
    if (e.deltaY < 0) {
      setZoom((z) => Math.min(5, Math.round((z + 0.15) * 100) / 100))
    } else {
      setZoom((z) => {
        const next = Math.max(0.25, Math.round((z - 0.15) * 100) / 100)
        if (next <= 1) setPan({ x: 0, y: 0 })
        return next
      })
    }
  }

  // Pan dragging when zoomed
  const handleMouseDown = (e: React.MouseEvent): void => {
    if (e.button !== 0) return // Left click only
    if (zoom <= 1) return // No panning needed if fitted

    setIsPanning(true)
    panStartRef.current = { x: e.clientX, y: e.clientY }
    panCurrentRef.current = { ...pan }
  }

  const handleMouseMove = (e: React.MouseEvent): void => {
    if (!isPanning) return
    const deltaX = e.clientX - panStartRef.current.x
    const deltaY = e.clientY - panStartRef.current.y
    setPan({
      x: panCurrentRef.current.x + deltaX,
      y: panCurrentRef.current.y + deltaY
    })
  }

  const handleMouseUp = (): void => {
    setIsPanning(false)
  }

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        handleClose()
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn()
      } else if (e.key === '-') {
        handleZoomOut()
      } else if (e.key === '0' || e.key === 'f' || e.key === 'F') {
        handleResetZoom()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleClose, handleZoomIn, handleZoomOut, handleResetZoom])

  return (
    <div className="w-screen h-screen flex flex-col bg-surface-bg text-content-primary select-none overflow-hidden font-sans">
      {/* Native-style Modern Header Bar */}
      <header className="h-12 px-4 bg-surface-secondary border-b border-surface-border flex items-center justify-between shrink-0 z-20 shadow-xs">
        {/* File Info Left */}
        <div className="flex items-center gap-3 min-w-0 flex-1 mr-4">
          <div className="w-7 h-7 rounded-lg bg-accent-soft text-accent flex items-center justify-center shrink-0">
            <ImageIcon className="w-4 h-4" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xs font-bold text-content-primary truncate tracking-tight">
                {params.fileName}
              </h1>
              {dimensions && (
                <Badge variant="secondary" size="sm">
                  {dimensions.width} × {dimensions.height}
                </Badge>
              )}
              {fileSize !== null && (
                <Badge variant="default" size="sm">
                  {formatSize(fileSize)}
                </Badge>
              )}
            </div>
            <p className="text-[10px] text-content-muted truncate" title={params.relativePath}>
              {params.relativePath}
            </p>
          </div>
        </div>

        {/* Toolbar Controls Right */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Zoom controls pill */}
          <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg bg-surface-bg border border-surface-border text-xs text-content-secondary mr-2">
            <IconButton
              variant="ghost"
              size="xs"
              onClick={handleZoomOut}
              tooltip="Reduzir Zoom (-)"
              icon={<ZoomOut className="w-3.5 h-3.5" />}
            />
            <button
              type="button"
              onClick={handleResetZoom}
              title="Ajustar à Janela (0)"
              className="px-1.5 py-0.5 rounded hover:bg-surface-secondary text-[11px] font-mono min-w-[46px] text-center transition-colors text-content-primary font-semibold cursor-pointer"
            >
              {Math.round(zoom * 100)}%
            </button>
            <IconButton
              variant="ghost"
              size="xs"
              onClick={handleZoomIn}
              tooltip="Aumentar Zoom (+)"
              icon={<ZoomIn className="w-3.5 h-3.5" />}
            />
            <IconButton
              variant="ghost"
              size="xs"
              onClick={handleResetZoom}
              tooltip="Ajustar 100% à janela (0)"
              icon={<RotateCcw className="w-3 h-3" />}
            />
          </div>

          <IconButton
            variant="ghost"
            size="sm"
            onClick={handleToggleBg}
            tooltip={`Plano de Fundo: ${
              bgMode === 'canvas'
                ? 'Tema do App'
                : bgMode === 'dark'
                  ? 'Fundo Escuro'
                  : bgMode === 'light'
                    ? 'Fundo Claro'
                    : 'Quadriculado'
            } (Clique para alternar)`}
            icon={<SunMedium className="w-4 h-4" />}
          />

          <IconButton
            variant="secondary"
            size="sm"
            onClick={handleOpenInExplorer}
            tooltip="Abrir no Windows Explorer"
            icon={<FolderOpen className="w-4 h-4" />}
          />

          <IconButton
            variant="danger"
            size="sm"
            onClick={handleClose}
            tooltip="Fechar Janela (Esc)"
            icon={<X className="w-4 h-4" />}
          />
        </div>
      </header>

      {/* Main Viewport: Follows 100% of Window Width and Height */}
      <main
        className={`flex-1 w-full h-full relative overflow-hidden transition-colors duration-150 flex items-center justify-center p-3 select-none ${
          bgMode === 'dark'
            ? 'bg-[#181825]'
            : bgMode === 'light'
              ? 'bg-[#ffffff]'
              : bgMode === 'checkered'
                ? 'bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:16px_16px] bg-slate-100'
                : 'bg-surface-canvas'
        } ${zoom > 1 ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleResetZoom}
      >
        {isLoading ? (
          <div className="flex flex-col items-center gap-2.5 text-content-muted">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
            <span className="text-xs font-medium">Carregando imagem em alta resolução...</span>
          </div>
        ) : loadError ? (
          <div className="p-6 text-center max-w-sm rounded-xl bg-surface-secondary border border-rose-500/20 text-rose-500 text-xs">
            <p className="font-bold mb-1">Falha na Visualização</p>
            <p>{loadError}</p>
          </div>
        ) : dataUrl ? (
          <div
            className="w-full h-full flex items-center justify-center relative transition-transform duration-75 ease-out"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center'
            }}
          >
            <img
              src={dataUrl}
              alt={params.fileName}
              onLoad={(e) => {
                const img = e.currentTarget
                setDimensions({ width: img.naturalWidth, height: img.naturalHeight })
              }}
              draggable={false}
              className="max-w-full max-h-full w-auto h-auto object-contain select-none shadow-none pointer-events-auto"
            />
          </div>
        ) : null}
      </main>

      {/* Modern Status Footer */}
      <footer className="h-6 px-3 bg-surface-secondary/80 border-t border-surface-border flex items-center justify-between text-[10px] text-content-muted shrink-0">
        <div className="flex items-center gap-2">
          <span>{zoom > 1 ? 'Modo Zoom & Pan (Arraste para mover)' : 'Ajustado 100% à janela'}</span>
          <span>•</span>
          <span>Fundo: {bgMode.toUpperCase()}</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Rolar mouse para zoom</span>
          <span>•</span>
          <span>Duplo clique ou <strong>0</strong> para ajustar</span>
          <span>•</span>
          <span><strong>Esc</strong> fecha a janela</span>
        </div>
      </footer>
    </div>
  )
}
