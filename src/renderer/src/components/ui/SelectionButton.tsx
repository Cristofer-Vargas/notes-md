import React from 'react'
import { cn } from '../../utils/cn'

/** A selectable option that can contain a label, description, or other structured content. */
export const SelectionButton = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn('focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-50 disabled:cursor-not-allowed', className)}
      {...props}
    />
  )
)

SelectionButton.displayName = 'SelectionButton'
