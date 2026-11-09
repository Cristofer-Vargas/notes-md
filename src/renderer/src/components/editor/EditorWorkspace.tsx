import React, { useCallback, useRef, useState, useEffect } from 'react'
import type {
  AppSettings,
  EditorPaneState,
  IndexedNoteMeta,
  OpenTab,
  SplitLayoutMode
} from '../../types/app'
import type { VaultNoteData } from '../../../../preload/index.d'
import {
  EditorPaneView,
  type DraggedTabInfo,
  type DropZoneDirection
} from './EditorPaneView'

interface EditorWorkspaceProps {
  splitLayout: SplitLayoutMode
  onUpdateSplitLayout: (layout: SplitLayoutMode) => void
  splitRatio: number
  onUpdateSplitRatio: (ratio: number) => void
  pane1: EditorPaneState
  onUpdatePane1: (updater: (prev: EditorPaneState) => EditorPaneState) => void
  pane2: EditorPaneState
  onUpdatePane2: (updater: (prev: EditorPaneState) => EditorPaneState) => void
  activePaneId: 'pane-1' | 'pane-2'
  onSetActivePaneId: (paneId: 'pane-1' | 'pane-2') => void
  allNotes: VaultNoteData[]
  vaultIndex: Record<string, IndexedNoteMeta>
  settings: AppSettings
  isZenMode: boolean
  onSaveContent: (relativePath: string, content: string) => void
  onRenameActiveNote: (newTitle: string) => void
  onNavigateWikiLink: (target: string, openInNewTab?: boolean) => void
  onToggleZenMode: () => void
  onOpenHelpModal: () => void
  onUpdateSettings: (partial: Partial<AppSettings>) => void
  onOpenQuickSwitcher: () => void
  onCreateNotePrompt: (folderRelativePath?: string) => void
}

