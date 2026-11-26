import React, { useState, useMemo, useEffect, useRef } from 'react'
import {
  Link2,
  ArrowUpRight,
  ListTree,
  MessageSquareText,
  AudioLines,
  PanelRight,
  FileText,
  PlusCircle,
  ChevronDown,
  ChevronRight,
  UnfoldVertical,
  FoldVertical
} from 'lucide-react'
import type { VaultNoteData } from '../../../../preload/index.d'
import type { IndexedNoteMeta, NoteHeading } from '../../types/app'
import { extractHeadings, resolveWikiLinkTarget } from '../../services/noteIndexer'
import { IconButton } from '../ui/IconButton'
import { SelectionButton } from '../ui/SelectionButton'
import { useSideNotes } from '../editor/useSideNotes'
import { AudioLibraryPanel } from './AudioLibraryPanel'
import { extractVaultAudioReferences, type VaultAudioReference } from '../../services/vaultAudioReferences'

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

type SidebarTab = 'connections' | 'outline' | 'audio' | 'observations'

const SIDEBAR_TAB_ORDER_KEY = 'notes-md:right-sidebar-tab-order:v1'
const SIDEBAR_SPLIT_RATIO_KEY = 'notes-md:right-sidebar-split-ratio:v1'
const DEFAULT_SIDEBAR_TAB_ORDER: SidebarTab[] = ['connections', 'outline', 'audio', 'observations']

function loadSidebarTabOrder(): SidebarTab[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(SIDEBAR_TAB_ORDER_KEY) ?? 'null')
    if (
      Array.isArray(saved) &&
      saved.length === DEFAULT_SIDEBAR_TAB_ORDER.length &&
      saved.every((tab): tab is SidebarTab => DEFAULT_SIDEBAR_TAB_ORDER.includes(tab)) &&
      new Set(saved).size === DEFAULT_SIDEBAR_TAB_ORDER.length
    ) {
      return [
        ...saved.filter((tab) => DEFAULT_SIDEBAR_TAB_ORDER.slice(0, 2).includes(tab)),
        ...saved.filter((tab) => DEFAULT_SIDEBAR_TAB_ORDER.slice(2).includes(tab))
      ]
    }
  } catch {
    // Restore the default grouping when saved preferences cannot be read.
  }
  return [...DEFAULT_SIDEBAR_TAB_ORDER]
}

function loadSidebarSplitRatio(): number {
  try {
    const value = Number(localStorage.getItem(SIDEBAR_SPLIT_RATIO_KEY))
    if (Number.isFinite(value) && value >= 0.2 && value <= 0.8) return value
  } catch {
    // Use the default split if the saved preference cannot be read.
  }
  return 0.56
}

function loadSidebarPanelTab(panel: 'top' | 'bottom', order: SidebarTab[]): SidebarTab {
  const allowedTabs = panel === 'top' ? order.slice(0, 2) : order.slice(2)
  const key = `notes-md:right-sidebar-${panel}-tab:v1`
  try {
    const saved = localStorage.getItem(key) as SidebarTab | null
    if (saved && allowedTabs.includes(saved)) return saved
    const legacyTab = localStorage.getItem('notes-md:right-sidebar-tab') as SidebarTab | null
    if (legacyTab && allowedTabs.includes(legacyTab)) return legacyTab
  } catch {
    // Use the first tab in this panel if the saved selection cannot be read.
  }
  return allowedTabs[0]
}

interface HeadingTreeItemProps {
  node: HeadingTreeNode
  collapsedNodes: Record<string, boolean>
  onToggleCollapse: (id: string) => void
  onNavigate: (node: HeadingTreeNode) => void
  activeIndex: number
  depth?: number
}

