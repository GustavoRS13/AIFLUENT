'use client'

import * as React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  X,
  Phone,
  MessageCircle,
  Mail,
  Pencil,
  MapPin,
  Calendar,
  Clock,
  User,
  Globe,
  GraduationCap,
  StickyNote,
  Activity,
  Send,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatPhone, formatDate, getInitials, generateColor } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import type { KanbanCard, LeadTemperature, LeadStatus, LeadSource } from '@/types'

// ── Label maps ──────────────────────────────────────────────────────────────

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

const statusVariant: Record<LeadStatus, 'default' | 'primary' | 'success' | 'warning' | 'error' | 'secondary'> = {
  new: 'primary',
  contacted: 'default',
  qualified: 'secondary',
  negotiating: 'warning',
  converted: 'success',
  lost: 'error',
}

// ── Score circle ────────────────────────────────────────────────────────────

function ScoreCircleLg({ score }: { score: number | null }) {
  if (score == null) return null
  const pct = Math.min(score, 100)
  const r = 22
  const circumference = 2 * Math.PI * r
  const offset = circumference - (pct / 100) * circumference
  const color =
    pct >= 70 ? 'text-emerald-400' : pct >= 40 ? 'text-amber-400' : 'text-rose-400'

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="52" height="52" className="-rotate-90">
        <circle cx="26" cy="26" r={r} fill="none" stroke="currentColor" strokeWidth="3" className="text-gray-800" />
        <circle cx="26" cy="26" r={r} fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className={color} />
      </svg>
      <span className={cn('absolute text-sm font-bold', color)}>{pct}</span>
    </div>
  )
}

// ── Field row ───────────────────────────────────────────────────────────────

function FieldRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-200 last:border-0">
      <div className="mt-0.5 text-gray-400">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-gray-400 mb-0.5">{label}</p>
        <div className="text-sm text-gray-800">{value || <span className="text-gray-400">--</span>}</div>
      </div>
    </div>
  )
}

// ── Component ───────────────────────────────────────────────────────────────

interface LeadDetailModalProps {
  lead: KanbanCard | null
  open: boolean
  onClose: () => void
  onEdit?: (lead: KanbanCard) => void
}

