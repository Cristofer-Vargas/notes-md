import React from 'react'
import { cn } from '../../utils/cn'

export const RangeInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} type="range" className={cn('w-full accent-[var(--accent-color)] cursor-pointer focus-visible:outline-accent', className)} {...props} />
  )
)

RangeInput.displayName = 'RangeInput'
