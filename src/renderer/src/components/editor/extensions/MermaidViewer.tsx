import React, { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'
import {
  Code2,
  Copy,
  Check,
  AlertCircle,
  Sparkles,
  Workflow,
  RotateCcw,
  ZoomIn,
  ZoomOut
} from 'lucide-react'

interface MermaidViewerProps {
  code: string
  onEditCode: () => void
  onInsertExample?: (exampleCode: string) => void
  theme?: 'light' | 'dark' | 'sepia'
}

const MERMAID_EXAMPLES = [
  {
    name: 'Fluxograma (Flowchart)',
    code: `graph TD
  A[Início do Processo] --> B{Possui Dados?}
  B -->|Sim| C[Processar Informações]
  B -->|Não| D[Aguardar Entrada]
  C --> E[Finalizado com Sucesso]`
  },
  {
    name: 'Sequência (Sequence)',
    code: `sequenceDiagram
  autonumber
  actor Usuário
  participant App as Notes-MD
  participant Disco as Vault Local
  Usuário->>App: Escrever Nota Markdown
  App->>Disco: Salvar Arquivo (.md)
  Disco-->>App: Sincronização em Tempo Real
  App-->>Usuário: Confirmação Instantânea`
  },
  {
    name: 'Grafo Git (Git Graph)',
    code: `gitGraph
  commit id: "v1.0"
  branch feature
  checkout feature
  commit id: "Adiciona Mermaid"
  commit id: "Syntax Highlighting"
  checkout main
  merge feature id: "v1.1" tag: "release"`
  },
  {
    name: 'Gráfico de Pizza (Pie)',
    code: `pie title Progresso das Notas
  "Concluídas" : 50
  "Em Andamento" : 35
  "Ideias Futuras" : 15`
  }
]

export const MermaidViewer: React.FC<MermaidViewerProps> = ({
  code,
  onEditCode,
  onInsertExample,
  theme = 'dark'
}) => {
  const [svgHtml, setSvgHtml] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [zoomLevel, setZoomLevel] = useState<number>(100)
  const renderTimeoutRef = useRef<number | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const cleanCode = code.trim()

  useEffect(() => {
    if (!cleanCode) {
      setSvgHtml('')
      setErrorMessage(null)
      return
    }

    if (renderTimeoutRef.current) {
      window.clearTimeout(renderTimeoutRef.current)
    }

    renderTimeoutRef.current = window.setTimeout(async () => {
      try {
        const isDark =
          theme === 'dark' ||
          (theme !== 'light' && document.documentElement.getAttribute('data-theme') === 'dark')

        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'loose',
          theme: isDark ? 'base' : theme === 'sepia' ? 'neutral' : 'default',
          themeVariables: isDark
            ? {
                darkMode: true,
                background: '#282a36',
                mainBkg: '#21222c',
                primaryColor: '#343746',
                primaryTextColor: '#f8f8f2',
                primaryBorderColor: '#bd93f9',
                lineColor: '#bd93f9',
                secondaryColor: '#282a36',
                tertiaryColor: '#44475a',
                textColor: '#f8f8f2',
                nodeBorder: '#bd93f9',
                clusterBkg: '#21222c',
                titleColor: '#f1fa8c',
                edgeLabelBackground: '#21222c',
                actorBorder: '#ff79c6',
                actorBkg: '#21222c',
                actorTextColor: '#f8f8f2',
                actorLineColor: '#6272a4'
              }
            : undefined,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 14
        })

        const uniqueId = `mermaid-svg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
        const { svg } = await mermaid.render(uniqueId, cleanCode)
        setSvgHtml(svg)
        setErrorMessage(null)
      } catch (err: any) {
        setSvgHtml('')
        const errorText =
          err?.str || err?.message || 'Erro de sintaxe no diagrama Mermaid. Verifique a estrutura.'
        setErrorMessage(errorText)
      }
    }, 120)

    return () => {
      if (renderTimeoutRef.current) {
        window.clearTimeout(renderTimeoutRef.current)
      }
    }
  }, [cleanCode, theme])

  const handleCopyCode = async (e: React.MouseEvent): Promise<void> => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(cleanCode)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  // Se o bloco de código mermaid estiver vazio, exibe tela de boas-vindas com modelos
  if (!cleanCode) {
    return (
      <div className="p-6 text-center bg-surface-secondary/50 rounded-b-xl border-t border-surface-border">
        <div className="w-10 h-10 rounded-xl bg-accent-soft text-accent flex items-center justify-center mx-auto mb-2">
          <Workflow className="w-5 h-5" />
        </div>
        <h4 className="text-xs font-semibold text-content-primary mb-1">
          Diagrama Mermaid (Estilo Obsidian)
        </h4>
        <p className="text-[11px] text-content-muted max-w-sm mx-auto mb-3">
          Crie fluxogramas, gráficos, diagramas de sequência e mais. Escolha um modelo abaixo ou
          clique em <strong>Código</strong> para começar a escrever.
        </p>

        {onInsertExample && (
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {MERMAID_EXAMPLES.map((ex) => (
              <button
                key={ex.name}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onInsertExample(ex.code)}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md bg-surface-tertiary hover:bg-accent-soft hover:text-accent text-content-secondary transition-colors border border-surface-border"
              >
                <Sparkles className="w-3 h-3 text-accent" />
                <span>{ex.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Se houver erro de sintaxe no Mermaid
  if (errorMessage) {
    return (
      <div className="p-4 bg-rose-500/10 border-t border-rose-500/20 rounded-b-xl text-left">
        <div className="flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-rose-500 mb-0.5">
              Erro ao renderizar diagrama Mermaid
            </div>
            <div className="text-[11px] text-content-secondary font-mono bg-surface-bg/80 p-2 rounded border border-rose-500/20 max-h-24 overflow-y-auto mb-2 whitespace-pre-wrap">
              {errorMessage}
            </div>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={onEditCode}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-rose-500 text-white hover:bg-rose-600 transition-colors"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Editar Código do Diagrama</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      onDoubleClick={onEditCode}
      title="Duplo clique para editar o código do diagrama"
      className="relative group p-4 bg-surface-bg/70 dark:bg-surface-secondary/50 rounded-b-xl border-t border-surface-border overflow-hidden select-none transition-colors"
    >
      {/* Action Floating Badges */}
      <div className="absolute top-2 right-2 flex items-center gap-1 bg-surface-bg/90 dark:bg-surface-secondary/90 backdrop-blur-md border border-surface-border rounded-lg p-1 shadow-sm opacity-80 group-hover:opacity-100 transition-opacity z-10">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setZoomLevel((prev) => Math.max(50, prev - 15))}
          title="Diminuir Zoom"
          className="p-1 rounded text-content-muted hover:text-content-primary hover:bg-surface-secondary transition-colors"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <span className="text-[10px] font-mono text-content-muted px-1">{zoomLevel}%</span>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setZoomLevel((prev) => Math.min(200, prev + 15))}
          title="Aumentar Zoom"
          className="p-1 rounded text-content-muted hover:text-content-primary hover:bg-surface-secondary transition-colors"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        {zoomLevel !== 100 && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setZoomLevel(100)}
            title="Resetar Zoom"
            className="p-1 rounded text-content-muted hover:text-content-primary hover:bg-surface-secondary transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        )}
        <div className="h-3 w-px bg-surface-border mx-0.5" />
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleCopyCode}
          title="Copiar código do diagrama"
          className="p-1 rounded text-content-muted hover:text-content-primary hover:bg-surface-secondary transition-colors"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-500" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onEditCode}
          title="Editar código fonte do diagrama (ou duplo clique)"
          className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium text-accent hover:bg-accent-soft transition-colors"
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>Editar</span>
        </button>
      </div>

      {/* Rendered Mermaid SVG */}
      <div className="overflow-x-auto py-2 flex items-center justify-center min-h-[140px]">
        <div
          style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
          className="transition-transform duration-150 inline-block max-w-full"
          dangerouslySetInnerHTML={{ __html: svgHtml }}
        />
      </div>
    </div>
  )
}
