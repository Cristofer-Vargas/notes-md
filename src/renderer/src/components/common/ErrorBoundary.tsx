import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({ errorInfo })
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen p-6 bg-surface-bg text-content-primary flex flex-col justify-center items-center select-text">
          <div className="max-w-xl w-full p-6 rounded-2xl bg-surface-secondary border border-rose-500/40 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-500 font-bold text-base">
              <span className="text-2xl">⚠️</span>
              <span>Ocorreu um erro na renderização do aplicativo</span>
            </div>
            <p className="text-xs text-content-secondary leading-relaxed">
              O aplicativo encontrou um erro inesperado ao atualizar a interface.
            </p>
            <div className="p-3 rounded-xl bg-surface-bg border border-surface-border font-mono text-[11px] text-rose-400 overflow-auto max-h-48 whitespace-pre-wrap">
              {this.state.error?.toString()}
              {'\n\n'}
              {this.state.errorInfo?.componentStack}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, error: null, errorInfo: null })
                  window.location.reload()
                }}
                className="px-4 py-2 rounded-xl bg-accent text-white font-medium text-xs hover:bg-accent-hover transition-colors cursor-pointer"
              >
                Recarregar Aplicativo
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
