import React, { useRef, useState, useEffect } from 'react'
import {
  FileText,
  X,
  Plus,
  Columns2,
  Rows2,
  Minimize2,
  Maximize2,
  ArrowRightLeft,
  FilePlus2,
  Split,
  FolderOpen
} from 'lucide-react'
import type {
  AppSettings,
  EditorPaneState,
  IndexedNoteMeta,
  OpenTab,
  SplitLayoutMode
} from '../../types/app'
import type { VaultNoteData } from '../../../../preload/index.d'
import { MarkdownEditor } from './MarkdownEditor'

export interface DraggedTabInfo {
  paneId: 'pane-1' | 'pane-2'
  relativePath: string
}

export type DropZoneDirection = 'left' | 'right' | 'top' | 'bottom' | 'center'

interface EditorPaneViewProps {
  pane: EditorPaneState
  isActivePane: boolean
  splitLayout: SplitLayoutMode
  allNotes: VaultNoteData[]
  vaultIndex: Record<string, IndexedNoteMeta>
  settings: AppSettings
  isZenMode: boolean
  draggedTabInfo: DraggedTabInfo | null
  setDraggedTabInfo: (info: DraggedTabInfo | null) => void
  onFocusPane: () => void
  onSelectTab: (relativePath: string) => void
  onCloseTab: (relativePath: string, e?: React.MouseEvent) => void
  onReorderTabs: (fromIndex: number, toIndex: number) => void
  onNewNote: () => void
  onSplit: (direction: 'horizontal' | 'vertical') => void
  onClosePane: () => void
  onToggleLayout: () => void
  onDropNote: (notePath: string, dropZone: DropZoneDirection) => void
  onSaveContent: (relativePath: string, content: string) => void
  onRenameActiveNote: (newTitle: string) => void
  onNavigateWikiLink: (target: string, openInNewTab?: boolean) => void
  onToggleZenMode: () => void
  onOpenHelpModal: () => void
  onUpdateSettings: (partial: Partial<AppSettings>) => void
  onOpenQuickSwitcher: () => void
}