export const EditorWorkspace: React.FC<EditorWorkspaceProps> = ({
  splitLayout,
  onUpdateSplitLayout,
  splitRatio,
  onUpdateSplitRatio,
  pane1,
  onUpdatePane1,
  pane2,
  onUpdatePane2,
  activePaneId,
  onSetActivePaneId,
  allNotes,
  vaultIndex,
  settings,
  isZenMode,
  onSaveContent,
  onRenameActiveNote,
  onNavigateWikiLink,
  onToggleZenMode,
  onOpenHelpModal,
  onUpdateSettings,
  onOpenQuickSwitcher,
  onCreateNotePrompt
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const isResizingRef = useRef(false)
  const [draggedTabInfo, setDraggedTabInfo] = useState<DraggedTabInfo | null>(null)

  // Start Resizing between Pane 1 and Pane 2
  const handleStartResize = (e: React.MouseEvent): void => {
    e.preventDefault()
    isResizingRef.current = true

    const handleMouseMove = (moveEvent: MouseEvent): void => {
      if (!isResizingRef.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()

      if (splitLayout === 'horizontal') {
        const x = moveEvent.clientX - rect.left
        const rawRatio = x / rect.width
        const boundedRatio = Math.max(0.18, Math.min(0.82, rawRatio))
        onUpdateSplitRatio(boundedRatio)
      } else if (splitLayout === 'vertical') {
        const y = moveEvent.clientY - rect.top
        const rawRatio = y / rect.height
        const boundedRatio = Math.max(0.18, Math.min(0.82, rawRatio))
        onUpdateSplitRatio(boundedRatio)
      }
    }

    const handleMouseUp = (): void => {
      isResizingRef.current = false
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  // Double click divider to reset to 50/50
  const handleResetSplitRatio = (): void => {
    onUpdateSplitRatio(0.5)
  }

  // Select Tab within a Pane
  const handleSelectTab = (paneId: 'pane-1' | 'pane-2', relativePath: string): void => {
    onSetActivePaneId(paneId)
    if (paneId === 'pane-1') {
      onUpdatePane1((prev) => ({ ...prev, activeNotePath: relativePath }))
    } else {
      onUpdatePane2((prev) => ({ ...prev, activeNotePath: relativePath }))
    }
  }

  // Auto-collapse split layout whenever either pane becomes empty
  useEffect(() => {
    if (splitLayout === 'single') return

    if (pane2.tabs.length === 0 && pane1.tabs.length > 0) {
      onUpdateSplitLayout('single')
      onSetActivePaneId('pane-1')
    } else if (pane1.tabs.length === 0 && pane2.tabs.length > 0) {
      onUpdatePane1(() => ({
        id: 'pane-1',
        tabs: [...pane2.tabs],
        activeNotePath: pane2.activeNotePath
      }))
      onUpdatePane2(() => ({ id: 'pane-2', tabs: [], activeNotePath: null }))
      onUpdateSplitLayout('single')
      onSetActivePaneId('pane-1')
    } else if (pane1.tabs.length === 0 && pane2.tabs.length === 0) {
      onUpdateSplitLayout('single')
      onSetActivePaneId('pane-1')
    }
  }, [
    splitLayout,
    pane1.tabs.length,
    pane2.tabs.length,
    pane2.tabs,
    pane2.activeNotePath,
    onUpdatePane1,
    onUpdatePane2,
    onUpdateSplitLayout,
    onSetActivePaneId
  ])

  // Close Tab within a Pane
  const handleCloseTab = (
    paneId: 'pane-1' | 'pane-2',
    relativePath: string,
    e?: React.MouseEvent
  ): void => {
    if (e) e.stopPropagation()

    if (paneId === 'pane-1') {
      const remainingTabs = pane1.tabs.filter((t) => t.relativePath !== relativePath)

      if (remainingTabs.length === 0) {
        if (splitLayout !== 'single' && pane2.tabs.length > 0) {
          // Pane 1 became empty: transfer pane 2 to pane 1 and collapse to single
          onUpdatePane1(() => ({
            id: 'pane-1',
            tabs: [...pane2.tabs],
            activeNotePath: pane2.activeNotePath
          }))
          onUpdatePane2(() => ({ id: 'pane-2', tabs: [], activeNotePath: null }))
          onUpdateSplitLayout('single')
          onSetActivePaneId('pane-1')
        } else {
          onUpdatePane1((prev) => ({ ...prev, tabs: [], activeNotePath: null }))
          if (splitLayout !== 'single') {
            onUpdateSplitLayout('single')
            onSetActivePaneId('pane-1')
          }
        }
      } else {
        const nextActive =
          pane1.activeNotePath === relativePath
            ? remainingTabs[remainingTabs.length - 1].relativePath
            : pane1.activeNotePath
        onUpdatePane1((prev) => ({
          ...prev,
          tabs: remainingTabs,
          activeNotePath: nextActive
        }))
      }
    } else {
      // paneId === 'pane-2'
      const remainingTabs = pane2.tabs.filter((t) => t.relativePath !== relativePath)

      if (remainingTabs.length === 0) {
        // Pane 2 became empty: auto-close pane 2 and revert to single
        onUpdatePane2(() => ({ id: 'pane-2', tabs: [], activeNotePath: null }))
        onUpdateSplitLayout('single')
        onSetActivePaneId('pane-1')
      } else {
        const nextActive =
          pane2.activeNotePath === relativePath
            ? remainingTabs[remainingTabs.length - 1].relativePath
            : pane2.activeNotePath
        onUpdatePane2((prev) => ({
          ...prev,
          tabs: remainingTabs,
          activeNotePath: nextActive
        }))
      }
    }
  }

  // Reorder tabs within a pane
  const handleReorderTabs = (
    paneId: 'pane-1' | 'pane-2',
    fromIndex: number,
    toIndex: number
  ): void => {
    const updater = (prev: EditorPaneState): EditorPaneState => {
      const nextTabs = [...prev.tabs]
      const [moved] = nextTabs.splice(fromIndex, 1)
      nextTabs.splice(toIndex, 0, moved)
      return { ...prev, tabs: nextTabs }
    }

    if (paneId === 'pane-1') {
      onUpdatePane1(updater)
    } else {
      onUpdatePane2(updater)
    }
  }

  // Split Pane Button action
  const handleSplit = (sourcePaneId: 'pane-1' | 'pane-2', direction: 'horizontal' | 'vertical'): void => {
    if (splitLayout === 'single') {
      const sourcePane = sourcePaneId === 'pane-1' ? pane1 : pane2
      const activeTab = sourcePane.tabs.find((t) => t.relativePath === sourcePane.activeNotePath)

      if (activeTab) {
        onUpdatePane2(() => ({
          id: 'pane-2',
          tabs: [{ ...activeTab }],
          activeNotePath: activeTab.relativePath
        }))
      }

      onUpdateSplitLayout(direction)
      onSetActivePaneId('pane-2')
    } else if (splitLayout !== direction) {
      // Toggle between horizontal and vertical split
      onUpdateSplitLayout(direction)
    }
  }

  // Close split pane
  const handleClosePane = (paneIdToClose: 'pane-1' | 'pane-2'): void => {
    if (paneIdToClose === 'pane-2') {
      onUpdatePane2(() => ({ id: 'pane-2', tabs: [], activeNotePath: null }))
      onUpdateSplitLayout('single')
      onSetActivePaneId('pane-1')
    } else {
      // Move pane-2 tabs to pane-1
      onUpdatePane1(() => ({
        id: 'pane-1',
        tabs: [...pane2.tabs],
        activeNotePath: pane2.activeNotePath
      }))
      onUpdatePane2(() => ({ id: 'pane-2', tabs: [], activeNotePath: null }))
      onUpdateSplitLayout('single')
      onSetActivePaneId('pane-1')
    }
  }

  // Toggle layout direction
  const handleToggleLayout = (): void => {
    onUpdateSplitLayout(splitLayout === 'horizontal' ? 'vertical' : 'horizontal')
  }

  // Handle Drag-and-Drop drop on a Pane
  const handleDropNote = useCallback(
    (targetPaneId: 'pane-1' | 'pane-2', notePath: string, dropZone: DropZoneDirection): void => {
      // Extract title
      const foundNote = allNotes.find((n) => n.relativePath === notePath)
      const title =
        foundNote?.name ||
        notePath
          .replace(/\.md$/, '')
          .split('/')
          .pop() ||
        'Nota'
      const newTab: OpenTab = { relativePath: notePath, title }

      const sourcePaneId = draggedTabInfo?.paneId

      // Case 1: Split drop (right or bottom -> target is pane-2)
      if (dropZone === 'right' || dropZone === 'bottom') {
        const nextLayout: SplitLayoutMode = dropZone === 'right' ? 'horizontal' : 'vertical'

        // If currently in single layout and pane-1 has <= 1 tab:
        // We open the tab in pane-2 alongside pane-1 so both panes remain populated
        if (splitLayout === 'single' && pane1.tabs.length <= 1) {
          onUpdatePane2(() => ({
            id: 'pane-2',
            tabs: [newTab],
            activeNotePath: notePath
          }))
          onUpdateSplitLayout(nextLayout)
          onSetActivePaneId('pane-2')
          setDraggedTabInfo(null)
          return
        }

        // If dragged from pane-1 to split right/bottom:
        if (sourcePaneId === 'pane-1') {
          const remainingInPane1 = pane1.tabs.filter((t) => t.relativePath !== notePath)
          if (remainingInPane1.length === 0) {
            // pane-1 would become empty: duplicate/retain in pane-1 and add to pane-2
            onUpdatePane2((prev) => {
              const exists = prev.tabs.some((t) => t.relativePath === notePath)
              return {
                ...prev,
                tabs: exists ? prev.tabs : [...prev.tabs, newTab],
                activeNotePath: notePath
              }
            })
          } else {
            // Remove from pane-1
            onUpdatePane1((prev) => {
              const nextTabs = prev.tabs.filter((t) => t.relativePath !== notePath)
              const nextActive =
                prev.activeNotePath === notePath
                  ? nextTabs.length > 0
                    ? nextTabs[nextTabs.length - 1].relativePath
                    : null
                  : prev.activeNotePath
              return { ...prev, tabs: nextTabs, activeNotePath: nextActive }
            })
            // Add to pane-2
            onUpdatePane2((prev) => {
              const exists = prev.tabs.some((t) => t.relativePath === notePath)
              return {
                ...prev,
                tabs: exists ? prev.tabs : [...prev.tabs, newTab],
                activeNotePath: notePath
              }
            })
          }
        } else {
          // Dragged from sidebar or elsewhere into pane-2
          onUpdatePane2((prev) => {
            const exists = prev.tabs.some((t) => t.relativePath === notePath)
            return {
              ...prev,
              tabs: exists ? prev.tabs : [...prev.tabs, newTab],
              activeNotePath: notePath
            }
          })
        }

        onUpdateSplitLayout(nextLayout)
        onSetActivePaneId('pane-2')
        setDraggedTabInfo(null)
        return
      }

      // Case 2: Split drop (left or top -> target is pane-1)
      if (dropZone === 'left' || dropZone === 'top') {
        const nextLayout: SplitLayoutMode = dropZone === 'left' ? 'horizontal' : 'vertical'

        if (splitLayout === 'single' && pane1.tabs.length <= 1) {
          onUpdatePane2(() => ({
            id: 'pane-2',
            tabs: [newTab],
            activeNotePath: notePath
          }))
          onUpdateSplitLayout(nextLayout)
          onSetActivePaneId('pane-1')
          setDraggedTabInfo(null)
          return
        }

        if (sourcePaneId === 'pane-2') {
          const remainingInPane2 = pane2.tabs.filter((t) => t.relativePath !== notePath)
          if (remainingInPane2.length === 0) {
            // pane-2 would become empty! Auto-close pane-2 and remain in single mode
            onUpdatePane2(() => ({ id: 'pane-2', tabs: [], activeNotePath: null }))
            onUpdatePane1((prev) => {
              const exists = prev.tabs.some((t) => t.relativePath === notePath)
              return {
                ...prev,
                tabs: exists ? prev.tabs : [...prev.tabs, newTab],
                activeNotePath: notePath
              }
            })
            onUpdateSplitLayout('single')
            onSetActivePaneId('pane-1')
            setDraggedTabInfo(null)
            return
          } else {
            onUpdatePane2((prev) => {
              const nextTabs = prev.tabs.filter((t) => t.relativePath !== notePath)
              const nextActive =
                prev.activeNotePath === notePath
                  ? nextTabs.length > 0
                    ? nextTabs[nextTabs.length - 1].relativePath
                    : null
                  : prev.activeNotePath
              return { ...prev, tabs: nextTabs, activeNotePath: nextActive }
            })
          }
        }

        onUpdatePane1((prev) => {
          const exists = prev.tabs.some((t) => t.relativePath === notePath)
          return {
            ...prev,
            tabs: exists ? prev.tabs : [...prev.tabs, newTab],
            activeNotePath: notePath
          }
        })
        onUpdateSplitLayout(nextLayout)
        onSetActivePaneId('pane-1')
        setDraggedTabInfo(null)
        return
      }

      // Case 3: dropZone === 'center' (Move into target pane or tab bar)
      if (sourcePaneId && sourcePaneId !== targetPaneId) {
        if (sourcePaneId === 'pane-2') {
          const remainingInPane2 = pane2.tabs.filter((t) => t.relativePath !== notePath)
          if (remainingInPane2.length === 0) {
            // pane-2 became empty! Auto-close pane-2 and return to single layout!
            onUpdatePane2(() => ({ id: 'pane-2', tabs: [], activeNotePath: null }))
            onUpdatePane1((prev) => {
              const exists = prev.tabs.some((t) => t.relativePath === notePath)
              return {
                ...prev,
                tabs: exists ? prev.tabs : [...prev.tabs, newTab],
                activeNotePath: notePath
              }
            })
            onUpdateSplitLayout('single')
            onSetActivePaneId('pane-1')
            setDraggedTabInfo(null)
            return
          } else {
            // pane-2 still has tabs
            onUpdatePane2((prev) => {
              const nextTabs = prev.tabs.filter((t) => t.relativePath !== notePath)
              const nextActive =
                prev.activeNotePath === notePath
                  ? nextTabs.length > 0
                    ? nextTabs[nextTabs.length - 1].relativePath
                    : null
                  : prev.activeNotePath
              return { ...prev, tabs: nextTabs, activeNotePath: nextActive }
            })
          }
        } else if (sourcePaneId === 'pane-1') {
          const remainingInPane1 = pane1.tabs.filter((t) => t.relativePath !== notePath)
          if (remainingInPane1.length === 0) {
            // pane-1 became empty! All tabs now in pane-2 -> transfer to pane-1 and collapse!
            onUpdatePane1(() => {
              const combined = [...pane2.tabs]
              if (!combined.some((t) => t.relativePath === notePath)) {
                combined.push(newTab)
              }
              return {
                id: 'pane-1',
                tabs: combined,
                activeNotePath: notePath
              }
            })
            onUpdatePane2(() => ({ id: 'pane-2', tabs: [], activeNotePath: null }))
            onUpdateSplitLayout('single')
            onSetActivePaneId('pane-1')
            setDraggedTabInfo(null)
            return
          } else {
            // pane-1 still has tabs
            onUpdatePane1((prev) => {
              const nextTabs = prev.tabs.filter((t) => t.relativePath !== notePath)
              const nextActive =
                prev.activeNotePath === notePath
                  ? nextTabs.length > 0
                    ? nextTabs[nextTabs.length - 1].relativePath
                    : null
                  : prev.activeNotePath
              return { ...prev, tabs: nextTabs, activeNotePath: nextActive }
            })
          }
        }
      }

      // Add to target pane
      if (targetPaneId === 'pane-1') {
        onUpdatePane1((prev) => {
          const exists = prev.tabs.some((t) => t.relativePath === notePath)
          return {
            ...prev,
            tabs: exists ? prev.tabs : [...prev.tabs, newTab],
            activeNotePath: notePath
          }
        })
        onSetActivePaneId('pane-1')
      } else {
        onUpdatePane2((prev) => {
          const exists = prev.tabs.some((t) => t.relativePath === notePath)
          return {
            ...prev,
            tabs: exists ? prev.tabs : [...prev.tabs, newTab],
            activeNotePath: notePath
          }
        })
        onSetActivePaneId('pane-2')
      }

      setDraggedTabInfo(null)
    },
    [allNotes, draggedTabInfo, onSetActivePaneId, onUpdatePane1, onUpdatePane2, onUpdateSplitLayout, pane1.tabs, pane2.tabs, splitLayout]
  )

  const isSplitActive = splitLayout !== 'single'

  return (
    <div
      ref={containerRef}
      className={`flex-1 flex min-w-0 min-h-0 overflow-hidden relative ${
        splitLayout === 'horizontal' ? 'flex-row' : 'flex-col'
      }`}
    >
      {/* Pane 1 */}
      <div
        style={{
          flex: isSplitActive
            ? `${splitRatio} 1 0%`
            : '1 1 0%'
        }}
        className="flex flex-col min-w-0 min-h-0 overflow-hidden"
      >
        <EditorPaneView
          pane={pane1}
          isActivePane={activePaneId === 'pane-1'}
          splitLayout={splitLayout}
          allNotes={allNotes}
          vaultIndex={vaultIndex}
          settings={settings}
          isZenMode={isZenMode}
          draggedTabInfo={draggedTabInfo}
          setDraggedTabInfo={setDraggedTabInfo}
          onFocusPane={() => onSetActivePaneId('pane-1')}
          onSelectTab={(path) => handleSelectTab('pane-1', path)}
          onCloseTab={(path, e) => handleCloseTab('pane-1', path, e)}
          onReorderTabs={(from, to) => handleReorderTabs('pane-1', from, to)}
          onNewNote={() => onCreateNotePrompt('')}
          onSplit={(direction) => handleSplit('pane-1', direction)}
          onClosePane={() => handleClosePane('pane-1')}
          onToggleLayout={handleToggleLayout}
          onDropNote={(path, zone) => handleDropNote('pane-1', path, zone)}
          onSaveContent={onSaveContent}
          onRenameActiveNote={onRenameActiveNote}
          onNavigateWikiLink={onNavigateWikiLink}
          onToggleZenMode={onToggleZenMode}
          onOpenHelpModal={onOpenHelpModal}
          onUpdateSettings={onUpdateSettings}
          onOpenQuickSwitcher={onOpenQuickSwitcher}
        />
      </div>

      {/* Resizer Divider between Pane 1 and Pane 2 */}
      {isSplitActive && (
        <div
          onMouseDown={handleStartResize}
          onDoubleClick={handleResetSplitRatio}
          title={
            splitLayout === 'horizontal'
              ? 'Arraste para ajustar largura • Duplo clique para 50%/50%'
              : 'Arraste para ajustar altura • Duplo clique para 50%/50%'
          }
          className={`group relative z-30 shrink-0 select-none bg-surface-border hover:bg-accent active:bg-accent transition-colors flex items-center justify-center ${
            splitLayout === 'horizontal'
              ? 'w-1.5 hover:w-2 -mx-0.5 cursor-col-resize h-full'
              : 'h-1.5 hover:h-2 -my-0.5 cursor-row-resize w-full'
          }`}
        >
          <div
            className={`rounded-full bg-accent opacity-0 group-hover:opacity-100 transition-opacity ${
              splitLayout === 'horizontal' ? 'w-1 h-8' : 'h-1 w-8'
            }`}
          />
        </div>
      )}

      {/* Pane 2 */}
      {isSplitActive && (
        <div
          style={{
            flex: `${1 - splitRatio} 1 0%`
          }}
          className="flex flex-col min-w-0 min-h-0 overflow-hidden"
        >
          <EditorPaneView
            pane={pane2}
            isActivePane={activePaneId === 'pane-2'}
            splitLayout={splitLayout}
            allNotes={allNotes}
            vaultIndex={vaultIndex}
            settings={settings}
            isZenMode={isZenMode}
            draggedTabInfo={draggedTabInfo}
            setDraggedTabInfo={setDraggedTabInfo}
            onFocusPane={() => onSetActivePaneId('pane-2')}
            onSelectTab={(path) => handleSelectTab('pane-2', path)}
            onCloseTab={(path, e) => handleCloseTab('pane-2', path, e)}
            onReorderTabs={(from, to) => handleReorderTabs('pane-2', from, to)}
            onNewNote={() => onCreateNotePrompt('')}
            onSplit={(direction) => handleSplit('pane-2', direction)}
            onClosePane={() => handleClosePane('pane-2')}
            onToggleLayout={handleToggleLayout}
            onDropNote={(path, zone) => handleDropNote('pane-2', path, zone)}
            onSaveContent={onSaveContent}
            onRenameActiveNote={onRenameActiveNote}
            onNavigateWikiLink={onNavigateWikiLink}
            onToggleZenMode={onToggleZenMode}
            onOpenHelpModal={onOpenHelpModal}
            onUpdateSettings={onUpdateSettings}
            onOpenQuickSwitcher={onOpenQuickSwitcher}
          />
        </div>
      )}
    </div>
  )
}
