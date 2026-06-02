'use client'

import { Phone, CalendarDays, Mail, Clock, Bot, Flag } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuickActionsBarProps {
  phone?: string | null
  email?: string | null
  onSchedule?: () => void
  onReminder?: () => void
  onAiAction?: () => void
  onFlag?: () => void
  className?: string
}

const actions = [
  { key: 'phone', icon: Phone, label: 'Ligar', color: 'hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200' },
  { key: 'calendar', icon: CalendarDays, label: 'Agendar', color: 'hover:bg-sky-50 hover:text-sky-600 hover:border-sky-200' },
  { key: 'email', icon: Mail, label: 'Email', color: 'hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200' },
  { key: 'reminder', icon: Clock, label: 'Lembrete', color: 'hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200' },
  { key: 'ai', icon: Bot, label: 'IA', color: 'hover:bg-violet-50 hover:text-violet-600 hover:border-violet-200' },
  { key: 'flag', icon: Flag, label: 'Marcar', color: 'hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200' },
] as const

export function QuickActionsBar({
  phone,
  email,
  onSchedule,
  onReminder,
  onAiAction,
  onFlag,
  className,
}: QuickActionsBarProps) {
  function handleClick(key: string) {
    switch (key) {
      case 'phone':
        if (phone) window.open(`tel:${phone}`, '_self')
        break
      case 'email':
        if (email) window.open(`mailto:${email}`, '_self')
        break
      case 'calendar':
        onSchedule?.()
        break
      case 'reminder':
        onReminder?.()
        break
      case 'ai':
        onAiAction?.()
        break
      case 'flag':
        onFlag?.()
        break
    }
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {actions.map(({ key, icon: Icon, label, color }) => (
        <button
          key={key}
          onClick={() => handleClick(key)}
          title={label}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-400 transition-all',
            color
          )}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  )
}
