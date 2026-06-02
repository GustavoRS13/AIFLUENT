'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Phone, Mail, MapPin, Building, ChevronDown, DollarSign, Loader2, RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils'
import { AICopilot } from './ai-copilot'
import { StageSelector } from './stage-selector'
import { DealStatusButtons } from './deal-status-buttons'
import { NotesSection } from './notes-section'
import { HistorySection } from './history-section'
import { TasksSection } from './tasks-section'
import { QuickActionsBar } from './quick-actions-bar'

interface LeadData {
  id: string
  firstName: string
  lastName?: string | null
  email?: string | null
  phone?: string | null
  whatsapp?: string | null
  company?: string | null
  jobTitle?: string | null
  temperature?: string | null
  score?: number | null
  stageId?: string | null
  city?: string | null
  state?: string | null
  courseInterest?: string | null
  notes?: string | null
  createdAt: string
  updatedAt: string
  consultant?: { id: string; name: string; avatar?: string | null } | null
  stage?: { id: string; name: string; color: string } | null
  deals?: Array<{
    id: string
    title: string
    value?: number | null
    status: string
    probability?: number | null
    stage?: { id: string; name: string; color: string } | null
  }>
  activities?: Array<{
    id: string
    type: string
    title: string
    description?: string | null
    createdAt: string
    userId?: string | null
    user?: { id: string; name: string } | null
  }>
  tasks?: Array<{
    id: string
    title: string
    status: string
    priority: string
    dueDate?: string | null
    assignee?: { id: string; name: string } | null
  }>
}

interface LeadOperationPanelProps {
  leadId: string | null
  className?: string
}

export function LeadOperationPanel({ leadId, className }: LeadOperationPanelProps) {
  const [lead, setLead] = useState<LeadData | null>(null)
  const [loading, setLoading] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)

  const fetchLead = useCallback(async () => {
    if (!leadId) { setLead(null); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/leads/${leadId}`)
      if (res.ok) {
        const data = await res.json()
        setLead(data)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [leadId])

  useEffect(() => {
    fetchLead()
  }, [fetchLead])

  if (!leadId) {
    return (
      <div className={cn('flex flex-col items-center justify-center p-6 text-center', className)}>
        <User className="h-10 w-10 text-gray-300 mb-3" />
        <p className="text-sm font-medium text-gray-500">Selecione uma conversa</p>
        <p className="text-xs text-gray-400 mt-1">Os dados do lead aparecerão aqui</p>
      </div>
    )
  }

  if (loading && !lead) {
    return (
      <div className={cn('flex items-center justify-center p-6', className)}>
        <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
      </div>
    )
  }

  if (!lead) {
    return (
      <div className={cn('flex flex-col items-center justify-center p-6 text-center', className)}>
        <User className="h-10 w-10 text-gray-300 mb-3" />
        <p className="text-sm font-medium text-gray-500">Lead nao encontrado</p>
      </div>
    )
  }

  const fullName = [lead.firstName, lead.lastName].filter(Boolean).join(' ')
  const notes = (lead.activities || []).filter((a) => a.type === 'note')
  const activities = lead.activities || []
  const tasks = lead.tasks || []
  const deals = lead.deals || []
  const primaryDeal = deals[0]

  return (
    <div className={cn('flex flex-col h-full overflow-y-auto', className)}>
      {/* Header */}
      <div className="border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-500">
              <span className="text-xs font-bold text-white">
                {lead.firstName?.[0]?.toUpperCase() || '?'}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{fullName}</p>
              {lead.company && <p className="text-[10px] text-gray-500 truncate">{lead.company}</p>}
            </div>
          </div>
          <button
            onClick={fetchLead}
            disabled={loading}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            title="Atualizar"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          </button>
        </div>

        {/* Quick actions */}
        <QuickActionsBar
          phone={lead.phone || lead.whatsapp}
          email={lead.email}
          className="mt-3"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {/* AI Copilot */}
        <AICopilot
          temperature={lead.temperature}
          score={lead.score}
          stageName={lead.stage?.name}
          lastContactAt={lead.updatedAt}
          leadId={lead.id}
        />

        {/* Deal Management */}
        <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Negocio</p>
            <StageSelector
              currentStageId={lead.stageId || null}
              leadId={lead.id}
              onStageChange={fetchLead}
            />
          </div>

          {primaryDeal ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{primaryDeal.title}</span>
                {primaryDeal.value != null && (
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(primaryDeal.value)}
                  </span>
                )}
              </div>
              {primaryDeal.probability != null && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-sky-500 transition-all"
                      style={{ width: `${primaryDeal.probability}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-500">{primaryDeal.probability}%</span>
                </div>
              )}
              <DealStatusButtons
                dealId={primaryDeal.id}
                currentStatus={primaryDeal.status}
                onStatusChange={fetchLead}
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <DollarSign className="h-3.5 w-3.5" />
              Nenhum negocio vinculado
            </div>
          )}

          {/* Consultant */}
          {lead.consultant && (
            <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100">
                <User className="h-3 w-3 text-gray-400" />
              </div>
              <span className="text-xs text-gray-600">Responsavel: {lead.consultant.name}</span>
            </div>
          )}
        </div>

        {/* Contact info accordion */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <button
            onClick={() => setContactOpen((o) => !o)}
            className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-gray-50"
          >
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-sky-500" />
              <span className="text-sm font-medium text-gray-900">Contato</span>
            </div>
            <ChevronDown
              className={cn('h-4 w-4 text-gray-400 transition-transform', contactOpen && 'rotate-180')}
            />
          </button>
          <AnimatePresence>
            {contactOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="border-t border-gray-100 px-4 py-3 space-y-2">
                  {lead.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Phone className="h-3.5 w-3.5 text-gray-400" />
                      <a href={`tel:${lead.phone}`} className="hover:text-sky-600 transition-colors">{lead.phone}</a>
                    </div>
                  )}
                  {lead.whatsapp && lead.whatsapp !== lead.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Phone className="h-3.5 w-3.5 text-emerald-500" />
                      <span>{lead.whatsapp}</span>
                    </div>
                  )}
                  {lead.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Mail className="h-3.5 w-3.5 text-gray-400" />
                      <a href={`mailto:${lead.email}`} className="hover:text-sky-600 transition-colors truncate">{lead.email}</a>
                    </div>
                  )}
                  {(lead.city || lead.state) && (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <MapPin className="h-3.5 w-3.5 text-gray-400" />
                      <span>{[lead.city, lead.state].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                  {lead.company && (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Building className="h-3.5 w-3.5 text-gray-400" />
                      <span>{lead.company}{lead.jobTitle ? ` - ${lead.jobTitle}` : ''}</span>
                    </div>
                  )}
                  {lead.courseInterest && (
                    <div className="mt-2 rounded-lg bg-sky-50 border border-sky-100 px-3 py-1.5">
                      <p className="text-[10px] text-sky-500 font-medium">Interesse</p>
                      <p className="text-xs text-gray-700">{lead.courseInterest}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Notes Section */}
        <NotesSection
          leadId={lead.id}
          notes={notes}
          onNoteAdded={fetchLead}
        />

        {/* History Section */}
        <HistorySection activities={activities} />

        {/* Tasks Section */}
        <TasksSection
          leadId={lead.id}
          tasks={tasks}
          onTaskCreated={fetchLead}
          onTaskToggled={fetchLead}
        />
      </div>
    </div>
  )
}
