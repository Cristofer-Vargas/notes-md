import { useCallback, useEffect, useRef, useState } from 'react'
import type { SideNote, SideNoteAnchor } from '../../../../shared/sideNotes'

export function useSideNotes(vaultPath: string) {
  const [notes, setNotes] = useState<SideNote[]>([])
  const [error, setError] = useState('')
  const notesRef = useRef(notes)
  const queueRef = useRef(new Map<string, Promise<void>>())
  const failedRef = useRef(new Set<string>())
  const requestRef = useRef(0)
  const vaultRef = useRef(vaultPath)
  vaultRef.current = vaultPath
  const replace = useCallback((next: SideNote[]) => { notesRef.current = next; setNotes(next) }, [])
  const refresh = useCallback(async () => {
    if (!vaultPath) { replace([]); return }
    const request = ++requestRef.current
    try {
      const result = await window.electronAPI.listSideNotes(vaultPath)
      if (vaultRef.current !== vaultPath || request !== requestRef.current) return
      const pending = queueRef.current
      const merged = result.map((note) => pending.has(note.id) || failedRef.current.has(note.id) ? notesRef.current.find((current) => current.id === note.id) ?? note : note)
      for (const note of notesRef.current) if (failedRef.current.has(note.id) && !merged.some((item) => item.id === note.id)) merged.push(note)
      replace(merged)
      if (!failedRef.current.size) setError('')
    } catch { if (vaultRef.current === vaultPath) setError('Não foi possível carregar as notas laterais.') }
  }, [vaultPath, replace])
  useEffect(() => {
    replace([])
    failedRef.current.clear()
    void refresh()
    const unsubscribe = window.electronAPI.onSideNotesChanged((changed) => { if (changed === vaultPath) void refresh() })
    const timer = window.setInterval(() => { void refresh() }, 5000)
    return () => { unsubscribe(); window.clearInterval(timer) }
  }, [vaultPath, refresh, replace])

  const create = useCallback(async (sourcePath: string, anchor: SideNoteAnchor) => {
    try { const result = await window.electronAPI.createSideNote(vaultPath, { sourcePath, anchor, body: '' }); if (vaultRef.current === vaultPath) { requestRef.current++; replace([...notesRef.current.filter((note) => note.id !== result.id), result]) }; return result }
    catch { setError('Não foi possível criar a nota lateral.'); return null }
  }, [vaultPath, replace])

  const update = useCallback((id: string, changes: Partial<Pick<SideNote, 'body' | 'anchor' | 'sourcePath' | 'detached'>>) => {
    const original = notesRef.current.find((note) => note.id === id)
    if (!original) return
    replace(notesRef.current.map((note) => note.id === id ? { ...note, ...changes } : note))
    const previous = queueRef.current.get(id) ?? Promise.resolve()
    const operation = previous.then(async () => {
      const current = notesRef.current.find((note) => note.id === id)
      if (!current || vaultRef.current !== vaultPath) return
      const saved = await window.electronAPI.updateSideNote(vaultPath, current)
      if (vaultRef.current !== vaultPath) return
      requestRef.current++
      failedRef.current.delete(id)
      replace(notesRef.current.map((note) => note.id === id ? { ...note, revision: saved.revision, updatedAt: saved.updatedAt } : note))
    }).catch(() => { failedRef.current.add(id); setError('Não foi possível salvar uma nota lateral. Ela pode ter sido alterada externamente; copie seu texto antes de recarregar.') })
    queueRef.current.set(id, operation)
    void operation.finally(() => { if (queueRef.current.get(id) === operation) queueRef.current.delete(id) })
  }, [vaultPath, replace])

  const remove = useCallback(async (id: string) => {
    try { await queueRef.current.get(id); await window.electronAPI.deleteSideNote(vaultPath, id); failedRef.current.delete(id); if (vaultRef.current === vaultPath) { requestRef.current++; replace(notesRef.current.filter((note) => note.id !== id)) } }
    catch { setError('Não foi possível excluir a nota lateral.') }
  }, [vaultPath, replace])
  return { notes, notesRef, error, refresh, create, update, remove }
}
