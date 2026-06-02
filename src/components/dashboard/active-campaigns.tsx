'use client'

import { motion } from 'framer-motion'
import {
  MessageCircle,
  Mail,
  Smartphone,
  MoreHorizontal,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { CampaignChannel, CampaignStatus } from '@/types'

interface ActiveCampaign {
  id: string
  name: string
  channel: CampaignChannel
  status: CampaignStatus
  sent: number
  total: number
  openRate: number
}

// TODO: Connect to /api/campaigns?active=true when backend is ready
const initialCampaigns: ActiveCampaign[] = []

const channelIcons: Record<CampaignChannel, React.ElementType> = {
  whatsapp: MessageCircle,
  email: Mail,
  sms: Smartphone,
  instagram: MessageCircle,
  messenger: MessageCircle,
}

const channelColors: Record<CampaignChannel, string> = {
  whatsapp: 'text-emerald-400 bg-emerald-500/10',
  email: 'text-blue-400 bg-blue-500/10',
  sms: 'text-violet-400 bg-violet-500/10',
  instagram: 'text-pink-400 bg-pink-500/10',
  messenger: 'text-blue-400 bg-blue-500/10',
}

const statusConfig: Record<
  CampaignStatus,
  { label: string; variant: 'success' | 'warning' | 'primary' | 'default' | 'error' | 'secondary' }
> = {
  draft: { label: 'Rascunho', variant: 'default' },
  scheduled: { label: 'Agendada', variant: 'warning' },
  sending: { label: 'Enviando', variant: 'primary' },
  completed: { label: 'Concluída', variant: 'success' },
  paused: { label: 'Pausada', variant: 'secondary' },
  cancelled: { label: 'Cancelada', variant: 'error' },
}

export function ActiveCampaigns() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
      className="rounded-2xl border border-gray-200 bg-gray-50 p-6"
    >
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Campanhas Ativas</h3>
          <p className="mt-1 text-sm text-gray-500">Campanhas em andamento</p>
        </div>
        <button className="rounded-lg border border-gray-200 bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900">
          Ver todas
        </button>
      </div>

      <div className="space-y-4">
        {initialCampaigns.map((campaign, index) => {
          const ChannelIcon = channelIcons[campaign.channel]
          const statusCfg = statusConfig[campaign.status]
          const progress = campaign.total > 0 ? (campaign.sent / campaign.total) * 100 : 0

          return (
            <motion.div
              key={campaign.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + index * 0.05 }}
              className="group rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-gray-300/30 hover:bg-gray-50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                      channelColors[campaign.channel]
                    )}
                  >
                    <ChannelIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-800">
                      {campaign.name}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant={statusCfg.variant} size="sm" dot>
                        {statusCfg.label}
                      </Badge>
                      <span className="text-[10px] text-gray-400 capitalize">
                        {campaign.channel}
                      </span>
                    </div>
                  </div>
                </div>

                <button className="shrink-0 rounded-md p-1 text-gray-400 opacity-0 transition-all hover:bg-gray-100 hover:text-gray-700 group-hover:opacity-100">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3">
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="text-gray-500">
                    {campaign.sent.toLocaleString('pt-BR')} / {campaign.total.toLocaleString('pt-BR')} enviados
                  </span>
                  {campaign.openRate > 0 && (
                    <span className="font-medium text-gray-700">
                      {campaign.openRate}% aberturas
                    </span>
                  )}
                </div>
                <Progress value={progress} />
              </div>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}
