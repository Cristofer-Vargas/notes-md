import { describe, it, expect } from 'vitest'
import path from 'path'
import fs from 'fs/promises'
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
} from '../../../../main/vaultService'
import type { VaultSnapshot } from '../../../../preload/index.d'

describe('vaultService — Operações de Sistema de Arquivos e Watcher em Tempo Real', () => {
  const defaultVaultDir = path.join(process.cwd(), 'Vault-Notas')

  it('inicializa o Vault padrão com notas Markdown interconectadas', async () => {
    const snapshot = await ensureDefaultVault(defaultVaultDir)
    expect(snapshot.vaultName).toBe('Vault-Notas')
    expect(snapshot.notes.length).toBeGreaterThanOrEqual(4)
    const welcome = snapshot.notes.find((n) => n.name === 'Bem-vindo ao Notes-MD')
    expect(welcome).toBeDefined()
    expect(welcome?.content).toContain('[[Guia do Editor WYSIWYG]]')
  })

  it('cria, renomeia e exclui uma nota Markdown no disco', async () => {
    const created = await createNoteFile(
      defaultVaultDir,
      '',
      'Nota Temporaria de Teste',
      '# Teste\nConteúdo ligado a [[Bem-vindo ao Notes-MD]].'
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
