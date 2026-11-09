import React, { useEffect, useRef } from 'react'
import {
  FilePlus2,
  FolderPlus,
  Pencil,
  Trash2,
  FileText,
  Folder,
  HardDrive,
  ExternalLink,
  RefreshCw,
  Copy,
  Image as ImageIcon,
  Eye,
  FileCode2
} from 'lucide-react'
import type { VaultFileEntry } from '../../../../preload/index.d'

export interface FileContextMenuTarget {
  type: 'root' | 'folder' | 'note' | 'image' | 'file'
  entry?: VaultFileEntry
  x: number
  y: number
}

interface FileContextMenuProps {
  target: FileContextMenuTarget | null
  vaultName: string
  onClose: () => void
  onSelectNote: (relativePath: string, openInNewTab?: boolean) => void
  onOpenImage?: (relativePath: string, fileName: string) => void
  onOpenOtherFile?: (relativePath: string, fileName: string) => void
  onCreateNoteInFolder: (folderRelativePath: string) => void
  onCreateFolderInParent: (parentRelativePath: string) => void
  onDuplicateNote?: (relativePath: string) => void
  onRenameEntry: (oldRelativePath: string, currentName: string) => void
  onDeleteEntry: (relativePath: string, name: string) => void
  onRefreshVault: () => void
  onOpenInExplorer: (relativePath?: string) => void
}

function getParentFolderRelativePath(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, '/')
  const lastSlash = normalized.lastIndexOf('/')
  return lastSlash === -1 ? '' : normalized.slice(0, lastSlash)
}

