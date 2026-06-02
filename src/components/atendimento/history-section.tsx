'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown, FileText, ArrowRight, Trophy, Phone,
  Mail, MessageCircle, Tag, Clock, User, Activity,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface ActivityItem {
  id: string
  type: string
  title: string
  description?: string | null
  createdAt: string
  user?: { id: string; name: string } | null
  userId?: string | null
}

interface HistorySectionProps {
  activities: ActivityItem[]
}

const typeIcons: Record<string, React.ElementType> = {
  note: FileText,
  stage_change: ArrowRight,
  deal_won: Trophy,
  deal_lost: Tag,
  call: Phone,
  email: Mail,
  whatsapp: MessageCircle,
  tag_added: Tag,
  follow_up: Clock,
  assigned: User,
}

const typeColors: Record<string, string> = {
  note: 'bg-sky-50 text-sky-600',
  stage_change: 'bg-violet-50 text-violet-600',
  deal_won: 'bg-emerald-50 text-emerald-600',
  deal_lost: 'bg-rose-50 text-rose-600',
  call: 'bg-amber-50 text-amber-600',
  email: 'bg-blue-50 text-blue-600',
  whatsapp: 'bg-green-50 text-green-600',
  tag_added: 'bg-indigo-50 text-indigo-600',
  follow_up: 'bg-orange-50 text-orange-600',
  assigned: 'bg-gray-50 text-gray-600',
}

export function HistorySection({ activities }: HistorySectionProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-gray-50"
      >
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-sky-500" />
          <span className="text-sm font-medium text-gray-900">Historico</span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
            {activities.length}
          </span>
        </div>
        <ChevronDown
          className={cn('h-4 w-4 text-gray-400 transition-transform', open && 'rotate-180')}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-gray-100 px-4 py-3">
              {activities.length > 0 ? (
                <div className="space-y-0 max-h-64 overflow-y-auto">
                  {activities.map((activity, idx) => {
                    const Icon = typeIcons[activity.type] || Activity
                    const colorClass = typeColors[activity.type] || 'bg-gray-50 text-gray-600'
                    return (
                      <div key={activity.id} className="relative flex gap-3 pb-3">
                        {/* Timeline line */}
                        {idx < activities.length - 1 && (
                          <div className="absolute left-[13px] top-8 bottom-0 w-px bg-gray-100" />
                        )}
                        {/* Icon */}
                        <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full', colorClass)}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        {/* Content */}
                        <div className="flex-1 min-w-0 pt-0.5">
                          <p className="text-sm font-medium text-gray-900 truncate">{activity.title}</p>
                          {activity.description && (
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{activity.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
                            {activity.user && <span>{activity.user.name}</span>}
                            <span>
                              {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true, locale: ptBR })}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center py-2">Nenhuma atividade registrada</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
