'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  GitBranch,
  Search,
  SlidersHorizontal,
  RefreshCw,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePipelineStore, type PipelineStage } from '@/stores/pipeline-store'
import { KanbanBoard } from '@/components/pipeline/kanban-board'
import { PipelineStats } from '@/components/pipeline/pipeline-stats'
import type { KanbanCard, LeadSource, LeadTemperature } from '@/types'

// ── Stage color map (matches the 9 pipeline stages) ────────────────────────
const STAGE_COLORS: Record<string, string> = {
  base: '#6366f1',
  'primeiro contato': '#8b5cf6',
  'segundo contato': '#a78bfa',
  prospeccao: '#3b82f6',
  conexao: '#06b6d4',
  negociacao: '#f59e0b',
  'follow-up': '#f97316',
  perdido: '#ef4444',
  fechado: '#10b981',
}

// ── Shape the API response into our store format ───────────────────────────
interface APILead {
  id: string
  firstName: string
  lastName: string | null
  email: string | null
  phone: string | null
  whatsapp: string | null
  avatar: string | null
  source: string
  temperature: string
  aiScore: number | null
  status: string
  courseInterest: string | null
  lastContactAt: string | null
  createdAt: string
  stageOrder: number
  consultant: { id: string; name: string; avatar: string | null } | null
  tags: Array<{ tag: { id: string; name: string; color: string } }>
}

interface APIStage {
  id: string
  name: string
  color: string
  order: number
  isWon: boolean
  isLost: boolean
  leads: APILead[]
  _count: { leads: number }
}

interface APIPipeline {
  id: string
  name: string
  stages: APIStage[]
}

function mapAPIToStore(pipeline: APIPipeline): PipelineStage[] {
  return pipeline.stages.map((stage) => ({
    id: stage.id,
    name: stage.name,
    color: stage.color || STAGE_COLORS[stage.name.toLowerCase()] || '#6366f1',
    order: stage.order,
    isWon: stage.isWon,
    isLost: stage.isLost,
    leads: stage.leads.map((lead): KanbanCard => ({
      id: lead.id,
      name: [lead.firstName, lead.lastName].filter(Boolean).join(' '),
      photo: lead.avatar,
      phone: lead.phone,
      whatsapp: lead.whatsapp,
      email: lead.email,
      source: (lead.source || 'manual') as LeadSource,
      consultant: lead.consultant?.name ?? null,
      lastInteraction: lead.lastContactAt,
      temperature: (lead.temperature || 'warm') as LeadTemperature,
      aiScore: lead.aiScore,
      tags: lead.tags.map((t) => t.tag.name),
      courseInterest: lead.courseInterest,
      status: lead.status as KanbanCard['status'],
      entryDate: lead.createdAt,
    })),
  }))
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function PipelinePage() {
  const { stages, setStages } = usePipelineStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [pipelineName, setPipelineName] = useState('Pipeline Principal')

  // Fetch pipeline data
  const fetchPipeline = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/pipeline')
      if (!res.ok) throw new Error('Falha ao carregar pipeline')
      const data: APIPipeline | null = await res.json()

      if (data) {
        setPipelineName(data.name)
        setStages(mapAPIToStore(data))
      } else {
        // No pipeline in DB - set up empty default stages
        const defaultStages: PipelineStage[] = [
          'Base',
          'Primeiro Contato',
          'Segundo Contato',
          'Prospeccao',
          'Conexao',
          'Negociacao',
          'Follow-up',
          'Perdido',
          'Fechado',
        ].map((name, i) => ({
          id: `stage-${i}`,
          name,
          color: STAGE_COLORS[name.toLowerCase()] || '#6366f1',
          order: i,
          isWon: name === 'Fechado',
          isLost: name === 'Perdido',
          leads: [],
        }))
        setStages(defaultStages)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [setStages])

  useEffect(() => {
    fetchPipeline()
  }, [fetchPipeline])

  // Handle drag-and-drop API call
  const handleMoveLead = useCallback(
    async (leadId: string, stageId: string, newOrder: number) => {
      try {
        await fetch('/api/pipeline', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leadId, stageId, newOrder }),
        })
      } catch {
        // Silently fail - optimistic update already applied
      }
    },
    []
  )

  // Filter stages by search query
  const filteredStages = searchQuery.trim()
    ? stages.map((stage) => ({
        ...stage,
        leads: stage.leads.filter(
          (lead) =>
            lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            lead.phone?.includes(searchQuery) ||
            lead.courseInterest
              ?.toLowerCase()
              .includes(searchQuery.toLowerCase()) ||
            lead.tags.some((t) =>
              t.toLowerCase().includes(searchQuery.toLowerCase())
            )
        ),
      }))
    : stages

  return (
    <div className="flex flex-col h-full -m-6">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 space-y-4">
        {/* Title row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
              <GitBranch className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100">
                Pipeline de Vendas
              </h1>
              <p className="text-xs text-slate-500">{pipelineName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  'h-8 w-56 rounded-lg border border-slate-700/40 bg-slate-800/40 backdrop-blur-sm pl-8 pr-3 text-xs text-slate-200',
                  'placeholder:text-slate-500',
                  'focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/30',
                  'transition-all duration-200'
                )}
              />
            </div>

            {/* Filter button */}
            <button
              className={cn(
                'flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium',
                'text-slate-400 border border-slate-700/40 bg-slate-800/40 backdrop-blur-sm',
                'hover:text-slate-200 hover:bg-slate-800/60 hover:border-slate-600/50',
                'transition-all duration-150'
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filtros
            </button>

            {/* Refresh */}
            <button
              onClick={fetchPipeline}
              disabled={loading}
              className={cn(
                'flex items-center justify-center h-8 w-8 rounded-lg',
                'text-slate-400 border border-slate-700/40 bg-slate-800/40 backdrop-blur-sm',
                'hover:text-slate-200 hover:bg-slate-800/60 hover:border-slate-600/50',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'transition-all duration-150'
              )}
            >
              <RefreshCw
                className={cn('h-3.5 w-3.5', loading && 'animate-spin')}
              />
            </button>
          </div>
        </div>

        {/* Stats bar */}
        {!loading && <PipelineStats stages={filteredStages} />}
      </div>

      {/* Kanban board area */}
      <div className="flex-1 overflow-hidden px-6 pb-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-3"
            >
              <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
              <span className="text-sm text-slate-500">
                Carregando pipeline...
              </span>
            </motion.div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-3 text-center"
            >
              <div className="h-12 w-12 rounded-full bg-rose-500/10 flex items-center justify-center">
                <GitBranch className="h-6 w-6 text-rose-400" />
              </div>
              <p className="text-sm text-slate-400">{error}</p>
              <button
                onClick={fetchPipeline}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Tentar novamente
              </button>
            </motion.div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            <KanbanBoard
              onMoveLead={handleMoveLead}
              onAddLead={(stageId) => {
                // TODO: Open add lead modal
                console.log('Add lead to stage:', stageId)
              }}
              onCardClick={(card) => {
                // TODO: Open lead detail modal
                console.log('Card clicked:', card.id)
              }}
            />
          </motion.div>
        )}
      </div>
    </div>
  )
}
