'use client'

import { motion } from 'framer-motion'
import {
  Camera,
  Share2,
  Search,
  MessageCircle,
  Globe,
  UserPlus,
  CalendarDays,
  ExternalLink,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import type { LeadSource, LeadTemperature } from '@/types'

interface RecentLead {
  id: string
  name: string
  source: LeadSource
  course: string
  temperature: LeadTemperature
  score: number
  consultant: string
  date: string
}

// TODO: Connect to /api/leads?recent=true when backend is ready
const initialLeads: RecentLead[] = []

const sourceIcons: Record<LeadSource, React.ElementType> = {
  instagram: Camera,
  facebook: Share2,
  google: Search,
  whatsapp: MessageCircle,
  website: Globe,
  referral: UserPlus,
  event: CalendarDays,
  manual: UserPlus,
  import: ExternalLink,
  meta_ads: Search,
  facebook_lead_ad: Share2,
}

const sourceColors: Record<LeadSource, string> = {
  instagram: 'text-pink-400',
  facebook: 'text-blue-400',
  google: 'text-green-400',
  whatsapp: 'text-emerald-400',
  website: 'text-indigo-400',
  referral: 'text-amber-400',
  event: 'text-violet-400',
  manual: 'text-gray-500',
  import: 'text-cyan-400',
  meta_ads: 'text-indigo-400',
  facebook_lead_ad: 'text-blue-400',
}

const temperatureLabels: Record<LeadTemperature, string> = {
  cold: 'Frio',
  warm: 'Morno',
  hot: 'Quente',
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
      : score >= 60
        ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
        : 'text-gray-500 bg-gray-100 border-gray-300'

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold tabular-nums',
        color
      )}
    >
      {score}
    </span>
  )
}

export function RecentLeads() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className="rounded-2xl border border-gray-200 bg-gray-50 p-6"
    >
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Leads Recentes</h3>
          <p className="mt-1 text-sm text-gray-500">Últimos 10 leads capturados</p>
        </div>
        <Link href="/leads" className="rounded-lg border border-gray-200 bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200 hover:text-gray-900">
          Ver todos
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="pb-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Nome
              </th>
              <th className="pb-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Origem
              </th>
              <th className="pb-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Curso
              </th>
              <th className="pb-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Temperatura
              </th>
              <th className="pb-3 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Score
              </th>
              <th className="pb-3 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Consultor
              </th>
              <th className="pb-3 text-right text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Data
              </th>
            </tr>
          </thead>
          <tbody>
            {initialLeads.map((lead, index) => {
              const SourceIcon = sourceIcons[lead.source]

              return (
                <motion.tr
                  key={lead.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.03 }}
                  className="group border-b border-gray-200 transition-colors hover:bg-gray-50 cursor-pointer"
                >
                  <td className="py-3 pr-4">
                    <span className="text-sm font-medium text-gray-800 group-hover:text-gray-900">
                      {lead.name}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-1.5">
                      <SourceIcon
                        className={cn('h-3.5 w-3.5', sourceColors[lead.source])}
                      />
                      <span className="text-xs text-gray-500 capitalize">
                        {lead.source === 'website' ? 'site' : lead.source === 'referral' ? 'indicação' : lead.source === 'event' ? 'evento' : lead.source}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="text-xs text-gray-700">{lead.course}</span>
                  </td>
                  <td className="py-3 pr-4">
                    <Badge variant={lead.temperature} size="sm" dot>
                      {temperatureLabels[lead.temperature]}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4 text-center">
                    <ScoreBadge score={lead.score} />
                  </td>
                  <td className="py-3 pr-4">
                    <span className="text-xs text-gray-500">{lead.consultant}</span>
                  </td>
                  <td className="py-3 text-right">
                    <span className="text-xs tabular-nums text-gray-400">
                      {formatDate(lead.date)}
                    </span>
                  </td>
                </motion.tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  )
}
