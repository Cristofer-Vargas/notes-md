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
import { SelectionButton } from '../ui/SelectionButton'
import { cn } from '../../utils/cn'
import appLogo from '../../assets/logo.png'
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
  onRemoveRecentVault?: (path: string) => void
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
  onSelectRecentVault,
  onRemoveRecentVault
}) => {
  const [contextTarget, setContextTarget] = useState<FileContextMenuTarget | null>(null)
  const [draggedEntryPath, setDraggedEntryPath] = useState<string | null>(null)
  const [dragOverFolderPath, setDragOverFolderPath] = useState<string | null>(null)
  const [isRecentVaultsOpen, setIsRecentVaultsOpen] = useState(false)
  const recentVaultsRef = useRef<HTMLDivElement | null>(null)
  const recentVaultsToggleRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!isRecentVaultsOpen) return
    const handleDown = (e: MouseEvent): void => {
      if (recentVaultsRef.current && !recentVaultsRef.current.contains(e.target as Node) && !recentVaultsToggleRef.current?.contains(e.target as Node)) {
        setIsRecentVaultsOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        setIsRecentVaultsOpen(false)
        recentVaultsToggleRef.current?.focus()
      }
    }
    window.addEventListener('mousedown', handleDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('mousedown', handleDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
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
              className={`relative group flex items-center justify-between pr-1.5 h-7 rounded-md text-xs font-medium cursor-pointer transition-colors duration-150 ${
                isDragging ? 'opacity-40' : ''
              } ${
                isDragOver
                  ? 'ring-2 ring-inset ring-accent bg-accent-soft text-accent font-semibold'
                  : 'text-content-secondary hover:bg-surface-tertiary hover:text-content-primary'
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
                className="hidden shrink-0 group-hover:flex group-focus-within:flex items-center gap-0.5 pl-1"
                onClick={(e) => e.stopPropagation()}
              >
                <IconButton
                  size="xs"
                  onClick={() => {
                    onSetExpandedFolders((prev) => ({ ...prev, [entry.relativePath]: true }))
                    onCreateNote(entry.relativePath)
                  }}
                  tooltip="Nova nota nesta pasta"
                  icon={<FilePlus2 className="w-3 h-3" />}
                  className="!w-5 !h-5 text-content-muted hover:text-accent"
                />
                <IconButton
                  size="xs"
                  onClick={() => {
                    onSetExpandedFolders((prev) => ({ ...prev, [entry.relativePath]: true }))
                    onCreateFolder(entry.relativePath)
                  }}
                  tooltip="Nova subpasta"
                  icon={<FolderPlus className="w-3 h-3" />}
                  className="!w-5 !h-5 text-content-muted hover:text-accent"
                />
                <IconButton
                  size="xs"
                  onClick={() => onRenameEntry(entry.relativePath, entry.name)}
                  tooltip="Renomear pasta"
                  icon={<Pencil className="w-3 h-3" />}
                  className="!w-5 !h-5 text-content-muted"
                />
                <IconButton
                  size="xs"
                  variant="danger"
                  onClick={() => onDeleteEntry(entry.relativePath, entry.name)}
                  tooltip="Excluir pasta"
                  icon={<Trash2 className="w-3 h-3" />}
                  className="!w-5 !h-5"
                />
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
          className={`relative group flex items-center justify-between pr-1.5 h-7 rounded-md text-xs cursor-pointer transition-colors duration-150 ${
            isDragging ? 'opacity-40' : ''
          } ${
            isActive
              ? 'bg-accent-soft text-accent font-medium'
              : 'text-content-secondary hover:bg-surface-tertiary hover:text-content-primary'
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
            {!isMd && entry.extension && (
              <span
                className={cn(
                  'text-[9px] px-1 py-0.2 rounded font-mono font-bold shrink-0 tracking-wider uppercase select-none ml-1.5',
                  isImage
                    ? 'bg-emerald-500/15 text-emerald-500'
                    : 'bg-amber-500/15 text-amber-500'
                )}
              >
                {entry.extension}
              </span>
            )}
          </div>

          <div
            className="hidden shrink-0 group-hover:flex group-focus-within:flex items-center gap-0.5 pl-1"
            onClick={(e) => e.stopPropagation()}
          >
            <IconButton
              size="xs"
              onClick={() => onRenameEntry(entry.relativePath, entry.name)}
              tooltip="Renomear"
              icon={<Pencil className="w-3 h-3" />}
              className="!w-5 !h-5 text-content-muted"
            />
            <IconButton
              size="xs"
              variant="danger"
              onClick={() => onDeleteEntry(entry.relativePath, entry.name)}
              tooltip="Excluir"
              icon={<Trash2 className="w-3 h-3" />}
              className="!w-5 !h-5"
            />
          </div>
        </div>
      )
    })
  }

  return (
    <aside style={{ width: width ? `${width}px` : undefined }} className="w-64 shrink-0 h-full bg-surface-secondary border-r border-surface-border flex flex-col select-none">
      {/* Quick Actions Bar (Top) */}
      <div className="px-2.5 py-2 flex items-center gap-1 border-b border-surface-border/60">
        <SelectionButton
          type="button"
          onClick={onOpenQuickSwitcher}
          className="flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded-sm bg-surface-bg border border-surface-border text-xs text-content-muted hover:text-content-primary hover:border-accent/50 transition-colors min-w-0"
        >
          <Search className="w-3.5 h-3.5 text-accent shrink-0" />
          <span className="truncate">Buscar...</span>
        </SelectionButton>

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
            className="absolute bottom-full left-2 mb-2 w-72 max-w-[calc(100vw-1rem)] rounded-sm bg-surface-bg border border-surface-border shadow-xl p-1.5 z-40"
          >
            <div className="flex items-center justify-between px-2 py-1 mb-1 border-b border-surface-border/60">
              <span className="text-[11px] font-bold uppercase tracking-wider text-content-muted">
                Cofres recentes
              </span>
              <span className="text-[10px] text-content-muted">
                {recentVaults.length} / 5
              </span>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1 py-1">
              {recentVaults.length > 0 ? (
                recentVaults.map((vault) => {
                  const isCurrent = vault.path.toLowerCase() === vaultPath.toLowerCase()
                  return (
                    <div
                      key={vault.path}
                      className={cn(
                        'group flex items-center rounded-sm pr-1 text-xs transition-colors',
                        isCurrent
                          ? 'bg-accent-soft'
                          : 'hover:bg-surface-tertiary'
                      )}
                    >
                      <SelectionButton
                        type="button"
                        onClick={() => {
                          setIsRecentVaultsOpen(false)
                          onSelectRecentVault?.(vault.path)
                        }}
                        className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2 text-left text-content-primary"
                      >
                        <HardDrive className={cn('w-3.5 h-3.5 shrink-0', isCurrent ? 'text-accent' : 'text-content-muted')} />
                        <div className="min-w-0 flex-1">
                          <div className={cn('truncate font-medium', isCurrent && 'text-accent')}>{vault.name}</div>
                          <div className="text-[10px] text-content-muted truncate" title={vault.path}>{vault.path}</div>
                        </div>
                        {isCurrent && <Check className="w-3.5 h-3.5 shrink-0 text-accent" />}
                      </SelectionButton>
                      {onRemoveRecentVault && (
                        <IconButton
                          size="xs"
                          variant="danger"
                          tooltip={`Remover ${vault.name} dos recentes`}
                          icon={<Trash2 className="w-3.5 h-3.5" />}
                          onClick={() => onRemoveRecentVault(vault.path)}
                          className="invisible group-hover:visible group-focus-within:visible"
                        />
                      )}
                    </div>
                  )
                })
              ) : (
                <div className="px-2 py-3 text-center text-xs text-content-muted">
                  Nenhum cofre recente registrado.
                </div>
              )}
            </div>

            <div className="pt-1 mt-1 border-t border-surface-border/60">
              <SelectionButton
                type="button"
                onClick={() => {
                  setIsRecentVaultsOpen(false)
                  onSwitchVault()
                }}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-sm text-xs font-medium text-accent hover:bg-accent-soft transition-colors cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Abrir outro Cofre / Pasta...</span>
              </SelectionButton>
            </div>
          </div>
        )}

        {/* Vault Switcher Button */}
        <SelectionButton
          ref={recentVaultsToggleRef}
          type="button"
          aria-expanded={isRecentVaultsOpen}
          onClick={() => setIsRecentVaultsOpen((prev) => !prev)}
          title={`Cofre atual: ${vaultName} (${vaultPath})\nClique para ver cofres recentes ou abrir outro`}
          className="flex items-center gap-2 min-w-0 flex-1 px-2 py-1 rounded-sm hover:bg-surface-tertiary transition-colors text-left group cursor-pointer"
        >
          <img src={appLogo} alt="" className="w-6 h-6 object-contain shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-content-primary truncate group-hover:text-accent transition-colors flex items-center gap-1">
              <span className="truncate">{vaultName}</span>
              <ChevronUp className="w-3 h-3 text-content-muted group-hover:text-accent shrink-0" />
            </div>
            <div className="text-[10px] text-content-muted truncate">Cofres recentes</div>
          </div>
        </SelectionButton>

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
