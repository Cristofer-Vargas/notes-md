import fs from 'fs/promises'
import fsSync from 'fs'
import path from 'path'
import type { VaultFileEntry, VaultNoteData, VaultSnapshot } from '../preload/index.d'

function normalizeRelPath(relPath: string): string {
  return relPath.split(path.sep).join('/')
}

const DEFAULT_NOTES: Array<{ relativePath: string; content: string }> = [
  {
    relativePath: 'Bem-vindo ao Notes MD.md',
    content: `# Bem-vindo ao <mark data-color="#fef08a">Notes MD</mark>

Essenciais para desenvolvedores, escritores e criadores de conhecimento conectado.

Os editores de texto rico e o **Markdown** evoluíram para unir a velocidade da escrita limpa com o poder visual de um editor **WYSIWYG** moderno — inspirado no melhor do *Obsidian* e dos editores documentais modernos.

---

## Capítulo 1: O Poder das Notas Conectadas

O grande diferencial do **Notes MD** é combinar uma barra de ferramentas completa (no topo) com conexões bidirecionais entre arquivos Markdown reais no seu computador.

Experimente passar o mouse ou clicar nos links abaixo:
- Explore todas as ferramentas visuais em [[Guia do Editor WYSIWYG]]
- Entenda como funcionam os links e conexões em [[Sistema Zettelkasten e Links]]
- Veja um exemplo prático de planejamento em [[Projetos/Ideias de Projetos]]
- Ou clique em uma nota que ainda não existe para criá-la na hora: [[Minha Nova Ideia]]

> **Dica Rápida:** Digite \`[[\` em qualquer lugar do editor para abrir o autocompletar inteligente de notas do seu Vault!

### Comparativo de Produtividade

| Recurso | Editor Comum | Notes MD (WYSIWYG + Obsidian) |
| :--- | :--- | :--- |
| **Formatação Visual** | Apenas texto ou pesado | Barra WYSIWYG completa + Markdown puro |
| **Conexão entre Notas** | Pastas isoladas | \`[[WikiLinks]]\`, Backlinks e Hover Preview |
| **Armazenamento** | Formato proprietário | Arquivos \`.md\` locais no seu PC |

### Primeiros Passos

- [x] Abrir o Vault inicial no Notes MD
- [x] Testar os destaques coloridos e tabelas
- [ ] Passar o mouse sobre um \`[[WikiLink]]\` para ver o **Hover Preview**
- [ ] Conferir o painel de **Backlinks** na barra lateral direita
- [ ] Personalizar o tema e a tipografia no botão de **Configurações**
`
  },
  {
    relativePath: 'Guia do Editor WYSIWYG.md',
    content: `# Guia Completo do Editor WYSIWYG

Esta nota está conectada à página inicial [[Bem-vindo ao Notes MD]] e demonstra todas as ferramentas disponíveis na barra superior.

---

## 1. Formatação de Texto e Destaques

Você pode combinar **Negrito**, *Itálico*, <u>Sublinhado</u>, ~~Tachado~~, \`código inline\`, além de destaques coloridos como <mark data-color="#fef08a">Amarelo Solar</mark>, <mark data-color="#bbf7d0">Verde Menta</mark>, <mark data-color="#bfdbfe">Azul Céu</mark> e <mark data-color="#fbcfe8">Rosa Suave</mark>.

## 2. Blocos de Código com Syntax Highlighting

\`\`\`typescript
interface NoteConnection {
  source: string
  target: string
  backlinksCount: number
}

export function connectNotes(a: string, b: string): NoteConnection {
  console.log(\`Conectando \${a} com \${b}...\`)
  return { source: a, target: b, backlinksCount: 42 }
}
\`\`\`

\`\`\`python
def calcular_relevancia(palavras: int, backlinks: int) -> float:
    # Pontuação baseada em densidade de conexões
    fator = 1.5 if backlinks > 0 else 1.0
    return round((palavras / 100) * fator, 2)
\`\`\`

## 3. Diagramas Mermaid Interativos (Estilo Obsidian)

Assim como no Obsidian, você pode criar fluxogramas, sequências e grafos diretamente em blocos de código com linguagem \`mermaid\`:

\`\`\`mermaid
graph TD
  A["💡 Nova Ideia"] --> B{"Conectar a Nota?"}
  B -->|Sim| C["Inserir [[WikiLink]]"]
  B -->|Não| D["Salvar como Rascunho"]
  C --> E["Explorar Backlinks"]
  D --> E
  E --> F["✨ Conhecimento Integrado"]
\`\`\`

## 4. Citações e Listas

> "O conhecimento só se torna poderoso quando as ideias se conectam de forma fluida." — Veja mais em [[Sistema Zettelkasten e Links]].

1. Alterne entre o modo **Visual (WYSIWYG)** e o **Código Fonte Markdown (\`<>\`)** a qualquer momento na barra superior.
2. Insira tabelas, listas de tarefas, links e imagens com um clique.
`
  },
  {
    relativePath: 'Sistema Zettelkasten e Links.md',
    content: `# Sistema Zettelkasten e Conexões

No **Notes MD**, cada nota é um arquivo \`.md\` independente, mas todas fazem parte de uma rede viva de conhecimento.

---

## Como funcionam os Links Bidirecionais?

1. **Links Diretos (\`[[WikiLinks]]\`)**: Quando você escreve [[Bem-vindo ao Notes MD]] ou [[Guia do Editor WYSIWYG]], o editor cria um vínculo ativo.
2. **Backlinks Automáticos**: Abra a nota [[Bem-vindo ao Notes MD]] e olhe o painel lateral direito — você verá que esta nota aparece listada automaticamente nas **Menções Vinculadas (Backlinks)** com o trecho exato onde foi citada!
3. **Hover Preview**: Passe o cursor sobre [[Projetos/Ideias de Projetos]] para ler o resumo da nota sem sair da página atual.
`
  },
  {
    relativePath: 'Projetos/Ideias de Projetos.md',
    content: `# Ideias de Projetos e Roadmap

Nota organizada dentro da pasta \`Projetos/\` e vinculada a [[Bem-vindo ao Notes MD]] e [[Sistema Zettelkasten e Links]].

---

## Próximos Objetivos

- [x] Criar arquitetura em Electron + React + TipTap
- [x] Implementar barra de ferramentas WYSIWYG completa
- [ ] Escrever anotações diárias conectadas
`
  }
]

