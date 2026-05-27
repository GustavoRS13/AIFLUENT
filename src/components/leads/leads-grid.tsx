'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import {
  MessageCircle,
  Phone,
  Mail,
  Camera,
  MessagesSquare,
  Globe,
  MapPin,
  Users as UsersIcon,
  UserPlus,
  ArrowRightLeft,
  Target,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatPhone, getInitials, generateColor } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import type { KanbanCard, LeadSource, LeadTemperature, LeadStatus } from '@/types'

// ── Label maps ──────────────────────────────────────────────────────────────

const sourceLabel: Record<LeadSource, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  google: 'Google',
  whatsapp: 'WhatsApp',
  website: 'Site',
  referral: 'Indicacao',
  event: 'Evento',
  manual: 'Manual',
  import: 'Importado',
  meta_ads: 'Meta Ads',
  facebook_lead_ad: 'Facebook Lead Ad',
}

const sourceIcon: Record<LeadSource, React.ReactNode> = {
  instagram: <Camera className="h-3 w-3 text-pink-400" />,
  facebook: <MessagesSquare className="h-3 w-3 text-blue-400" />,
  google: <Globe className="h-3 w-3 text-emerald-400" />,
  whatsapp: <MessageCircle className="h-3 w-3 text-green-400" />,
  website: <Globe className="h-3 w-3 text-violet-400" />,
  referral: <UsersIcon className="h-3 w-3 text-amber-400" />,
  event: <MapPin className="h-3 w-3 text-cyan-400" />,
  manual: <UserPlus className="h-3 w-3 text-slate-400" />,
  import: <ArrowRightLeft className="h-3 w-3 text-slate-400" />,
  meta_ads: <Target className="h-3 w-3 text-orange-400" />,
  facebook_lead_ad: <MessagesSquare className="h-3 w-3 text-blue-400" />,
}

const tempLabel: Record<LeadTemperature, string> = {
  cold: 'Frio',
  warm: 'Morno',
  hot: 'Quente',
}

const statusLabel: Record<LeadStatus, string> = {
  new: 'Novo',
  contacted: 'Contatado',
  qualified: 'Qualificado',
  negotiating: 'Negociando',
  converted: 'Convertido',
  lost: 'Perdido',
}

const statusVariant: Record<LeadStatus, 'default' | 'primary' | 'success' | 'warning' | 'error' | 'secondary'> = {
  new: 'primary',
  contacted: 'default',
  qualified: 'secondary',
  negotiating: 'warning',
  converted: 'success',
  lost: 'error',
}

// ── Score bar ───────────────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number | null }) {
  if (score == null) return null
  const pct = Math.min(score, 100)
  const color =
    pct >= 70
      ? 'from-emerald-500 to-emerald-400'
      : pct >= 40
        ? 'from-amber-500 to-amber-400'
        : 'from-rose-500 to-rose-400'
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
        <motion.div
          className={cn('h-full rounded-full bg-gradient-to-r', color)}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <span className="text-[10px] font-bold text-slate-400 tabular-nums">
        {pct}
      </span>
    </div>
  )
}

// ── Relative time ───────────────────────────────────────────────────────────

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Nunca'
  const now = Date.now()
  const d = new Date(dateStr).getTime()
  const diffMs = now - d
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Agora'
  if (mins < 60) return `ha ${mins}min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `ha ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `ha ${days}d`
  const months = Math.floor(days / 30)
  return `ha ${months}m`
}

// ── Component ───────────────────────────────────────────────────────────────

interface LeadsGridProps {
  leads: KanbanCard[]
  onView?: (lead: KanbanCard) => void
}

export function LeadsGrid({ leads, onView }: LeadsGridProps) {
  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-800/50">
          <UsersIcon className="h-8 w-8 text-slate-600" />
        </div>
        <p className="text-sm text-slate-500">Nenhum lead encontrado.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {leads.map((lead, i) => (
        <motion.div
          key={lead.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: i * 0.03 }}
          onClick={() => onView?.(lead)}
          className={cn(
            'group cursor-pointer rounded-xl border border-slate-700/50 bg-slate-900/50 backdrop-blur-sm p-4',
            'transition-all duration-300',
            'hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/5 hover:border-indigo-500/20'
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar size="md">
                {lead.photo ? (
                  <AvatarImage src={lead.photo} alt={lead.name} />
                ) : null}
                <AvatarFallback style={{ background: generateColor(lead.name) }}>
                  {getInitials(lead.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-100">
                  {lead.name}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {sourceIcon[lead.source]}
                  <span className="text-[11px] text-slate-500">
                    {sourceLabel[lead.source]}
                  </span>
                </div>
              </div>
            </div>
            <Badge variant={lead.temperature} size="sm" dot>
              {tempLabel[lead.temperature]}
            </Badge>
          </div>

          {/* Contact info */}
          <div className="mt-3 space-y-1.5">
            {lead.phone && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Phone className="h-3 w-3 text-slate-500" />
                <span className="font-mono">{formatPhone(lead.phone)}</span>
              </div>
            )}
            {lead.email && (
              <div className="flex items-center gap-2 text-xs text-slate-400 truncate">
                <Mail className="h-3 w-3 text-slate-500" />
                <span className="truncate">{lead.email}</span>
              </div>
            )}
          </div>

          {/* Course interest */}
          {lead.courseInterest && (
            <div className="mt-3 rounded-md bg-slate-800/50 px-2.5 py-1.5">
              <p className="text-[11px] text-slate-500 uppercase tracking-wide">
                Interesse
              </p>
              <p className="text-xs text-slate-300 font-medium truncate">
                {lead.courseInterest}
              </p>
            </div>
          )}

          {/* Score */}
          {lead.aiScore != null && (
            <div className="mt-3">
              <ScoreBar score={lead.aiScore} />
            </div>
          )}

          {/* Footer */}
          <div className="mt-3 flex items-center justify-between border-t border-slate-800/50 pt-3">
            <Badge variant={statusVariant[lead.status]} size="sm">
              {statusLabel[lead.status]}
            </Badge>
            <div className="flex items-center gap-2">
              {lead.consultant && (
                <span className="text-[10px] text-slate-500 truncate max-w-[80px]">
                  {lead.consultant}
                </span>
              )}
              <span className="text-[10px] text-slate-600">
                {relativeTime(lead.lastInteraction)}
              </span>
            </div>
          </div>

          {/* Tags */}
          {lead.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {lead.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-slate-800/80 px-2 py-0.5 text-[10px] text-slate-400"
                >
                  {tag}
                </span>
              ))}
              {lead.tags.length > 3 && (
                <span className="rounded-full bg-slate-800/80 px-2 py-0.5 text-[10px] text-slate-500">
                  +{lead.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </motion.div>
      ))}
    </div>
  )
}
