'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import {
  Send,
  CheckCheck,
  Eye,
  MessageCircle,
  Target,
  Download,
  ArrowDown,
  TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { calculatePercentage } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────────────────────

interface CampaignMetricsData {
  sent: number
  delivered: number
  opened: number
  replied: number
  converted: number
  deliveryOverTime: { hour: string; count: number }[]
  responsesOverTime: { hour: string; count: number }[]
  bestHours: number[][] // 7 days x 24 hours, values 0-1 normalized
}

interface CampaignMetricsProps {
  data: CampaignMetricsData
  onExport?: () => void
}

// ── Mock data generator ──────────────────────────────────────────────────────

export function getMockMetrics(): CampaignMetricsData {
  const hours = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i.toString().padStart(2, '0')}:00`,
    count: Math.floor(Math.random() * 120) + 10,
  }))

  const heatmap = Array.from({ length: 7 }, () =>
    Array.from({ length: 24 }, () => Math.random())
  )

  return {
    sent: 4820,
    delivered: 4650,
    opened: 3720,
    replied: 1240,
    converted: 372,
    deliveryOverTime: hours,
    responsesOverTime: hours.map((h) => ({ ...h, count: Math.floor(h.count * 0.3) })),
    bestHours: heatmap,
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString('pt-BR')
}

const dayLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom']

// ── Component ────────────────────────────────────────────────────────────────

export function CampaignMetrics({ data, onExport }: CampaignMetricsProps) {
  const funnel = [
    {
      icon: Send,
      label: 'Enviados',
      value: data.sent,
      color: 'from-slate-500 to-slate-600',
      textColor: 'text-slate-300',
      dropoff: null as number | null,
    },
    {
      icon: CheckCheck,
      label: 'Entregues',
      value: data.delivered,
      color: 'from-blue-500 to-blue-600',
      textColor: 'text-blue-400',
      dropoff: data.sent > 0 ? calculatePercentage(data.sent - data.delivered, data.sent) : 0,
    },
    {
      icon: Eye,
      label: 'Abertos',
      value: data.opened,
      color: 'from-indigo-500 to-indigo-600',
      textColor: 'text-indigo-400',
      dropoff: data.delivered > 0 ? calculatePercentage(data.delivered - data.opened, data.delivered) : 0,
    },
    {
      icon: MessageCircle,
      label: 'Respondidos',
      value: data.replied,
      color: 'from-emerald-500 to-emerald-600',
      textColor: 'text-emerald-400',
      dropoff: data.opened > 0 ? calculatePercentage(data.opened - data.replied, data.opened) : 0,
    },
    {
      icon: Target,
      label: 'Convertidos',
      value: data.converted,
      color: 'from-amber-500 to-amber-600',
      textColor: 'text-amber-400',
      dropoff: data.replied > 0 ? calculatePercentage(data.replied - data.converted, data.replied) : 0,
    },
  ]

  const maxDelivery = Math.max(...data.deliveryOverTime.map((d) => d.count), 1)
  const maxResponses = Math.max(...data.responsesOverTime.map((d) => d.count), 1)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-indigo-400" />
          <h3 className="text-lg font-semibold text-slate-100">Metricas da Campanha</h3>
        </div>
        {onExport && (
          <Button variant="secondary" size="sm" onClick={onExport}>
            <Download className="h-4 w-4 mr-1.5" />
            Exportar Dados
          </Button>
        )}
      </div>

      {/* Funnel Visualization */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-6">
        <h4 className="text-sm font-medium text-slate-400 mb-6">Funil de Conversao</h4>

        <div className="space-y-3">
          {funnel.map((step, idx) => {
            const Icon = step.icon
            const widthPercent = data.sent > 0
              ? Math.max((step.value / data.sent) * 100, 8)
              : 100
            const rate = data.sent > 0 ? calculatePercentage(step.value, data.sent) : 0

            return (
              <div key={step.label}>
                {/* Dropoff indicator */}
                {step.dropoff !== null && step.dropoff > 0 && (
                  <div className="flex items-center gap-2 ml-8 mb-1">
                    <ArrowDown className="h-3 w-3 text-rose-400" />
                    <span className="text-[10px] text-rose-400 font-medium">
                      -{step.dropoff}% perda
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br', step.color)}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-400">{step.label}</span>
                      <div className="flex items-center gap-2">
                        <span className={cn('text-sm font-bold tabular-nums', step.textColor)}>
                          {formatCompact(step.value)}
                        </span>
                        <span className="text-[10px] text-slate-500">({rate}%)</span>
                      </div>
                    </div>

                    <motion.div
                      className="h-2.5 rounded-full overflow-hidden bg-slate-900/50"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      <motion.div
                        className={cn('h-full rounded-full bg-gradient-to-r', step.color)}
                        initial={{ width: 0 }}
                        animate={{ width: `${widthPercent}%` }}
                        transition={{ duration: 0.8, delay: idx * 0.15, ease: 'easeOut' }}
                      />
                    </motion.div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Delivery Over Time */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-5">
          <h4 className="text-sm font-medium text-slate-400 mb-4">Entregas por Hora</h4>
          <div className="flex items-end gap-0.5 h-32">
            {data.deliveryOverTime.map((point, i) => (
              <motion.div
                key={point.hour}
                className="flex-1 bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t opacity-80 hover:opacity-100 transition-opacity relative group"
                initial={{ height: 0 }}
                animate={{ height: `${(point.count / maxDelivery) * 100}%` }}
                transition={{ duration: 0.5, delay: i * 0.02 }}
              >
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] text-slate-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  {point.hour}: {point.count}
                </div>
              </motion.div>
            ))}
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] text-slate-600">00h</span>
            <span className="text-[10px] text-slate-600">06h</span>
            <span className="text-[10px] text-slate-600">12h</span>
            <span className="text-[10px] text-slate-600">18h</span>
            <span className="text-[10px] text-slate-600">23h</span>
          </div>
        </div>

        {/* Responses Over Time */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-5">
          <h4 className="text-sm font-medium text-slate-400 mb-4">Respostas por Hora</h4>
          <div className="flex items-end gap-0.5 h-32">
            {data.responsesOverTime.map((point, i) => (
              <motion.div
                key={point.hour}
                className="flex-1 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t opacity-80 hover:opacity-100 transition-opacity relative group"
                initial={{ height: 0 }}
                animate={{ height: `${(point.count / maxResponses) * 100}%` }}
                transition={{ duration: 0.5, delay: i * 0.02 }}
              >
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] text-slate-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  {point.hour}: {point.count}
                </div>
              </motion.div>
            ))}
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] text-slate-600">00h</span>
            <span className="text-[10px] text-slate-600">06h</span>
            <span className="text-[10px] text-slate-600">12h</span>
            <span className="text-[10px] text-slate-600">18h</span>
            <span className="text-[10px] text-slate-600">23h</span>
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-5">
        <h4 className="text-sm font-medium text-slate-400 mb-4">Melhores Horarios para Envio</h4>

        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Hour labels */}
            <div className="flex ml-10 mb-1">
              {Array.from({ length: 24 }, (_, i) => (
                <div key={i} className="flex-1 text-center text-[9px] text-slate-600">
                  {i % 3 === 0 ? `${i.toString().padStart(2, '0')}` : ''}
                </div>
              ))}
            </div>

            {/* Heatmap rows */}
            {data.bestHours.map((row, dayIdx) => (
              <div key={dayIdx} className="flex items-center gap-1 mb-0.5">
                <span className="w-8 text-right text-[10px] text-slate-500 shrink-0 mr-1">
                  {dayLabels[dayIdx]}
                </span>
                <div className="flex flex-1 gap-0.5">
                  {row.map((value, hourIdx) => (
                    <motion.div
                      key={hourIdx}
                      className="flex-1 h-5 rounded-sm transition-colors relative group"
                      style={{
                        backgroundColor: `rgba(99, 102, 241, ${0.05 + value * 0.85})`,
                      }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: (dayIdx * 24 + hourIdx) * 0.002 }}
                    >
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] text-slate-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        {dayLabels[dayIdx]} {hourIdx}h: {Math.round(value * 100)}%
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-2 mt-3">
          <span className="text-[10px] text-slate-500">Menos</span>
          {[0.1, 0.3, 0.5, 0.7, 0.9].map((v) => (
            <div
              key={v}
              className="h-3 w-6 rounded-sm"
              style={{ backgroundColor: `rgba(99, 102, 241, ${0.05 + v * 0.85})` }}
            />
          ))}
          <span className="text-[10px] text-slate-500">Mais</span>
        </div>
      </div>
    </div>
  )
}