export async function ensureDefaultVault(defaultVaultPath: string): Promise<VaultSnapshot> {
  if (!fsSync.existsSync(defaultVaultPath)) {
    await fs.mkdir(defaultVaultPath, { recursive: true })
  }

  const existingEntries = await fs.readdir(defaultVaultPath)
  const hasMarkdown = existingEntries.some((e) => e.endsWith('.md') || !e.startsWith('.'))

  if (!hasMarkdown || existingEntries.length === 0) {
    for (const seed of DEFAULT_NOTES) {
      const targetPath = path.join(defaultVaultPath, seed.relativePath)
      await fs.mkdir(path.dirname(targetPath), { recursive: true })
      await fs.writeFile(targetPath, seed.content, 'utf-8')
    }
  }

  return loadVaultSnapshot(defaultVaultPath)
}

export async function loadVaultSnapshot(vaultPath: string): Promise<VaultSnapshot> {
  const notes: VaultNoteData[] = []

  if (!fsSync.existsSync(vaultPath)) {
    await fs.mkdir(vaultPath, { recursive: true })
  }

  async function scanDir(currentDir: string): Promise<VaultFileEntry[]> {
    let dirEntries: fsSync.Dirent[] = []
    try {
      dirEntries = await fs.readdir(currentDir, { withFileTypes: true })
    } catch {
      return []
    }

    const entries: VaultFileEntry[] = []

    // Sort folders first, then alphabetically
    dirEntries.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1
      if (!a.isDirectory() && b.isDirectory()) return 1
      return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
    })

    for (const entry of dirEntries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') {
        continue
      }

      const fullPath = path.join(currentDir, entry.name)
      const relativePath = normalizeRelPath(path.relative(vaultPath, fullPath))

      let stat: fsSync.Stats
      try {
        stat = await fs.stat(fullPath)
      } catch {
        // Entry may have been deleted/renamed mid-scan by an external program
        continue
      }

      if (entry.isDirectory()) {
        const children = await scanDir(fullPath)
        entries.push({
          name: entry.name,
          relativePath,
          fullPath,
          isDirectory: true,
          updatedAt: stat.mtimeMs,
          children
        })
      } else if (entry.isFile()) {
        const isMarkdown = entry.name.toLowerCase().endsWith('.md')
        const ext = path.extname(entry.name).replace(/^\./, '').toLowerCase()

        if (isMarkdown) {
          try {
            const fileContent = await fs.readFile(fullPath, 'utf-8')
            const cleanName = entry.name.replace(/\.md$/i, '')

            entries.push({
              name: cleanName,
              relativePath,
              fullPath,
              isDirectory: false,
              updatedAt: stat.mtimeMs,
              extension: 'md'
            })

            notes.push({
              name: cleanName,
              fileName: entry.name,
              relativePath,
              fullPath,
              content: fileContent,
              updatedAt: stat.mtimeMs
            })
          } catch {
            // Skip file if temporarily locked or removed by external process
            continue
          }
        } else {
          // Other files (images, code, documents, assets, etc.)
          entries.push({
            name: entry.name,
            relativePath,
            fullPath,
            isDirectory: false,
            updatedAt: stat.mtimeMs,
            extension: ext || 'file'
          })
        }
      }
    }

    return entries
  }

  const tree = await scanDir(vaultPath)
  const vaultName = path.basename(vaultPath)

  return {
    vaultPath,
    vaultName,
    tree,
    notes
  }
}

