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

const mockLeads: RecentLead[] = [
  { id: '1', name: 'Maria Silva', source: 'instagram', course: 'Administração', temperature: 'hot', score: 92, consultant: 'Ana Souza', date: '2026-05-27' },
  { id: '2', name: 'João Oliveira', source: 'google', course: 'Engenharia', temperature: 'warm', score: 78, consultant: 'Carlos Lima', date: '2026-05-27' },
  { id: '3', name: 'Fernanda Costa', source: 'whatsapp', course: 'Direito', temperature: 'hot', score: 88, consultant: 'Ana Souza', date: '2026-05-27' },
  { id: '4', name: 'Pedro Santos', source: 'facebook', course: 'Medicina', temperature: 'cold', score: 45, consultant: 'Bruno Reis', date: '2026-05-26' },
  { id: '5', name: 'Camila Ferreira', source: 'website', course: 'Psicologia', temperature: 'warm', score: 71, consultant: 'Carlos Lima', date: '2026-05-26' },
  { id: '6', name: 'Lucas Almeida', source: 'referral', course: 'Arquitetura', temperature: 'hot', score: 95, consultant: 'Ana Souza', date: '2026-05-26' },
  { id: '7', name: 'Beatriz Rocha', source: 'event', course: 'Design', temperature: 'warm', score: 67, consultant: 'Bruno Reis', date: '2026-05-25' },
  { id: '8', name: 'Thiago Mendes', source: 'instagram', course: 'Marketing', temperature: 'cold', score: 38, consultant: 'Carlos Lima', date: '2026-05-25' },
  { id: '9', name: 'Gabriela Nunes', source: 'google', course: 'Ciência da Computação', temperature: 'hot', score: 84, consultant: 'Ana Souza', date: '2026-05-25' },
  { id: '10', name: 'Rafael Barbosa', source: 'whatsapp', course: 'Economia', temperature: 'warm', score: 73, consultant: 'Bruno Reis', date: '2026-05-24' },
]

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
  manual: 'text-slate-400',
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
        : 'text-slate-400 bg-slate-500/10 border-slate-500/20'

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
      className="rounded-2xl border border-white/5 bg-slate-800/50 backdrop-blur-sm p-6"
    >
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">Leads Recentes</h3>
          <p className="mt-1 text-sm text-slate-400">Últimos 10 leads capturados</p>
        </div>
        <button className="rounded-lg border border-white/5 bg-slate-700/30 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700/50 hover:text-slate-100">
          Ver todos
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700/30">
              <th className="pb-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Nome
              </th>
              <th className="pb-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Origem
              </th>
              <th className="pb-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Curso
              </th>
              <th className="pb-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Temperatura
              </th>
              <th className="pb-3 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Score
              </th>
              <th className="pb-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Consultor
              </th>
              <th className="pb-3 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Data
              </th>
            </tr>
          </thead>
          <tbody>
            {mockLeads.map((lead, index) => {
              const SourceIcon = sourceIcons[lead.source]

              return (
                <motion.tr
                  key={lead.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.03 }}
                  className="group border-b border-slate-700/20 transition-colors hover:bg-slate-700/20 cursor-pointer"
                >
                  <td className="py-3 pr-4">
                    <span className="text-sm font-medium text-slate-200 group-hover:text-white">
                      {lead.name}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-1.5">
                      <SourceIcon
                        className={cn('h-3.5 w-3.5', sourceColors[lead.source])}
                      />
                      <span className="text-xs text-slate-400 capitalize">
                        {lead.source === 'website' ? 'site' : lead.source === 'referral' ? 'indicação' : lead.source === 'event' ? 'evento' : lead.source}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="text-xs text-slate-300">{lead.course}</span>
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
                    <span className="text-xs text-slate-400">{lead.consultant}</span>
                  </td>
                  <td className="py-3 text-right">
                    <span className="text-xs tabular-nums text-slate-500">
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
