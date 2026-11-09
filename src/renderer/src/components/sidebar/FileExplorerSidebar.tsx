import React, { useEffect, useState } from 'react'
import {
  Folder,
  FolderOpen,
  FileText,
  Image as ImageIcon,
  FileCode2,
  File,
  FilePlus2,
  FolderPlus,
  Search,
  ChevronRight,
  ChevronDown,
  Trash2,
  Pencil,
  HardDrive,
  Settings,
  RefreshCw,
  ExternalLink,
  Radio,
  ChevronsDownUp,
  ChevronsUpDown
} from 'lucide-react'
import type { VaultFileEntry } from '../../../../preload/index.d'
import { FileContextMenu, type FileContextMenuTarget } from './FileContextMenu'

interface FileExplorerSidebarProps {
  width?: number
  vaultName: string
  onMoveEntry?: (oldRelativePath: string, newParentFolderRelativePath: string) => void
  onOpenImage?: (relativePath: string, fileName: string) => void
  onOpenOtherFile?: (relativePath: string, fileName: string) => void
  vaultPath: string
  tree: VaultFileEntry[]
  activeNotePath: string | null
  lastSyncTime: number
  expandedFolders: Record<string, boolean>
  onSetExpandedFolders: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  onSelectNote: (relativePath: string, openInNewTab?: boolean) => void
  onHoverTarget?: (targetName: string, rect: DOMRect, isCtrlDown: boolean) => void
  onLeaveTarget?: () => void
  onCreateNote: (folderRelativePath: string) => void
  onCreateFolder: (parentRelativePath: string) => void
  onDuplicateNote: (relativePath: string) => void
  onRenameEntry: (oldRelativePath: string, currentName: string) => void
  onDeleteEntry: (relativePath: string, name: string) => void
  onSwitchVault: () => void
  onRefreshVault: () => void
  onOpenInExplorer: (subRelativePath?: string) => void
  onOpenQuickSwitcher: () => void
  onOpenSettings: () => void
}

function collectAllFolderPaths(entries: VaultFileEntry[]): string[] {
  const result: string[] = []
  for (const entry of entries) {
    if (entry.isDirectory) {
      result.push(entry.relativePath)
      if (entry.children) {
        result.push(...collectAllFolderPaths(entry.children))
      }
    }
  }
  return result
}


const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico'])
const CODE_EXTENSIONS = new Set([
  'ts', 'tsx', 'js', 'jsx', 'json', 'py', 'html', 'css', 'scss',
  'cpp', 'c', 'cs', 'java', 'rs', 'go', 'php', 'rb', 'sh', 'sql', 'yaml', 'yml', 'xml'
])

function getFileIcon(extension?: string) {
  const ext = (extension || '').toLowerCase()
  if (ext === 'md') return FileText
  if (IMAGE_EXTENSIONS.has(ext)) return ImageIcon
  if (CODE_EXTENSIONS.has(ext)) return FileCode2
  return File
}

function normalizeRel(p: string): string {
  return p.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')
}

function canDropInto(draggedPath: string | null, targetFolderPath: string): boolean {
  if (!draggedPath) return false
  const cleanDragged = normalizeRel(draggedPath)
  const cleanTarget = normalizeRel(targetFolderPath)
  if (cleanDragged === cleanTarget) return false
  // Cannot drop a folder into its own descendant
  if (cleanTarget.startsWith(cleanDragged + '/')) return false
  // Cannot drop if already directly in target folder
  const currentParent = cleanDragged.includes('/')
    ? cleanDragged.slice(0, cleanDragged.lastIndexOf('/'))
    : ''
  if (currentParent === cleanTarget) return false
  return true
}

function getEntryPathFromData(e: React.DragEvent, fallback: string | null): string | null {
  const custom = e.dataTransfer.getData('application/notes-md-entry')
  if (custom) {
    try {
      const parsed = JSON.parse(custom)
      if (parsed.relativePath) return parsed.relativePath
    } catch {
      // ignore
    }
  }
  const text = e.dataTransfer.getData('text/plain')
  if (text) return text
  return fallback
}

