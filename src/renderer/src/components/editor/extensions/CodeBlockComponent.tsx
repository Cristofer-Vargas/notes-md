import React, { useEffect, useRef, useState } from 'react'
import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { IconButton } from '../../ui'
import { SelectMenu } from '../../ui/SelectMenu'
import { MermaidViewer } from './MermaidViewer'
import {
  Code2,
  Copy,
  Check,
  Workflow,
  Eye,
  FileCode2,
  Terminal,
} from 'lucide-react'

const CODE_LANGUAGES = [
  { id: 'typescript', label: 'TypeScript', ext: 'ts' },
  { id: 'javascript', label: 'JavaScript', ext: 'js' },
  { id: 'python', label: 'Python', ext: 'py' },
  { id: 'mermaid', label: 'Mermaid', ext: 'mermaid' },
  { id: 'html', label: 'HTML', ext: 'html' },
  { id: 'css', label: 'CSS', ext: 'css' },
  { id: 'scss', label: 'SCSS', ext: 'scss' },
  { id: 'json', label: 'JSON', ext: 'json' },
  { id: 'bash', label: 'Bash / Shell', ext: 'sh' },
  { id: 'sql', label: 'SQL', ext: 'sql' },
  { id: 'markdown', label: 'Markdown', ext: 'md' },
  { id: 'csharp', label: 'C#', ext: 'cs' },
  { id: 'cpp', label: 'C++', ext: 'cpp' },
  { id: 'c', label: 'C', ext: 'c' },
  { id: 'java', label: 'Java', ext: 'java' },
  { id: 'kotlin', label: 'Kotlin', ext: 'kt' },
  { id: 'rust', label: 'Rust', ext: 'rs' },
  { id: 'go', label: 'Go', ext: 'go' },
  { id: 'php', label: 'PHP', ext: 'php' },
  { id: 'ruby', label: 'Ruby', ext: 'rb' },
  { id: 'lua', label: 'Lua', ext: 'lua' },
  { id: 'yaml', label: 'YAML', ext: 'yaml' },
  { id: 'diff', label: 'Diff', ext: 'diff' },
  { id: 'plaintext', label: 'Texto Puro', ext: 'txt' }
]

