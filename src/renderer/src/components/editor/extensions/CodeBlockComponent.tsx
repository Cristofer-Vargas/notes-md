import React, { useState } from 'react'
import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { MermaidViewer } from './MermaidViewer'
import {
  Code2,
  Copy,
  Check,
  Workflow,
  Eye,
  FileCode2,
  Terminal,
  ChevronDown
} from 'lucide-react'

const CODE_LANGUAGES = [
  { id: 'typescript', label: 'TypeScript', ext: 'ts' },
  { id: 'javascript', label: 'JavaScript', ext: 'js' },
  { id: 'python', label: 'Python', ext: 'py' },
  { id: 'mermaid', label: '📊 Mermaid (Diagramas)', ext: 'mermaid' },
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

  // Para Mermaid: se houver código já salvo, inicia no modo diagrama visual (estilo Obsidian)
  const [viewMode, setViewMode] = useState<'preview' | 'code'>(
    isMermaid && node.textContent.trim().length > 0 ? 'preview' : 'code'
  )
  const [copied, setCopied] = useState(false)

  const handleCopyCode = async (e: React.MouseEvent): Promise<void> => {
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
    updateAttributes({ language: newLang })
    if (newLang === 'mermaid') {
      setViewMode(node.textContent.trim().length > 0 ? 'preview' : 'code')
    }
  }

  const handleInsertExample = (exampleCode: string): void => {
    if (typeof getPos === 'function') {
      const from = getPos() + 1
      const to = from + node.nodeSize - 2
      editor.chain().focus().insertContentAt({ from, to }, exampleCode).run()
      setViewMode('preview')
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
      className="my-5 rounded-xl border border-[var(--code-border,#383a4c)] bg-[var(--code-bg,#21222c)] text-[var(--code-text,#f8f8f2)] shadow-md overflow-hidden select-text transition-all duration-150"
    >
      {/* Header Interativo do Bloco de Código */}
      <div
        contentEditable={false}
        className="flex items-center justify-between px-3 py-1.5 bg-[var(--code-header-bg,#1e1f29)] border-b border-[var(--code-border,#383a4c)] text-xs select-none"
      >
        {/* Lado Esquerdo: Ícone + Seletor de Linguagem Interativo */}
        <div className="flex items-center gap-2">
          {isMermaid ? (
            <Workflow className="w-4 h-4 text-emerald-400" />
          ) : currentLang === 'bash' || currentLang === 'shell' ? (
            <Terminal className="w-4 h-4 text-amber-400" />
          ) : (
            <FileCode2 className="w-4 h-4 text-sky-400" />
          )}

          <div className="relative flex items-center">
            <select
              value={currentLang}
              onChange={(e) => handleLanguageChange(e.target.value)}
              title="Mudar linguagem do bloco de código (aplica realce de sintaxe e tema)"
              className="appearance-none bg-surface-tertiary hover:bg-surface-tertiary/80 text-content-primary text-xs font-mono font-medium rounded-md pl-2 pr-6 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-accent border border-surface-border transition-colors"
            >
              {languageOptions.map((l) => (
                <option key={l.id} value={l.id} className="bg-surface-secondary text-content-primary">
                  {l.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-content-muted absolute right-1.5 pointer-events-none" />
          </div>

          {isMermaid && (
            <span className="hidden sm:inline-block text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
              Live Preview
            </span>
          )}
        </div>

        {/* Lado Direito: Alternância Mermaid (Diagrama ↔ Código) e Botão Copiar */}
        <div className="flex items-center gap-1.5">
          {isMermaid && (
            <div className="flex items-center p-0.5 rounded-lg bg-surface-tertiary border border-surface-border mr-1">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setViewMode('preview')}
                title="Visualizar Diagrama Mermaid renderizado"
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
                  viewMode === 'preview'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-content-muted hover:text-content-primary hover:bg-surface-bg/50'
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>Diagrama</span>
              </button>

              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setViewMode('code')}
                title="Editar código fonte do diagrama Mermaid"
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
                  viewMode === 'code'
                    ? 'bg-surface-bg text-content-primary shadow-sm'
                    : 'text-content-muted hover:text-content-primary hover:bg-surface-bg/50'
                }`}
              >
                <Code2 className="w-3 h-3" />
                <span>Código</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleCopyCode}
            title="Copiar código para a área de transferência"
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-content-secondary hover:text-content-primary bg-surface-tertiary hover:bg-surface-tertiary/80 border border-surface-border transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400 font-medium">Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-content-muted" />
                <span>Copiar</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Conteúdo do Bloco: Diagrama Mermaid VS Código com Syntax Highlighting */}
      {isMermaid && viewMode === 'preview' ? (
        <>
          <MermaidViewer
            code={node.textContent}
            onEditCode={() => setViewMode('code')}
            onInsertExample={handleInsertExample}
          />
          {/* Mantém NodeViewContent ativo no DOM oculto para preservar o estado do ProseMirror */}
          <div className="hidden">
            <NodeViewContent as="code" spellCheck={false} className="language-mermaid font-mono" />
          </div>
        </>
      ) : (
        <div className="relative">
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

          {isMermaid && (
            <div
              contentEditable={false}
              className="flex items-center justify-between px-3 py-1 bg-[var(--code-header-bg,#1e1f29)] border-t border-[var(--code-border,#383a4c)] text-[11px] text-content-muted select-none"
            >
              <span>Edite o código Mermaid acima</span>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setViewMode('preview')}
                className="text-emerald-400 hover:underline flex items-center gap-1 font-medium"
              >
                <Eye className="w-3 h-3" />
                <span>Visualizar Diagrama</span>
              </button>
            </div>
          )}
        </div>
      )}
    </NodeViewWrapper>
  )
}