export const FileExplorerSidebar: React.FC<FileExplorerSidebarProps> = ({
  width,
  vaultName,
  onMoveEntry,
  onOpenImage,
  onOpenOtherFile,
  vaultPath,
  tree,
  activeNotePath,
  lastSyncTime,
  expandedFolders,
  onSetExpandedFolders,
  onSelectNote,
  onHoverTarget,
  onLeaveTarget,
  onCreateNote,
  onCreateFolder,
  onDuplicateNote,
  onRenameEntry,
  onDeleteEntry,
  onSwitchVault,
  onRefreshVault,
  onOpenInExplorer,
  onOpenQuickSwitcher,
  onOpenSettings
}) => {
  const [isSyncPulse, setIsSyncPulse] = useState(false)
  const [contextTarget, setContextTarget] = useState<FileContextMenuTarget | null>(null)
  const [draggedEntryPath, setDraggedEntryPath] = useState<string | null>(null)
  const [dragOverFolderPath, setDragOverFolderPath] = useState<string | null>(null)

  // Pulse indicator briefly whenever a filesystem change is synchronized
  useEffect(() => {
    if (!lastSyncTime) return
    setIsSyncPulse(true)
    const timer = window.setTimeout(() => setIsSyncPulse(false), 900)
    return () => window.clearTimeout(timer)
  }, [lastSyncTime])

  const toggleFolder = (relPath: string): void => {
    onSetExpandedFolders((prev) => {
      const current = prev[relPath] ?? true
      return { ...prev, [relPath]: !current }
    })
  }

  const allFolderPaths = collectAllFolderPaths(tree)
  const anyExpanded = allFolderPaths.some((p) => expandedFolders[p] ?? true)

  const handleToggleAllFolders = (): void => {
    const nextState: Record<string, boolean> = {}
    for (const p of allFolderPaths) {
      nextState[p] = !anyExpanded
    }
    onSetExpandedFolders(nextState)
  }

  const renderTree = (entries: VaultFileEntry[], depth = 0): React.ReactNode => {
    return entries.map((entry) => {
      const isDragging = draggedEntryPath === entry.relativePath
      const isDragOver = dragOverFolderPath === entry.relativePath

      if (entry.isDirectory) {
        const isExpanded = expandedFolders[entry.relativePath] ?? true
        return (
          <div key={entry.relativePath}>
            <div
              draggable={true}
              onDragStart={(e) => {
                e.stopPropagation()
                e.dataTransfer.setData(
                  'application/notes-md-entry',
                  JSON.stringify({ relativePath: entry.relativePath, isDirectory: true })
                )
                e.dataTransfer.setData('text/plain', entry.relativePath)
                e.dataTransfer.effectAllowed = 'move'
                setDraggedEntryPath(entry.relativePath)
              }}
              onDragEnd={() => {
                setDraggedEntryPath(null)
                setDragOverFolderPath(null)
              }}
              onDragOver={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (canDropInto(draggedEntryPath, entry.relativePath)) {
                  e.dataTransfer.dropEffect = 'move'
                  setDragOverFolderPath(entry.relativePath)
                }
              }}
              onDragLeave={(e) => {
                e.stopPropagation()
                if (dragOverFolderPath === entry.relativePath) {
                  setDragOverFolderPath(null)
                }
              }}
              onDrop={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setDragOverFolderPath(null)
                const fromPath = getEntryPathFromData(e, draggedEntryPath)
                if (fromPath && canDropInto(fromPath, entry.relativePath)) {
                  onMoveEntry?.(fromPath, entry.relativePath)
                }
              }}
              style={{ paddingLeft: `${depth * 12 + 8}px` }}
              onClick={() => toggleFolder(entry.relativePath)}
              onContextMenu={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setContextTarget({
                  type: 'folder',
                  entry,
                  x: e.clientX,
                  y: e.clientY
                })
              }}
              title={`Pasta: ${entry.name} (Arraste para mover para outra pasta)`}
              className={`group flex items-center justify-between pr-1.5 h-7 rounded-md text-xs font-medium cursor-pointer transition-colors duration-150 border ${
                isDragging ? 'opacity-40' : ''
              } ${
                isDragOver
                  ? 'ring-2 ring-accent bg-accent-soft/50 text-accent font-semibold border-accent'
                  : 'text-content-secondary border-transparent hover:bg-surface-tertiary hover:text-content-primary hover:border-surface-border/50'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 shrink-0 text-content-muted" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 shrink-0 text-content-muted" />
                )}
                {isExpanded ? (
                  <FolderOpen className="w-4 h-4 shrink-0 text-accent" />
                ) : (
                  <Folder className="w-4 h-4 shrink-0 text-accent" />
                )}
                <span className="truncate">{entry.name}</span>
              </div>

              <div
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none group-hover:pointer-events-auto flex items-center gap-0.5 shrink-0 ml-1"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => {
                    onSetExpandedFolders((prev) => ({ ...prev, [entry.relativePath]: true }))
                    onCreateNote(entry.relativePath)
                  }}
                  title="Nova nota nesta pasta"
                  className="w-5 h-5 flex items-center justify-center p-0 rounded hover:bg-surface-bg text-content-muted hover:text-accent transition-colors"
                >
                  <FilePlus2 className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSetExpandedFolders((prev) => ({ ...prev, [entry.relativePath]: true }))
                    onCreateFolder(entry.relativePath)
                  }}
                  title="Nova subpasta"
                  className="w-5 h-5 flex items-center justify-center p-0 rounded hover:bg-surface-bg text-content-muted hover:text-accent transition-colors"
                >
                  <FolderPlus className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => onRenameEntry(entry.relativePath, entry.name)}
                  title="Renomear pasta"
                  className="w-5 h-5 flex items-center justify-center p-0 rounded hover:bg-surface-bg text-content-muted hover:text-content-primary transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteEntry(entry.relativePath, entry.name)}
                  title="Excluir pasta"
                  className="w-5 h-5 flex items-center justify-center p-0 rounded hover:bg-surface-bg text-content-muted hover:text-rose-500 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>

            {isExpanded && entry.children && entry.children.length > 0 && (
              <div className="mt-0.5">{renderTree(entry.children, depth + 1)}</div>
            )}
          </div>
        )
      }

      const isActive = activeNotePath === entry.relativePath
      const ext = (entry.extension || '').toLowerCase()
      const isMd = ext === 'md' || entry.name.endsWith('.md')
      const isImage = IMAGE_EXTENSIONS.has(ext)
      const IconComponent = getFileIcon(entry.extension)

      const handleFileClick = (openInNewTab = false): void => {
        if (isMd) {
          onSelectNote(entry.relativePath, openInNewTab)
        } else if (isImage) {
          onOpenImage?.(entry.relativePath, entry.name)
        } else {
          onOpenOtherFile?.(entry.relativePath, entry.name)
        }
      }

      const fileTooltip = isMd
        ? `Nota: ${entry.name}\nClique esquerdo: abrir nesta guia • Botão do meio: abrir em nova guia • Arraste para mover`
        : isImage
          ? `Imagem: ${entry.name} (Clique para visualizar, arraste para mover)`
          : `Arquivo ${(entry.extension || '').toUpperCase()}: ${entry.name} (Arraste para mover)`

      const parentFolder = entry.relativePath.includes('/')
        ? entry.relativePath.slice(0, entry.relativePath.lastIndexOf('/'))
        : ''
      const canDropToParent = canDropInto(draggedEntryPath, parentFolder)

      return (
        <div
          key={entry.relativePath}
          draggable={true}
          onDragStart={(e) => {
            e.stopPropagation()
            e.dataTransfer.setData(
              'application/notes-md-entry',
              JSON.stringify({ relativePath: entry.relativePath, isDirectory: false })
            )
            e.dataTransfer.setData('text/plain', entry.relativePath)
            e.dataTransfer.effectAllowed = 'move'
            setDraggedEntryPath(entry.relativePath)
          }}
          onDragEnd={() => {
            setDraggedEntryPath(null)
            setDragOverFolderPath(null)
          }}
          onDragOver={(e) => {
            if (canDropToParent) {
              e.preventDefault()
              e.stopPropagation()
              e.dataTransfer.dropEffect = 'move'
              setDragOverFolderPath(parentFolder || '__root__')
            }
          }}
          onDragLeave={(e) => {
            e.stopPropagation()
            if (dragOverFolderPath === (parentFolder || '__root__')) {
              setDragOverFolderPath(null)
            }
          }}
          onDrop={(e) => {
            if (canDropToParent) {
              e.preventDefault()
              e.stopPropagation()
              setDragOverFolderPath(null)
              const fromPath = getEntryPathFromData(e, draggedEntryPath)
              if (fromPath && canDropInto(fromPath, parentFolder)) {
                onMoveEntry?.(fromPath, parentFolder)
              }
            }
          }}
          style={{ paddingLeft: `${depth * 12 + 20}px` }}
          onClick={() => handleFileClick(false)}
          onMouseDown={(e) => {
            if (e.button === 1) e.preventDefault()
          }}
          onAuxClick={(e) => {
            if (e.button === 1 && isMd) {
              e.preventDefault()
              e.stopPropagation()
              handleFileClick(true)
            }
          }}
          onMouseMove={(e) => {
            if (isMd) {
              onHoverTarget?.(
                entry.relativePath,
                e.currentTarget.getBoundingClientRect(),
                e.ctrlKey || e.metaKey
              )
            }
          }}
          onMouseLeave={() => {
            if (isMd) {
              onLeaveTarget?.()
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setContextTarget({
              type: isMd ? 'note' : isImage ? 'image' : 'file',
              entry,
              x: e.clientX,
              y: e.clientY
            })
          }}
          title={fileTooltip}
          className={`group flex items-center justify-between pr-1.5 h-7 rounded-md text-xs cursor-pointer transition-colors duration-150 border ${
            isDragging ? 'opacity-40' : ''
          } ${
            isActive
              ? 'bg-accent-soft text-accent font-semibold border-accent-border/50'
              : 'text-content-secondary border-transparent hover:bg-surface-tertiary hover:text-content-primary hover:border-surface-border/50'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <IconComponent
              className={`w-3.5 h-3.5 shrink-0 ${
                isActive
                  ? 'text-accent'
                  : isImage
                    ? 'text-emerald-500'
                    : isMd
                      ? 'text-content-muted'
                      : 'text-amber-500'
              }`}
            />
            <span className="truncate">{entry.name}</span>
          </div>

          <div
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none group-hover:pointer-events-auto flex items-center gap-0.5 shrink-0 ml-1"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => onRenameEntry(entry.relativePath, entry.name)}
              title="Renomear"
              className="w-5 h-5 flex items-center justify-center p-0 rounded hover:bg-surface-bg text-content-muted hover:text-content-primary transition-colors"
            >
              <Pencil className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => onDeleteEntry(entry.relativePath, entry.name)}
              title="Excluir"
              className="w-5 h-5 flex items-center justify-center p-0 rounded hover:bg-surface-bg text-content-muted hover:text-rose-500 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      )
    })
  }

  return (
    <aside style={{ width: width ? `${width}px` : undefined }} className="w-64 shrink-0 h-full bg-surface-secondary border-r border-surface-border flex flex-col select-none">
      {/* Vault Header */}
      <div className="p-3 border-b border-surface-border flex items-center justify-between gap-1">
        <button
          type="button"
          onClick={onSwitchVault}
          title={`Vault atual: ${vaultPath}\nClique para trocar a pasta do Vault`}
          className="flex items-center gap-2 min-w-0 flex-1 px-2 py-1.5 rounded-lg hover:bg-surface-tertiary transition-colors text-left"
        >
          <div className="w-6 h-6 rounded-md bg-accent text-white flex items-center justify-center shrink-0">
            <HardDrive className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-content-primary truncate">{vaultName}</div>
            <div className="text-[10px] text-content-muted truncate">Trocar pasta (Vault)</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onOpenInExplorer('')}
          title="Abrir pasta do Vault no Windows Explorer"
          className="p-1.5 rounded-lg text-content-secondary hover:bg-surface-tertiary hover:text-content-primary transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          title="Personalizar Aparência e Editor"
          className="p-1.5 rounded-lg text-content-secondary hover:bg-surface-tertiary hover:text-content-primary transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Actions Bar */}
      <div className="px-3 py-2 flex items-center gap-1 border-b border-surface-border/60">
        <button
          type="button"
          onClick={onOpenQuickSwitcher}
          className="flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-surface-bg border border-surface-border text-xs text-content-muted hover:text-content-primary hover:border-accent/50 transition-colors min-w-0"
        >
          <Search className="w-3.5 h-3.5 text-accent shrink-0" />
          <span className="truncate">Buscar...</span>
        </button>

        <button
          type="button"
          onClick={() => onCreateNote('')}
          title="Nova Nota Markdown na Raiz (Ctrl+N)"
          className="p-1.5 rounded-lg bg-accent text-white hover:bg-accent-hover transition-colors shrink-0"
        >
          <FilePlus2 className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => onCreateFolder('')}
          title="Nova Pasta na Raiz"
          className="p-1.5 rounded-lg bg-surface-bg border border-surface-border text-content-secondary hover:text-content-primary hover:bg-surface-tertiary transition-colors shrink-0"
        >
          <FolderPlus className="w-4 h-4" />
        </button>

        {allFolderPaths.length > 0 && (
          <button
            type="button"
            onClick={handleToggleAllFolders}
            title={anyExpanded ? 'Recolher todas as pastas' : 'Expandir todas as pastas'}
            className="p-1.5 rounded-lg bg-surface-bg border border-surface-border text-content-secondary hover:text-content-primary hover:bg-surface-tertiary transition-colors shrink-0"
          >
            {anyExpanded ? (
              <ChevronsDownUp className="w-4 h-4" />
            ) : (
              <ChevronsUpDown className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* File Tree (Right-click on empty area targets Root directory) */}
      <div
        className={`flex-1 overflow-y-auto p-2 space-y-0.5 transition-colors ${
          dragOverFolderPath === '__root__' ? 'ring-2 ring-inset ring-accent/60 bg-accent-soft/20 rounded-lg' : ''
        }`}
        onDragOver={(e) => {
          if (canDropInto(draggedEntryPath, '')) {
            e.preventDefault()
            e.dataTransfer.dropEffect = 'move'
            setDragOverFolderPath('__root__')
          }
        }}
        onDragLeave={(e) => {
          if (e.currentTarget === e.target) {
            setDragOverFolderPath(null)
          }
        }}
        onDrop={(e) => {
          e.preventDefault()
          setDragOverFolderPath(null)
          const fromPath = getEntryPathFromData(e, draggedEntryPath)
          if (fromPath && canDropInto(fromPath, '')) {
            onMoveEntry?.(fromPath, '')
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault()
          setContextTarget({
            type: 'root',
            x: e.clientX,
            y: e.clientY
          })
        }}
      >
        {tree.length > 0 ? (
          renderTree(tree)
        ) : (
          <div className="p-4 text-center text-xs text-content-muted">
            Nenhuma nota neste Vault. Clique com o botão direito ou em <strong>+</strong> para criar!
          </div>
        )}
      </div>

      {/* Right-Click File/Folder/Root Context Menu */}
      <FileContextMenu
        target={contextTarget}
        vaultName={vaultName}
        onClose={() => setContextTarget(null)}
        onSelectNote={onSelectNote}
        onOpenImage={onOpenImage}
        onOpenOtherFile={onOpenOtherFile}
        onCreateNoteInFolder={(folderRel) => {
          if (folderRel) {
            onSetExpandedFolders((prev) => ({ ...prev, [folderRel]: true }))
          }
          onCreateNote(folderRel)
        }}
        onCreateFolderInParent={(parentRel) => {
          if (parentRel) {
            onSetExpandedFolders((prev) => ({ ...prev, [parentRel]: true }))
          }
          onCreateFolder(parentRel)
        }}
        onDuplicateNote={onDuplicateNote}
        onRenameEntry={onRenameEntry}
        onDeleteEntry={onDeleteEntry}
        onRefreshVault={onRefreshVault}
        onOpenInExplorer={onOpenInExplorer}
      />

      {/* Live Watcher Status Footer */}
      <div className="px-3 py-2 border-t border-surface-border bg-surface-bg/40 flex items-center justify-between text-[11px] text-content-muted">
        <div className="flex items-center gap-1.5 min-w-0">
          <Radio
            className={`w-3.5 h-3.5 shrink-0 transition-colors ${
              isSyncPulse ? 'text-emerald-500 animate-pulse' : 'text-emerald-500/80'
            }`}
          />
          <span className="truncate">
            {isSyncPulse ? 'Diretório atualizado!' : 'Sincronização ativa'}
          </span>
        </div>

        <button
          type="button"
          onClick={onRefreshVault}
          title="Sincronizar diretório agora"
          className="p-1 rounded hover:bg-surface-tertiary text-content-secondary hover:text-content-primary transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isSyncPulse ? 'animate-spin text-accent' : ''}`} />
        </button>
      </div>
    </aside>
  )
}
