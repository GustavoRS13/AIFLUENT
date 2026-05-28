'use client'

import { motion } from 'framer-motion'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import {
  Camera,
  Share2,
  Search,
  MessageCircle,
  Globe,
  UserPlus,
  CalendarDays,
} from 'lucide-react'
const sourceData = [
  { name: 'Instagram', value: 342, color: '#E1306C', icon: Camera },
  { name: 'Facebook', value: 218, color: '#1877F2', icon: Share2 },
  { name: 'Google', value: 187, color: '#34A853', icon: Search },
  { name: 'WhatsApp', value: 156, color: '#25D366', icon: MessageCircle },
  { name: 'Site', value: 124, color: '#6366f1', icon: Globe },
  { name: 'Indicação', value: 98, color: '#f59e0b', icon: UserPlus },
  { name: 'Evento', value: 67, color: '#a855f7', icon: CalendarDays },
]

const total = sourceData.reduce((sum, d) => sum + d.value, 0)

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; payload: { color: string } }>
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const data = payload[0]

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-2xl">
      <div className="flex items-center gap-2">
        <div
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: data.payload.color }}
        />
        <span className="text-sm font-medium text-gray-800">{data.name}</span>
      </div>
      <p className="mt-1 text-lg font-bold text-gray-900">
        {data.value} <span className="text-xs font-normal text-gray-500">leads</span>
      </p>
      <p className="text-xs text-gray-400">
        {((data.value / total) * 100).toFixed(1)}% do total
      </p>
    </div>
  )
}

export function LeadsBySource() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="rounded-2xl border border-gray-200 bg-gray-50 p-6"
    >
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Leads por Origem</h3>
        <p className="mt-1 text-sm text-gray-500">Distribuição das fontes de captação</p>
      </div>

      <div className="relative h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={sourceData}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={105}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={0}
            >
              {sourceData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} opacity={0.85} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center text */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-3xl font-bold text-gray-900">
            {total.toLocaleString('pt-BR')}
          </p>
          <p className="text-xs text-gray-400">leads totais</p>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
        {sourceData.map((source) => {
          const Icon = source.icon
          const pct = ((source.value / total) * 100).toFixed(1)

          return (
            <div
              key={source.name}
              className="flex items-center justify-between rounded-lg px-2 py-1.5 transition-colors hover:bg-gray-200/30"
            >
              <div className="flex items-center gap-2">
                <Icon
                  className="h-3.5 w-3.5"
                  style={{ color: source.color }}
                />
                <span className="text-xs text-gray-700">{source.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-800">
                  {source.value}
                </span>
                <span className="text-[10px] text-gray-400">{pct}%</span>
              </div>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}
