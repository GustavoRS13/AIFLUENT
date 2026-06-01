'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  MessageCircle, Phone, Mail, Clock,
} from 'lucide-react'
import { cn, generateColor } from '@/lib/utils'
import type { KanbanCard as KanbanCardType } from '@/types'

interface KanbanCardProps {
  card: KanbanCardType
  onClick?: () => void
  isDragOverlay?: boolean
}

const tagColors: Record<string, string> = {
  'Botao whatsapp site': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Home_NEW': 'bg-blue-100 text-blue-700 border-blue-200',
  'RMKT 1 MES': 'bg-orange-100 text-orange-700 border-orange-200',
  'LP - Ingles MSI': 'bg-purple-100 text-purple-700 border-purple-200',
  'ultima semana cliente': 'bg-rose-100 text-rose-700 border-rose-200',
  'MSI': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  'RENOVACAO MSI': 'bg-amber-100 text-amber-700 border-amber-200',
  'Black_MSI_EX': 'bg-gray-800 text-white border-gray-700',
  'no duplicates': 'bg-gray-100 text-gray-500 border-gray-200',
}

function getTagColor(tag: string) {
  return tagColors[tag] || 'bg-indigo-50 text-indigo-600 border-indigo-200'
}

export function KanbanCard({ card, onClick: _onClick, isDragOverlay = false }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: 'card', card },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    touchAction: 'none',
  }

  const consultantInitial = card.consultant ? card.consultant.charAt(0).toUpperCase() : null

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'group relative bg-white rounded-lg border border-gray-200 p-3',
        'cursor-grab active:cursor-grabbing',
        'transition-shadow duration-150 hover:shadow-md hover:border-gray-300',
        isDragging && 'opacity-30 scale-95 shadow-none',
        isDragOverlay && 'shadow-2xl border-indigo-400 rotate-2 scale-105 cursor-grabbing'
      )}
    >
      {/* Tags de origem */}
      {card.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {card.tags.slice(0, 2).map((tag) => (
            <span key={tag} className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border', getTagColor(tag))}>
              {tag}
            </span>
          ))}
          {card.tags.length > 2 && (
            <span className="text-[10px] text-gray-400 self-center">+{card.tags.length - 2}</span>
          )}
        </div>
      )}

      {/* Nome + Avatar consultor */}
      <div className="flex items-center justify-between mb-1.5">
        <h4 className="text-sm font-semibold text-gray-900 truncate pr-4">{card.name}</h4>
        {consultantInitial && (
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
            style={{ background: `linear-gradient(135deg, ${generateColor(card.consultant!)}, ${generateColor(card.consultant! + 'x')})` }}
            title={card.consultant!}
          >
            {consultantInitial}
          </div>
        )}
      </div>

      {/* Preview da ultima mensagem */}
      {card.lastMessage && (
        <div className="flex items-center gap-1.5 mb-2">
          <MessageCircle className="w-3 h-3 text-emerald-500 shrink-0" />
          <span className="text-xs text-gray-500 truncate">{card.lastMessage}</span>
          {card.lastMessageAt && (
            <span className="text-[10px] text-gray-400 shrink-0 ml-auto">{card.lastMessageAt}</span>
          )}
        </div>
      )}

      {/* Footer: icones de acao + valor + contadores + tempo */}
      <div className="flex items-center gap-1.5 pt-2 border-t border-gray-100">
        <div className="flex items-center gap-0.5">
          <span
            className="p-1 rounded text-emerald-500 hover:bg-emerald-50 transition-colors"
            onPointerDown={(e) => { e.stopPropagation(); if (card.whatsapp) window.open(`https://wa.me/${card.whatsapp.replace(/\D/g, '')}`, '_blank') }}
          >
            <MessageCircle className="w-3.5 h-3.5" />
          </span>
          <span className="p-1 rounded text-blue-500 hover:bg-blue-50 transition-colors">
            <Phone className="w-3.5 h-3.5" />
          </span>
          <span className="p-1 rounded text-gray-400 hover:bg-gray-50 transition-colors">
            <Mail className="w-3.5 h-3.5" />
          </span>
        </div>

        <div className="flex-1" />

        {card.dealValue != null && card.dealValue > 0 && (
          <span className="text-[10px] font-medium text-gray-500">
            R${card.dealValue.toLocaleString('pt-BR')}
          </span>
        )}

        {card.totalMessages != null && (
          <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
            <Clock className="w-2.5 h-2.5" />
            {card.messageCount || 0}/{card.totalMessages}
          </span>
        )}

        {card.daysSinceEntry && (
          <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
            <Clock className="w-2.5 h-2.5" />
            {card.daysSinceEntry}
          </span>
        )}
      </div>
    </div>
  )
}