export const EditorPaneView: React.FC<EditorPaneViewProps> = ({
  pane,
  isActivePane,
  splitLayout,
  allNotes,
  vaultIndex,
  settings,
  isZenMode,
  draggedTabInfo,
  setDraggedTabInfo,
  onFocusPane,
  onSelectTab,
  onCloseTab,
  onReorderTabs,
  onNewNote,
  onSplit,
  onClosePane,
  onToggleLayout,
  onDropNote,
  onSaveContent,
  onRenameActiveNote,
  onNavigateWikiLink,
  onToggleZenMode,
  onOpenHelpModal,
  onUpdateSettings,
  onOpenQuickSwitcher
}) => {
  const editorContentRef = useRef<HTMLDivElement | null>(null)
  const [dropZone, setDropZone] = useState<DropZoneDirection | null>(null)
  const [dragOverTabPath, setDragOverTabPath] = useState<string | null>(null)

  const activeNote = allNotes.find((n) => n.relativePath === pane.activeNotePath) || null

  // Ensure drop zones and drag states are unconditionally cleaned up on any drag cancellation or completion
  useEffect(() => {
    const handleGlobalDragEnd = (): void => {
      setDropZone(null)
      setDragOverTabPath(null)
      setDraggedTabInfo(null)
    }

    const handleWindowDragLeave = (e: DragEvent): void => {
      if (
        !e.relatedTarget ||
        e.clientY <= 0 ||
        e.clientX <= 0 ||
        e.clientX >= window.innerWidth ||
        e.clientY >= window.innerHeight
      ) {
        setDropZone(null)
        setDragOverTabPath(null)
      }
    }

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        setDropZone(null)
        setDragOverTabPath(null)
        setDraggedTabInfo(null)
      }
    }

    window.addEventListener('dragend', handleGlobalDragEnd)
    window.addEventListener('drop', handleGlobalDragEnd)
    window.addEventListener('dragleave', handleWindowDragLeave)
    window.addEventListener('mouseup', handleGlobalDragEnd)
    window.addEventListener('blur', handleGlobalDragEnd)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('dragend', handleGlobalDragEnd)
      window.removeEventListener('drop', handleGlobalDragEnd)
      window.removeEventListener('dragleave', handleWindowDragLeave)
      window.removeEventListener('mouseup', handleGlobalDragEnd)
      window.removeEventListener('blur', handleGlobalDragEnd)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [setDraggedTabInfo])

  const extractNotePath = (e: React.DragEvent): string | null => {
    const customEntry = e.dataTransfer.getData('application/notes-md-entry')
    if (customEntry) {
      try {
        const parsed = JSON.parse(customEntry)
        if (parsed.relativePath && !parsed.isDirectory) {
          return parsed.relativePath
        }
      } catch {
        // ignore
      }
    }
    const tabData = e.dataTransfer.getData('application/notes-md-tab')
    if (tabData) return tabData
    const textData = e.dataTransfer.getData('text/plain')
    if (textData) return textData
    return draggedTabInfo?.relativePath || null
  }

  const calculateDropZone = (e: React.DragEvent): DropZoneDirection => {
    if (!editorContentRef.current) return 'center'
    const rect = editorContentRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const xPct = x / rect.width
    const yPct = y / rect.height

    if (xPct > 0.75) return 'right'
    if (xPct < 0.25) return 'left'
    if (yPct > 0.75) return 'bottom'
    if (yPct < 0.25) return 'top'
    return 'center'
  }

  const handleEditorDragOver = (e: React.DragEvent): void => {
    const hasNoteOrTab =
      e.dataTransfer.types.includes('application/notes-md-tab') ||
      e.dataTransfer.types.includes('application/notes-md-entry') ||
      e.dataTransfer.types.includes('text/plain')

    if (!hasNoteOrTab) return

    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    const zone = calculateDropZone(e)
    if (zone !== dropZone) {
      setDropZone(zone)
    }
  }

  const handleEditorDragLeave = (e: React.DragEvent): void => {
    if (
      !editorContentRef.current ||
      !editorContentRef.current.contains(e.relatedTarget as Node)
    ) {
      setDropZone(null)
    }
  }

  const handleEditorDrop = (e: React.DragEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    const zone = dropZone || calculateDropZone(e)
    setDropZone(null)
    setDragOverTabPath(null)

    const notePath = extractNotePath(e)
    if (notePath) {
      onDropNote(notePath, zone)
    }
  }

  const handleTabBarDrop = (e: React.DragEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    setDropZone(null)
    setDragOverTabPath(null)

    const notePath = extractNotePath(e)
    if (!notePath) return

    const fromIndex = pane.tabs.findIndex((t) => t.relativePath === notePath)
    if (fromIndex !== -1) {
      // Reordered within this pane: move to end
      onReorderTabs(fromIndex, pane.tabs.length - 1)
    } else {
      // Dropped into this pane's tab bar: add to this pane
      onDropNote(notePath, 'center')
    }
  }

  return (
    <div
      onClick={onFocusPane}
      className={`relative flex-1 flex flex-col min-w-0 min-h-0 bg-surface-bg overflow-hidden transition-all ${
        isActivePane && splitLayout !== 'single'
          ? 'ring-1 ring-accent/40 shadow-sm'
          : 'border-surface-border'
      }`}
    >
      {/* Pane Tab Bar / Header */}
      <div
        onDragEnter={() => setDropZone(null)}
        onDragOver={(e) => {
          e.preventDefault()
          setDropZone(null)
        }}
        className={`h-9 bg-surface-secondary border-b border-surface-border px-2 flex items-center justify-between gap-1.5 shrink-0 select-none ${
          isActivePane ? 'border-b-accent/30' : ''
        }`}
      >
        {/* Left Side: Tabs in this pane */}
        <div
          onDragOver={(e) => {
            e.preventDefault()
            e.stopPropagation()
            e.dataTransfer.dropEffect = 'move'
            setDropZone(null)
          }}
          onDrop={handleTabBarDrop}
          className="flex-1 flex items-center gap-1 overflow-x-auto no-scrollbar py-1 min-w-0"
        >
          {pane.tabs.map((tab, idx) => {
            const isTabActive = tab.relativePath === pane.activeNotePath
            const isDragging = draggedTabInfo?.relativePath === tab.relativePath
            const isDragOverThis = dragOverTabPath === tab.relativePath

            return (
              <div
                key={tab.relativePath}
                draggable={true}
                onDragStart={(e) => {
                  e.stopPropagation()
                  e.dataTransfer.setData('application/notes-md-tab', tab.relativePath)
                  e.dataTransfer.setData('text/plain', tab.relativePath)
                  e.dataTransfer.effectAllowed = 'move'
                  setDraggedTabInfo({ paneId: pane.id, relativePath: tab.relativePath })
                }}
                onDragEnd={() => {
                  setDraggedTabInfo(null)
                  setDragOverTabPath(null)
                  setDropZone(null)
                }}
                onDragEnter={() => setDropZone(null)}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setDropZone(null)
                  if (draggedTabInfo && draggedTabInfo.relativePath !== tab.relativePath) {
                    e.dataTransfer.dropEffect = 'move'
                    setDragOverTabPath(tab.relativePath)
                  }
                }}
                onDragLeave={() => {
                  if (dragOverTabPath === tab.relativePath) {
                    setDragOverTabPath(null)
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setDropZone(null)
                  setDragOverTabPath(null)
                  const sourcePath = extractNotePath(e)

                  if (!sourcePath || sourcePath === tab.relativePath) return

                  // Reorder within this pane or move to this pane
                  const fromIndex = pane.tabs.findIndex((t) => t.relativePath === sourcePath)
                  if (fromIndex !== -1) {
                    onReorderTabs(fromIndex, idx)
                  } else {
                    onDropNote(sourcePath, 'center')
                  }
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  onFocusPane()
                  onSelectTab(tab.relativePath)
                }}
                onMouseDown={(e) => {
                  if (e.button === 1) e.preventDefault()
                }}
                onAuxClick={(e) => {
                  if (e.button === 1) {
                    e.preventDefault()
                    e.stopPropagation()
                    onCloseTab(tab.relativePath)
                  }
                }}
                title={`${tab.title}\n(Clique com botão do meio para fechar • Arraste para reposicionar)`}
                className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-all max-w-[190px] shrink-0 border select-none ${
                  isDragging ? 'opacity-35 scale-95' : ''
                } ${
                  isDragOverThis
                    ? 'ring-2 ring-accent border-accent bg-accent-soft/40 text-accent font-bold scale-[1.02]'
                    : isTabActive
                      ? 'bg-surface-bg text-content-primary border-surface-border shadow-2xs font-semibold'
                      : 'bg-transparent text-content-secondary border-transparent hover:bg-surface-tertiary/70 hover:text-content-primary'
                }`}
              >
                <FileText
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isTabActive ? 'text-accent' : 'text-content-muted'
                  }`}
                />
                <span className="truncate">{tab.title}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onCloseTab(tab.relativePath, e)
                  }}
                  title="Fechar guia"
                  className="opacity-50 group-hover:opacity-100 p-0.5 rounded hover:bg-surface-tertiary text-content-muted hover:text-content-primary transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )
          })}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onFocusPane()
              onNewNote()
            }}
            title="Nova Nota nesta Janela (Ctrl+N)"
            className="p-1 rounded-md text-content-secondary hover:bg-surface-tertiary hover:text-accent transition-colors shrink-0 ml-0.5"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right Side: Split Window Controls */}
        <div className="flex items-center gap-0.5 shrink-0 pl-1 border-l border-surface-border/60">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onSplit('horizontal')
            }}
            title="Dividir Janela à Direita (Lado a Lado)"
            className="p-1 rounded text-content-secondary hover:text-accent hover:bg-surface-tertiary transition-colors"
          >
            <Columns2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onSplit('vertical')
            }}
            title="Dividir Janela Abaixo (Em Cima e Embaixo)"
            className="p-1 rounded text-content-secondary hover:text-accent hover:bg-surface-tertiary transition-colors"
          >
            <Rows2 className="w-3.5 h-3.5" />
          </button>

          {splitLayout !== 'single' && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleLayout()
                }}
                title={
                  splitLayout === 'horizontal'
                    ? 'Alternar para Divisão Vertical (Em Cima e Embaixo)'
                    : 'Alternar para Divisão Horizontal (Lado a Lado)'
                }
                className="p-1 rounded text-content-secondary hover:text-accent hover:bg-surface-tertiary transition-colors"
              >
                <Split className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onClosePane()
                }}
                title="Fechar esta Janela Dividida"
                className="p-1 rounded text-content-secondary hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Editor Content Area OR Empty State */}
      <div
        ref={editorContentRef}
        onDragOver={handleEditorDragOver}
        onDragLeave={handleEditorDragLeave}
        onDrop={handleEditorDrop}
        className="flex-1 min-h-0 relative flex flex-col overflow-hidden"
      >
        {activeNote ? (
          <MarkdownEditor
            activeNote={activeNote}
            allNotes={allNotes}
            vaultIndex={vaultIndex}
            settings={settings}
            onUpdateSettings={onUpdateSettings}
            onSaveContent={onSaveContent}
            onRenameActiveNote={onRenameActiveNote}
            onNavigateWikiLink={onNavigateWikiLink}
            isZenMode={isZenMode}
            onToggleZenMode={onToggleZenMode}
            onOpenHelpModal={onOpenHelpModal}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none bg-surface-canvas/30 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-surface-secondary border border-surface-border flex items-center justify-center text-content-muted shadow-sm">
              <FilePlus2 className="w-7 h-7 text-accent/80" />
            </div>

            <div className="max-w-xs space-y-1">
              <h3 className="text-sm font-semibold text-content-primary">
                Nenhuma nota aberta nesta janela
              </h3>
              <p className="text-xs text-content-muted leading-relaxed">
                Arraste uma nota para cá, crie uma nova ou abra pelo explorador de arquivos.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={onNewNote}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent text-white hover:bg-accent-hover transition-colors shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Nota</span>
              </button>

              <button
                type="button"
                onClick={onOpenQuickSwitcher}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-secondary border border-surface-border text-content-secondary hover:text-content-primary hover:bg-surface-tertiary transition-colors"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Quick Switcher (Ctrl+P)</span>
              </button>

              {splitLayout !== 'single' && (
                <button
                  type="button"
                  onClick={onClosePane}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-content-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Fechar Janela</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Dynamic Drag-and-Drop Drop Zone Overlays */}
        {dropZone === 'right' && (
          <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-accent/20 border-2 border-dashed border-accent rounded-xl flex flex-col items-center justify-center gap-2 pointer-events-none z-50 backdrop-blur-2xs animate-in fade-in duration-100 m-1.5 shadow-xl">
            <div className="p-3 rounded-full bg-accent text-white shadow-md">
              <Columns2 className="w-6 h-6" />
            </div>
            <div className="text-center px-4">
              <p className="text-xs font-bold text-content-primary">Dividir à Direita</p>
              <p className="text-[11px] text-content-secondary">Visualizar lado a lado</p>
            </div>
          </div>
        )}

        {dropZone === 'left' && (
          <div className="absolute left-0 top-0 bottom-0 w-1/2 bg-accent/20 border-2 border-dashed border-accent rounded-xl flex flex-col items-center justify-center gap-2 pointer-events-none z-50 backdrop-blur-2xs animate-in fade-in duration-100 m-1.5 shadow-xl">
            <div className="p-3 rounded-full bg-accent text-white shadow-md">
              <Columns2 className="w-6 h-6" />
            </div>
            <div className="text-center px-4">
              <p className="text-xs font-bold text-content-primary">Dividir à Esquerda</p>
              <p className="text-[11px] text-content-secondary">Visualizar lado a lado</p>
            </div>
          </div>
        )}

        {dropZone === 'bottom' && (
          <div className="absolute left-0 right-0 bottom-0 h-1/2 bg-accent/20 border-2 border-dashed border-accent rounded-xl flex flex-col items-center justify-center gap-2 pointer-events-none z-50 backdrop-blur-2xs animate-in fade-in duration-100 m-1.5 shadow-xl">
            <div className="p-3 rounded-full bg-accent text-white shadow-md">
              <Rows2 className="w-6 h-6" />
            </div>
            <div className="text-center px-4">
              <p className="text-xs font-bold text-content-primary">Dividir Abaixo</p>
              <p className="text-[11px] text-content-secondary">Visualizar em cima e embaixo</p>
            </div>
          </div>
        )}

        {dropZone === 'top' && (
          <div className="absolute left-0 right-0 top-0 h-1/2 bg-accent/20 border-2 border-dashed border-accent rounded-xl flex flex-col items-center justify-center gap-2 pointer-events-none z-50 backdrop-blur-2xs animate-in fade-in duration-100 m-1.5 shadow-xl">
            <div className="p-3 rounded-full bg-accent text-white shadow-md">
              <Rows2 className="w-6 h-6" />
            </div>
            <div className="text-center px-4">
              <p className="text-xs font-bold text-content-primary">Dividir Acima</p>
              <p className="text-[11px] text-content-secondary">Visualizar em cima e embaixo</p>
            </div>
          </div>
        )}

        {dropZone === 'center' && (
          <div className="absolute inset-2 bg-accent/15 border-2 border-dashed border-accent/70 rounded-xl flex flex-col items-center justify-center gap-2 pointer-events-none z-50 backdrop-blur-2xs animate-in fade-in duration-100 shadow-lg">
            <div className="p-2.5 rounded-full bg-accent text-white shadow-sm">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-content-primary">Mover para esta Janela</p>
          </div>
        )}
      </div>
    </div>
  )
}
