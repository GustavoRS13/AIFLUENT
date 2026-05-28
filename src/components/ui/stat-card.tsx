'use client'

import * as React from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface StatCardProps {
  /** Icon rendered at the top-left */
  icon?: React.ReactNode
  /** Label above the value */
  title: string
  /** Numeric value to display with count-up animation */
  value: number
  /** Optional prefix (e.g. "R$") */
  prefix?: string
  /** Optional suffix (e.g. "%") */
  suffix?: string
  /** Percentage change from previous period */
  change?: number
  /** Sparkline data points (0-1 normalized or raw) */
  sparkline?: number[]
  /** Format the displayed number */
  formatter?: (value: number) => string
  className?: string
}

function defaultFormatter(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString('pt-BR')
}

function CountUp({ value, formatter }: { value: number; formatter: (n: number) => string }) {
  const motionValue = useMotionValue(0)
  const display = useTransform(motionValue, (latest) => formatter(Math.round(latest)))
  const [text, setText] = React.useState(formatter(0))

  React.useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: 1.2,
      ease: 'easeOut',
    })
    const unsubscribe = display.on('change', (v) => setText(v))
    return () => {
      controls.stop()
      unsubscribe()
    }
  }, [value, motionValue, display])

  return <span>{text}</span>
}

function MiniSparkline({ data, className }: { data: number[]; className?: string }) {
  if (data.length < 2) return null
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const normalized = data.map((d) => (d - min) / range)

  const w = 80
  const h = 32
  const step = w / (normalized.length - 1)

  const points = normalized.map((v, i) => `${i * step},${h - v * h}`).join(' ')
  const areaPoints = `0,${h} ${points} ${w},${h}`

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={cn('w-20 h-8', className)}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(99 102 241)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="rgb(99 102 241)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#sparkGrad)" />
      <polyline
        points={points}
        fill="none"
        stroke="rgb(99 102 241)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  (
    {
      icon,
      title,
      value,
      prefix,
      suffix,
      change,
      sparkline,
      formatter = defaultFormatter,
      className,
    },
    ref
  ) => {
    const isPositive = change != null && change >= 0

    return (
      <motion.div
        ref={ref}
        className={cn(
          'rounded-xl border border-gray-200 bg-white p-5 space-y-3',
          className
        )}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon && (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                {icon}
              </div>
            )}
            <span className="text-sm font-medium text-gray-500">{title}</span>
          </div>
          {sparkline && sparkline.length > 1 && (
            <MiniSparkline data={sparkline} />
          )}
        </div>

        {/* Value row */}
        <div className="flex items-end justify-between">
          <div className="text-2xl font-bold text-gray-900 tabular-nums">
            {prefix && <span className="text-lg font-medium text-gray-500 mr-0.5">{prefix}</span>}
            <CountUp value={value} formatter={formatter} />
            {suffix && <span className="text-lg font-medium text-gray-500 ml-0.5">{suffix}</span>}
          </div>

          {change != null && (
            <div
              className={cn(
                'flex items-center gap-1 text-xs font-medium',
                isPositive ? 'text-emerald-400' : 'text-rose-400'
              )}
            >
              {isPositive ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
              <span>{isPositive ? '+' : ''}{change.toFixed(1)}%</span>
            </div>
          )}
        </div>
      </motion.div>
    )
  }
)
StatCard.displayName = 'StatCard'

export { StatCard }
