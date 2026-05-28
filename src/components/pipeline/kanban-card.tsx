'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion } from 'framer-motion'
import {
  GripVertical,
  Mail,
  Phone,
  MessageCircle,
  Camera,
  Share2,
  Globe,
  Users,
  Megaphone,
  Upload,
  PenLine,
  Search,
  Zap,
  BookOpen,
  Clock,
  Target,
  MessagesSquare,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn, getInitials, generateColor, formatPhone } from '@/lib/utils'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import type { KanbanCard as KanbanCardType, LeadSource, LeadTemperature } from '@/types'

interface KanbanCardProps {
  card: KanbanCardType
  onClick?: () => void
  isDragOverlay?: boolean
}

const sourceIcons: Record<LeadSource, React.ReactNode> = {
  instagram: <Camera className="h-3 w-3" />,
  facebook: <Share2 className="h-3 w-3" />,
  google: <Search className="h-3 w-3" />,
  whatsapp: <MessageCircle className="h-3 w-3" />,
  event: <Megaphone className="h-3 w-3" />,
  website: <Globe className="h-3 w-3" />,
  referral: <Users className="h-3 w-3" />,
  manual: <PenLine className="h-3 w-3" />,
  import: <Upload className="h-3 w-3" />,
  meta_ads: <Target className="h-3 w-3" />,
  facebook_lead_ad: <MessagesSquare className="h-3 w-3" />,
}

const sourceLabels: Record<LeadSource, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  google: 'Google',
  whatsapp: 'WhatsApp',
  event: 'Evento',
  website: 'Website',
  referral: 'Indicacao',
  manual: 'Manual',
  import: 'Importacao',
  meta_ads: 'Meta Ads',
  facebook_lead_ad: 'Facebook Lead Ad',
}

const temperatureConfig: Record<LeadTemperature, { label: string; variant: 'cold' | 'warm' | 'hot' }> = {
  cold: { label: 'Frio', variant: 'cold' },
  warm: { label: 'Morno', variant: 'warm' },
  hot: { label: 'Quente', variant: 'hot' },
}

function AIScoreCircle({ score }: { score: number }) {
  const radius = 10
  const circumference = 2 * Math.PI * radius
  const progress = (score / 100) * circumference
  const color =
    score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#6366f1'

  return (
    <div className="relative flex items-center justify-center" title={`Score IA: ${score}`}>
      <svg width="28" height="28" className="-rotate-90">
        <circle
          cx="14"
          cy="14"
          r={radius}
          fill="none"
          stroke="rgb(51 65 85 / 0.4)"
          strokeWidth="2.5"
        />
        <circle
          cx="14"
          cy="14"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <span className="absolute text-[8px] font-bold text-gray-700">
        {score}
      </span>
    </div>
  )
}

export function KanbanCard({ card, onClick, isDragOverlay = false }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: { type: 'card', card },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const tempConfig = temperatureConfig[card.temperature]

  const relativeLastInteraction = card.lastInteraction
    ? formatDistanceToNow(new Date(card.lastInteraction), {
        addSuffix: true,
        locale: ptBR,
      })
    : null

  const relativeEntryDate = formatDistanceToNow(new Date(card.entryDate), {
    addSuffix: true,
    locale: ptBR,
  })

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative rounded-xl border border-gray-200 bg-gray-50 p-3 cursor-pointer',
        'transition-all duration-200 ease-out',
        'hover:border-gray-200 hover:bg-gray-100 hover:shadow-lg hover:shadow-indigo-500/5 hover:-translate-y-0.5',
        isDragging && 'opacity-40 scale-95',
        isDragOverlay && 'shadow-2xl shadow-indigo-500/20 border-indigo-500/30 rotate-2 scale-105'
      )}
      onClick={onClick}
    >
      {/* Drag handle */}
      <button
        className={cn(
          'absolute top-2 right-2 p-0.5 rounded text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing',
          'hover:text-gray-500 hover:bg-gray-100'
        )}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      {/* Top row: Avatar + Name + Temperature */}
      <div className="flex items-start gap-2.5 mb-2.5">
        <Avatar size="sm">
          {card.photo ? (
            <AvatarImage src={card.photo} alt={card.name} />
          ) : null}
          <AvatarFallback
            style={{
              background: `linear-gradient(135deg, ${generateColor(card.name)}, ${generateColor(card.name + 'x')})`,
            }}
          >
            {getInitials(card.name)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-gray-900 truncate pr-6">
            {card.name}
          </h4>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Badge variant={tempConfig.variant} size="sm" dot>
              {tempConfig.label}
            </Badge>
            {card.aiScore != null && <AIScoreCircle score={card.aiScore} />}
          </div>
        </div>
      </div>

      {/* Contact info */}
      <div className="space-y-1 mb-2.5">
        {card.phone && (
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <Phone className="h-3 w-3 text-gray-400 shrink-0" />
            <span className="truncate">{formatPhone(card.phone)}</span>
          </div>
        )}
        {card.email && (
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <Mail className="h-3 w-3 text-gray-400 shrink-0" />
            <span className="truncate">{card.email}</span>
          </div>
        )}
        {card.whatsapp && (
          <a
            href={`https://wa.me/${card.whatsapp.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <MessageCircle className="h-3 w-3 shrink-0" />
            <span className="truncate">WhatsApp</span>
          </a>
        )}
      </div>

      {/* Source + Consultant row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1 text-[10px] text-gray-400">
          {sourceIcons[card.source]}
          <span>{sourceLabels[card.source]}</span>
        </div>
        {card.consultant && (
          <div className="flex items-center gap-1 text-[10px] text-gray-400">
            <div className="h-4 w-4 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[7px] font-bold text-white">
              {getInitials(card.consultant)}
            </div>
            <span className="truncate max-w-[60px]">{card.consultant}</span>
          </div>
        )}
      </div>

      {/* Course interest */}
      {card.courseInterest && (
        <div className="flex items-center gap-1 mb-2 text-[10px] text-gray-500">
          <BookOpen className="h-3 w-3 text-gray-400 shrink-0" />
          <span className="truncate">{card.courseInterest}</span>
        </div>
      )}

      {/* Tags */}
      {card.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {card.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-medium bg-gray-100 text-gray-500 border border-gray-200"
            >
              {tag}
            </span>
          ))}
          {card.tags.length > 3 && (
            <span className="text-[9px] text-gray-400 self-center">
              +{card.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer: last interaction + entry date */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
        {relativeLastInteraction ? (
          <div className="flex items-center gap-1 text-[10px] text-gray-400">
            <Zap className="h-2.5 w-2.5" />
            <span>{relativeLastInteraction}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-[10px] text-gray-400">
            <Zap className="h-2.5 w-2.5" />
            <span>Sem interacao</span>
          </div>
        )}
        <div className="flex items-center gap-1 text-[10px] text-gray-400">
          <Clock className="h-2.5 w-2.5" />
          <span>{relativeEntryDate}</span>
        </div>
      </div>
    </div>
  )
}