export function LeadDetailModal({ lead, open, onClose, onEdit }: LeadDetailModalProps) {
  return (
    <AnimatePresence>
      {open && lead && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/50"
            onClick={onClose}
          />

          {/* Slide-over panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 z-50 h-full w-full max-w-lg overflow-y-auto border-l border-gray-200 bg-white shadow-2xl"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 z-10 rounded-md p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <div className="border-b border-gray-200 p-6 pb-5">
              <div className="flex items-start gap-4">
                <Avatar size="xl">
                  {lead.photo ? (
                    <AvatarImage src={lead.photo} alt={lead.name} />
                  ) : null}
                  <AvatarFallback style={{ background: generateColor(lead.name) }}>
                    {getInitials(lead.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-gray-900 truncate">
                    {lead.name}
                  </h2>
                  <div className="mt-1 flex items-center gap-2 flex-wrap">
                    <Badge variant={lead.temperature} size="md" dot>
                      {tempLabel[lead.temperature]}
                    </Badge>
                    <Badge variant={statusVariant[lead.status]} size="md">
                      {statusLabel[lead.status]}
                    </Badge>
                  </div>
                  <div className="mt-2">
                    <ScoreCircleLg score={lead.aiScore} />
                  </div>
                </div>
              </div>

              {/* Quick actions */}
              <div className="mt-4 flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const num = lead.whatsapp || lead.phone
                    if (num) window.open(`tel:${num}`, '_self')
                  }}
                >
                  <Phone className="h-3.5 w-3.5" />
                  Ligar
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const num = lead.whatsapp || lead.phone
                    if (num) window.open(`https://wa.me/55${num.replace(/\D/g, '')}`, '_blank')
                  }}
                >
                  <MessageCircle className="h-3.5 w-3.5 text-green-400" />
                  WhatsApp
                </Button>
                {lead.email && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => window.open(`mailto:${lead.email}`, '_self')}
                  >
                    <Mail className="h-3.5 w-3.5 text-violet-400" />
                    Email
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit?.(lead)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </Button>
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="details" className="p-6">
              <TabsList className="w-full">
                <TabsTrigger value="details" className="flex-1">Detalhes</TabsTrigger>
                <TabsTrigger value="timeline" className="flex-1">Timeline</TabsTrigger>
                <TabsTrigger value="messages" className="flex-1">Mensagens</TabsTrigger>
                <TabsTrigger value="notes" className="flex-1">Notas</TabsTrigger>
              </TabsList>

              {/* Detalhes */}
              <TabsContent value="details" className="mt-4">
                <div className="space-y-0">
                  <FieldRow
                    icon={<User className="h-4 w-4" />}
                    label="Nome completo"
                    value={lead.name}
                  />
                  <FieldRow
                    icon={<Mail className="h-4 w-4" />}
                    label="Email"
                    value={lead.email}
                  />
                  <FieldRow
                    icon={<Phone className="h-4 w-4" />}
                    label="Telefone"
                    value={lead.phone ? formatPhone(lead.phone) : null}
                  />
                  <FieldRow
                    icon={<MessageCircle className="h-4 w-4" />}
                    label="WhatsApp"
                    value={lead.whatsapp ? formatPhone(lead.whatsapp) : null}
                  />
                  <FieldRow
                    icon={<Globe className="h-4 w-4" />}
                    label="Origem"
                    value={sourceLabel[lead.source]}
                  />
                  <FieldRow
                    icon={<GraduationCap className="h-4 w-4" />}
                    label="Curso de interesse"
                    value={lead.courseInterest}
                  />
                  <FieldRow
                    icon={<User className="h-4 w-4" />}
                    label="Consultor"
                    value={lead.consultant}
                  />
                  <FieldRow
                    icon={<Calendar className="h-4 w-4" />}
                    label="Data de entrada"
                    value={formatDate(lead.entryDate)}
                  />
                  <FieldRow
                    icon={<Clock className="h-4 w-4" />}
                    label="Ultima interacao"
                    value={lead.lastInteraction ? formatDate(lead.lastInteraction) : null}
                  />
                  {lead.tags.length > 0 && (
                    <FieldRow
                      icon={<StickyNote className="h-4 w-4" />}
                      label="Tags"
                      value={
                        <div className="flex flex-wrap gap-1">
                          {lead.tags.map((tag) => (
                            <Badge key={tag} variant="default" size="sm">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      }
                    />
                  )}
                </div>
              </TabsContent>

              {/* Timeline */}
              <TabsContent value="timeline" className="mt-4">
                <div className="space-y-4">
                  <TimelineItem
                    time={lead.entryDate}
                    title="Lead criado"
                    description={`Origem: ${sourceLabel[lead.source]}`}
                    icon={<User className="h-3.5 w-3.5" />}
                  />
                  {lead.lastInteraction && (
                    <TimelineItem
                      time={lead.lastInteraction}
                      title="Ultima interacao"
                      description="Contato realizado"
                      icon={<Activity className="h-3.5 w-3.5" />}
                    />
                  )}
                  <div className="py-8 text-center">
                    <p className="text-xs text-gray-400">
                      Historico completo disponivel em breve.
                    </p>
                  </div>
                </div>
              </TabsContent>

              {/* Mensagens */}
              <TabsContent value="messages" className="mt-4">
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-50">
                    <Send className="h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-400">
                    Nenhuma mensagem registrada.
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    Inicie uma conversa por WhatsApp ou Email.
                  </p>
                </div>
              </TabsContent>

              {/* Notas */}
              <TabsContent value="notes" className="mt-4">
                <div className="space-y-3">
                  <textarea
                    placeholder="Adicionar uma nota..."
                    className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 min-h-[100px]"
                  />
                  <Button size="sm">
                    <StickyNote className="h-3.5 w-3.5" />
                    Salvar nota
                  </Button>
                  <div className="pt-4 text-center">
                    <p className="text-xs text-gray-400">
                      Nenhuma nota registrada ainda.
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ── Timeline item ───────────────────────────────────────────────────────────

function TimelineItem({
  time,
  title,
  description,
  icon,
}: {
  time: string
  title: string
  description: string
  icon: React.ReactNode
}) {
  return (
    <div className="relative flex gap-3 pl-6">
      <div className="absolute left-0 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-gray-500 ring-2 ring-white">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800">{title}</p>
        <p className="text-xs text-gray-400">{description}</p>
        <p className="mt-0.5 text-[10px] text-gray-400">{formatDate(time)}</p>
      </div>
    </div>
  )
}
