import React, { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Button, IconButton, Input } from '../ui'

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
          <IconButton
            variant="ghost"
            size="sm"
            onClick={onClose}
            tooltip="Fechar"
            icon={<X className="w-4 h-4" />}
          />
        </div>

        <div className="p-5 space-y-4">
          <Input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            autoFocus
          />

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
