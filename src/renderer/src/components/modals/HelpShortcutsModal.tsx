import React from 'react'
import { X, Keyboard, Sparkles } from 'lucide-react'
import appLogo from '../../assets/logo.png'

interface HelpShortcutsModalProps {
  isOpen: boolean
  onClose: () => void
}

export const HelpShortcutsModal: React.FC<HelpShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null

  const shortcuts = [
    { keys: '[[Nome da Nota]]', desc: 'Conecta a outra nota do Vault (abre autocomplete ao digitar [[)' },
    { keys: '[[Nota|Texto]]', desc: 'Cria um link para a nota exibindo um apelido (alias) personalizado' },
    { keys: 'Ctrl + P', desc: 'Abre a Busca Rápida (Quick Switcher) para abrir ou criar notas' },
    { keys: 'Ctrl + N', desc: 'Cria uma nova nota Markdown instantaneamente' },
    { keys: '# , ## , ### + Espaço', desc: 'Transforma a linha em Título H1, H2 ou H3 automaticamente' },
    { keys: '- [ ] + Espaço', desc: 'Cria uma lista de tarefas interativa (Checklist)' },
    { keys: '> + Espaço', desc: 'Cria um bloco de citação (Blockquote)' },
    { keys: '``` + Enter', desc: 'Cria um bloco de código formatado' },
    { keys: '--- + Enter', desc: 'Insere uma linha divisória horizontal' },
    { keys: 'Ctrl + B / Ctrl + I / Ctrl + U', desc: 'Aplica Negrito, Itálico ou Sublinhado' }
  ]

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-surface-bg border border-surface-border shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 bg-surface-secondary border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={appLogo} alt="Notes MD" className="app-logo w-5 h-5 object-contain" />
            <h2 className="text-sm font-bold text-content-primary">
              Guia Rápido: WYSIWYG, Markdown & WikiLinks
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-content-secondary hover:bg-surface-tertiary"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3 max-h-[75vh] overflow-y-auto">
          <div className="p-3 rounded-xl bg-accent-soft border border-accent-border flex items-start gap-2.5 text-xs text-content-primary">
            <Sparkles className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <div>
              <strong>Dica Estilo Obsidian:</strong> Passe o mouse sobre qualquer link{' '}
              <code>[[Nota]]</code> para visualizar o conteúdo da nota sem sair da página atual, ou
              clique para abri-la!
            </div>
          </div>

          <div className="divide-y divide-surface-border">
            {shortcuts.map((s) => (
              <div key={s.keys} className="py-2.5 flex items-center justify-between gap-4 text-xs">
                <span className="text-content-secondary">{s.desc}</span>
                <kbd className="px-2 py-1 rounded-md bg-surface-secondary border border-surface-border font-mono text-[11px] font-semibold text-accent shrink-0">
                  {s.keys}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
