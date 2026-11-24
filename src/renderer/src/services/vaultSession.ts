export const VAULT_SESSIONS_STORAGE_KEY = 'notes-md:vault-sessions:v1'

export interface PersistedHeadingFoldReference {
  level: number
  text: string
  occurrence: number
}

export interface PersistedNoteViewState {
  foldedHeadings: PersistedHeadingFoldReference[]
  scrollTop: number
}

export interface PersistedVaultSession {
  openTabPaths: string[]
  activeNotePath: string | null
  expandedFolders: Record<string, boolean>
  noteViewStates?: Record<string, PersistedNoteViewState>
}

const LEGACY_HEADING_FOLD_PREFIX = 'notes-md:heading-folds:v1:'

function readAllSessions(): Record<string, PersistedVaultSession> {
  try {
    const raw = localStorage.getItem(VAULT_SESSIONS_STORAGE_KEY)
    return raw ? JSON.parse(raw) as Record<string, PersistedVaultSession> : {}
  } catch {
    return {}
  }
}

export function loadVaultSession(targetVaultPath: string): PersistedVaultSession | null {
  return readAllSessions()[targetVaultPath] || null
}

export function saveVaultSession(targetVaultPath: string, session: PersistedVaultSession): void {
  if (!targetVaultPath) return
  try {
    const allSessions = readAllSessions()
    const previous = allSessions[targetVaultPath]
    const allowedPaths = new Set(session.openTabPaths)
    const viewStates = {
      ...(previous?.noteViewStates ?? {}),
      ...(session.noteViewStates ?? {})
    }
    for (const notePath of Object.keys(viewStates)) {
      if (!allowedPaths.has(notePath)) delete viewStates[notePath]
    }
    allSessions[targetVaultPath] = { ...previous, ...session, noteViewStates: viewStates }
    localStorage.setItem(VAULT_SESSIONS_STORAGE_KEY, JSON.stringify(allSessions))
  } catch {
    // Ignore storage errors; open notes remain usable for this session.
  }
}

export function loadNoteViewState(vaultPath: string, notePath: string): PersistedNoteViewState | null {
  const saved = loadVaultSession(vaultPath)?.noteViewStates?.[notePath]
  if (!saved || typeof saved !== 'object') return null
  const foldedHeadings = Array.isArray(saved.foldedHeadings)
    ? saved.foldedHeadings.filter((heading) =>
      heading && Number.isInteger(heading.level) && heading.level >= 1 && heading.level <= 6 &&
      typeof heading.text === 'string' && Number.isInteger(heading.occurrence) && heading.occurrence > 0
    )
    : []
  return {
    foldedHeadings,
    scrollTop: Number.isFinite(saved.scrollTop) ? Math.max(0, saved.scrollTop) : 0
  }
}

export function saveNoteViewState(
  vaultPath: string,
  notePath: string,
  update: Partial<PersistedNoteViewState>
): void {
  if (!vaultPath || !notePath) return
  try {
    const allSessions = readAllSessions()
    const session = allSessions[vaultPath]
    if (session && !session.openTabPaths?.includes(notePath)) return

    const previous = session?.noteViewStates?.[notePath] ?? { foldedHeadings: [], scrollTop: 0 }
    const nextState: PersistedNoteViewState = {
      foldedHeadings: update.foldedHeadings ?? previous.foldedHeadings,
      scrollTop: update.scrollTop === undefined ? previous.scrollTop : Math.max(0, update.scrollTop)
    }
    const nextSession: PersistedVaultSession = session
      ? { ...session, noteViewStates: { ...session.noteViewStates, [notePath]: nextState } }
      : { openTabPaths: [notePath], activeNotePath: notePath, expandedFolders: {}, noteViewStates: { [notePath]: nextState } }
    allSessions[vaultPath] = nextSession
    localStorage.setItem(VAULT_SESSIONS_STORAGE_KEY, JSON.stringify(allSessions))
  } catch {
    // Ignore storage errors; open notes remain usable for this session.
  }
}

/** Remove per-note fold entries written by older versions once their tabs close. */
export function pruneLegacyHeadingFoldStates(vaultPath: string, openNoteFullPaths: string[]): void {
  const openPaths = new Set(openNoteFullPaths)
  try {
    for (let index = localStorage.length - 1; index >= 0; index--) {
      const key = localStorage.key(index)
      if (!key?.startsWith(LEGACY_HEADING_FOLD_PREFIX)) continue
      let scope: unknown
      try { scope = JSON.parse(key.slice(LEGACY_HEADING_FOLD_PREFIX.length)) } catch { continue }
      if (!Array.isArray(scope) || scope[0] !== vaultPath || typeof scope[1] !== 'string') continue
      if (!openPaths.has(scope[1])) localStorage.removeItem(key)
    }
  } catch {
    // Ignore storage errors; this only cleans obsolete cached state.
  }
}