export const CodeBlockComponent: React.FC<NodeViewProps> = ({
  node,
  updateAttributes,
  editor,
  getPos
}) => {
  const currentLang = (node.attrs.language || 'plaintext').toLowerCase()
  const isMermaid = currentLang === 'mermaid'
  const hasCodeContent = node.textContent.trim().length > 0

  // Para Mermaid: utiliza o atributo viewMode persistido no node se o usuário já tiver alternado.
  // Se ainda for nulo (primeira abertura), inicia em 'preview' se tiver conteúdo salvo, ou 'code' se vazio.
  const explicitViewMode = node.attrs.viewMode as 'preview' | 'code' | null | undefined
  const effectiveViewMode: 'preview' | 'code' = isMermaid
    ? (explicitViewMode ?? (hasCodeContent ? 'preview' : 'code'))
    : 'code'

  const [copied, setCopied] = useState(false)

  const handleSwitchToCode = (e?: React.MouseEvent): void => {
    e?.preventDefault()
    e?.stopPropagation()
    updateAttributes({ viewMode: 'code' })

    // Foca suavemente o cursor dentro do bloco de código para edição imediata
    if (typeof getPos === 'function') {
      const pos = getPos()
      window.setTimeout(() => {
        try {
          editor.chain().focus(pos + 1).run()
        } catch {
          // ignore
        }
      }, 25)
    }
  }

  const handleSwitchToPreview = (e?: React.MouseEvent): void => {
    e?.preventDefault()
    e?.stopPropagation()
    updateAttributes({ viewMode: 'preview' })
  }

  const handleCopyCode = async (e: React.MouseEvent): Promise<void> => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(node.textContent)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  const handleLanguageChange = (newLang: string): void => {
    const isNowMermaid = newLang.toLowerCase() === 'mermaid'
    updateAttributes({
      language: newLang,
      viewMode: isNowMermaid ? (node.textContent.trim().length > 0 ? 'preview' : 'code') : null
    })
  }

  const handleInsertExample = (exampleCode: string): void => {
    if (typeof getPos === 'function') {
      const from = getPos() + 1
      const to = from + node.nodeSize - 2
      editor.chain().focus().insertContentAt({ from, to }, exampleCode).run()
      updateAttributes({ viewMode: 'preview' })
    }
  }

  // Verifica se a linguagem atual está na lista padrão, caso não esteja, adiciona
  const hasLangInList = CODE_LANGUAGES.some((l) => l.id === currentLang)
  const languageOptions = hasLangInList
    ? CODE_LANGUAGES
    : [{ id: currentLang, label: currentLang, ext: currentLang }, ...CODE_LANGUAGES]

  return (
    <NodeViewWrapper
      spellCheck={false}
      data-gramm={false}
      className="my-5 overflow-hidden rounded-sm border border-[var(--code-border)] bg-[var(--code-bg)] text-[var(--code-text)] select-text"
    >
      {/* Header Interativo do Bloco de Código */}
      <div
        contentEditable={false}
        className="flex items-center justify-between gap-2 px-3 py-1.5 bg-[var(--code-header-bg)] border-b border-[var(--code-border)] text-xs select-none"
      >
        {/* Lado Esquerdo: Ícone + Seletor de Linguagem Interativo */}
        <div className="flex items-center gap-2">
          {isMermaid ? (
            <Workflow className="w-4 h-4 opacity-60" />
          ) : currentLang === 'bash' || currentLang === 'shell' ? (
            <Terminal className="w-4 h-4 opacity-60" />
          ) : (
            <FileCode2 className="w-4 h-4 opacity-60" />
          )}

          <SelectMenu
            value={currentLang}
            options={languageOptions.map((language) => ({ value: language.id, label: language.label, hint: language.ext }))}
            label="Linguagem do código"
            onChange={handleLanguageChange}
            className="h-7 w-40 border-transparent bg-transparent font-mono text-[var(--code-text)] hover:bg-[var(--code-border)]"
          />
        </div>

        {/* Lado Direito: Alternância Mermaid (Diagrama ↔ Código) e Botão Copiar */}
        <div className="flex items-center gap-1">
          {isMermaid && (
            <div className="flex items-center gap-0.5 border-r border-[var(--code-border)] pr-1 mr-1">
              <IconButton
                size="xs"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleSwitchToPreview}
                tooltip="Visualizar diagrama"
                aria-pressed={effectiveViewMode === 'preview'}
                icon={<Eye className="w-3.5 h-3.5" />}
                className={`text-[var(--code-text)] hover:text-[var(--code-text)] hover:bg-[var(--code-border)] ${effectiveViewMode === 'preview' ? 'bg-[var(--code-border)]' : 'opacity-60'}`}
              />
              <IconButton
                size="xs"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleSwitchToCode}
                tooltip="Editar código do diagrama"
                aria-pressed={effectiveViewMode === 'code'}
                icon={<Code2 className="w-3.5 h-3.5" />}
                className={`text-[var(--code-text)] hover:text-[var(--code-text)] hover:bg-[var(--code-border)] ${effectiveViewMode === 'code' ? 'bg-[var(--code-border)]' : 'opacity-60'}`}
              />
            </div>
          )}

          <IconButton
            size="xs"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleCopyCode}
            tooltip={copied ? 'Código copiado' : 'Copiar código'}
            icon={
              copied ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )
            }
            className="text-[var(--code-text)] opacity-60 hover:opacity-100 hover:text-[var(--code-text)] hover:bg-[var(--code-border)]"
          />
        </div>
      </div>

      {/* Conteúdo do Bloco: Diagrama Mermaid VS Código com Syntax Highlighting */}
      {isMermaid && effectiveViewMode === 'preview' && (
        <MermaidViewer
          code={node.textContent}
          onEditCode={handleSwitchToCode}
          onInsertExample={handleInsertExample}
        />
      )}

      <div className={isMermaid && effectiveViewMode === 'preview' ? 'hidden' : 'relative'}>
        <pre
          spellCheck={false}
          className="code-block-pre font-mono text-[13px] leading-relaxed p-4 overflow-x-auto bg-[var(--code-bg,#21222c)] text-[var(--code-text,#f8f8f2)] min-h-[50px] m-0"
        >
          <NodeViewContent
            as="code"
            spellCheck={false}
            data-gramm={false}
            className={`language-${currentLang} font-mono focus:outline-none`}
          />
        </pre>

      </div>
    </NodeViewWrapper>
  )
}
