import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, type LucideIcon } from 'lucide-react'
import { SelectionButton } from './SelectionButton'
import { cn } from '../../utils/cn'

export interface SelectMenuOption {
  value: string
  label: string
  hint?: string
  icon?: LucideIcon
  separator?: boolean
}

interface SelectMenuProps {
  value: string
  options: SelectMenuOption[]
  label: string
  icon?: LucideIcon
  disabled?: boolean
  className?: string
  onChange: (value: string) => void
}

export function SelectMenu({ value, options, label, icon: Icon, disabled, className, onChange }: SelectMenuProps): React.ReactElement {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [position, setPosition] = useState<React.CSSProperties>({ left: 0, top: 0, width: 224, maxHeight: 300 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value))

  useLayoutEffect(() => {
    if (!open) return
    const updatePosition = (): void => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return
      const width = Math.min(Math.max(224, rect.width), window.innerWidth - 16)
      const availableBelow = window.innerHeight - rect.bottom - 8
      const availableAbove = rect.top - 8
      const above = availableBelow < 220 && availableAbove > availableBelow
      const maxHeight = Math.max(80, Math.min(384, above ? availableAbove - 4 : availableBelow - 4))
      setPosition({
        left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
        ...(above ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
        width,
        maxHeight
      })
    }
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => { window.removeEventListener('resize', updatePosition); window.removeEventListener('scroll', updatePosition, true) }
  }, [open, options.length])

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: MouseEvent): void => {
      if (!triggerRef.current?.contains(event.target as Node) && !menuRef.current?.contains(event.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', closeOutside)
    return () => window.removeEventListener('mousedown', closeOutside)
  }, [open])
  useEffect(() => { if (disabled) setOpen(false) }, [disabled])
  useEffect(() => {
    if (open) document.getElementById(`${listId}-${activeIndex}`)?.scrollIntoView({ block: 'nearest' })
  }, [open, activeIndex, listId])

  const choose = (index: number): void => {
    setOpen(false)
    if (options[index].value !== value) onChange(options[index].value)
  }
  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>): void => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) { setActiveIndex(selectedIndex); setOpen(true) }
      else setActiveIndex((index) => (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length)
    } else if (open && (event.key === 'Home' || event.key === 'End')) {
      event.preventDefault(); setActiveIndex(event.key === 'Home' ? 0 : options.length - 1)
    } else if (open && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault(); choose(activeIndex)
    } else if (open && event.key === 'Escape') {
      event.preventDefault(); event.stopPropagation(); setOpen(false)
    } else if (event.key === 'Tab') setOpen(false)
  }

  return (
    <>
      <SelectionButton
        ref={triggerRef} role="combobox" aria-label={label} aria-expanded={open}
        aria-controls={open ? listId : undefined} aria-activedescendant={open ? `${listId}-${activeIndex}` : undefined}
        aria-haspopup="listbox" disabled={disabled}
        onMouseDown={(event) => { event.preventDefault(); event.stopPropagation(); event.currentTarget.focus({ preventScroll: true }) }}
        onClick={() => { setActiveIndex(selectedIndex); setOpen((previous) => !previous) }} onKeyDown={handleKeyDown}
        className={cn('flex h-8 w-44 shrink-0 items-center gap-2 border border-surface-border bg-surface-secondary px-2.5 text-left text-xs text-content-primary transition-colors hover:bg-surface-tertiary', open && 'border-accent', className)}
      >
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0 opacity-60" />}
        <span className="flex-1 truncate font-medium">{options[selectedIndex]?.label}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 opacity-60 transition-transform', open && 'rotate-180')} />
      </SelectionButton>
      {open && createPortal(
        <div ref={menuRef} id={listId} role="listbox" aria-label={label} style={position} className="fixed z-[9999] overflow-y-auto border border-surface-border bg-surface-bg p-1 shadow-xl select-none">
          <div aria-hidden="true" className="px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider text-content-muted">{label}</div>
          {options.map((option, index) => {
            const OptionIcon = option.icon
            return (
              <SelectionButton key={option.value} id={`${listId}-${index}`} role="option" aria-selected={index === selectedIndex}
                onMouseDown={(event) => { event.preventDefault(); event.stopPropagation() }} onMouseMove={() => setActiveIndex(index)} onClick={() => choose(index)}
                className={cn('flex w-full items-center gap-2.5 px-2 py-1.5 text-left text-xs text-content-secondary', option.separator && 'mt-1 border-t border-surface-border pt-2', index === activeIndex && 'bg-surface-tertiary text-content-primary', index === selectedIndex && 'text-accent')}>
                {OptionIcon && <OptionIcon className="h-3.5 w-3.5 shrink-0" />}
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {option.hint && <span className="font-mono text-[10px] text-content-muted">{option.hint}</span>}
                {index === selectedIndex && <Check className="h-3.5 w-3.5 shrink-0 text-accent" />}
              </SelectionButton>
            )
          })}
        </div>, document.body
      )}
    </>
  )
}
