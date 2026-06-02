'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface SLATimerProps {
  lastMessageAt: string
  className?: string
}

export function SLATimer({ lastMessageAt, className }: SLATimerProps) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const calc = () => {
      const diff = Date.now() - new Date(lastMessageAt).getTime()
      setElapsed(Math.max(0, Math.floor(diff / 1000)))
    }
    calc()
    const interval = setInterval(calc, 1000)
    return () => clearInterval(interval)
  }, [lastMessageAt])

  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60
  const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  const color =
    minutes < 5
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : minutes < 15
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-rose-50 text-rose-700 border-rose-200'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold tabular-nums',
        color,
        className
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          minutes < 5 ? 'bg-emerald-500' : minutes < 15 ? 'bg-amber-500' : 'bg-rose-500 animate-pulse'
        )}
      />
      {display}
    </span>
  )
}
