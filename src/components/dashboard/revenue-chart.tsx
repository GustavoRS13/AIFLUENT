'use client'

import { motion } from 'framer-motion'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { TrendingUp } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

const revenueData = [
  { month: 'Jun', revenue: 42500, leads: 120 },
  { month: 'Jul', revenue: 51200, leads: 145 },
  { month: 'Ago', revenue: 48300, leads: 132 },
  { month: 'Set', revenue: 62100, leads: 178 },
  { month: 'Out', revenue: 58400, leads: 165 },
  { month: 'Nov', revenue: 71200, leads: 201 },
  { month: 'Dez', revenue: 85600, leads: 234 },
  { month: 'Jan', revenue: 79300, leads: 215 },
  { month: 'Fev', revenue: 92400, leads: 256 },
  { month: 'Mar', revenue: 104500, leads: 289 },
  { month: 'Abr', revenue: 118200, leads: 312 },
  { month: 'Mai', revenue: 135800, leads: 348 },
]

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ value: number; dataKey: string }>
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur-xl px-4 py-3 shadow-2xl">
      <p className="mb-2 text-xs font-medium text-slate-400">{label} 2026</p>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-emerald-400">
          {formatCurrency(payload[0].value)}
        </p>
        {payload[1] && (
          <p className="text-xs text-slate-400">
            {payload[1].value} leads
          </p>
        )}
      </div>
    </div>
  )
}

export function RevenueChart() {
  const totalRevenue = revenueData.reduce((sum, d) => sum + d.revenue, 0)
  const lastMonth = revenueData[revenueData.length - 1].revenue
  const prevMonth = revenueData[revenueData.length - 2].revenue
  const growthPct = ((lastMonth - prevMonth) / prevMonth * 100).toFixed(1)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="rounded-2xl border border-white/5 bg-slate-800/50 backdrop-blur-sm p-6"
    >
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">Receita Mensal</h3>
          <p className="mt-1 text-sm text-slate-400">Últimos 12 meses</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-slate-100">
            {formatCurrency(totalRevenue)}
          </p>
          <div className="mt-1 flex items-center justify-end gap-1 text-emerald-400">
            <TrendingUp className="h-3.5 w-3.5" />
            <span className="text-xs font-semibold">+{growthPct}%</span>
          </div>
        </div>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={revenueData}
            margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="50%" stopColor="#6366f1" stopOpacity={0.1} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="leadsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(148, 163, 184, 0.06)"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 12 }}
              dy={8}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 11 }}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#6366f1"
              strokeWidth={2.5}
              fill="url(#revenueGradient)"
              dot={false}
              activeDot={{
                r: 5,
                stroke: '#6366f1',
                strokeWidth: 2,
                fill: '#0f172a',
              }}
            />
            <Area
              type="monotone"
              dataKey="leads"
              stroke="#10b981"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              fill="url(#leadsGradient)"
              dot={false}
              activeDot={{
                r: 4,
                stroke: '#10b981',
                strokeWidth: 2,
                fill: '#0f172a',
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex items-center gap-6 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <div className="h-2 w-6 rounded-full bg-indigo-500" />
          <span>Receita (BRL)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-[2px] w-6 rounded-full bg-emerald-500" style={{ borderTop: '2px dashed #10b981', background: 'none' }} />
          <span>Leads</span>
        </div>
      </div>
    </motion.div>
  )
}
