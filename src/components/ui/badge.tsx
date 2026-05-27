'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full font-medium transition-colors',
  {
    variants: {
      variant: {
        default:
          'bg-slate-700/50 text-slate-300 border border-slate-600/50',
        primary:
          'bg-indigo-500/15 text-indigo-400 border border-indigo-500/25',
        secondary:
          'bg-violet-500/15 text-violet-400 border border-violet-500/25',
        success:
          'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25',
        warning:
          'bg-amber-500/15 text-amber-400 border border-amber-500/25',
        error:
          'bg-rose-500/15 text-rose-400 border border-rose-500/25',
        // Lead temperature variants
        cold:
          'bg-blue-500/15 text-blue-400 border border-blue-500/25',
        warm:
          'bg-amber-500/15 text-amber-400 border border-amber-500/25',
        hot:
          'bg-rose-500/15 text-rose-400 border border-rose-500/25',
      },
      size: {
        sm: 'px-2 py-0.5 text-[10px]',
        md: 'px-2.5 py-0.5 text-xs',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, dot = false, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant, size, className }))}
        {...props}
      >
        {dot && (
          <span
            className={cn(
              'mr-1.5 h-1.5 w-1.5 rounded-full',
              variant === 'success' && 'bg-emerald-400',
              variant === 'warning' && 'bg-amber-400',
              variant === 'error' && 'bg-rose-400',
              variant === 'primary' && 'bg-indigo-400',
              variant === 'cold' && 'bg-blue-400',
              variant === 'warm' && 'bg-amber-400',
              variant === 'hot' && 'bg-rose-400',
              (!variant || variant === 'default' || variant === 'secondary') && 'bg-slate-400'
            )}
          />
        )}
        {children}
      </span>
    )
  }
)
Badge.displayName = 'Badge'

export { Badge, badgeVariants }
