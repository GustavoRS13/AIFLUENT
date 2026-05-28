'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  MessageCircle,
  Phone,
  Mail,
  Camera,
  MessagesSquare,
  Globe,
  MapPin,
  Users as UsersIcon,
  UserPlus,
  Tag,
  ArrowRightLeft,
  Target,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatPhone, getInitials, generateColor } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { useLeadsStore } from '@/stores/leads-store'
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
  instagram: <Camera className="h-3.5 w-3.5 text-pink-400" />,
  facebook: <MessagesSquare className="h-3.5 w-3.5 text-blue-400" />,
  google: <Globe className="h-3.5 w-3.5 text-emerald-400" />,
  whatsapp: <MessageCircle className="h-3.5 w-3.5 text-green-400" />,
  website: <Globe className="h-3.5 w-3.5 text-violet-400" />,
  referral: <UsersIcon className="h-3.5 w-3.5 text-amber-400" />,
  event: <MapPin className="h-3.5 w-3.5 text-cyan-400" />,
  manual: <UserPlus className="h-3.5 w-3.5 text-gray-500" />,
  import: <ArrowRightLeft className="h-3.5 w-3.5 text-gray-500" />,
  meta_ads: <Target className="h-3.5 w-3.5 text-orange-400" />,
  facebook_lead_ad: <MessagesSquare className="h-3.5 w-3.5 text-blue-400" />,
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

// ── Score circle ────────────────────────────────────────────────────────────

function ScoreCircle({ score }: { score: number | null }) {
  if (score == null) return <span className="text-gray-400">--</span>
  const pct = Math.min(score, 100)
  const r = 14
  const circumference = 2 * Math.PI * r
  const offset = circumference - (pct / 100) * circumference
  const color =
    pct >= 70 ? 'text-emerald-400' : pct >= 40 ? 'text-amber-400' : 'text-rose-400'

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="36" height="36" className="-rotate-90">
        <circle
          cx="18"
          cy="18"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-gray-800"
        />
        <circle
          cx="18"
          cy="18"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={color}
        />
      </svg>
      <span className={cn('absolute text-[10px] font-bold', color)}>{pct}</span>
    </div>
  )
}

// ── Relative time helper ────────────────────────────────────────────────────

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Nunca'
  const now = Date.now()
  const d = new Date(dateStr).getTime()
  const diffMs = now - d
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Agora'
  if (mins < 60) return `${mins}min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d`
  const months = Math.floor(days / 30)
  return `${months}m`
}

// ── Component ───────────────────────────────────────────────────────────────

interface LeadsTableProps {
  leads: KanbanCard[]
  onView?: (lead: KanbanCard) => void
  onEdit?: (lead: KanbanCard) => void
  onDelete?: (lead: KanbanCard) => void
}