export function computeVaultSignature(snapshot: VaultSnapshot): string {
  const treeParts: string[] = []
  function walk(items: VaultFileEntry[]): void {
    for (const item of items) {
      treeParts.push(`${item.isDirectory ? 'D' : 'F'}:${item.relativePath}`)
      if (item.children) walk(item.children)
    }
  }
  walk(snapshot.tree)

  const noteParts = snapshot.notes.map(
    (n) => `${n.relativePath}:${n.content.length}:${Math.round(n.updatedAt)}`
  )
  return `${snapshot.vaultPath}|${treeParts.join(',')}|${noteParts.join(',')}`
}

export class VaultWatcher {
  private currentVaultPath: string | null = null
  private fsWatcher: fsSync.FSWatcher | null = null
  private pollTimer: NodeJS.Timeout | null = null
  private debounceTimer: NodeJS.Timeout | null = null
  private lastSignature = ''
  private isScanning = false
  private onChangedCallback: (snapshot: VaultSnapshot) => void

  constructor(onChangedCallback: (snapshot: VaultSnapshot) => void) {
    this.onChangedCallback = onChangedCallback
  }

  public watch(vaultPath: string, initialSnapshot?: VaultSnapshot): void {
    if (initialSnapshot) {
      this.lastSignature = computeVaultSignature(initialSnapshot)
    }

    if (this.currentVaultPath === vaultPath && this.fsWatcher) {
      return
    }

    this.stop()
    this.currentVaultPath = vaultPath

    try {
      this.fsWatcher = fsSync.watch(
        vaultPath,
        { recursive: true },
        (_eventType, filename) => {
          if (filename) {
            const normalized = filename.replace(/\\/g, '/')
            if (
              normalized.startsWith('.') ||
              normalized.includes('/.') ||
              normalized.includes('node_modules')
            ) {
              return
            }
          }
          this.scheduleCheck()
        }
      )

      this.fsWatcher.on('error', () => {
        // Fallback pollTimer continues working even if fsWatcher encounters a transient OS error
      })
    } catch {
      // Directory watching fallback handled by pollTimer below
    }

    // Lightweight periodic verification to catch external folder moves/renames reliably
    this.pollTimer = setInterval(() => {
      this.checkAndEmit()
    }, 4000)
  }

