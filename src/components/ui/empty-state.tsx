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
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-50 border border-gray-200 text-gray-400">
            {icon}
          </div>
        )}
        <h3 className="text-base font-semibold text-gray-800">{title}</h3>
        {description && (
          <p className="mt-1.5 max-w-sm text-sm text-gray-400">{description}</p>
        )}
        {action && <div className="mt-5">{action}</div>}
      </div>
    )
  }
)
EmptyState.displayName = 'EmptyState'

export { EmptyState }
