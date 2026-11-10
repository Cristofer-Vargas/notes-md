import React from 'react'
import { cn } from '../../utils/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  isLoading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'secondary',
      size = 'sm',
      leftIcon,
      rightIcon,
      isLoading,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 select-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.98]'

    const variantStyles: Record<ButtonVariant, string> = {
      primary:
        'bg-accent text-white hover:bg-accent-hover shadow-2xs border border-transparent font-semibold',
      secondary:
        'bg-surface-secondary text-content-primary border border-surface-border hover:bg-surface-tertiary hover:border-surface-border/80 shadow-2xs',
      ghost:
        'bg-transparent text-content-secondary hover:text-content-primary hover:bg-surface-tertiary border border-transparent',
      danger:
        'bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20 hover:text-rose-600',
      outline:
        'bg-transparent border border-surface-border text-content-secondary hover:text-accent hover:border-accent/60'
    }

    const sizeStyles: Record<ButtonSize, string> = {
      xs: 'px-2 py-1 text-xs gap-1',
      sm: 'px-3 py-1.5 text-xs gap-1.5',
      md: 'px-4 py-2 text-sm gap-2',
      lg: 'px-5 py-2.5 text-base gap-2.5'
    }

    return (
      <button
        ref={ref}
        type={props.type || 'button'}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {isLoading ? (
          <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        {children && <span>{children}</span>}
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    )
  }
)

Button.displayName = 'Button'