  public scheduleCheck(delayMs = 140): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }
    this.debounceTimer = setTimeout(() => {
      this.checkAndEmit()
    }, delayMs)
  }

  public async checkAndEmit(): Promise<void> {
    if (!this.currentVaultPath || this.isScanning) return
    this.isScanning = true
    try {
      const snapshot = await loadVaultSnapshot(this.currentVaultPath)
      const nextSig = computeVaultSignature(snapshot)
      if (nextSig !== this.lastSignature) {
        this.lastSignature = nextSig
        this.onChangedCallback(snapshot)
      }
    } catch {
      // Ignore transient errors during external bulk file operations
    } finally {
      this.isScanning = false
    }
  }

  public stop(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
    if (this.fsWatcher) {
      try {
        this.fsWatcher.close()
      } catch {
        // ignore
      }
      this.fsWatcher = null
    }
    this.currentVaultPath = null
  }
}

export async function readNoteFile(vaultPath: string, relativePath: string): Promise<string> {
  const fullPath = path.join(vaultPath, relativePath)
  return fs.readFile(fullPath, 'utf-8')
}

export async function writeNoteFile(
  vaultPath: string,
  relativePath: string,
  content: string
): Promise<{ updatedAt: number }> {
  const fullPath = path.join(vaultPath, relativePath)
  await fs.mkdir(path.dirname(fullPath), { recursive: true })
  await fs.writeFile(fullPath, content, 'utf-8')
  const stat = await fs.stat(fullPath)
  return { updatedAt: stat.mtimeMs }
}

export async function createNoteFile(
  vaultPath: string,
  folderRelativePath: string,
  noteTitle: string,
  initialContent?: string
): Promise<VaultNoteData> {
  const sanitizedTitle = noteTitle
    .trim()
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\.md$/i, '')

  if (!sanitizedTitle || /^\.+$/.test(sanitizedTitle)) {
    throw new Error('Informe um nome válido para a nota.')
  }

  const baseRel = folderRelativePath
    ? `${folderRelativePath.replace(/\/+$/, '')}/${sanitizedTitle}`
    : sanitizedTitle

  let candidateRel = `${baseRel}.md`
  let counter = 1
  await fs.mkdir(path.dirname(path.join(vaultPath, candidateRel)), { recursive: true })
  const defaultBody = initialContent ?? ''
  while (true) {
    try {
      await fs.writeFile(path.join(vaultPath, candidateRel), defaultBody, { encoding: 'utf-8', flag: 'wx' })
      break
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
      candidateRel = `${baseRel} (${counter++}).md`
    }
  }

  const fullPath = path.join(vaultPath, candidateRel)
  const cleanName = path.basename(candidateRel, '.md')
  const stat = await fs.stat(fullPath)

  return {
    name: cleanName,
    fileName: path.basename(candidateRel),
    relativePath: normalizeRelPath(candidateRel),
    fullPath,
    content: defaultBody,
    updatedAt: stat.mtimeMs
  }
}

