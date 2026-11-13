import React, { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'
import { Button, IconButton } from '../../ui'
import {
  Code2,
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
  participant App as Notes MD
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
  theme
}) => {
  const [svgHtml, setSvgHtml] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [zoomLevel, setZoomLevel] = useState<number>(100)
  const renderTimeoutRef = useRef<number | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [documentTheme, setDocumentTheme] = useState(() => document.documentElement.getAttribute('data-theme') || 'dark')

  useEffect(() => {
    if (theme) return
    const observer = new MutationObserver(() => setDocumentTheme(document.documentElement.getAttribute('data-theme') || 'dark'))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [theme])

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
        const currentTheme = theme || documentTheme
        const isDark = currentTheme === 'dark'

        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'loose',
          theme: isDark ? 'base' : currentTheme === 'sepia' ? 'neutral' : 'default',
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
          fontFamily: 'Geist, system-ui, sans-serif',
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
  }, [cleanCode, theme, documentTheme])

  // Se o bloco de código mermaid estiver vazio, exibe tela de boas-vindas com modelos
  if (!cleanCode) {
    return (
      <div className="p-6 text-center bg-surface-bg">
        <div className="w-10 h-10 rounded-sm bg-accent-soft text-accent flex items-center justify-center mx-auto mb-2">
          <Workflow className="w-5 h-5" />
        </div>
        <h4 className="text-xs font-semibold text-content-primary mb-1">
          Diagrama Mermaid
        </h4>
        <p className="text-[11px] text-content-muted max-w-sm mx-auto mb-3">
          Crie fluxogramas, gráficos, diagramas de sequência e mais. Escolha um modelo abaixo ou
          use o ícone de código para começar a escrever.
        </p>

        {onInsertExample && (
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {MERMAID_EXAMPLES.map((ex) => (
              <Button
                key={ex.name}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onInsertExample(ex.code)}
                variant="secondary"
                size="xs"
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md bg-surface-tertiary hover:bg-accent-soft hover:text-accent text-content-secondary transition-colors border border-surface-border"
              >
                <Sparkles className="w-3 h-3 text-accent" />
                <span>{ex.name}</span>
              </Button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Se houver erro de sintaxe no Mermaid
  if (errorMessage) {
    return (
      <div className="p-4 bg-surface-bg text-left">
        <div className="flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-rose-500 mb-0.5">
              Erro ao renderizar diagrama Mermaid
            </div>
            <div className="text-[11px] text-content-secondary font-mono bg-surface-bg/80 p-2 rounded border border-rose-500/20 max-h-24 overflow-y-auto mb-2 whitespace-pre-wrap">
              {errorMessage}
            </div>
            <Button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={onEditCode}
              variant="secondary"
              size="xs"
              leftIcon={<Code2 className="w-3.5 h-3.5" />}
            >
              Editar código
            </Button>
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
      className="relative group p-4 bg-surface-bg overflow-hidden select-none"
    >
      {/* Action Floating Badges */}
      <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-surface-bg border border-surface-border p-0.5 z-10">
        <IconButton
          size="xs"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setZoomLevel((prev) => Math.max(50, prev - 15))}
          tooltip="Diminuir zoom"
          icon={<ZoomOut className="w-3.5 h-3.5" />}
        />
        <span className="text-[10px] font-mono text-content-muted px-1">{zoomLevel}%</span>
        <IconButton
          size="xs"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setZoomLevel((prev) => Math.min(200, prev + 15))}
          tooltip="Aumentar zoom"
          icon={<ZoomIn className="w-3.5 h-3.5" />}
        />
        {zoomLevel !== 100 && (
          <IconButton
            size="xs"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setZoomLevel(100)}
            tooltip="Restaurar zoom"
            icon={<RotateCcw className="w-3.5 h-3.5" />}
          />
        )}
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
