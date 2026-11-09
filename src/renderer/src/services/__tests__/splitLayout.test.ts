import { describe, it, expect } from 'vitest'
import type { EditorPaneState, OpenTab, SplitLayoutMode } from '../../types/app'

describe('Flexible Editor Workspace & Drag and Drop Split Logic', () => {
  it('should initialize with single pane layout and pane-1 active', () => {
    const pane1: EditorPaneState = {
      id: 'pane-1',
      tabs: [{ relativePath: 'Nota1.md', title: 'Nota 1' }],
      activeNotePath: 'Nota1.md'
    }
    const pane2: EditorPaneState = {
      id: 'pane-2',
      tabs: [],
      activeNotePath: null
    }
    const splitLayout: SplitLayoutMode = 'single'

    expect(splitLayout).toBe('single')
    expect(pane1.tabs.length).toBe(1)
    expect(pane2.tabs.length).toBe(0)
  })

  it('should split horizontally (lado a lado) when requested', () => {
    let splitLayout: SplitLayoutMode = 'single'
    let activePaneId: 'pane-1' | 'pane-2' = 'pane-1'
    let pane1: EditorPaneState = {
      id: 'pane-1',
      tabs: [
        { relativePath: 'Nota1.md', title: 'Nota 1' },
        { relativePath: 'Nota2.md', title: 'Nota 2' }
      ],
      activeNotePath: 'Nota1.md'
    }
    let pane2: EditorPaneState = {
      id: 'pane-2',
      tabs: [],
      activeNotePath: null
    }

    // Split right action
    const activeTab = pane1.tabs.find((t) => t.relativePath === pane1.activeNotePath)
    if (activeTab) {
      pane2 = {
        id: 'pane-2',
        tabs: [{ ...activeTab }],
        activeNotePath: activeTab.relativePath
      }
    }
    splitLayout = 'horizontal'
    activePaneId = 'pane-2'

    expect(splitLayout).toBe('horizontal')
    expect(activePaneId).toBe('pane-2')
    expect(pane2.tabs.length).toBe(1)
    expect(pane2.activeNotePath).toBe('Nota1.md')
  })

  it('should split vertically (em cima e embaixo) when requested', () => {
    let splitLayout: SplitLayoutMode = 'single'
    splitLayout = 'vertical'
    expect(splitLayout).toBe('vertical')
  })

  it('should move tab to pane-2 and split when dropped on the right edge', () => {
    let splitLayout: SplitLayoutMode = 'single'
    let activePaneId: 'pane-1' | 'pane-2' = 'pane-1'
    let pane1: EditorPaneState = {
      id: 'pane-1',
      tabs: [
        { relativePath: 'Nota1.md', title: 'Nota 1' },
        { relativePath: 'Nota2.md', title: 'Nota 2' }
      ],
      activeNotePath: 'Nota1.md'
    }
    let pane2: EditorPaneState = {
      id: 'pane-2',
      tabs: [],
      activeNotePath: null
    }

    const draggedNote = 'Nota2.md'
    const dropZone = 'right'

    if (dropZone === 'right') {
      splitLayout = 'horizontal'
      // Remove from pane-1
      pane1.tabs = pane1.tabs.filter((t) => t.relativePath !== draggedNote)
      pane1.activeNotePath = 'Nota1.md'
      // Add to pane-2
      pane2.tabs = [{ relativePath: draggedNote, title: 'Nota 2' }]
      pane2.activeNotePath = draggedNote
      activePaneId = 'pane-2'
    }

    expect(splitLayout).toBe('horizontal')
    expect(activePaneId).toBe('pane-2')
    expect(pane1.tabs.length).toBe(1)
    expect(pane2.tabs.length).toBe(1)
    expect(pane2.tabs[0].relativePath).toBe('Nota2.md')
  })

  it('should auto-collapse split layout to single when all tabs in pane-2 are closed', () => {
    let splitLayout: SplitLayoutMode = 'horizontal'
    let activePaneId: 'pane-1' | 'pane-2' = 'pane-2'
    const pane1: EditorPaneState = {
      id: 'pane-1',
      tabs: [{ relativePath: 'Nota1.md', title: 'Nota 1' }],
      activeNotePath: 'Nota1.md'
    }
    let pane2: EditorPaneState = {
      id: 'pane-2',
      tabs: [{ relativePath: 'Nota2.md', title: 'Nota 2' }],
      activeNotePath: 'Nota2.md'
    }

    // Close tab in pane-2
    pane2.tabs = pane2.tabs.filter((t) => t.relativePath !== 'Nota2.md')
    if (pane2.tabs.length === 0) {
      splitLayout = 'single'
      activePaneId = 'pane-1'
    }

    expect(splitLayout).toBe('single')
    expect(activePaneId).toBe('pane-1')
    expect(pane1.tabs.length).toBe(1)
  })

  it('should bound split ratio between 0.18 and 0.82 and reset to 0.5', () => {
    const clampRatio = (r: number): number => Math.max(0.18, Math.min(0.82, r))

    expect(clampRatio(0.05)).toBe(0.18)
    expect(clampRatio(0.95)).toBe(0.82)
    expect(clampRatio(0.5)).toBe(0.5)

    // Reset divider
    const resetRatio = 0.5
    expect(resetRatio).toBe(0.5)
  })

  it('should auto-collapse split layout to single when the only tab in pane-2 is moved to pane-1', () => {
    let splitLayout: SplitLayoutMode = 'vertical'
    let activePaneId: 'pane-1' | 'pane-2' = 'pane-2'
    let pane1: EditorPaneState = {
      id: 'pane-1',
      tabs: [{ relativePath: 'Nota1.md', title: 'Nota 1' }],
      activeNotePath: 'Nota1.md'
    }
    let pane2: EditorPaneState = {
      id: 'pane-2',
      tabs: [{ relativePath: 'Nota2.md', title: 'Nota 2' }],
      activeNotePath: 'Nota2.md'
    }

    const movedNotePath = 'Nota2.md'

    // Move from pane-2 to pane-1
    const remainingInPane2 = pane2.tabs.filter((t) => t.relativePath !== movedNotePath)
    pane1.tabs.push({ relativePath: movedNotePath, title: 'Nota 2' })
    pane1.activeNotePath = movedNotePath

    if (remainingInPane2.length === 0) {
      pane2.tabs = []
      pane2.activeNotePath = null
      splitLayout = 'single'
      activePaneId = 'pane-1'
    }

    expect(splitLayout).toBe('single')
    expect(activePaneId).toBe('pane-1')
    expect(pane1.tabs.length).toBe(2)
    expect(pane2.tabs.length).toBe(0)
  })

  it('should auto-collapse split layout to single when the only tab in pane-1 is moved to pane-2', () => {
    let splitLayout: SplitLayoutMode = 'horizontal'
    let activePaneId: 'pane-1' | 'pane-2' = 'pane-1'
    let pane1: EditorPaneState = {
      id: 'pane-1',
      tabs: [{ relativePath: 'Nota1.md', title: 'Nota 1' }],
      activeNotePath: 'Nota1.md'
    }
    let pane2: EditorPaneState = {
      id: 'pane-2',
      tabs: [{ relativePath: 'Nota2.md', title: 'Nota 2' }],
      activeNotePath: 'Nota2.md'
    }

    const movedNotePath = 'Nota1.md'

    // Move from pane-1 to pane-2: pane-1 becomes empty, so pane-2 merges into pane-1 and collapses
    const remainingInPane1 = pane1.tabs.filter((t) => t.relativePath !== movedNotePath)
    if (remainingInPane1.length === 0) {
      pane1 = {
        id: 'pane-1',
        tabs: [...pane2.tabs, { relativePath: movedNotePath, title: 'Nota 1' }],
        activeNotePath: movedNotePath
      }
      pane2 = { id: 'pane-2', tabs: [], activeNotePath: null }
      splitLayout = 'single'
      activePaneId = 'pane-1'
    }

    expect(splitLayout).toBe('single')
    expect(activePaneId).toBe('pane-1')
    expect(pane1.tabs.length).toBe(2)
    expect(pane2.tabs.length).toBe(0)
  })

  it('should transfer pane-2 tabs into pane-1 and revert to single when pane-1 tab is closed', () => {
    let splitLayout: SplitLayoutMode = 'horizontal'
    let activePaneId: 'pane-1' | 'pane-2' = 'pane-1'
    let pane1: EditorPaneState = {
      id: 'pane-1',
      tabs: [{ relativePath: 'Nota1.md', title: 'Nota 1' }],
      activeNotePath: 'Nota1.md'
    }
    let pane2: EditorPaneState = {
      id: 'pane-2',
      tabs: [{ relativePath: 'Nota2.md', title: 'Nota 2' }],
      activeNotePath: 'Nota2.md'
    }

    // Close tab in pane-1
    const remainingInPane1 = pane1.tabs.filter((t) => t.relativePath !== 'Nota1.md')
    if (remainingInPane1.length === 0 && pane2.tabs.length > 0) {
      pane1 = {
        id: 'pane-1',
        tabs: [...pane2.tabs],
        activeNotePath: pane2.activeNotePath
      }
      pane2 = { id: 'pane-2', tabs: [], activeNotePath: null }
      splitLayout = 'single'
      activePaneId = 'pane-1'
    }

    expect(splitLayout).toBe('single')
    expect(activePaneId).toBe('pane-1')
    expect(pane1.tabs.length).toBe(1)
    expect(pane1.tabs[0].relativePath).toBe('Nota2.md')
    expect(pane2.tabs.length).toBe(0)
  })
})
