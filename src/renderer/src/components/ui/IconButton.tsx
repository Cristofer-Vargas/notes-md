import React from 'react'
import { cn } from '../../utils/cn'

export type IconButtonVariant = 'ghost' | 'secondary' | 'accent' | 'accent-soft' | 'danger'
export type IconButtonSize = 'xs' | 'sm' | 'md'

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: IconButtonVariant
  size?: IconButtonSize
  isActive?: boolean
  icon?: React.ReactNode
  tooltip?: string
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      className,
      variant = 'ghost',
      size = 'sm',
      isActive = false,
      icon,
      tooltip,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center rounded-sm transition-colors duration-150 select-none cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none'

    const sizeStyles: Record<IconButtonSize, string> = {
      xs: 'w-6 h-6 p-0.5 text-xs',
      sm: 'w-7 h-7 p-1 text-sm',
      md: 'w-8 h-8 p-1.5 text-base'
    }

    const variantStyles: Record<IconButtonVariant, string> = {
      ghost: isActive
        ? 'bg-accent-soft text-accent font-bold'
        : 'text-content-secondary hover:text-content-primary hover:bg-surface-tertiary',
      secondary: isActive
        ? 'bg-accent text-[var(--accent-foreground)] shadow-2xs border border-accent'
        : 'bg-surface-secondary border border-surface-border text-content-secondary hover:text-content-primary hover:bg-surface-tertiary',
      accent: 'bg-accent text-[var(--accent-foreground)] hover:bg-accent-hover shadow-2xs',
      'accent-soft': 'bg-accent-soft text-accent hover:bg-accent-soft/80',
      danger: 'text-content-muted hover:text-rose-500 hover:bg-rose-500/10'
    }

    return (
      <button
        ref={ref}
        type={props.type || 'button'}
        title={tooltip || props.title}
        aria-label={tooltip || props.title}
        className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)}
        {...props}
      >
        {icon || children}
      </button>
    )
  }
)

IconButton.displayName = 'IconButton'
