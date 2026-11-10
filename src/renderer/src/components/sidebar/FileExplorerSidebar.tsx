import React, { useState, useRef, useEffect } from 'react'
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
  ExternalLink,
  ChevronsDownUp,
  ChevronsUpDown,
  Moon,
  Sun,
  PanelLeft,
  Check,
  ChevronUp
} from 'lucide-react'
import type { VaultFileEntry } from '../../../../preload/index.d'
import { FileContextMenu, type FileContextMenuTarget } from './FileContextMenu'
import { IconButton } from '../ui/IconButton'
import { cn } from '../../utils/cn'
import type { RecentVault } from '../../types/app'

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
  theme?: 'light' | 'dark' | 'sepia'
  onToggleTheme?: () => void
  onCloseSidebar?: () => void
  recentVaults?: RecentVault[]
  onSelectRecentVault?: (path: string) => void
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
  lastSyncTime: _lastSyncTime,
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
  onOpenSettings,
  theme = 'dark',
  onToggleTheme,
  onCloseSidebar,
  recentVaults = [],
  onSelectRecentVault
}) => {
  const [contextTarget, setContextTarget] = useState<FileContextMenuTarget | null>(null)
  const [draggedEntryPath, setDraggedEntryPath] = useState<string | null>(null)
  const [dragOverFolderPath, setDragOverFolderPath] = useState<string | null>(null)
  const [isRecentVaultsOpen, setIsRecentVaultsOpen] = useState(false)
  const recentVaultsRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isRecentVaultsOpen) return
    const handleDown = (e: MouseEvent): void => {
      if (recentVaultsRef.current && !recentVaultsRef.current.contains(e.target as Node)) {
        setIsRecentVaultsOpen(false)
      }
    }
    window.addEventListener('mousedown', handleDown)
    return () => window.removeEventListener('mousedown', handleDown)
  }, [isRecentVaultsOpen])

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
              style={{ paddingLeft: `${depth * 10 + 6}px` }}
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
              className={`relative group flex items-center justify-between pr-1.5 h-7 rounded-md text-xs font-medium cursor-pointer transition-colors duration-150 border ${
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
                className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5 bg-surface-secondary/95 backdrop-blur-xs pl-1 pr-0.5 py-0.5 rounded-md shadow-xs border border-surface-border/60 z-10"
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
          style={{ paddingLeft: `${depth * 10 + 16}px` }}
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
          className={`relative group flex items-center justify-between pr-1.5 h-7 rounded-md text-xs cursor-pointer transition-colors duration-150 border ${
            isDragging ? 'opacity-40' : ''
          } ${
            isActive
              ? 'bg-accent-soft text-accent font-semibold border-accent-border/50'
              : 'text-content-secondary border-transparent hover:bg-surface-tertiary hover:text-content-primary hover:border-surface-border/50'
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
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
            {entry.extension && (
              <span
                className={cn(
                  'text-[9px] px-1 py-0.2 rounded font-mono font-bold shrink-0 tracking-wider uppercase select-none ml-1.5',
                  isMd
                    ? 'bg-accent/15 text-accent'
                    : isImage
                      ? 'bg-emerald-500/15 text-emerald-500'
                      : 'bg-amber-500/15 text-amber-500'
                )}
              >
                {entry.extension}
              </span>
            )}
          </div>

          <div
            className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5 bg-surface-secondary/95 backdrop-blur-xs pl-1 pr-0.5 py-0.5 rounded-md shadow-xs border border-surface-border/60 z-10"
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
      {/* Quick Actions Bar (Top) */}
      <div className="px-2.5 py-2 flex items-center gap-1 border-b border-surface-border/60">
        <button
          type="button"
          onClick={onOpenQuickSwitcher}
          className="flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-surface-bg border border-surface-border text-xs text-content-muted hover:text-content-primary hover:border-accent/50 transition-colors min-w-0"
        >
          <Search className="w-3.5 h-3.5 text-accent shrink-0" />
          <span className="truncate">Buscar...</span>
        </button>

        <IconButton
          variant="accent"
          size="sm"
          onClick={() => onCreateNote('')}
          tooltip="Nova Nota Markdown na Raiz (Ctrl+N)"
          icon={<FilePlus2 className="w-4 h-4" />}
        />

        <IconButton
          variant="secondary"
          size="sm"
          onClick={() => onCreateFolder('')}
          tooltip="Nova Pasta na Raiz"
          icon={<FolderPlus className="w-4 h-4" />}
        />

        {allFolderPaths.length > 0 && (
          <IconButton
            variant="secondary"
            size="sm"
            onClick={handleToggleAllFolders}
            tooltip={anyExpanded ? 'Recolher todas as pastas' : 'Expandir todas as pastas'}
            icon={
              anyExpanded ? (
                <ChevronsDownUp className="w-4 h-4" />
              ) : (
                <ChevronsUpDown className="w-4 h-4" />
              )
            }
          />
        )}

        {onCloseSidebar && (
          <IconButton
            variant="ghost"
            size="sm"
            onClick={onCloseSidebar}
            tooltip="Ocultar Explorador de Arquivos (Ctrl+B)"
            icon={<PanelLeft className="w-4 h-4 text-content-secondary hover:text-content-primary" />}
          />
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

      {/* Vault Footer & Switcher (Obsidian style) */}
      <div className="relative p-2 border-t border-surface-border flex items-center justify-between gap-1.5 bg-surface-bg/50 shrink-0">
        {/* Recent Vaults Dropdown Popover */}
        {isRecentVaultsOpen && (
          <div
            ref={recentVaultsRef}
            className="absolute bottom-full left-2 mb-2 w-72 rounded-xl bg-surface-secondary border border-surface-border shadow-xl p-2 z-40 animate-in fade-in slide-in-from-bottom-2 duration-150"
          >
            <div className="flex items-center justify-between px-2 py-1 mb-1 border-b border-surface-border/60">
              <span className="text-[11px] font-bold uppercase tracking-wider text-content-muted">
                Cofres Recentes
              </span>
              <span className="text-[10px] text-content-muted">
                {recentVaults.length} encontrado{recentVaults.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1 py-1">
              {recentVaults.length > 0 ? (
                recentVaults.map((vault) => {
                  const isCurrent = vault.path.toLowerCase() === vaultPath.toLowerCase()
                  return (
                    <button
                      key={vault.path}
                      type="button"
                      onClick={() => {
                        setIsRecentVaultsOpen(false)
                        onSelectRecentVault?.(vault.path)
                      }}
                      className={cn(
                        'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors group cursor-pointer',
                        isCurrent
                          ? 'bg-accent-soft text-accent font-semibold'
                          : 'text-content-primary hover:bg-surface-tertiary'
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <HardDrive className={cn('w-3.5 h-3.5 shrink-0', isCurrent ? 'text-accent' : 'text-content-muted')} />
                        <div className="truncate min-w-0">
                          <div className="truncate font-medium">{vault.name}</div>
                          <div className="text-[10px] text-content-muted truncate">{vault.path}</div>
                        </div>
                      </div>
                      {isCurrent && <Check className="w-3.5 h-3.5 shrink-0 text-accent ml-2" />}
                    </button>
                  )
                })
              ) : (
                <div className="px-2 py-3 text-center text-xs text-content-muted">
                  Nenhum cofre recente registrado.
                </div>
              )}
            </div>

            <div className="pt-1 mt-1 border-t border-surface-border/60">
              <button
                type="button"
                onClick={() => {
                  setIsRecentVaultsOpen(false)
                  onSwitchVault()
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-accent hover:bg-accent-soft transition-colors cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Abrir outro Cofre / Pasta...</span>
              </button>
            </div>
          </div>
        )}

        {/* Vault Switcher Button */}
        <button
          type="button"
          onClick={() => setIsRecentVaultsOpen((prev) => !prev)}
          title={`Cofre atual: ${vaultName} (${vaultPath})\nClique para ver cofres recentes ou abrir outro`}
          className="flex items-center gap-2 min-w-0 flex-1 px-2 py-1 rounded-lg hover:bg-surface-tertiary transition-colors text-left group cursor-pointer"
        >
          <div className="w-5 h-5 rounded-md bg-accent text-white flex items-center justify-center shrink-0">
            <HardDrive className="w-3 h-3" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-content-primary truncate group-hover:text-accent transition-colors flex items-center gap-1">
              <span className="truncate">{vaultName}</span>
              <ChevronUp className="w-3 h-3 text-content-muted group-hover:text-accent shrink-0" />
            </div>
            <div className="text-[10px] text-content-muted truncate">Cofres recentes</div>
          </div>
        </button>

        <div className="flex items-center gap-0.5 shrink-0">
          <IconButton
            variant="ghost"
            size="sm"
            onClick={() => onOpenInExplorer('')}
            tooltip="Abrir pasta do Vault no Explorador de Arquivos"
            icon={<ExternalLink className="w-3.5 h-3.5" />}
          />

          {onToggleTheme && (
            <IconButton
              variant="ghost"
              size="sm"
              onClick={onToggleTheme}
              tooltip={`Tema atual: ${theme.toUpperCase()} (Clique para alternar)`}
              icon={
                theme === 'dark' ? (
                  <Moon className="w-3.5 h-3.5 text-accent" />
                ) : (
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                )
              }
            />
          )}

          <IconButton
            variant="ghost"
            size="sm"
            onClick={onOpenSettings}
            tooltip="Personalizar Aparência e Editor (Ctrl+,)"
            icon={<Settings className="w-3.5 h-3.5" />}
          />
        </div>
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
    </aside>
  )
}
