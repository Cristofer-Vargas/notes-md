import React, { useState, useMemo } from 'react'
import {
  Link2,
  ArrowUpRight,
  ListTree,
  Sparkles,
  FileText,
  PlusCircle,
  ChevronDown,
  ChevronRight,
  UnfoldVertical,
  FoldVertical
} from 'lucide-react'
import type { VaultNoteData } from '../../../../preload/index.d'
import type { IndexedNoteMeta, NoteHeading } from '../../types/app'
import { resolveWikiLinkTarget } from '../../services/noteIndexer'

export interface HeadingTreeNode extends NoteHeading {
  index: number
  children: HeadingTreeNode[]
}

export function buildHeadingTree(headings: NoteHeading[]): HeadingTreeNode[] {
  const root: HeadingTreeNode[] = []
  const stack: HeadingTreeNode[] = []

  headings.forEach((h, index) => {
    const node: HeadingTreeNode = { ...h, index, children: [] }
    while (stack.length > 0 && stack[stack.length - 1].level >= node.level) {
      stack.pop()
    }
    if (stack.length === 0) {
      root.push(node)
    } else {
      stack[stack.length - 1].children.push(node)
    }
    stack.push(node)
  })

  return root
}

const getHeadingBadgeClass = (level: number): string => {
  switch (level) {
    case 1:
      return 'bg-accent/15 text-accent font-bold'
    case 2:
      return 'bg-surface-tertiary text-content-primary font-semibold'
    case 3:
      return 'bg-surface-tertiary text-content-secondary font-medium'
    default:
      return 'bg-surface-tertiary/60 text-content-muted font-normal'
  }
}

interface HeadingTreeItemProps {
  node: HeadingTreeNode
  collapsedNodes: Record<string, boolean>
  onToggleCollapse: (id: string) => void
  onNavigate: (node: HeadingTreeNode) => void
  depth?: number
}