export const FileContextMenu: React.FC<FileContextMenuProps> = ({
  target,
  vaultName,
  onClose,
  onSelectNote,
  onOpenImage,
  onOpenOtherFile,
  onCreateNoteInFolder,
  onCreateFolderInParent,
  onDuplicateNote,
  onRenameEntry,
  onDeleteEntry,
  onRefreshVault,
  onOpenInExplorer
}) => {
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!target) return
    const handleMouseDown = (e: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [target, onClose])

  if (!target) return null

  const menuWidth = 240
  const menuHeight = 300
  const safeLeft = Math.min(Math.max(8, target.x), window.innerWidth - menuWidth - 12)
  const safeTop = Math.min(Math.max(8, target.y), window.innerHeight - menuHeight - 12)

  const run = (fn: () => void): void => {
    fn()
    onClose()
  }

  const entry = target.entry
  const targetFolderRel =
    target.type === 'folder' && entry
      ? entry.relativePath
      : entry
        ? getParentFolderRelativePath(entry.relativePath)
        : ''

  const locationLabel = targetFolderRel ? `em "${targetFolderRel}"` : 'na Raiz'

  const getEntryTypeLabel = (): string => {
    switch (target.type) {
      case 'folder':
        return 'Pasta'
      case 'note':
        return 'Nota'
      case 'image':
        return 'Imagem'
      case 'file':
        return 'Arquivo'
      default:
        return 'Item'
    }
  }

  return (
    <div
      ref={menuRef}
      style={{ top: safeTop, left: safeLeft, width: menuWidth }}
      onContextMenu={(e) => e.preventDefault()}
      className="fixed z-50 rounded-xl border border-surface-border bg-surface-bg/98 backdrop-blur-md shadow-2xl p-1.5 select-none animate-in fade-in zoom-in-95 duration-100"
    >
      {/* Context Header */}
      <div className="px-2.5 py-1.5 mb-1 rounded-lg bg-surface-secondary border border-surface-border/60 flex items-center gap-2">
        {target.type === 'folder' ? (
          <Folder className="w-3.5 h-3.5 text-accent shrink-0" />
        ) : target.type === 'note' ? (
          <FileText className="w-3.5 h-3.5 text-accent shrink-0" />
        ) : target.type === 'image' ? (
          <ImageIcon className="w-3.5 h-3.5 text-accent shrink-0" />
        ) : target.type === 'file' ? (
          <FileCode2 className="w-3.5 h-3.5 text-accent shrink-0" />
        ) : (
          <HardDrive className="w-3.5 h-3.5 text-accent shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold text-content-primary truncate">
            {entry ? entry.name : vaultName}
          </div>
          <div className="text-[10px] text-content-muted truncate">
            {target.type === 'folder'
              ? `Pasta • ${entry?.relativePath}`
              : target.type === 'note'
                ? `Nota • ${entry?.relativePath}`
                : target.type === 'image'
                  ? `Imagem • ${entry?.relativePath}`
                  : target.type === 'file'
                    ? `Arquivo ${(entry?.extension || '').toUpperCase()} • ${entry?.relativePath}`
                    : 'Diretório Raiz do Vault'}
          </div>
        </div>
      </div>

      {/* Note-specific actions */}
      {target.type === 'note' && entry && (
        <>
          <button
            type="button"
            onClick={() => run(() => onSelectNote(entry.relativePath, false))}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-content-primary hover:bg-surface-secondary transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-accent shrink-0" />
            <span>Abrir nesta Guia</span>
          </button>
          <button
            type="button"
            onClick={() => run(() => onSelectNote(entry.relativePath, true))}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-content-primary hover:bg-surface-secondary transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-accent shrink-0" />
            <span>Abrir em Nova Guia</span>
          </button>
          {onDuplicateNote && (
            <button
              type="button"
              onClick={() => run(() => onDuplicateNote(entry.relativePath))}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-content-primary hover:bg-surface-secondary transition-colors"
            >
              <Copy className="w-3.5 h-3.5 text-content-secondary shrink-0" />
              <span>Duplicar Nota</span>
            </button>
          )}
          <div className="h-px bg-surface-border my-1" />
        </>
      )}

      {/* Image-specific actions */}
      {target.type === 'image' && entry && (
        <>
          <button
            type="button"
            onClick={() => run(() => onOpenImage?.(entry.relativePath, entry.name))}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-content-primary hover:bg-accent-soft hover:text-accent transition-colors"
          >
            <Eye className="w-3.5 h-3.5 text-accent shrink-0" />
            <span>Visualizar Imagem (Modal)</span>
          </button>
          <button
            type="button"
            onClick={() => run(() => onOpenOtherFile?.(entry.relativePath, entry.name))}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-content-primary hover:bg-surface-secondary transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-content-muted shrink-0" />
            <span>Abrir no Visualizador do Sistema</span>
          </button>
          <div className="h-px bg-surface-border my-1" />
        </>
      )}

      {/* Generic file-specific actions */}
      {target.type === 'file' && entry && (
        <>
          <button
            type="button"
            onClick={() => run(() => onOpenOtherFile?.(entry.relativePath, entry.name))}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-content-primary hover:bg-surface-secondary transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-accent shrink-0" />
            <span>Abrir com Aplicativo Padrão</span>
          </button>
          <div className="h-px bg-surface-border my-1" />
        </>
      )}

      {/* Creation Actions in the target directory */}
      <button
        type="button"
        onClick={() => run(() => onCreateNoteInFolder(targetFolderRel))}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-content-primary hover:bg-surface-secondary transition-colors text-left"
      >
        <FilePlus2 className="w-3.5 h-3.5 text-accent shrink-0" />
        <span className="truncate">Nova Nota {locationLabel}</span>
      </button>

      <button
        type="button"
        onClick={() => run(() => onCreateFolderInParent(targetFolderRel))}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-content-primary hover:bg-surface-secondary transition-colors text-left"
      >
        <FolderPlus className="w-3.5 h-3.5 text-accent shrink-0" />
        <span className="truncate">Nova Pasta {locationLabel}</span>
      </button>

      {/* Rename, Explore & Delete for items */}
      {entry && (
        <>
          <div className="h-px bg-surface-border my-1" />

          <button
            type="button"
            onClick={() => run(() => onRenameEntry(entry.relativePath, entry.name))}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-content-primary hover:bg-surface-secondary transition-colors"
          >
            <Pencil className="w-3.5 h-3.5 text-content-secondary shrink-0" />
            <span>Renomear {getEntryTypeLabel()}</span>
          </button>

          <button
            type="button"
            onClick={() => run(() => onOpenInExplorer(targetFolderRel))}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-content-primary hover:bg-surface-secondary transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-content-secondary shrink-0" />
            <span>Mostrar no Explorer</span>
          </button>

          <div className="h-px bg-surface-border my-1" />

          <button
            type="button"
            onClick={() => run(() => onDeleteEntry(entry.relativePath, entry.name))}
            title="Mover para a Lixeira do Sistema Operacional"
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-500 hover:bg-rose-500/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5 shrink-0" />
            <span>Mover para a Lixeira</span>
          </button>
        </>
      )}

      {/* Root-specific actions */}
      {target.type === 'root' && (
        <>
          <div className="h-px bg-surface-border my-1" />
          <button
            type="button"
            onClick={() => run(onRefreshVault)}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-content-primary hover:bg-surface-secondary transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-content-secondary shrink-0" />
            <span>Sincronizar Diretório</span>
          </button>
          <button
            type="button"
            onClick={() => run(() => onOpenInExplorer(''))}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-content-primary hover:bg-surface-secondary transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-content-secondary shrink-0" />
            <span>Abrir no Windows Explorer</span>
          </button>
        </>
      )}
    </div>
  )
}
