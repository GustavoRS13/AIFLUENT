'use client'

import * as React from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  /** Called with the debounced value (300ms) */
  onSearch?: (value: string) => void
  /** Called on every keystroke (not debounced) */
  onChange?: (value: string) => void
  /** Debounce delay in ms. Default 300 */
  debounce?: number
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, onSearch, onChange, debounce = 300, defaultValue = '', ...props }, ref) => {
    const [value, setValue] = React.useState(String(defaultValue))
    const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

    // Debounced search callback
    React.useEffect(() => {
      if (!onSearch) return
      timerRef.current = setTimeout(() => {
        onSearch(value)
      }, debounce)
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current)
      }
    }, [value, debounce, onSearch])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value
      setValue(v)
      onChange?.(v)
    }

    const handleClear = () => {
      setValue('')
      onChange?.('')
      onSearch?.('')
    }

    return (
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={handleChange}
          className={cn(
            'flex h-10 w-full rounded-lg border border-slate-700/50 bg-slate-800/50 pl-10 pr-9 py-2 text-sm text-slate-100 placeholder:text-slate-500 transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 focus:bg-slate-800/80 focus:backdrop-blur-sm',
            className
          )}
          {...props}
        />
        {value.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 hover:text-slate-300 transition-colors"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    )
  }
)
SearchInput.displayName = 'SearchInput'

export { SearchInput }