const HeadingTreeItem: React.FC<HeadingTreeItemProps> = ({
  node,
  collapsedNodes,
  onToggleCollapse,
  onNavigate,
  depth = 0
}) => {
  const hasChildren = node.children.length > 0
  const isCollapsed = Boolean(collapsedNodes[node.id])

  return (
    <div className="flex flex-col">
      <div
        role="button"
        tabIndex={0}
        onClick={() => onNavigate(node)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onNavigate(node)
          }
        }}
        title={`Ir para "${node.text}" (H${node.level})`}
        className={`flex items-center gap-1.5 py-1 px-1.5 rounded-lg text-xs group cursor-pointer transition-colors select-none ${
          node.level === 1
            ? 'text-content-primary font-semibold hover:bg-surface-tertiary'
            : node.level === 2
            ? 'text-content-primary/90 font-medium hover:bg-surface-tertiary'
            : 'text-content-secondary hover:text-content-primary hover:bg-surface-tertiary'
        }`}
      >
        {/* Toggle chevron or bullet */}
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onToggleCollapse(node.id)
            }}
            title={isCollapsed ? 'Expandir subtópicos' : 'Recolher subtópicos'}
            className="w-4 h-4 flex items-center justify-center rounded text-content-muted hover:text-content-primary hover:bg-surface-bg transition-colors shrink-0"
          >
            {isCollapsed ? (
              <ChevronRight className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        ) : (
          <span className="w-4 h-4 flex items-center justify-center shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-content-muted/30 group-hover:bg-accent/60 transition-colors" />
          </span>
        )}

        {/* Level badge */}
        <span
          className={`text-[9px] px-1 py-0.5 rounded leading-none shrink-0 uppercase tracking-wider ${getHeadingBadgeClass(
            node.level
          )}`}
        >
          H{node.level}
        </span>

        {/* Text */}
        <span className="truncate flex-1">{node.text}</span>

        {/* Subitems count when collapsed */}
        {hasChildren && isCollapsed && (
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-surface-tertiary text-content-muted font-normal shrink-0">
            {node.children.length}
          </span>
        )}
      </div>

      {/* Children recursive tree with cascading vertical guide line */}
      {hasChildren && !isCollapsed && (
        <div className="pl-2 ml-2.5 border-l border-surface-border/70 flex flex-col space-y-0.5 mt-0.5">
          {node.children.map((child) => (
            <HeadingTreeItem
              key={child.id}
              node={child}
              collapsedNodes={collapsedNodes}
              onToggleCollapse={onToggleCollapse}
              onNavigate={onNavigate}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface BacklinksSidebarProps {
  width?: number
  vaultName?: string
  activeNote: VaultNoteData | null
  noteMeta?: IndexedNoteMeta
  allNotes: VaultNoteData[]
  onOpenNoteByPath: (relativePath: string, openInNewTab?: boolean) => void
  onNavigateWikiLink: (targetTitle: string, openInNewTab?: boolean) => void
  onHoverTarget?: (targetName: string, rect: DOMRect, isCtrlDown: boolean) => void
  onLeaveTarget?: () => void
}

export const BacklinksSidebar: React.FC<BacklinksSidebarProps> = ({
  width,
  activeNote,
  noteMeta,
  allNotes,
  onOpenNoteByPath,
  onNavigateWikiLink,
  onHoverTarget,
  onLeaveTarget
}) => {
  const [activeTab, setActiveTab] = useState<'connections' | 'outline'>(() => {
    try {
      const saved = localStorage.getItem('notes-md:right-sidebar-tab')
      if (saved === 'connections' || saved === 'outline') return saved
    } catch {
      // ignore
    }
    return 'connections'
  })

  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({})

  const handleSelectTab = (tab: 'connections' | 'outline'): void => {
    setActiveTab(tab)
    try {
      localStorage.setItem('notes-md:right-sidebar-tab', tab)
    } catch {
      // ignore
    }
  }

  const headingTree = useMemo(() => {
    if (!noteMeta?.headings?.length) return []
    return buildHeadingTree(noteMeta.headings)
  }, [noteMeta?.headings])

  const hasHeadingsWithChildren = useMemo(() => {
    const checkHasChildren = (nodes: HeadingTreeNode[]): boolean => {
      return nodes.some((n) => n.children.length > 0 || checkHasChildren(n.children))
    }
    return checkHasChildren(headingTree)
  }, [headingTree])

  const handleToggleCollapse = (nodeId: string): void => {
    setCollapsedNodes((prev) => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }))
  }

  const handleExpandAll = (): void => {
    setCollapsedNodes({})
  }

  const handleCollapseAll = (): void => {
    const next: Record<string, boolean> = {}
    const collectBranchIds = (nodes: HeadingTreeNode[]): void => {
      for (const n of nodes) {
        if (n.children.length > 0) {
          next[n.id] = true
          collectBranchIds(n.children)
        }
      }
    }
    collectBranchIds(headingTree)
    setCollapsedNodes(next)
  }

  const handleNavigateToHeading = (node: HeadingTreeNode): void => {
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>(
        '.ProseMirror h1, .ProseMirror h2, .ProseMirror h3, .ProseMirror h4, .ProseMirror h5, .ProseMirror h6'
      )
    )

    let target: HTMLElement | undefined = elements[node.index]
    if (!target || target.textContent?.trim() !== node.text.trim()) {
      target = elements.find((el) => el.textContent?.trim() === node.text.trim())
    }

    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
      target.classList.remove('heading-target-pulse')
      void target.offsetWidth // force reflow
      target.classList.add('heading-target-pulse')
      window.setTimeout(() => {
        target?.classList.remove('heading-target-pulse')
      }, 1500)
    }
  }

  return (
    <aside
      style={{ width: width ? `${width}px` : undefined }}
      className="w-72 shrink-0 h-full bg-surface-secondary border-l border-surface-border flex flex-col select-none"
    >
      {/* Header Tabs (Links & Sumário) */}
      <div className="p-2 border-b border-surface-border flex items-center gap-1.5 bg-surface-bg/50">
        <button
          type="button"
          onClick={() => handleSelectTab('connections')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'connections'
              ? 'bg-accent-soft text-accent'
              : 'text-content-secondary hover:bg-surface-tertiary'
          }`}
        >
          <Link2 className="w-3.5 h-3.5 shrink-0" />
          <span>
            Links ({noteMeta ? noteMeta.backlinks.length + noteMeta.outgoingLinks.length : 0})
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectTab('outline')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'outline'
              ? 'bg-accent-soft text-accent'
              : 'text-content-secondary hover:bg-surface-tertiary'
          }`}
        >
          <ListTree className="w-3.5 h-3.5 shrink-0" />
          <span>Sumário ({noteMeta ? noteMeta.headings.length : 0})</span>
        </button>
      </div>

      {!activeNote || !noteMeta ? (
        <div className="flex-1 p-4 flex flex-col items-center justify-center text-center text-xs text-content-muted">
          Abra uma nota para visualizar suas conexões e sumário.
        </div>
      ) : activeTab === 'connections' ? (
        <div className="flex-1 overflow-y-auto p-3 space-y-5">
          {/* Backlinks Section (Notes that link TO this note) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-content-muted">
                Backlinks (Citam esta nota)
              </span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-accent-soft text-accent">
                {noteMeta.backlinks.length}
              </span>
            </div>

            {noteMeta.backlinks.length > 0 ? (
              <div className="space-y-2">
                {noteMeta.backlinks.map((item, idx) => (
                  <div
                    key={`${item.sourceRelativePath}-${idx}`}
                    role="button"
                    tabIndex={0}
                    draggable={true}
                    onDragStart={(e) => {
                      e.dataTransfer.setData(
                        'application/notes-md-entry',
                        JSON.stringify({ relativePath: item.sourceRelativePath, isDirectory: false })
                      )
                      e.dataTransfer.setData('text/plain', item.sourceRelativePath)
                      e.dataTransfer.effectAllowed = 'copyMove'
                    }}
                    onClick={() => onOpenNoteByPath(item.sourceRelativePath, false)}
                    onMouseDown={(e) => {
                      if (e.button === 1) e.preventDefault()
                    }}
                    onAuxClick={(e) => {
                      if (e.button === 1) {
                        e.preventDefault()
                        e.stopPropagation()
                        onOpenNoteByPath(item.sourceRelativePath, true)
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onOpenNoteByPath(item.sourceRelativePath, false)
                    }}
                    onMouseMove={(e) => {
                      onHoverTarget?.(
                        item.sourceRelativePath,
                        e.currentTarget.getBoundingClientRect(),
                        e.ctrlKey || e.metaKey
                      )
                    }}
                    onMouseLeave={() => {
                      onLeaveTarget?.()
                    }}
                    title={`${item.sourceName}\nClique esquerdo: abrir nesta guia • Botão do meio: abrir em nova guia • Ctrl + Hover: preview`}
                    className="w-full text-left p-2.5 rounded-xl bg-surface-bg border border-surface-border hover:border-accent/60 transition-all group space-y-1.5 shadow-2xs cursor-pointer select-none"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-content-primary group-hover:text-accent truncate">
                        <FileText className="w-3.5 h-3.5 text-accent shrink-0" />
                        {item.sourceName}
                      </span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-content-muted group-hover:text-accent shrink-0" />
                    </div>
                    <p className="text-[11px] text-content-secondary line-clamp-2 bg-surface-secondary px-2 py-1 rounded border border-surface-border/60">
                      &ldquo;{item.contextSnippet}&rdquo;
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-surface-bg/60 border border-dashed border-surface-border text-center text-xs text-content-muted">
                Nenhuma outra nota aponta para <strong>{activeNote.name}</strong> ainda.
                <div className="mt-1 text-[11px]">
                  Use <code>[[{activeNote.name}]]</code> em outra nota para conectá-las!
                </div>
              </div>
            )}
          </div>

          {/* Outgoing Links Section (Notes referenced FROM this note) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-content-muted">
                Links de Saída (Citadas aqui)
              </span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-surface-tertiary text-content-secondary">
                {noteMeta.outgoingLinks.length}
              </span>
            </div>

            {noteMeta.outgoingLinks.length > 0 ? (
              <div className="space-y-1.5">
                {noteMeta.outgoingLinks.map((out, idx) => {
                  const targetNote = resolveWikiLinkTarget(out.target, allNotes)
                  const targetExists = Boolean(targetNote)
                  return (
                    <div
                      key={`${out.target}-${idx}`}
                      role="button"
                      tabIndex={0}
                      draggable={targetExists}
                      onDragStart={(e) => {
                        if (targetNote) {
                          e.dataTransfer.setData(
                            'application/notes-md-entry',
                            JSON.stringify({ relativePath: targetNote.relativePath, isDirectory: false })
                          )
                          e.dataTransfer.setData('text/plain', targetNote.relativePath)
                          e.dataTransfer.effectAllowed = 'copyMove'
                        }
                      }}
                      onClick={() => onNavigateWikiLink(out.target, false)}
                      onMouseDown={(e) => {
                        if (e.button === 1) e.preventDefault()
                      }}
                      onAuxClick={(e) => {
                        if (e.button === 1) {
                          e.preventDefault()
                          e.stopPropagation()
                          onNavigateWikiLink(out.target, true)
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') onNavigateWikiLink(out.target, false)
                      }}
                      onMouseMove={(e) => {
                        onHoverTarget?.(
                          out.target,
                          e.currentTarget.getBoundingClientRect(),
                          e.ctrlKey || e.metaKey
                        )
                      }}
                      onMouseLeave={() => {
                        onLeaveTarget?.()
                      }}
                      title={`${out.alias || out.target}\nClique esquerdo: abrir nesta guia • Botão do meio: abrir em nova guia • Ctrl + Hover: preview`}
                      className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-surface-bg border border-surface-border hover:border-accent/60 text-left transition-colors cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {targetExists ? (
                          <FileText className="w-3.5 h-3.5 text-accent shrink-0" />
                        ) : (
                          <PlusCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-content-primary truncate">
                            {out.alias || out.target}
                          </div>
                          <div className="text-[10px] text-content-muted truncate">
                            {targetExists ? 'Nota existente' : 'Clique para criar nota'}
                          </div>
                        </div>
                      </div>
                      <ArrowUpRight className="w-3.5 h-3.5 text-content-muted shrink-0" />
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-surface-bg/60 border border-dashed border-surface-border text-center text-xs text-content-muted">
                Nenhum link <code>[[Nota]]</code> inserido nesta nota.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Outline / Hierarchical Table of Contents Section */
        <div className="flex-1 flex flex-col min-h-0">
          {/* Outline Toolbar */}
          <div className="px-3 py-2 border-b border-surface-border flex items-center justify-between gap-2 bg-surface-bg/30 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-content-muted">
                Estrutura de Tópicos
              </span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-accent-soft text-accent">
                {noteMeta.headings.length}
              </span>
            </div>

            {hasHeadingsWithChildren && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleExpandAll}
                  title="Expandir todos os tópicos"
                  className="p-1 rounded text-content-muted hover:text-content-primary hover:bg-surface-tertiary transition-colors"
                >
                  <UnfoldVertical className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleCollapseAll}
                  title="Recolher todos os tópicos"
                  className="p-1 rounded text-content-muted hover:text-content-primary hover:bg-surface-tertiary transition-colors"
                >
                  <FoldVertical className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {headingTree.length > 0 ? (
              headingTree.map((node) => (
                <HeadingTreeItem
                  key={node.id}
                  node={node}
                  collapsedNodes={collapsedNodes}
                  onToggleCollapse={handleToggleCollapse}
                  onNavigate={handleNavigateToHeading}
                />
              ))
            ) : (
              <div className="p-4 text-center text-xs text-content-muted">
                Adicione títulos (H1, H2, H3) no editor para gerar o sumário automático com navegação.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="p-2.5 border-t border-surface-border bg-surface-bg/40 flex items-center gap-2 text-[11px] text-content-muted">
        <Sparkles className="w-3.5 h-3.5 text-accent shrink-0" />
        <span>Sincronizado com o sistema de arquivos</span>
      </div>
    </aside>
  )
}
