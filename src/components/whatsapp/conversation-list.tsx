'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getInitials, truncate, generateColor } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────────────────────

export interface Conversation {
  id: string
  contactName: string
  contactPhone: string
  lastMessage: string
  lastMessageTime: string
  unreadCount: number
  isOnline?: boolean
  isPending?: boolean
}

interface ConversationListProps {
  conversations: Conversation[]
  activeId: string | null
  onSelect: (id: string) => void
}

type FilterMode = 'all' | 'unread' | 'pending'

// ── Component ────────────────────────────────────────────────────────────────

export function ConversationList({ conversations, activeId, onSelect }: ConversationListProps) {
  const [search, setSearch] = React.useState('')
  const [filter, setFilter] = React.useState<FilterMode>('all')

  const filtered = React.useMemo(() => {
    let items = conversations

    if (filter === 'unread') items = items.filter((c) => c.unreadCount > 0)
    else if (filter === 'pending') items = items.filter((c) => c.isPending)

    if (search) {
      const q = search.toLowerCase()
      items = items.filter(
        (c) =>
          c.contactName.toLowerCase().includes(q) ||
          c.contactPhone.includes(q) ||
          c.lastMessage.toLowerCase().includes(q)
      )
    }

    return items
  }, [conversations, filter, search])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-gray-200 space-y-3 shrink-0">
        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar conversas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex h-9 w-full rounded-lg border border-gray-200 bg-gray-50 pl-10 pr-9 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/30 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-gray-400 hover:text-gray-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1">
          {[
            { value: 'all' as const, label: 'Todas' },
            { value: 'unread' as const, label: 'Nao lidas' },
            { value: 'pending' as const, label: 'Pendentes' },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                filter === f.value
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <p className="text-sm text-gray-400">Nenhuma conversa encontrada</p>
          </div>
        ) : (
          filtered.map((conversation, idx) => {
            const isActive = conversation.id === activeId
            return (
              <motion.button
                key={conversation.id}
                onClick={() => onSelect(conversation.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-3 text-left transition-colors border-b border-gray-200',
                  isActive
                    ? 'bg-emerald-500/8 border-l-2 border-l-emerald-500'
                    : 'hover:bg-gray-50 border-l-2 border-l-transparent'
                )}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <Avatar size="sm">
                    <AvatarFallback
                      style={{ background: generateColor(conversation.contactName) }}
                      className="text-gray-900 text-[10px]"
                    >
                      {getInitials(conversation.contactName)}
                    </AvatarFallback>
                  </Avatar>
                  {conversation.isOnline && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        'text-sm truncate',
                        conversation.unreadCount > 0 ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'
                      )}
                    >
                      {conversation.contactName}
                    </span>
                    <span className="text-[10px] text-gray-400 whitespace-nowrap shrink-0">
                      {conversation.lastMessageTime}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p
                      className={cn(
                        'text-xs truncate',
                        conversation.unreadCount > 0 ? 'text-gray-700' : 'text-gray-400'
                      )}
                    >
                      {truncate(conversation.lastMessage, 45)}
                    </p>
                    {conversation.unreadCount > 0 && (
                      <span className="flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white shrink-0">
                        {conversation.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </motion.button>
            )
          })
        )}
      </div>
    </div>
  )
}
