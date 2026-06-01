'use client'

import { motion } from 'framer-motion'
import {
  Users,
  TrendingUp,
  Clock,
  DollarSign,
  BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PipelineStage } from '@/stores/pipeline-store'

interface PipelineStatsProps {
  stages: PipelineStage[]
  className?: string
}

export function PipelineStats({ stages, className }: PipelineStatsProps) {
  const totalLeads = stages.reduce((sum, s) => sum + s.leads.length, 0)

  const closedStage = stages.find((s) => s.isWon)
  const closedCount = closedStage?.leads.length ?? 0
  const conversionRate = totalLeads > 0 ? (closedCount / totalLeads) * 100 : 0

  // Average days in pipeline (mock calculation based on entry dates)
  const allLeads = stages.flatMap((s) => s.leads)
  const avgDays =
    allLeads.length > 0
      ? Math.round(
          allLeads.reduce((sum, lead) => {
            const entryDate = new Date(lead.entryDate)
            const now = new Date()
            const diffDays = Math.floor(
              (now.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24)
            )
            return sum + diffDays
          }, 0) / allLeads.length
        )
      : 0

  // Negotiation stage value (count since we don't have deal value on KanbanCard)
  const negotiationStage = stages.find(
    (s) => s.name.toLowerCase().includes('negocia')
  )
  const negotiationCount = negotiationStage?.leads.length ?? 0

  const stats = [
    {
      icon: <Users className="h-4 w-4" />,
      label: 'Total no Pipeline',
      value: totalLeads.toString(),
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10',
    },
    {
      icon: <TrendingUp className="h-4 w-4" />,
      label: 'Taxa de Conversao',
      value: `${conversionRate.toFixed(1)}%`,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
    {
      icon: <Clock className="h-4 w-4" />,
      label: 'Tempo Medio',
      value: `${avgDays}d`,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
    {
      icon: <DollarSign className="h-4 w-4" />,
      label: 'Em Negociacao',
      value: negotiationCount.toString(),
      color: 'text-violet-400',
      bgColor: 'bg-violet-500/10',
    },
  ]

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Main stat cards */}
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.3 }}
          className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2"
        >
          <div
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-lg',
              stat.bgColor,
              stat.color
            )}
          >
            {stat.icon}
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
              {stat.label}
            </span>
            <span className="text-sm font-bold text-gray-900 tabular-nums">
              {stat.value}
            </span>
          </div>
        </motion.div>
      ))}

      {/* Mini stage badges */}
      <div className="ml-auto flex items-center gap-1.5">
        <BarChart3 className="h-3.5 w-3.5 text-gray-400 mr-1" />
        {stages.map((stage) => (
          <motion.div
            key={stage.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border border-gray-200 bg-white"
            title={stage.name}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: stage.color }}
            />
            <span className="text-gray-500">{stage.leads.length}</span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
