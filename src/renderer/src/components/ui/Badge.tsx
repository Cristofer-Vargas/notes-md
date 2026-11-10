import React from 'react'
import { cn } from '../../utils/cn'

export type BadgeVariant = 'default' | 'accent' | 'secondary' | 'success' | 'warning' | 'danger'
export type BadgeSize = 'sm' | 'md'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  size?: BadgeSize
  icon?: React.ReactNode
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'default',
  size = 'sm',
  icon,
  children,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center font-medium rounded-full select-none'

  const sizeStyles: Record<BadgeSize, string> = {
    sm: 'px-2 py-0.5 text-[11px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5'
  }

  const variantStyles: Record<BadgeVariant, string> = {
    default: 'bg-surface-tertiary text-content-secondary border border-surface-border/60',
    accent: 'bg-accent-soft text-accent border border-accent/20 font-semibold',
    secondary: 'bg-surface-secondary text-content-primary border border-surface-border',
    success: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
    danger: 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
  }

  return (
    <span className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)} {...props}>
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  )
}
