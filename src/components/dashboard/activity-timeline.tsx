'use client'

import { motion } from 'framer-motion'
import {
  UserPlus,
  MessageCircle,
  Phone,
  Mail,
  CheckCircle,
  Calendar,
  ArrowRightLeft,
  Star,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getInitials } from '@/lib/utils'

type ActivityType =
  | 'lead_created'
  | 'message_sent'
  | 'call_made'
  | 'email_sent'
  | 'deal_won'
  | 'meeting_scheduled'
  | 'stage_changed'
  | 'score_updated'
  | 'note_added'

interface Activity {
  id: string
  type: ActivityType
  title: string
  leadName: string
  userName: string
  timeAgo: string
}

const mockActivities: Activity[] = [
  {
    id: '1',
    type: 'lead_created',
    title: 'Novo lead capturado via Instagram',
    leadName: 'Maria Silva',
    userName: 'Ana Souza',
    timeAgo: '2 min atrás',
  },
  {
    id: '2',
    type: 'message_sent',
    title: 'WhatsApp enviado - Vestibular 2026.2',
    leadName: 'João Oliveira',
    userName: 'Carlos Lima',
    timeAgo: '8 min atrás',
  },
  {
    id: '3',
    type: 'deal_won',
    title: 'Negócio fechado - Matrícula confirmada',
    leadName: 'Fernanda Costa',
    userName: 'Ana Souza',
    timeAgo: '15 min atrás',
  },
  {
    id: '4',
    type: 'call_made',
    title: 'Ligação realizada - 3min 42s',
    leadName: 'Pedro Santos',
    userName: 'Bruno Reis',
    timeAgo: '23 min atrás',
  },
  {
    id: '5',
    type: 'stage_changed',
    title: 'Movido para "Negociando"',
    leadName: 'Camila Ferreira',
    userName: 'Carlos Lima',
    timeAgo: '31 min atrás',
  },
  {
    id: '6',
    type: 'meeting_scheduled',
    title: 'Reunião agendada para 28/05 às 14h',
    leadName: 'Lucas Almeida',
    userName: 'Ana Souza',
    timeAgo: '45 min atrás',
  },
  {
    id: '7',
    type: 'score_updated',
    title: 'Score IA atualizado: 67 → 84',
    leadName: 'Beatriz Rocha',
    userName: 'Sistema IA',
    timeAgo: '52 min atrás',
  },
  {
    id: '8',
    type: 'email_sent',
    title: 'E-mail enviado - Informações do curso',
    leadName: 'Thiago Mendes',
    userName: 'Carlos Lima',
    timeAgo: '1h atrás',
  },
  {
    id: '9',
    type: 'note_added',
    title: 'Nota adicionada - "Interessado em bolsa"',
    leadName: 'Gabriela Nunes',
    userName: 'Bruno Reis',
    timeAgo: '1h atrás',
  },
  {
    id: '10',
    type: 'lead_created',
    title: 'Novo lead capturado via Google Ads',
    leadName: 'Rafael Barbosa',
    userName: 'Sistema',
    timeAgo: '2h atrás',
  },
]

const activityIcons: Record<ActivityType, React.ElementType> = {
  lead_created: UserPlus,
  message_sent: MessageCircle,
  call_made: Phone,
  email_sent: Mail,
  deal_won: CheckCircle,
  meeting_scheduled: Calendar,
  stage_changed: ArrowRightLeft,
  score_updated: Star,
  note_added: FileText,
}

const activityColors: Record<ActivityType, { icon: string; bg: string; line: string }> = {
  lead_created: {
    icon: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    line: 'bg-emerald-500/20',
  },
  message_sent: {
    icon: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
    line: 'bg-blue-500/20',
  },
  call_made: {
    icon: 'text-violet-400',
    bg: 'bg-violet-500/10 border-violet-500/20',
    line: 'bg-violet-500/20',
  },
  email_sent: {
    icon: 'text-cyan-400',
    bg: 'bg-cyan-500/10 border-cyan-500/20',
    line: 'bg-cyan-500/20',
  },
  deal_won: {
    icon: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    line: 'bg-emerald-500/20',
  },
  meeting_scheduled: {
    icon: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
    line: 'bg-amber-500/20',
  },
  stage_changed: {
    icon: 'text-indigo-400',
    bg: 'bg-indigo-500/10 border-indigo-500/20',
    line: 'bg-indigo-500/20',
  },
  score_updated: {
    icon: 'text-yellow-400',
    bg: 'bg-yellow-500/10 border-yellow-500/20',
    line: 'bg-yellow-500/20',
  },
  note_added: {
    icon: 'text-slate-400',
    bg: 'bg-slate-500/10 border-slate-500/20',
    line: 'bg-slate-500/20',
  },
}

export function ActivityTimeline() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.7 }}
      className="rounded-2xl border border-white/5 bg-slate-800/50 backdrop-blur-sm p-6"
    >
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">Atividades Recentes</h3>
          <p className="mt-1 text-sm text-slate-400">Timeline de ações da equipe</p>
        </div>
        <button className="rounded-lg border border-white/5 bg-slate-700/30 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700/50 hover:text-slate-100">
          Ver todas
        </button>
      </div>

      <div className="relative space-y-0">
        {mockActivities.map((activity, index) => {
          const Icon = activityIcons[activity.type]
          const colors = activityColors[activity.type]
          const isLast = index === mockActivities.length - 1

          return (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 + index * 0.04 }}
              className="group relative flex gap-4 pb-6"
            >
              {/* Vertical line */}
              {!isLast && (
                <div
                  className={cn(
                    'absolute left-[17px] top-10 h-[calc(100%-24px)] w-[1px]',
                    'bg-slate-700/40'
                  )}
                />
              )}

              {/* Icon */}
              <div
                className={cn(
                  'relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border',
                  colors.bg
                )}
              >
                <Icon className={cn('h-4 w-4', colors.icon)} />
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-300 group-hover:text-slate-100 transition-colors">
                      {activity.title}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      <span className="font-medium text-slate-400">
                        {activity.leadName}
                      </span>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {/* User avatar */}
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-700/50 text-[9px] font-bold text-slate-400">
                      {getInitials(activity.userName)}
                    </div>
                    <span className="whitespace-nowrap text-[10px] text-slate-600">
                      {activity.timeAgo}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}
