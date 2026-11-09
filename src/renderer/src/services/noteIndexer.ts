import type { VaultNoteData } from '../../../preload/index.d'
import type {
  BacklinkItem,
  IndexedNoteMeta,
  NoteHeading,
  WikiLinkReference
} from '../types/app'

const WIKILINK_REGEX = /\[\[([^[\]|#\n]+)(?:#[^[\]|\n]+)?(?:\|([^[\]\n]+))?\]\]/g

export function normalizeNoteKey(value: string): string {
  return value
    .trim()
    .replace(/\\/g, '/')
    .replace(/\.md$/i, '')
    .toLowerCase()
}

export function extractWikiLinks(content: string): WikiLinkReference[] {
  const results: WikiLinkReference[] = []
  const lines = content.split(/\r?\n/)
  let inCodeBlock = false

  lines.forEach((line, idx) => {
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock
      return
    }
    if (inCodeBlock) return

    const regex = new RegExp(WIKILINK_REGEX.source, 'g')
    let match: RegExpExecArray | null
    while ((match = regex.exec(line)) !== null) {
      const target = match[1].trim()
      const alias = match[2] ? match[2].trim() : undefined
      const cleanSnippet = line
        .replace(/<[^>]+>/g, '')
        .replace(/^#+\s*/, '')
        .replace(/^[-*+]\s*(\[[ xX]\]\s*)?/, '')
        .trim()

      results.push({
        raw: match[0],
        target,
        alias,
        contextSnippet: cleanSnippet || match[0],
        lineNumber: idx + 1
      })
    }
  })

  return results
}

export function extractHeadings(content: string): NoteHeading[] {
  const headings: NoteHeading[] = []
  const lines = content.split(/\r?\n/)
  let inCodeBlock = false

  lines.forEach((line, idx) => {
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock
      return
    }
    if (inCodeBlock) return

    const match = /^(#{1,6})\s+(.+)$/.exec(line.trim())
    if (match) {
      const level = match[1].length
      const text = match[2]
        .replace(/<[^>]+>/g, '')
        .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, t, a) => a || t)
        .replace(/[*_~`]/g, '')
        .trim()

      if (text) {
        headings.push({
          level,
          text,
          id: `heading-${idx}-${text.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
        })
      }
    }
  })

  return headings
}

export function createCleanExcerpt(content: string, maxLength = 220): string {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#') && !l.startsWith('---') && !l.startsWith('|'))

  const joined = lines
    .join(' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, alias) => alias || target)
    .replace(/[*_~`>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (!joined) return 'Nota vazia — clique para começar a editar.'
  return joined.length > maxLength ? `${joined.slice(0, maxLength)}...` : joined
}

export function countWords(content: string): number {
  const clean = content
    .replace(/<[^>]+>/g, ' ')
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, alias) => alias || target)
    .replace(/[#*_~`>|()-]/g, ' ')
    .trim()
  if (!clean) return 0
  return clean.split(/\s+/).filter(Boolean).length
}

export function resolveWikiLinkTarget(
  target: string,
  notes: VaultNoteData[]
): VaultNoteData | undefined {
  const normalizedTarget = normalizeNoteKey(target)
  if (!normalizedTarget) return undefined

  // 1. Exact relative path match (without .md)
  const exactRel = notes.find(
    (n) => normalizeNoteKey(n.relativePath) === normalizedTarget
  )
  if (exactRel) return exactRel

  // 2. Match by note name (basename without .md)
  const byName = notes.find((n) => normalizeNoteKey(n.name) === normalizedTarget)
  if (byName) return byName

  // 3. Match if target is suffix of relativePath
  const bySuffix = notes.find((n) =>
    normalizeNoteKey(n.relativePath).endsWith(`/${normalizedTarget}`)
  )
  return bySuffix
}

export function buildVaultIndex(notes: VaultNoteData[]): Record<string, IndexedNoteMeta> {
  const index: Record<string, IndexedNoteMeta> = {}

  for (const note of notes) {
    index[note.relativePath] = {
      relativePath: note.relativePath,
      name: note.name,
      excerpt: createCleanExcerpt(note.content),
      wordCount: countWords(note.content),
      headings: extractHeadings(note.content),
      outgoingLinks: extractWikiLinks(note.content),
      backlinks: []
    }
  }

  for (const sourceNote of notes) {
    const sourceMeta = index[sourceNote.relativePath]
    if (!sourceMeta) continue

    for (const link of sourceMeta.outgoingLinks) {
      const targetNote = resolveWikiLinkTarget(link.target, notes)
      if (targetNote && targetNote.relativePath !== sourceNote.relativePath) {
        const targetMeta = index[targetNote.relativePath]
        if (targetMeta) {
          const alreadyAdded = targetMeta.backlinks.some(
            (b) =>
              b.sourceRelativePath === sourceNote.relativePath &&
              b.lineNumber === link.lineNumber
          )
          if (!alreadyAdded) {
            targetMeta.backlinks.push({
              sourceRelativePath: sourceNote.relativePath,
              sourceName: sourceNote.name,
              contextSnippet: link.contextSnippet,
              lineNumber: link.lineNumber
            })
          }
        }
      }
    }
  }

  return index
}

export function updateWikiLinksAfterRename(
  content: string,
  oldName: string,
  oldRelPath: string,
  newName: string,
  newRelPath: string
): { updatedContent: string; changed: boolean } {
  const oldNameKey = normalizeNoteKey(oldName)
  const oldRelKey = normalizeNoteKey(oldRelPath)
  const cleanNewRel = newRelPath.replace(/\.md$/i, '')

  let changed = false
  const updatedContent = content.replace(
    WIKILINK_REGEX,
    (fullMatch, rawTarget: string, rawAlias?: string) => {
      const targetKey = normalizeNoteKey(rawTarget)
      if (targetKey === oldNameKey) {
        changed = true
        return rawAlias ? `[[${newName}|${rawAlias}]]` : `[[${newName}]]`
      }
      if (targetKey === oldRelKey) {
        changed = true
        return rawAlias ? `[[${cleanNewRel}|${rawAlias}]]` : `[[${cleanNewRel}]]`
      }
      return fullMatch
    }
  )

  return { updatedContent, changed }
}

/**
 * Normalizes any legacy HTML wiki-link spans or duplicated brackets into clean
 * [[Target]] or [[Target|Alias]] syntax so the Live Preview editor plugin can
 * render and edit them inline just like Obsidian.
 */
export function preprocessMarkdownForEditor(markdown: string): string {
  const lines = markdown.split(/\r?\n/)
  let inCodeBlock = false

  return lines
    .map((line) => {
      if (line.trim().startsWith('```')) {
        inCodeBlock = !inCodeBlock
        return line
      }
      if (inCodeBlock) return line

      // 1. Convert any legacy <span data-wiki-link="..."> back to [[Target|Alias]]
      let processed = line.replace(
        /<span[^>]*data-wiki-link="([^"]+)"[^>]*>([\s\S]*?)<\/span>/gi,
        (fullMatch, target: string, innerText: string) => {
          const aliasMatch = /data-wiki-alias="([^"]*)"/i.exec(fullMatch)
          const rawAlias = aliasMatch && aliasMatch[1] ? aliasMatch[1].trim() : ''
          const cleanTarget = target.replace(/&quot;/g, '"').replace(/^\[+|\]+$/g, '').trim()
          const cleanInner = innerText
            .replace(/<[^>]+>/g, '')
            .replace(/^\[+|\]+$/g, '')
            .trim()
          const cleanAlias = rawAlias.replace(/^\[+|\]+$/g, '').trim()

          if (cleanAlias && cleanAlias !== cleanTarget) {
            return `[[${cleanTarget}|${cleanAlias}]]`
          }
          if (cleanInner && cleanInner !== cleanTarget) {
            return `[[${cleanTarget}|${cleanInner}]]`
          }
          return `[[${cleanTarget}]]`
        }
      )

      // 2. Fix corrupted [[Target|[[Target]]]] patterns if any
      processed = processed.replace(
        /\[\[([^[\]|#\n]+)\|\[\[([^\][\n]+)\]\]\]\]/g,
        (_m, t: string, a: string) => {
          const cleanT = t.trim()
          const cleanA = a.trim()
          return cleanA && cleanA !== cleanT ? `[[${cleanT}|${cleanA}]]` : `[[${cleanT}]]`
        }
      )

      // 3. Collapse accidental triple/quadruple brackets [[[[Nota]]]] -> [[Nota]]
      processed = processed.replace(/\[{3,}([^[\]\n]+?)\]{3,}/g, '[[$1]]')

      return processed
    })
    .join('\n')
}

/**
 * Unescapes brackets/pipes produced by prosemirror-markdown serializer and cleans up
 * any legacy wiki-link spans or extra brackets into standard [[Target]] or [[Target|Alias]].
 */
export function postprocessMarkdownFromEditor(markdown: string): string {
  const lines = markdown.split(/\r?\n/)
  let inCodeBlock = false

  return lines
    .map((line) => {
      if (line.trim().startsWith('```')) {
        inCodeBlock = !inCodeBlock
        return line
      }
      if (inCodeBlock) return line

      // 1. Convert any legacy HTML span if present
      let processed = line.replace(
        /<span[^>]*data-wiki-link="([^"]+)"[^>]*>([\s\S]*?)<\/span>/gi,
        (fullMatch, target: string, innerText: string) => {
          const aliasMatch = /data-wiki-alias="([^"]*)"/i.exec(fullMatch)
          const rawAlias = aliasMatch && aliasMatch[1] ? aliasMatch[1].trim() : ''
          const cleanTarget = target.replace(/&quot;/g, '"').replace(/^\[+|\]+$/g, '').trim()
          const cleanInner = innerText
            .replace(/<[^>]+>/g, '')
            .replace(/^\[+|\]+$/g, '')
            .trim()
          const cleanAlias = rawAlias.replace(/^\[+|\]+$/g, '').trim()

          if (cleanAlias && cleanAlias !== cleanTarget) {
            return `[[${cleanTarget}|${cleanAlias}]]`
          }
          if (cleanInner && cleanInner !== cleanTarget) {
            return `[[${cleanTarget}|${cleanInner}]]`
          }
          return `[[${cleanTarget}]]`
        }
      )

      // 2. Unescape prosemirror-markdown escaped brackets: \[\[Target\|Alias\]\] or \[\[Target]]
      processed = processed.replace(
        /(?:\\?\[){2,}([^[\]\n]+?)(?:\\?\]){2,}/g,
        (_match, inner: string) => {
          const unescapedInner = inner
            .replace(/\\\|/g, '|')
            .replace(/\\\[/g, '')
            .replace(/\\\]/g, '')
            .trim()
          return `[[${unescapedInner}]]`
        }
      )

      // 3. Collapse any remaining 3+ brackets [[[[Nota]]]] -> [[Nota]]
      processed = processed.replace(/\[{3,}([^[\]\n]+?)\]{3,}/g, '[[$1]]')

      return processed
    })
    .join('\n')
}
