import React from 'react'
import { cn } from '../../utils/cn'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  error?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, leftIcon, rightIcon, error, ...props }, ref) => {
    return (
      <div className="relative w-full">
        {leftIcon && (
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-content-muted pointer-events-none flex items-center">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full bg-surface-tertiary border border-surface-border rounded-lg text-xs text-content-primary placeholder:text-content-muted/70 transition-colors focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed',
            leftIcon ? 'pl-8' : 'pl-3',
            rightIcon ? 'pr-8' : 'pr-3',
            'py-1.5',
            error && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500',
            className
          )}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-content-muted flex items-center">
            {rightIcon}
          </div>
        )}
        {error && <p className="mt-1 text-[11px] text-rose-500">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
