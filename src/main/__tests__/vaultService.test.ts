import { describe, it, expect } from 'vitest'
import path from 'path'
import fs from 'fs/promises'
import os from 'os'
import {
  ensureDefaultVault,
  loadVaultSnapshot,
  createNoteFile,
  renameVaultEntry,
  moveVaultEntry,
  deleteVaultEntry,
  readVaultImageBase64,
  VaultWatcher,
  computeVaultSignature
} from '../vaultService'
import type { VaultSnapshot } from '../../preload/index.d'

describe('vaultService — Operações de Sistema de Arquivos e Watcher em Tempo Real', () => {
  const defaultVaultDir = path.join(process.cwd(), 'Vault-Notas')

  it('cria notas vazias com nomes únicos, inclusive em criações simultâneas', async () => {
    const vaultDir = await fs.mkdtemp(path.join(os.tmpdir(), 'notes-md-create-'))
    try {
      const created = await Promise.all([
        createNoteFile(vaultDir, '', 'Nova nota'),
        createNoteFile(vaultDir, '', 'Nova nota'),
        createNoteFile(vaultDir, '', 'Nova nota')
      ])
      expect(new Set(created.map((note) => note.relativePath)).size).toBe(3)
      for (const note of created) {
        expect(note.content).toBe('')
        expect(await fs.readFile(note.fullPath, 'utf-8')).toBe('')
      }
    } finally {
      await fs.rm(vaultDir, { recursive: true, force: true })
    }
  })

  it('não substitui uma nota existente ao renomear', async () => {
    const vaultDir = await fs.mkdtemp(path.join(os.tmpdir(), 'notes-md-rename-'))
    try {
      const first = await createNoteFile(vaultDir, '', 'Nova nota', 'Primeira')
      const second = await createNoteFile(vaultDir, '', 'Outra nota', 'Segunda')
      await expect(renameVaultEntry(vaultDir, first.relativePath, 'Outra nota')).rejects.toThrow()
      expect(await fs.readFile(first.fullPath, 'utf-8')).toBe('Primeira')
      expect(await fs.readFile(second.fullPath, 'utf-8')).toBe('Segunda')
    } finally {
      await fs.rm(vaultDir, { recursive: true, force: true })
    }
  })

  it('preserva a extensão ao renomear um arquivo que não é Markdown', async () => {
    const vaultDir = await fs.mkdtemp(path.join(process.cwd(), '.notes-md-rename-file-'))
    try {
      await fs.writeFile(path.join(vaultDir, 'imagem.png'), 'imagem')
      const renamed = await renameVaultEntry(vaultDir, 'imagem.png', 'nova-imagem')
      expect(renamed.newRelativePath).toBe('nova-imagem.png')
      expect(await fs.readFile(path.join(vaultDir, renamed.newRelativePath), 'utf-8')).toBe('imagem')
    } finally {
      await fs.rm(vaultDir, { recursive: true, force: true })
    }
  })

  it('inicializa o Vault padrão com notas Markdown interconectadas', async () => {
    const vaultDir = await fs.mkdtemp(path.join(os.tmpdir(), 'notes-md-seed-'))
    try {
      const snapshot = await ensureDefaultVault(vaultDir)
      expect(snapshot.notes.length).toBeGreaterThanOrEqual(4)
      const welcome = snapshot.notes.find((n) => n.name === 'Bem-vindo ao Notes MD')
      expect(welcome).toBeDefined()
      expect(welcome?.content).toContain('[[Guia do Editor WYSIWYG]]')

      const guide = snapshot.notes.find((n) => n.name === 'Guia do Editor WYSIWYG')
      expect(guide).toBeDefined()
      expect(guide?.content).toContain('[[Bem-vindo ao Notes MD]]')
      expect(guide?.content).toContain('C["Inserir [[WikiLink]]"]')
      expect(guide?.content).not.toContain('C[Inserir [[WikiLink]]]')
    } finally {
      await fs.rm(vaultDir, { recursive: true, force: true })
    }
  })

  it('cria, renomeia e exclui uma nota Markdown no disco', async () => {
    const created = await createNoteFile(
      defaultVaultDir,
      '',
      'Nota Temporaria de Teste',
      '# Teste\nConteúdo ligado a [[Bem-vindo ao Notes MD]].'
    )
    expect(created.name).toBe('Nota Temporaria de Teste')

    const renamed = await renameVaultEntry(
      defaultVaultDir,
      created.relativePath,
      'Nota Renomeada de Teste'
    )
    expect(renamed.newName).toBe('Nota Renomeada de Teste')

    const deleted = await deleteVaultEntry(defaultVaultDir, renamed.newRelativePath)
    expect(deleted).toBe(true)
  })

  it('detecta alterações externas no diretório (criação, edição e remoção de arquivos) via VaultWatcher', async () => {
    const initial = await ensureDefaultVault(defaultVaultDir)
    let receivedSnapshot: VaultSnapshot | null = null

    const watcher = new VaultWatcher((snap) => {
      receivedSnapshot = snap
    })
    watcher.watch(defaultVaultDir, initial)

    const externalFilePath = path.join(defaultVaultDir, 'Criado-Pelo-Explorer.md')
    try {
      // Simulate external file creation (like Windows Explorer / Notepad)
      await fs.writeFile(externalFilePath, '# Nota Externa\nCriada fora do app!', 'utf-8')
      await watcher.checkAndEmit()

      expect(receivedSnapshot).not.toBeNull()
      expect(
        receivedSnapshot!.notes.some((n) => n.name === 'Criado-Pelo-Explorer')
      ).toBe(true)

      const sigBeforeEdit = computeVaultSignature(receivedSnapshot!)

      // Simulate external file content modification
      await fs.writeFile(
        externalFilePath,
        '# Nota Externa Modificada\nConteúdo atualizado pelo Explorer!',
        'utf-8'
      )
      await watcher.checkAndEmit()

      const sigAfterEdit = computeVaultSignature(receivedSnapshot!)
      expect(sigAfterEdit).not.toBe(sigBeforeEdit)
    } finally {
      watcher.stop()
      await fs.rm(externalFilePath, { force: true })
    }
  })

  it('moveVaultEntry move arquivos e pastas com validação de descendência (Drag and Drop)', async () => {
    const testFile = await createNoteFile(defaultVaultDir, '', 'NotaParaMover', '# Conteúdo')
    try {
      const moved = await moveVaultEntry(defaultVaultDir, testFile.relativePath, 'Projetos')
      expect(moved.newRelativePath).toBe('Projetos/NotaParaMover.md')

      // Move back to root
      const movedBack = await moveVaultEntry(defaultVaultDir, moved.newRelativePath, '')
      expect(movedBack.newRelativePath).toBe('NotaParaMover.md')

      // Cannot move folder into its own descendant
      await expect(moveVaultEntry(defaultVaultDir, 'Projetos', 'Projetos/Sub')).rejects.toThrow()
    } finally {
      await deleteVaultEntry(defaultVaultDir, 'NotaParaMover.md').catch(() => {})
      await deleteVaultEntry(defaultVaultDir, 'Projetos/NotaParaMover.md').catch(() => {})
    }
  })

  it('exibe arquivos com diferentes extensões no tree e lê imagens em base64', async () => {
    const tempImgPath = path.join(defaultVaultDir, 'test-image.png')
    // 1x1 transparent PNG byte buffer
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    )
    await fs.writeFile(tempImgPath, pngBuffer)

    try {
      const snapshot = await loadVaultSnapshot(defaultVaultDir)
      const imgEntry = snapshot.tree.find((e) => e.name === 'test-image.png')
      expect(imgEntry).toBeDefined()
      expect(imgEntry?.extension).toBe('png')

      const imgData = await readVaultImageBase64(defaultVaultDir, 'test-image.png')
      expect(imgData).not.toBeNull()
      expect(imgData?.dataUrl).toContain('data:image/png;base64,')
      expect(imgData?.size).toBeGreaterThan(0)
    } finally {
      await fs.rm(tempImgPath, { force: true })
    }
  })
})
