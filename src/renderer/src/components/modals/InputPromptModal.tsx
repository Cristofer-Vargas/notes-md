import React, { useEffect, useState } from 'react'
import { X } from 'lucide-react'

interface InputPromptModalProps {
  isOpen: boolean
  title: string
  placeholder: string
  initialValue?: string
  confirmLabel?: string
  onConfirm: (value: string) => void
  onClose: () => void
}

export const InputPromptModal: React.FC<InputPromptModalProps> = ({
  isOpen,
  title,
  placeholder,
  initialValue = '',
  confirmLabel = 'Confirmar',
  onConfirm,
  onClose
}) => {
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue)
    }
  }, [isOpen, initialValue])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (value.trim()) {
      onConfirm(value.trim())
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-surface-bg border border-surface-border shadow-2xl overflow-hidden"
      >
        <div className="px-5 py-3.5 bg-surface-secondary border-b border-surface-border flex items-center justify-between">
          <h3 className="text-sm font-bold text-content-primary">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-content-secondary hover:bg-surface-tertiary"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            autoFocus
            className="w-full px-3 py-2 text-sm rounded-xl bg-surface-secondary border border-surface-border text-content-primary focus:outline-none focus:border-accent"
          />

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-content-secondary hover:bg-surface-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-accent text-white hover:bg-accent-hover transition-colors"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