export async function createVaultFolder(
  vaultPath: string,
  parentRelativePath: string,
  folderName: string
): Promise<string> {
  const sanitized = folderName.trim().replace(/[<>:"/\\|?*]/g, '')
  const relPath = parentRelativePath
    ? `${parentRelativePath.replace(/\/+$/, '')}/${sanitized}`
    : sanitized
  const fullPath = path.join(vaultPath, relPath)
  await fs.mkdir(fullPath, { recursive: true })
  return normalizeRelPath(relPath)
}

export async function renameVaultEntry(
  vaultPath: string,
  oldRelativePath: string,
  newName: string
): Promise<{ newRelativePath: string; newName: string }> {
  const oldFullPath = path.join(vaultPath, oldRelativePath)
  const stat = await fs.stat(oldFullPath)
  const parentDir = path.dirname(oldRelativePath)
  const sanitizedName = newName.trim().replace(/[<>:"/\\|?*]/g, '')
  if (!sanitizedName || /^\.+$/.test(sanitizedName) || /^\.md$/i.test(sanitizedName)) {
    throw new Error('Informe um nome válido.')
  }

  const oldExtension = path.extname(oldRelativePath)
  const finalFileName = stat.isDirectory()
    ? sanitizedName
    : oldExtension.toLowerCase() === '.md'
      ? sanitizedName.toLowerCase().endsWith('.md') ? sanitizedName : `${sanitizedName}.md`
      : path.extname(sanitizedName) ? sanitizedName : `${sanitizedName}${oldExtension}`

  const newRelativePath = normalizeRelPath(
    parentDir === '.' ? finalFileName : path.join(parentDir, finalFileName)
  )
  const newFullPath = path.join(vaultPath, newRelativePath)

  if (oldFullPath !== newFullPath && fsSync.existsSync(newFullPath)) {
    const targetStat = await fs.stat(newFullPath)
    if (oldFullPath.toLowerCase() !== newFullPath.toLowerCase() || targetStat.dev !== stat.dev || targetStat.ino !== stat.ino) {
      throw new Error('Já existe um arquivo ou pasta com esse nome.')
    }
  }
  if (oldFullPath !== newFullPath) {
    await fs.rename(oldFullPath, newFullPath)
  }

  return {
    newRelativePath,
    newName: finalFileName.replace(/\.md$/i, '')
  }
}

export async function deleteVaultEntry(vaultPath: string, relativePath: string): Promise<boolean> {
  const fullPath = path.join(vaultPath, relativePath)
  await fs.rm(fullPath, { recursive: true, force: true })
  return true
}

export async function moveVaultEntry(
  vaultPath: string,
  oldRelativePath: string,
  newParentFolderRelativePath: string
): Promise<{ newRelativePath: string }> {
  const normOldRel = normalizeRelPath(oldRelativePath)
  const normTargetFolder = normalizeRelPath(newParentFolderRelativePath || '')

  const oldFullPath = path.join(vaultPath, normOldRel)
  const entryBaseName = path.basename(normOldRel)

  // Validation: cannot move into itself or its own descendant
  if (normTargetFolder === normOldRel || normTargetFolder.startsWith(normOldRel + '/')) {
    throw new Error('Não é possível mover uma pasta para dentro de si mesma.')
  }

  const newRelPath = normalizeRelPath(
    normTargetFolder ? path.join(normTargetFolder, entryBaseName) : entryBaseName
  )
  const newFullPath = path.join(vaultPath, newRelPath)

  if (oldFullPath === newFullPath) {
    return { newRelativePath: normOldRel }
  }

  // Ensure target folder exists
  const targetDir = path.dirname(newFullPath)
  await fs.mkdir(targetDir, { recursive: true })

  // Rename/move
  await fs.rename(oldFullPath, newFullPath)

  return { newRelativePath: newRelPath }
}

const IMAGE_MIME_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  webp: 'image/webp',
  bmp: 'image/bmp',
  ico: 'image/x-icon'
}

export async function readVaultImageBase64(
  vaultPath: string,
  relativePath: string
): Promise<{ dataUrl: string; size: number } | null> {
  try {
    const fullPath = path.join(vaultPath, relativePath)
    const stat = await fs.stat(fullPath)
    const ext = path.extname(fullPath).replace(/^\./, '').toLowerCase()
    const mime = IMAGE_MIME_TYPES[ext] || 'application/octet-stream'
    const buffer = await fs.readFile(fullPath)
    const base64 = buffer.toString('base64')
    return {
      dataUrl: `data:${mime};base64,${base64}`,
      size: stat.size
    }
  } catch {
    return null
  }
}
