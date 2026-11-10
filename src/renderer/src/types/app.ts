export type ThemeMode = 'light' | 'dark' | 'sepia'

export type AccentPreset = 'blue' | 'purple' | 'emerald' | 'amber' | 'rose'

export type FontFamilyPreset = 'sans' | 'serif' | 'mono'

export type PageWidthPreset = 'standard' | 'wide' | 'full'

export type CanvasStylePreset = 'paper' | 'flat'

export type EditorFontWeightPreset = '200' | '300' | '400' | '500'

export type ShortcutActionId =
  | 'quickSwitcher'
  | 'newNote'
  | 'openSettings'
  | 'toggleLeftSidebar'
  | 'toggleRightSidebar'
  | 'nextTab'
  | 'prevTab'
  | 'closeTab'
  | 'quickTools'
  | 'toggleZenMode'
  | 'toggleSourceMode'
  | 'insertWikiLink'
  | 'saveNote'

export type CustomShortcutsMap = Partial<Record<ShortcutActionId, string>>

export interface RecentVault {
  path: string
  name: string
  lastOpened: number
}

export interface AppSettings {
  theme: ThemeMode
  accent: AccentPreset
  fontFamily: FontFamilyPreset
  editorFontWeight: EditorFontWeightPreset
  baseFontSize: number // 14 to 22
  lineHeight: number // 1.5 to 2.0
  pageWidth: PageWidthPreset
  canvasStyle: CanvasStylePreset
  showLeftSidebar: boolean
  showRightSidebar: boolean
  spellcheck: boolean
  spellcheckLanguages: string[]
  ignoredWords: string[]
  shortcuts?: CustomShortcutsMap
}

export interface OpenTab {
  relativePath: string
  title: string
  isDirty?: boolean
}

export type SplitLayoutMode = 'single' | 'horizontal' | 'vertical'

export interface EditorPaneState {
  id: 'pane-1' | 'pane-2'
  tabs: OpenTab[]
  activeNotePath: string | null
}

export interface WikiLinkReference {
  raw: string // e.g. "[[Guia do Editor WYSIWYG|Guia]]"
  target: string // e.g. "Guia do Editor WYSIWYG"
  alias?: string // e.g. "Guia"
  contextSnippet: string // surrounding sentence/line
  lineNumber: number
}

export interface BacklinkItem {
  sourceRelativePath: string
  sourceName: string
  contextSnippet: string
  lineNumber: number
}

export interface NoteHeading {
  level: number
  text: string
  id: string
}

export interface IndexedNoteMeta {
  relativePath: string
  name: string
  excerpt: string
  wordCount: number
  headings: NoteHeading[]
  outgoingLinks: WikiLinkReference[]
  backlinks: BacklinkItem[]
}