export function LeadsTable({ leads, onView, onEdit, onDelete }: LeadsTableProps) {
  const { selectedLeads, toggleSelectLead, selectAll, clearSelection } =
    useLeadsStore()

  const hasSelection = selectedLeads.size > 0

  const columns: ColumnDef<KanbanCard>[] = React.useMemo(
    () => [
      {
        id: 'name',
        header: 'Nome',
        sortable: true,
        accessorFn: (row) => row.name,
        cell: (row) => (
          <div className="flex items-center gap-3">
            <Avatar size="sm">
              {row.photo ? (
                <AvatarImage src={row.photo} alt={row.name} />
              ) : null}
              <AvatarFallback
                style={{ background: generateColor(row.name) }}
              >
                {getInitials(row.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900">
                {row.name}
              </p>
              {row.courseInterest && (
                <p className="truncate text-xs text-gray-400">
                  {row.courseInterest}
                </p>
              )}
            </div>
          </div>
        ),
        className: 'min-w-[200px]',
      },
      {
        id: 'email',
        header: 'Email',
        sortable: true,
        accessorFn: (row) => row.email,
        cell: (row) =>
          row.email ? (
            <span className="text-xs text-gray-500">{row.email}</span>
          ) : (
            <span className="text-xs text-gray-400">--</span>
          ),
      },
      {
        id: 'phone',
        header: 'Telefone',
        cell: (row) =>
          row.phone ? (
            <span className="text-xs text-gray-500 font-mono">
              {formatPhone(row.phone)}
            </span>
          ) : (
            <span className="text-xs text-gray-400">--</span>
          ),
      },
      {
        id: 'source',
        header: 'Origem',
        sortable: true,
        accessorFn: (row) => row.source,
        cell: (row) => (
          <div className="flex items-center gap-1.5">
            {sourceIcon[row.source]}
            <span className="text-xs text-gray-500">
              {sourceLabel[row.source]}
            </span>
          </div>
        ),
      },
      {
        id: 'temperature',
        header: 'Temp.',
        sortable: true,
        accessorFn: (row) => row.temperature,
        cell: (row) => (
          <Badge variant={row.temperature} size="sm" dot>
            {tempLabel[row.temperature]}
          </Badge>
        ),
      },
      {
        id: 'score',
        header: 'Score',
        sortable: true,
        accessorFn: (row) => row.aiScore ?? 0,
        cell: (row) => <ScoreCircle score={row.aiScore} />,
        className: 'text-center',
      },
      {
        id: 'consultant',
        header: 'Consultor',
        sortable: true,
        accessorFn: (row) => row.consultant,
        cell: (row) =>
          row.consultant ? (
            <span className="text-xs text-gray-500">{row.consultant}</span>
          ) : (
            <span className="text-xs text-gray-400">Sem consultor</span>
          ),
      },
      {
        id: 'lastInteraction',
        header: 'Ultima',
        sortable: true,
        accessorFn: (row) => row.lastInteraction,
        cell: (row) => (
          <span className="text-xs text-gray-400">
            {relativeTime(row.lastInteraction)}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Etapa',
        sortable: true,
        accessorFn: (row) => row.status,
        cell: (row) => (
          <Badge variant={statusVariant[row.status]} size="sm">
            {statusLabel[row.status]}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: (row) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => onView?.(row)}>
                <Eye className="mr-2 h-4 w-4" />
                Ver detalhes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit?.(row)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  const num = row.whatsapp || row.phone
                  if (num) window.open(`https://wa.me/55${num.replace(/\D/g, '')}`, '_blank')
                }}
              >
                <MessageCircle className="mr-2 h-4 w-4 text-green-400" />
                WhatsApp
              </DropdownMenuItem>
              {row.phone && (
                <DropdownMenuItem
                  onClick={() => window.open(`tel:${row.phone}`, '_self')}
                >
                  <Phone className="mr-2 h-4 w-4 text-blue-400" />
                  Ligar
                </DropdownMenuItem>
              )}
              {row.email && (
                <DropdownMenuItem
                  onClick={() => window.open(`mailto:${row.email}`, '_self')}
                >
                  <Mail className="mr-2 h-4 w-4 text-violet-400" />
                  Email
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete?.(row)}
                className="text-rose-400 focus:text-rose-300"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Deletar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
        className: 'w-12',
      },
    ],
    [onView, onEdit, onDelete]
  )

  return (
    <div className="space-y-2">
      {/* Bulk actions bar */}
      <AnimatePresence>
        {hasSelection && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-3 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-4 py-2.5">
              <span className="text-sm text-indigo-300 font-medium">
                {selectedLeads.size} selecionado{selectedLeads.size > 1 ? 's' : ''}
              </span>
              <div className="h-4 w-px bg-indigo-500/30" />
              <Button variant="ghost" size="sm" className="text-xs text-gray-700">
                <UsersIcon className="mr-1.5 h-3.5 w-3.5" />
                Atribuir
              </Button>
              <Button variant="ghost" size="sm" className="text-xs text-gray-700">
                <ArrowRightLeft className="mr-1.5 h-3.5 w-3.5" />
                Mover
              </Button>
              <Button variant="ghost" size="sm" className="text-xs text-gray-700">
                <Tag className="mr-1.5 h-3.5 w-3.5" />
                Tag
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-rose-400 hover:text-rose-300"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Deletar
              </Button>
              <div className="flex-1" />
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="text-xs text-gray-500"
              >
                Limpar selecao
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Data table */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
        <DataTable
          columns={columns}
          data={leads}
          getRowId={(row) => row.id}
          selectable
          selectedIds={selectedLeads}
          onSelectionChange={(ids) => {
            // Sync with Zustand store
            const current = useLeadsStore.getState().selectedLeads
            // Find items to toggle
            const toAdd = [...ids].filter((id) => !current.has(id))
            const toRemove = [...current].filter((id) => !ids.has(id))
            if (ids.size === 0) {
              clearSelection()
            } else if (ids.size === leads.length) {
              selectAll()
            } else {
              toAdd.forEach(toggleSelectLead)
              toRemove.forEach(toggleSelectLead)
            }
          }}
          onRowClick={(row) => onView?.(row)}
          emptyMessage="Nenhum lead encontrado."
        />
      </div>
    </div>
  )
}
