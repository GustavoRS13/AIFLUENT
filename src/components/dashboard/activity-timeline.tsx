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
import Link from 'next/link'
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

// TODO: Connect to /api/activities when backend is ready
const initialActivities: Activity[] = []

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
    icon: 'text-gray-500',
    bg: 'bg-gray-100 border-gray-300',
    line: 'bg-gray-200',
  },
}

export function ActivityTimeline() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.7 }}
      className="rounded-2xl border border-gray-200 bg-gray-50 p-6"
    >
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Atividades Recentes</h3>
          <p className="mt-1 text-sm text-gray-500">Timeline de ações da equipe</p>
        </div>
        <Link href="/tasks" className="rounded-lg border border-gray-200 bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200 hover:text-gray-900">
          Ver todas
        </Link>
      </div>

      <div className="relative space-y-0">
        {initialActivities.map((activity, index) => {
          const Icon = activityIcons[activity.type]
          const colors = activityColors[activity.type]
          const isLast = index === initialActivities.length - 1

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
                    'bg-gray-100'
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
                    <p className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                      {activity.title}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      <span className="font-medium text-gray-500">
                        {activity.leadName}
                      </span>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {/* User avatar */}
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-[9px] font-bold text-gray-500">
                      {getInitials(activity.userName)}
                    </div>
                    <span className="whitespace-nowrap text-[10px] text-gray-400">
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
