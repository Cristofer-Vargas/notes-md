import { mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { createSideNote, getSideNoteFilePath, listSideNotes, remapSideNotePaths, updateSideNote } from '../sideNotesService'

describe('arquivos de notas laterais', () => {
  let directory = ''
  afterEach(async () => { if (directory) await rm(directory, { recursive: true, force: true }) })
  it('guarda Markdown independente e atualiza referências em mudanças de pasta', async () => {
    directory = await mkdtemp(join(tmpdir(), 'notes-md-side-test-'))
    const created = await createSideNote(directory, { sourcePath: 'antiga/nota.md', anchor: { quote: 'trecho', prefix: '', suffix: '' }, body: '**observação**' })
    expect((await readFile(getSideNoteFilePath(directory, created.id), 'utf8'))).toContain('**observação**')
    expect(await listSideNotes(directory)).toEqual([created])
    await updateSideNote(directory, { ...created, body: 'atualizada' })
    await remapSideNotePaths(directory, 'antiga', 'nova')
    expect(await listSideNotes(directory)).toMatchObject([{ sourcePath: 'nova/nota.md', body: 'atualizada' }])
  })
  it('rejeita identificadores que tentem sair da pasta', () => {
    expect(() => getSideNoteFilePath('cofre', '../nota')).toThrow()
  })
  it('não sobrescreve uma alteração externa no conteúdo', async () => {
    directory = await mkdtemp(join(tmpdir(), 'notes-md-side-test-'))
    const created = await createSideNote(directory, { sourcePath: 'nota.md', anchor: { quote: 'trecho', prefix: '', suffix: '' }, body: 'original' })
    const path = getSideNoteFilePath(directory, created.id)
    await writeFile(path, (await readFile(path, 'utf8')).replace('original', 'edição externa'))
    await expect(updateSideNote(directory, { ...created, body: 'outra alteração' })).rejects.toThrow('alterada por outro processo')
    expect(await readFile(path, 'utf8')).toContain('edição externa')
  })
  it('rejeita gravações concorrentes com a mesma revisão', async () => {
    directory = await mkdtemp(join(tmpdir(), 'notes-md-side-test-'))
    const note = await createSideNote(directory, { sourcePath: 'nota.md', anchor: { quote: 'trecho', prefix: '', suffix: '' }, body: 'original' })
    const results = await Promise.allSettled([updateSideNote(directory, { ...note, body: 'primeira' }), updateSideNote(directory, { ...note, body: 'segunda' })])
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1)
  })
})
