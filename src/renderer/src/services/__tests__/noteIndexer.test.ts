import { describe, it, expect } from 'vitest'
import {
  extractWikiLinks,
  extractHeadings,
  buildVaultIndex,
  updateWikiLinksAfterRename,
  preprocessMarkdownForEditor,
  postprocessMarkdownFromEditor
} from '../noteIndexer'
import type { VaultNoteData } from '../../../../preload/index.d'

describe('noteIndexer — Obsidian WikiLinks & Backlinks Engine', () => {
  it('extrai [[WikiLinks]] simples e com alias ignorando blocos de código', () => {
    const md = `# Título Principal
Texto com [[Nota A]] e também [[Projetos/Nota B|Apelido B]].
\`\`\`md
[[Link Ignorado Dentro de Código]]
\`\`\`
\`\`\`mermaid
graph TD
  A[[Link Ignorado Em Mermaid]] --> B
\`\`\`
Outra linha apontando para [[Nota A]].`

    const links = extractWikiLinks(md)
    expect(links).toHaveLength(3)
    expect(links[0].target).toBe('Nota A')
    expect(links[1].target).toBe('Projetos/Nota B')
    expect(links[1].alias).toBe('Apelido B')
    expect(links[2].target).toBe('Nota A')
  })

  it('constrói o índice de Backlinks bidirecionais entre notas do Vault', () => {
    const notes: VaultNoteData[] = [
      {
        name: 'Nota Principal',
        fileName: 'Nota Principal.md',
        relativePath: 'Nota Principal.md',
        fullPath: '/vault/Nota Principal.md',
        content: '# Nota Principal\nConectada com [[Segunda Nota]].',
        updatedAt: 1
      },
      {
        name: 'Segunda Nota',
        fileName: 'Segunda Nota.md',
        relativePath: 'Segunda Nota.md',
        fullPath: '/vault/Segunda Nota.md',
        content: '# Segunda Nota\nAqui fazemos referência de volta para [[Nota Principal]].',
        updatedAt: 2
      }
    ]

    const index = buildVaultIndex(notes)
    expect(index['Nota Principal.md'].backlinks).toHaveLength(1)
    expect(index['Nota Principal.md'].backlinks[0].sourceName).toBe('Segunda Nota')
    expect(index['Segunda Nota.md'].backlinks).toHaveLength(1)
    expect(index['Segunda Nota.md'].backlinks[0].sourceName).toBe('Nota Principal')
  })

  it('atualiza referências [[WikiLinks]] automaticamente quando uma nota é renomeada', () => {
    const content = 'Veja [[Ideia Antiga]] e também [[Ideia Antiga|Meu Resumo]].'
    const { updatedContent, changed } = updateWikiLinksAfterRename(
      content,
      'Ideia Antiga',
      'Ideia Antiga.md',
      'Ideia Nova',
      'Ideia Nova.md'
    )

    expect(changed).toBe(true)
    expect(updatedContent).toBe('Veja [[Ideia Nova]] e também [[Ideia Nova|Meu Resumo]].')
  })

  it('normaliza [[WikiLinks]] e aliases para Live Preview sem colchetes extras', () => {
    const original = 'Teste com [[Guia WYSIWYG]] e [[Sistema Zettelkasten|Zettelkasten]].'
    const prepared = preprocessMarkdownForEditor(original)
    expect(prepared).toBe(original)

    // Remove colchetes duplicados acidentais [[[[Nota]]]] -> [[Nota]]
    const withExtraBrackets = 'Link duplicado [[[[Nota Teste]]]] e [[Nota|[[Nota]]]].'
    expect(preprocessMarkdownForEditor(withExtraBrackets)).toBe(
      'Link duplicado [[Nota Teste]] e [[Nota]].'
    )

    // Desescapa colchetes e pipes serializados pelo prosemirror-markdown
    const escapedFromSerializer =
      'Teste com \\[\\[Guia WYSIWYG\\]\\] e \\[\\[Sistema Zettelkasten\\|Zettelkasten\\]\\].'
    expect(postprocessMarkdownFromEditor(escapedFromSerializer)).toBe(original)
  })

  it('extrai cabeçalhos H1-H6 para o sumário (Outline)', () => {
    const md = `# Cap 1\n## Seção 1.1\n### Tópico com [[Link]]`
    const headings = extractHeadings(md)
    expect(headings).toHaveLength(3)
    expect(headings[0]).toMatchObject({ level: 1, text: 'Cap 1' })
    expect(headings[2]).toMatchObject({ level: 3, text: 'Tópico com Link' })
  })

  it('constrói árvore hierárquica em cascata (buildHeadingTree) com filhos e níveis aninhados', async () => {
    const { buildHeadingTree } = await import('../../components/sidebar/BacklinksSidebar')
    const headings = [
      { id: '1', level: 1, text: 'H1 Principal' },
      { id: '2', level: 2, text: 'H2 Subtópico 1' },
      { id: '3', level: 3, text: 'H3 Detalhe 1.1' },
      { id: '4', level: 2, text: 'H2 Subtópico 2' },
      { id: '5', level: 1, text: 'H1 Segundo' }
    ]

    const tree = buildHeadingTree(headings)
    expect(tree).toHaveLength(2)
    expect(tree[0].text).toBe('H1 Principal')
    expect(tree[0].children).toHaveLength(2)
    expect(tree[0].children[0].text).toBe('H2 Subtópico 1')
    expect(tree[0].children[0].children).toHaveLength(1)
    expect(tree[0].children[0].children[0].text).toBe('H3 Detalhe 1.1')
    expect(tree[0].children[1].text).toBe('H2 Subtópico 2')
    expect(tree[1].text).toBe('H1 Segundo')
    expect(tree[1].children).toHaveLength(0)
  })
})