const HeadingTreeItem: React.FC<HeadingTreeItemProps> = ({
  node,
  collapsedNodes,
  onToggleCollapse,
  onNavigate,
  activeIndex,
  depth = 0
}) => {
  const hasChildren = node.children.length > 0
  const isCollapsed = Boolean(collapsedNodes[node.id])
  const isActive = node.index === activeIndex

  return (
    <div className="flex flex-col">
      <div
        role="button"
        aria-current={isActive ? 'location' : undefined}
        data-active-heading={isActive ? 'true' : undefined}
        tabIndex={0}
        onClick={() => onNavigate(node)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onNavigate(node)
          }
        }}
        title={`Ir para "${node.text}" (H${node.level})`}
        className={`flex items-center gap-1.5 py-1 px-1.5 rounded-sm text-xs group cursor-pointer transition-colors select-none ${
          isActive
            ? 'bg-accent-soft text-accent font-semibold'
            : node.level === 1
            ? 'text-content-primary font-semibold hover:bg-surface-tertiary'
            : node.level === 2
            ? 'text-content-primary/90 font-medium hover:bg-surface-tertiary'
            : 'text-content-secondary hover:text-content-primary hover:bg-surface-tertiary'
        }`}
      >
        {/* Toggle chevron or bullet */}
        {hasChildren ? (
          <SelectionButton
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
          </SelectionButton>
        ) : (
          <span className="w-4 h-4 flex items-center justify-center shrink-0">
            <span className="w-1.5 h-1.5 rounded-sm bg-content-muted/30 group-hover:bg-accent/60 transition-colors" />
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
          <span className="text-[10px] px-1.5 py-0.2 rounded-sm bg-surface-tertiary text-content-muted font-normal shrink-0">
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
              activeIndex={activeIndex}
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
  vaultPath: string
  onObservationsPanelTarget: (element: HTMLDivElement | null) => void
  vaultName?: string
  activeNote: VaultNoteData | null
  activePaneId: 'pane-1' | 'pane-2'
  noteMeta?: IndexedNoteMeta
  allNotes: VaultNoteData[]
  onSaveContent: (relativePath: string, newMarkdown: string) => Promise<void>
  onOpenNoteByPath: (relativePath: string, openInNewTab?: boolean) => void
  onNavigateAudio: (audio: VaultAudioReference) => void
  onNavigateWikiLink: (targetTitle: string, openInNewTab?: boolean) => void
  onHoverTarget?: (targetName: string, rect: DOMRect, isCtrlDown: boolean) => void
  onLeaveTarget?: () => void
  onCloseSidebar?: () => void
}

export const BacklinksSidebar: React.FC<BacklinksSidebarProps> = ({
  width,
  vaultPath,
  onObservationsPanelTarget,
  activeNote,
  activePaneId,
  noteMeta,
  allNotes,
  onSaveContent,
  onOpenNoteByPath,
  onNavigateAudio,
  onNavigateWikiLink,
  onHoverTarget,
  onLeaveTarget,
  onCloseSidebar
}) => {
  const { notes: observations } = useSideNotes(vaultPath)
  const [sidebarTabOrder, setSidebarTabOrder] = useState<SidebarTab[]>(loadSidebarTabOrder)
  const [topPanelTab, setTopPanelTab] = useState<SidebarTab>(() => loadSidebarPanelTab('top', loadSidebarTabOrder()))
  const [bottomPanelTab, setBottomPanelTab] = useState<SidebarTab>(() => loadSidebarPanelTab('bottom', loadSidebarTabOrder()))
  const [sidebarSplitRatio, setSidebarSplitRatio] = useState(loadSidebarSplitRatio)
  const [draggedSidebarTab, setDraggedSidebarTab] = useState<SidebarTab | null>(null)
  const [dragOverSidebarTab, setDragOverSidebarTab] = useState<SidebarTab | null>(null)

  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({})
  const [activeHeadingIndex, setActiveHeadingIndex] = useState(-1)
  const outlineRef = useRef<HTMLDivElement>(null)
  const sidebarRef = useRef<HTMLElement>(null)
  const topPanelHeaderRef = useRef<HTMLDivElement>(null)
  const bottomPanelHeaderRef = useRef<HTMLDivElement>(null)
  const sidebarSplitterRef = useRef<HTMLDivElement>(null)
  const sidebarSplitRatioRef = useRef(sidebarSplitRatio)
  sidebarSplitRatioRef.current = sidebarSplitRatio

  useEffect(() => {
    const updateActiveHeading = (): void => {
      const pane = document.querySelector<HTMLElement>('[data-active-editor-pane="true"]')
      if (!pane) return
      const focused = document.activeElement
      if (focused instanceof HTMLTextAreaElement && pane.contains(focused)) {
        setActiveHeadingIndex(extractHeadings(focused.value.slice(0, focused.selectionStart)).length - 1)
        return
      }
      const selection = document.getSelection()
      const anchor = selection?.anchorNode
      const editor = pane.querySelector('.ProseMirror')
      if (!anchor || !editor?.contains(anchor)) return
      const range = selection!.getRangeAt(0).cloneRange()
      range.collapse(true)
      const headings = Array.from(editor.querySelectorAll('h1, h2, h3, h4, h5, h6'))
      let index = -1
      headings.forEach((heading, i) => {
        const headingRange = document.createRange()
        headingRange.selectNodeContents(heading)
        headingRange.collapse(true)
        if (headingRange.compareBoundaryPoints(Range.START_TO_START, range) <= 0) index = i
      })
      setActiveHeadingIndex(index)
    }
    setActiveHeadingIndex(-1)
    updateActiveHeading()
    document.addEventListener('selectionchange', updateActiveHeading)
    document.addEventListener('keyup', updateActiveHeading)
    document.addEventListener('click', updateActiveHeading)
    return () => {
      document.removeEventListener('selectionchange', updateActiveHeading)
      document.removeEventListener('keyup', updateActiveHeading)
      document.removeEventListener('click', updateActiveHeading)
    }
  }, [activeNote?.fullPath, activePaneId])

  useEffect(() => {
    outlineRef.current?.querySelector<HTMLElement>('[data-active-heading="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [activeHeadingIndex, topPanelTab, collapsedNodes])

  const handleSelectTab = (tab: SidebarTab): void => {
    const isTopTab = sidebarTabOrder.slice(0, 2).includes(tab)
    if (isTopTab) setTopPanelTab(tab)
    else setBottomPanelTab(tab)
    try {
      localStorage.setItem('notes-md:right-sidebar-tab', tab)
      localStorage.setItem(`notes-md:right-sidebar-${isTopTab ? 'top' : 'bottom'}-tab:v1`, tab)
    } catch {
      // ignore
    }
  }

  const headingTree = useMemo(() => {
    if (!noteMeta?.headings?.length) return []
    return buildHeadingTree(noteMeta.headings)
  }, [noteMeta?.headings])

  useEffect(() => {
    if (activeHeadingIndex < 0) return
    const findAncestors = (nodes: HeadingTreeNode[], parents: string[]): string[] | null => {
      for (const node of nodes) {
        if (node.index === activeHeadingIndex) return parents
        const found = findAncestors(node.children, [...parents, node.id])
        if (found) return found
      }
      return null
    }
    const ancestors = findAncestors(headingTree, [])
    if (!ancestors?.length) return
    setCollapsedNodes((previous) => {
      if (!ancestors.some((id) => previous[id])) return previous
      const next = { ...previous }
      ancestors.forEach((id) => { delete next[id] })
      return next
    })
  }, [activeHeadingIndex, headingTree])

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
        '[data-active-editor-pane="true"] .ProseMirror :is(h1, h2, h3, h4, h5, h6)'
      )
    )

    let target: HTMLElement | undefined = elements[node.index]
    if (!target || target.textContent?.trim() !== node.text.trim()) {
      target = elements.find((el) => el.textContent?.trim() === node.text.trim())
    }

    if (target) {
      const range = document.createRange()
      range.selectNodeContents(target)
      range.collapse(true)
      const selection = document.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(range)
      setActiveHeadingIndex(node.index)
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
      target.classList.remove('heading-target-pulse')
      void target.offsetWidth // force reflow
      target.classList.add('heading-target-pulse')
      window.setTimeout(() => {
        target?.classList.remove('heading-target-pulse')
      }, 1500)
    }
  }

  const isCompact = typeof width === 'number' && width < 260
  const isIconOnly = typeof width === 'number' && width < 350
  const linksCount = noteMeta ? noteMeta.backlinks.length + noteMeta.outgoingLinks.length : 0
  const headingsCount = noteMeta ? noteMeta.headings.length : 0
  const observationsCount = activeNote ? observations.filter((note) => note.sourcePath === activeNote.relativePath).length : 0
  const audioCount = activeNote ? extractVaultAudioReferences([activeNote]).length : 0

  const reorderSidebarTab = (source: SidebarTab, target: SidebarTab): void => {
    if (source === target) return
    const next = [...sidebarTabOrder]
    const sourceIndex = next.indexOf(source)
    const targetIndex = next.indexOf(target)
    if (sourceIndex < 0 || targetIndex < 0) return
    if ((sourceIndex < 2) !== (targetIndex < 2)) return
    next.splice(sourceIndex, 1)
    next.splice(targetIndex, 0, source)
    setSidebarTabOrder(next)
    const nextTopTabs = next.slice(0, 2)
    const nextBottomTabs = next.slice(2)
    if (!nextTopTabs.includes(topPanelTab)) {
      const nextTab = nextTopTabs[0]
      setTopPanelTab(nextTab)
      try { localStorage.setItem('notes-md:right-sidebar-top-tab:v1', nextTab) } catch {}
    }
    if (!nextBottomTabs.includes(bottomPanelTab)) {
      const nextTab = nextBottomTabs[0]
      setBottomPanelTab(nextTab)
      try { localStorage.setItem('notes-md:right-sidebar-bottom-tab:v1', nextTab) } catch {}
    }
    try {
      localStorage.setItem(SIDEBAR_TAB_ORDER_KEY, JSON.stringify(next))
    } catch {
      // Keep the reordered tabs for the current session if storage is unavailable.
    }
  }

  const handleStartSidebarSplitResize = (event: React.MouseEvent<HTMLDivElement>): void => {
    event.preventDefault()
    const sidebar = sidebarRef.current
    if (!sidebar) return
    const bounds = sidebar.getBoundingClientRect()
    const onMouseMove = (moveEvent: MouseEvent): void => {
      const topHeaderHeight = topPanelHeaderRef.current?.offsetHeight ?? 0
      const bottomHeaderHeight = bottomPanelHeaderRef.current?.offsetHeight ?? 0
      const splitterHeight = sidebarSplitterRef.current?.offsetHeight ?? 0
      const availableHeight = Math.max(1, bounds.height - topHeaderHeight - bottomHeaderHeight - splitterHeight)
      const positionInContent = moveEvent.clientY - bounds.top - topHeaderHeight - splitterHeight / 2
      const nextRatio = Math.max(0.2, Math.min(0.8, positionInContent / availableHeight))
      sidebarSplitRatioRef.current = nextRatio
      setSidebarSplitRatio(nextRatio)
    }
    const onMouseUp = (): void => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      try { localStorage.setItem(SIDEBAR_SPLIT_RATIO_KEY, String(sidebarSplitRatioRef.current)) } catch {}
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  const resizeSidebarSplitByKeyboard = (delta: number): void => {
    const nextRatio = Math.max(0.2, Math.min(0.8, sidebarSplitRatio + delta))
    sidebarSplitRatioRef.current = nextRatio
    setSidebarSplitRatio(nextRatio)
    try { localStorage.setItem(SIDEBAR_SPLIT_RATIO_KEY, String(nextRatio)) } catch {}
  }

  const renderSidebarTab = (tab: SidebarTab, isActive: boolean): React.ReactElement => {
    const config = {
      connections: { label: 'Links', ariaLabel: `Links e Conexões (${linksCount})`, count: linksCount, icon: <Link2 className="h-3.5 w-3.5 shrink-0" /> },
      outline: { label: 'Sumário', ariaLabel: `Sumário da Nota (${headingsCount})`, count: headingsCount, icon: <ListTree className="h-3.5 w-3.5 shrink-0" /> },
      audio: { label: 'Áudios', ariaLabel: `Áudios da nota (${audioCount})`, count: audioCount, icon: <AudioLines className="h-3.5 w-3.5 shrink-0" /> },
      observations: { label: 'Observações', ariaLabel: `Observações da nota (${observationsCount})`, count: observationsCount, icon: <MessageSquareText className="h-3.5 w-3.5 shrink-0" /> }
    }[tab]
    const isDropTarget = dragOverSidebarTab === tab && draggedSidebarTab !== tab

    return (
      <SelectionButton
        key={tab}
        type="button"
        draggable
        aria-label={config.ariaLabel}
        aria-pressed={isActive}
        title={`${config.ariaLabel} · Arraste para reordenar`}
        onClick={() => handleSelectTab(tab)}
        onDragStart={(event) => {
          event.dataTransfer.setData('application/notes-md-sidebar-tab', tab)
          event.dataTransfer.effectAllowed = 'move'
          setDraggedSidebarTab(tab)
        }}
        onDragEnd={() => { setDraggedSidebarTab(null); setDragOverSidebarTab(null) }}
        onDragOver={(event) => {
          const sourceIndex = draggedSidebarTab ? sidebarTabOrder.indexOf(draggedSidebarTab) : -1
          const targetIndex = sidebarTabOrder.indexOf(tab)
          if (
            event.dataTransfer.types.includes('application/notes-md-sidebar-tab') &&
            sourceIndex >= 0 &&
            (sourceIndex < 2) === (targetIndex < 2)
          ) {
            event.preventDefault()
            event.dataTransfer.dropEffect = 'move'
            setDragOverSidebarTab(tab)
          }
        }}
        onDragLeave={() => setDragOverSidebarTab((current) => current === tab ? null : current)}
        onDrop={(event) => {
          const source = event.dataTransfer.getData('application/notes-md-sidebar-tab') as SidebarTab
          if (!DEFAULT_SIDEBAR_TAB_ORDER.includes(source)) return
          event.preventDefault()
          event.stopPropagation()
          reorderSidebarTab(source, tab)
          setDraggedSidebarTab(null)
          setDragOverSidebarTab(null)
        }}
        className={`flex min-w-0 items-center justify-center gap-1.5 rounded-sm px-2 py-1.5 text-xs font-semibold transition-colors ${
          isActive ? 'bg-accent-soft text-accent' : 'text-content-secondary hover:bg-surface-tertiary'
        } ${isDropTarget ? 'ring-1 ring-accent/50' : ''} ${draggedSidebarTab === tab ? 'opacity-50' : ''}`}
      >
        {config.icon}
        {!isIconOnly && <span className="truncate">{config.label} ({config.count})</span>}
      </SelectionButton>
    )
  }

  return (
    <aside
      ref={sidebarRef}
      style={{ width: width ? `${width}px` : undefined }}
      className="w-72 shrink-0 h-full bg-surface-secondary border-l border-surface-border flex flex-col select-none"
    >
      <section
        style={{ flex: `${sidebarSplitRatio} 1 0%` }}
        className="flex min-h-0 flex-col overflow-hidden"
      >
        <div ref={topPanelHeaderRef} className="relative shrink-0 border-b border-surface-border bg-surface-bg/50 p-2">
          <div className={`grid grid-cols-2 gap-1.5 ${onCloseSidebar ? 'pr-7' : ''}`}>
            {sidebarTabOrder.slice(0, 2).map((tab) => renderSidebarTab(tab, topPanelTab === tab))}
          </div>
          {onCloseSidebar && (
            <IconButton
              variant="ghost"
              size="sm"
              className="absolute right-2 top-2"
              onClick={onCloseSidebar}
              tooltip="Ocultar Painel Direito"
              icon={<PanelRight className="h-4 w-4 text-content-secondary hover:text-content-primary" />}
            />
          )}
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          {!activeNote || !noteMeta ? (
            <div className="flex flex-1 flex-col items-center justify-center p-4 text-center text-xs text-content-muted">
              Abra uma nota para visualizar suas conexões e sumário.
            </div>
          ) : topPanelTab === 'connections' ? (
            <div className="flex-1 overflow-y-auto p-3 space-y-5">
          {/* Backlinks Section (Notes that link TO this note) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-content-muted">
                {!isCompact ? 'Backlinks (Citam esta nota)' : 'Backlinks'}
              </span>
              <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-bold bg-accent-soft text-accent">
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
                    className="w-full text-left p-2.5 rounded-sm bg-surface-bg border border-surface-border hover:border-accent/60 transition-all group space-y-1.5 shadow-2xs cursor-pointer select-none"
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
              <div className="px-2 py-3 border-l border-surface-border text-xs text-content-muted leading-relaxed">
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
                {!isCompact ? 'Links de Saída (Citadas aqui)' : 'Links de Saída'}
              </span>
              <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-bold bg-surface-tertiary text-content-secondary">
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
                      className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-sm bg-surface-bg border border-surface-border hover:border-accent/60 text-left transition-colors cursor-pointer select-none"
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
              <div className="px-2 py-3 border-l border-surface-border text-xs text-content-muted leading-relaxed">
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
                {!isCompact ? 'Estrutura de Tópicos' : 'Tópicos'}
              </span>
              <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-bold bg-accent-soft text-accent">
                {noteMeta.headings.length}
              </span>
            </div>

            {hasHeadingsWithChildren && (
              <div className="flex items-center gap-1">
                <SelectionButton
                  type="button"
                  onClick={handleExpandAll}
                  title="Expandir todos os tópicos"
                  className="p-1 rounded text-content-muted hover:text-content-primary hover:bg-surface-tertiary transition-colors"
                >
                  <UnfoldVertical className="w-3.5 h-3.5" />
                </SelectionButton>
                <SelectionButton
                  type="button"
                  onClick={handleCollapseAll}
                  title="Recolher todos os tópicos"
                  className="p-1 rounded text-content-muted hover:text-content-primary hover:bg-surface-tertiary transition-colors"
                >
                  <FoldVertical className="w-3.5 h-3.5" />
                </SelectionButton>
              </div>
            )}
          </div>

          <div ref={outlineRef} className="flex-1 overflow-y-auto p-3 space-y-1">
            {headingTree.length > 0 ? (
              headingTree.map((node) => (
                <HeadingTreeItem
                  key={node.id}
                  node={node}
                  collapsedNodes={collapsedNodes}
                  onToggleCollapse={handleToggleCollapse}
                  onNavigate={handleNavigateToHeading}
                  activeIndex={activeHeadingIndex}
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
        </div>
      </section>

      <div
        ref={sidebarSplitterRef}
        role="separator"
        aria-label="Redimensionar painéis do painel direito"
        aria-orientation="horizontal"
        aria-valuemin={20}
        aria-valuemax={80}
        aria-valuenow={Math.round(sidebarSplitRatio * 100)}
        tabIndex={0}
        onMouseDown={handleStartSidebarSplitResize}
        onDoubleClick={() => resizeSidebarSplitByKeyboard(0.56 - sidebarSplitRatio)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowUp') { event.preventDefault(); resizeSidebarSplitByKeyboard(-0.02) }
          else if (event.key === 'ArrowDown') { event.preventDefault(); resizeSidebarSplitByKeyboard(0.02) }
          else if (event.key === 'Home') { event.preventDefault(); resizeSidebarSplitByKeyboard(0.2 - sidebarSplitRatio) }
          else if (event.key === 'End') { event.preventDefault(); resizeSidebarSplitByKeyboard(0.8 - sidebarSplitRatio) }
        }}
        className="group relative z-10 flex h-1.5 shrink-0 cursor-row-resize touch-none items-center justify-center bg-surface-border/50 transition-colors hover:bg-accent/50 active:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        <div className="h-0.5 w-8 rounded-full bg-content-muted/50 transition-colors group-hover:bg-accent group-active:bg-accent" />
      </div>

      <section
        style={{ flex: `${1 - sidebarSplitRatio} 1 0%` }}
        className="flex min-h-0 flex-col overflow-hidden"
      >
        <div ref={bottomPanelHeaderRef} className="shrink-0 border-b border-surface-border bg-surface-bg/50 p-2">
          <div className="grid grid-cols-2 gap-1.5">
            {sidebarTabOrder.slice(2).map((tab) => renderSidebarTab(tab, bottomPanelTab === tab))}
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          {bottomPanelTab === 'observations' ? (
            <div ref={onObservationsPanelTarget} className="flex min-h-0 flex-1 flex-col select-text">
              {!activeNote && <div className="flex flex-1 items-center justify-center p-4 text-center text-xs text-content-muted">Abra uma nota para consultar suas observações.</div>}
            </div>
          ) : bottomPanelTab === 'audio' ? (
            <AudioLibraryPanel activeNote={activeNote} allNotes={allNotes} onNavigateAudio={onNavigateAudio} onSaveContent={onSaveContent} />
          ) : (
            <div className="flex flex-1 items-center justify-center p-4 text-center text-xs text-content-muted">
              Escolha Links ou Sumário na parte superior para visualizar este painel.
            </div>
          )}
        </div>
      </section>
    </aside>
  )
}
