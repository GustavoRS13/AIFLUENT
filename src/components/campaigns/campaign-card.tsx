'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import {
  MessageSquare,
  Mail,
  Smartphone,
  MoreHorizontal,
  Copy,
  Pencil,
  Pause,
  Trash2,
  Play,
  Send,
  Eye,
  MessageCircle,
  Target,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatDate, getInitials, calculatePercentage } from '@/lib/utils'
import type { CampaignChannel, CampaignStatus } from '@/types'

// ── Types ────────────────────────────────────────────────────────────────────

export interface CampaignCardData {
  id: string
  name: string
  channel: CampaignChannel
  status: CampaignStatus
  type: 'broadcast' | 'sequence' | 'automation'
  metrics: {
    sent: number
    delivered: number
    opened: number
    replied: number
    converted: number
  }
  createdAt: string
  createdBy: string
  scheduledFor?: string
}

interface CampaignCardProps {
  campaign: CampaignCardData
  onEdit?: (id: string) => void
  onDuplicate?: (id: string) => void
  onPause?: (id: string) => void
  onResume?: (id: string) => void
  onDelete?: (id: string) => void
  onClick?: (id: string) => void
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const channelConfig: Record<CampaignChannel, { icon: typeof MessageSquare; label: string; color: string; bg: string }> = {
  whatsapp: {
    icon: MessageSquare,
    label: 'WhatsApp',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/15 border-emerald-500/25',
  },
  email: {
    icon: Mail,
    label: 'Email',
    color: 'text-blue-400',
    bg: 'bg-blue-500/15 border-blue-500/25',
  },
  sms: {
    icon: Smartphone,
    label: 'SMS',
    color: 'text-violet-400',
    bg: 'bg-violet-500/15 border-violet-500/25',
  },
  instagram: {
    icon: MessageSquare,
    label: 'Instagram',
    color: 'text-pink-400',
    bg: 'bg-pink-500/15 border-pink-500/25',
  },
  messenger: {
    icon: MessageSquare,
    label: 'Messenger',
    color: 'text-blue-400',
    bg: 'bg-blue-500/15 border-blue-500/25',
  },
}

const statusConfig: Record<CampaignStatus, { label: string; variant: 'default' | 'primary' | 'success' | 'warning' | 'error'; pulse?: boolean }> = {
  draft: { label: 'Rascunho', variant: 'default' },
  scheduled: { label: 'Agendada', variant: 'primary' },
  sending: { label: 'Enviando', variant: 'primary', pulse: true },
  completed: { label: 'Concluida', variant: 'success' },
  paused: { label: 'Pausada', variant: 'warning' },
  cancelled: { label: 'Cancelada', variant: 'error' },
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString('pt-BR')
}

// ── Component ────────────────────────────────────────────────────────────────

export function CampaignCard({
  campaign,
  onEdit,
  onDuplicate,
  onPause,
  onResume,
  onDelete,
  onClick,
}: CampaignCardProps) {
  const channel = channelConfig[campaign.channel]
  const status = statusConfig[campaign.status]
  const ChannelIcon = channel.icon

  const { sent, delivered, opened, replied, converted } = campaign.metrics
  const openRate = calculatePercentage(opened, delivered)
  const responseRate = calculatePercentage(replied, delivered)
  const deliveryProgress = sent > 0 ? calculatePercentage(delivered, sent) : 0

  return (
    <motion.div
      className={cn(
        'group rounded-xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-5',
        'transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/5 hover:border-indigo-500/20 cursor-pointer'
      )}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onClick={() => onClick?.(campaign.id)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border',
              channel.bg
            )}
          >
            <ChannelIcon className={cn('h-5 w-5', channel.color)} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-100 truncate">
              {campaign.name}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={cn('text-xs font-medium', channel.color)}>
                {channel.label}
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-xs text-slate-500 capitalize">
                {campaign.type}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={status.variant} size="sm" dot>
            {status.pulse && (
              <span className="mr-1 relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
              </span>
            )}
            {status.label}
          </Badge>

          <DropdownMenu>
            <DropdownMenuTrigger
              className="p-1 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-700/50 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); onEdit?.(campaign.id) }}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); onDuplicate?.(campaign.id) }}
              >
                <Copy className="h-4 w-4 mr-2" />
                Duplicar
              </DropdownMenuItem>
              {campaign.status === 'sending' ? (
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); onPause?.(campaign.id) }}
                >
                  <Pause className="h-4 w-4 mr-2" />
                  Pausar
                </DropdownMenuItem>
              ) : campaign.status === 'paused' ? (
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); onResume?.(campaign.id) }}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Retomar
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-rose-400 focus:text-rose-300"
                onClick={(e) => { e.stopPropagation(); onDelete?.(campaign.id) }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-5 gap-2 mb-4">
        {[
          { icon: Send, label: 'Enviados', value: sent, color: 'text-slate-400' },
          { icon: Eye, label: 'Entregues', value: delivered, color: 'text-blue-400' },
          { icon: Eye, label: 'Abertos', value: opened, color: 'text-indigo-400' },
          { icon: MessageCircle, label: 'Respondidos', value: replied, color: 'text-emerald-400' },
          { icon: Target, label: 'Convertidos', value: converted, color: 'text-amber-400' },
        ].map((metric) => (
          <div key={metric.label} className="text-center">
            <p className="text-xs text-slate-500 mb-0.5">{metric.label}</p>
            <p className={cn('text-sm font-semibold tabular-nums', metric.color)}>
              {formatCompact(metric.value)}
            </p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <Progress value={deliveryProgress} />
      </div>

      {/* Rates and Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
            <span className="text-xs text-slate-400">
              Abertura <span className="text-slate-200 font-medium">{openRate}%</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="text-xs text-slate-400">
              Resposta <span className="text-slate-200 font-medium">{responseRate}%</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Avatar size="xs">
            <AvatarFallback className="text-[8px]">
              {getInitials(campaign.createdBy)}
            </AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Clock className="h-3 w-3" />
            {formatDate(campaign.createdAt)}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
