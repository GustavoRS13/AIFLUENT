import * as React from 'react'
import { cn } from '@/lib/utils'

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Icon rendered above the title */
  icon?: React.ReactNode
  /** Main heading */
  title: string
  /** Supportive description text */
  description?: string
  /** Optional action element (e.g. a Button) */
  action?: React.ReactNode
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ icon, title, description, action, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col items-center justify-center py-16 px-6 text-center',
          className
        )}
        {...props}
      >
        {icon && (
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-800/50 border border-slate-700/50 text-slate-500">
            {icon}
          </div>
        )}
        <h3 className="text-base font-semibold text-slate-200">{title}</h3>
        {description && (
          <p className="mt-1.5 max-w-sm text-sm text-slate-500">{description}</p>
        )}
        {action && <div className="mt-5">{action}</div>}
      </div>
    )
  }
)
EmptyState.displayName = 'EmptyState'

export { EmptyState }
