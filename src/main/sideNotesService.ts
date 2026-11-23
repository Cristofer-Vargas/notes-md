import { promises as fs } from 'fs'
import { createHash, randomUUID } from 'crypto'
import { join } from 'path'
import type { SideNote } from '../shared/sideNotes'

export const SIDE_NOTES_DIRECTORY = '.notes-md-side-notes'
const HEADER = '<!-- notes-md-side-note:v1 '
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const writeQueues = new Map<string, Promise<unknown>>()

function notePath(vaultPath: string, id: string): string {
  if (!UUID.test(id)) throw new Error('Identificador de nota lateral inválido.')
  return join(vaultPath, SIDE_NOTES_DIRECTORY, `${id}.md`)
}

export function serializeSideNote(note: SideNote): string {
  const { body, revision: _revision, ...metadata } = note
  return `${HEADER}${Buffer.from(JSON.stringify(metadata), 'utf8').toString('base64url')} -->\n${body}`
}

export function parseSideNote(content: string, expectedId: string): SideNote | null {
  const end = content.indexOf(' -->\n')
  if (!content.startsWith(HEADER) || end < 0) return null
  try {
    const metadata = JSON.parse(Buffer.from(content.slice(HEADER.length, end), 'base64url').toString('utf8'))
    if (metadata.id !== expectedId || !UUID.test(metadata.id) || typeof metadata.sourcePath !== 'string' || !metadata.anchor || typeof metadata.anchor.quote !== 'string' || typeof metadata.anchor.prefix !== 'string' || typeof metadata.anchor.suffix !== 'string' || !Number.isFinite(metadata.createdAt) || !Number.isFinite(metadata.updatedAt)) return null
    return { ...metadata, body: content.slice(end + 5), revision: createHash('sha256').update(content).digest('hex') } as SideNote
  } catch {
    return null
  }
}

export async function ensureSideNotesDirectory(vaultPath: string): Promise<void> {
  await fs.mkdir(join(vaultPath, SIDE_NOTES_DIRECTORY), { recursive: true })
}

export async function listSideNotes(vaultPath: string): Promise<SideNote[]> {
  await ensureSideNotesDirectory(vaultPath)
  const entries = await fs.readdir(join(vaultPath, SIDE_NOTES_DIRECTORY), { withFileTypes: true })
  const notes: SideNote[] = []
  for (const entry of entries) {
    const id = entry.name.replace(/\.md$/i, '')
    if (!entry.isFile() || !/\.md$/i.test(entry.name) || !UUID.test(id)) continue
    const content = await fs.readFile(join(vaultPath, SIDE_NOTES_DIRECTORY, entry.name), 'utf8')
    const parsed = parseSideNote(content, id)
    if (parsed) notes.push(parsed)
  }
  return notes.sort((a, b) => a.createdAt - b.createdAt)
}

export async function createSideNote(vaultPath: string, data: Omit<SideNote, 'id' | 'createdAt' | 'updatedAt'>): Promise<SideNote> {
  await ensureSideNotesDirectory(vaultPath)
  const now = Date.now()
  const note: SideNote = { ...data, id: randomUUID(), createdAt: now, updatedAt: now }
  const content = serializeSideNote(note)
  await fs.writeFile(notePath(vaultPath, note.id), content, { encoding: 'utf8', flag: 'wx' })
  return { ...note, revision: createHash('sha256').update(content).digest('hex') }
}

export async function updateSideNote(vaultPath: string, note: SideNote): Promise<SideNote> {
  const target = notePath(vaultPath, note.id)
  const previous = writeQueues.get(target) ?? Promise.resolve()
  const operation = previous.catch(() => {}).then(() => writeSideNote(target, note))
  writeQueues.set(target, operation)
  try { return await operation } finally { if (writeQueues.get(target) === operation) writeQueues.delete(target) }
}

async function writeSideNote(target: string, note: SideNote): Promise<SideNote> {
  const existing = parseSideNote(await fs.readFile(target, 'utf8'), note.id)
  if (!existing) throw new Error('Arquivo de nota lateral inválido; nenhuma alteração foi gravada.')
  if (!note.revision || existing.revision !== note.revision) throw new Error('A nota lateral foi alterada por outro processo. Recarregue antes de salvar.')
  const updated = { ...note, createdAt: existing.createdAt, updatedAt: Math.max(Date.now(), existing.updatedAt + 1) }
  const temporary = `${target}.${randomUUID()}.tmp`
  const content = serializeSideNote(updated)
  await fs.writeFile(temporary, content, { encoding: 'utf8', flag: 'wx' })
  try { await fs.rename(temporary, target) } catch (error) { await fs.unlink(temporary).catch(() => {}); throw error }
  return { ...updated, revision: createHash('sha256').update(content).digest('hex') }
}

export async function remapSideNotePaths(vaultPath: string, oldPath: string, newPath: string): Promise<void> {
  try { await fs.access(join(vaultPath, SIDE_NOTES_DIRECTORY)) } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return
    throw error
  }
  const notes = await listSideNotes(vaultPath)
  for (const note of notes) {
    if (note.sourcePath === oldPath || note.sourcePath.startsWith(`${oldPath}/`)) {
      await updateSideNote(vaultPath, { ...note, sourcePath: newPath + note.sourcePath.slice(oldPath.length) })
    }
  }
}

export function getSideNoteFilePath(vaultPath: string, id: string): string {
  return notePath(vaultPath, id)
}
