import React from 'react'
import { cn } from '../../utils/cn'

export interface SwitchProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label: string
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onCheckedChange, label, className, disabled, ...props }, ref) => (
    <button
      {...props}
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-accent' : 'bg-surface-tertiary',
        className
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-4 w-4 rounded-full bg-surface-bg shadow-sm ring-0 transition-transform duration-200 ease-in-out',
          checked ? 'translate-x-4' : 'translate-x-0'
        )}
      />
    </button>
  )
)

Switch.displayName = 'Switch'
