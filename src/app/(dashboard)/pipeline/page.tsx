'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, SlidersHorizontal, RefreshCw, Loader2, Plus,
  ChevronDown, ChevronRight, Download, X, Check, Calendar,
  Tag, User, Activity,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePipelineStore, type PipelineStage } from '@/stores/pipeline-store'
import { KanbanBoard } from '@/components/pipeline/kanban-board'
import { LeadOperationPanel } from '@/components/atendimento/lead-operation-panel'
import type { KanbanCard, LeadSource, LeadTemperature } from '@/types'

const STAGES = [
  { name: 'Base', color: '#6366f1', isWon: false, isLost: false },
  { name: 'Prospeccao', color: '#8b5cf6', isWon: false, isLost: false },
  { name: 'Conexao', color: '#06b6d4', isWon: false, isLost: false },
  { name: 'Proposta', color: '#f59e0b', isWon: false, isLost: false },
  { name: 'Negociacao', color: '#f97316', isWon: false, isLost: false },
  { name: 'Fechamento', color: '#10b981', isWon: true, isLost: false },
  { name: 'Perdido', color: '#ef4444', isWon: false, isLost: true },
]

interface OriginGroup {
  id: string
  label: string
  children: { id: string; label: string }[]
}

const ORIGIN_TREE: OriginGroup[] = [
  {
    id: 'meta-ads',
    label: 'Meta Ads',
    children: [
      { id: 'facebook-lead-ads', label: 'Facebook Lead Ads' },
      { id: 'instagram-ads', label: 'Instagram Ads' },
      { id: 'remarketing', label: 'Remarketing' },
    ],
  },
  {
    id: 'google',
    label: 'Google Ads',
    children: [
      { id: 'google-search', label: 'Google Search' },
      { id: 'google-display', label: 'Google Display' },
    ],
  },
  {
    id: 'organico',
    label: 'Organico',
    children: [
      { id: 'whatsapp-site', label: 'WhatsApp Site' },
      { id: 'landing-page', label: 'Landing Page' },
      { id: 'indicacao', label: 'Indicacao' },
      { id: 'evento', label: 'Evento Presencial' },
    ],
  },
]

/** Map child origin IDs to LeadSource values for filtering */
const ORIGIN_SOURCE_MAP: Record<string, LeadSource[]> = {
  'facebook-lead-ads': ['facebook_lead_ad', 'facebook'],
  'instagram-ads': ['instagram'],
  'remarketing': ['meta_ads'],
  'google-search': ['google'],
  'google-display': ['google'],
  'whatsapp-site': ['whatsapp'],
  'landing-page': ['website'],
  'indicacao': ['referral'],
  'evento': ['event'],
}

/** Map group IDs to the union of their children's sources */
const GROUP_SOURCE_MAP: Record<string, LeadSource[]> = {
  'meta-ads': ['meta_ads', 'facebook_lead_ad', 'facebook', 'instagram'],
  'google': ['google'],
  'organico': ['whatsapp', 'website', 'referral', 'event'],
}

// No mock data — pipeline loads from API only. Empty columns shown when no leads exist.

export default function PipelinePage() {
  const { stages, setStages, addStage, renameStage, updateStageColor, deleteStage } = usePipelineStore()
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOrigin, setSelectedOrigin] = useState<string>('all')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['meta-ads', 'organico']))
  const [openFilter, setOpenFilter] = useState<string | null>(null)
  const [filterDate, setFilterDate] = useState<string>('')
  const [filterTag, setFilterTag] = useState<string>('')
  const [filterOwner, setFilterOwner] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const filterRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setOpenFilter(null)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchPipeline = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/pipeline')
      if (res.ok) {
        const data = await res.json()
        if (data?.stages?.length > 0) {
          const mapped: PipelineStage[] = data.stages.map((stage: { id: string; name: string; color: string; order: number; isWon: boolean; isLost: boolean; leads: Array<Record<string, unknown>> }) => ({
            id: stage.id, name: stage.name, color: stage.color, order: stage.order, isWon: stage.isWon, isLost: stage.isLost,
            leads: (stage.leads || []).map((l: Record<string, unknown>): KanbanCard => ({
              id: l.id as string, name: [l.firstName, l.lastName].filter(Boolean).join(' '),
              photo: (l.avatar as string) ?? null, phone: (l.phone as string) ?? null, whatsapp: (l.whatsapp as string) ?? null, email: (l.email as string) ?? null,
              source: ((l.source as string) || 'manual') as LeadSource, consultant: (l.consultant && typeof l.consultant === 'object') ? ((l.consultant as Record<string, string>).name ?? null) : null,
              lastInteraction: (l.lastContactAt as string) ?? null, temperature: ((l.temperature as string) || 'warm') as LeadTemperature,
              aiScore: (l.aiScore as number) ?? null, tags: Array.isArray(l.tags) ? (l.tags as Array<{ tag?: { name?: string } }>).map((t) => t.tag?.name ?? '').filter(Boolean) : [],
              courseInterest: (l.courseInterest as string) ?? null, status: (l.status as string) as KanbanCard['status'], entryDate: (l.createdAt as string) ?? new Date().toISOString(),
            })),
          }))
          setStages(mapped)
          setLoading(false)
          return
        }
      }
    } catch { /* fallback */ }

    const defaultStages: PipelineStage[] = STAGES.map((s, i) => {
      return { id: `stage-${i}`, name: s.name, color: s.color, order: i, isWon: s.isWon, isLost: s.isLost, leads: [] }
    })
    setStages(defaultStages)
    setLoading(false)
  }, [setStages])

  useEffect(() => { fetchPipeline() }, [fetchPipeline])

  const handleMoveLead = useCallback(async (leadId: string, stageId: string, newOrder: number) => {
    try { await fetch('/api/pipeline', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ leadId, stageId, newOrder }) }) } catch {}
  }, [])

  const handleAddStage = useCallback(() => {
    const defaultColors = ['#6366f1', '#8b5cf6', '#06b6d4', '#f59e0b', '#f97316', '#10b981', '#ef4444', '#ec4899', '#3b82f6', '#a855f7']
    const color = defaultColors[stages.length % defaultColors.length]
    addStage(`Nova Etapa ${stages.length + 1}`, color)
  }, [stages.length, addStage])

  const handleRenameStage = useCallback((stageId: string, name: string) => {
    renameStage(stageId, name)
  }, [renameStage])

  const handleUpdateStageColor = useCallback((stageId: string, color: string) => {
    updateStageColor(stageId, color)
  }, [updateStageColor])

  const handleDeleteStage = useCallback((stageId: string) => {
    deleteStage(stageId)
  }, [deleteStage])

  function toggleGroup(groupId: string) {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }

  function countForGroup(group: OriginGroup): number {
    const all = stages.flatMap(s => s.leads)
    const sources = GROUP_SOURCE_MAP[group.id]
    if (!sources) return 0
    return all.filter(l => sources.includes(l.source)).length
  }

  function countForChild(childId: string): number {
    const all = stages.flatMap(s => s.leads)
    const sources = ORIGIN_SOURCE_MAP[childId]
    if (!sources) return 0
    return all.filter(l => sources.includes(l.source)).length
  }

  /** Resolve the set of LeadSource values for the currently selected origin */
  function getSelectedSources(): LeadSource[] | null {
    if (selectedOrigin === 'all') return null
    // Check if it's a group
    if (GROUP_SOURCE_MAP[selectedOrigin]) return GROUP_SOURCE_MAP[selectedOrigin]
    // Check if it's a child
    if (ORIGIN_SOURCE_MAP[selectedOrigin]) return ORIGIN_SOURCE_MAP[selectedOrigin]
    return null
  }

  /** Find the display label for the current selection */
  function getSelectedLabel(): string {
    if (selectedOrigin === 'all') return 'Pipeline'
    for (const group of ORIGIN_TREE) {
      if (group.id === selectedOrigin) return group.label
      for (const child of group.children) {
        if (child.id === selectedOrigin) return child.label
      }
    }
    return 'Pipeline'
  }

  const selectedSources = getSelectedSources()

  const filteredStages = stages.map((stage) => ({
    ...stage,
    leads: stage.leads.filter((lead) => {
      if (selectedSources && !selectedSources.includes(lead.source)) return false
      if (searchQuery.trim() && !lead.name.toLowerCase().includes(searchQuery.toLowerCase()) && !lead.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))) return false
      if (filterTag && !lead.tags.includes(filterTag)) return false
      if (filterOwner && lead.consultant !== filterOwner) return false
      if (filterStatus && lead.status !== filterStatus) return false
      return true
    }),
  }))

  const totalLeads = filteredStages.reduce((s, st) => s + st.leads.length, 0)
  const totalValue = filteredStages.flatMap((s) => s.leads).reduce((s, l) => s + (l.dealValue || 0), 0)

  return (
    <div className="flex h-[calc(100dvh-4rem)] -m-6">
      {/* Sidebar de Origens */}
      <div className="hidden lg:flex w-[240px] border-r border-gray-200 bg-white flex-col shrink-0">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Origens</span>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-1 rounded text-gray-400 hover:text-gray-600 transition-colors"><Search className="w-3.5 h-3.5" /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {/* "Todos" option */}
          <button
            onClick={() => setSelectedOrigin('all')}
            className={cn(
              'w-full flex items-center gap-2 px-4 py-2 text-left text-sm transition-colors',
              selectedOrigin === 'all' ? 'bg-sky-50 text-sky-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
            )}
          >
            <span className={cn('w-2 h-2 rounded-full shrink-0', selectedOrigin === 'all' ? 'bg-sky-500' : 'bg-gray-300')} />
            <span className="truncate flex-1">Todos os Leads</span>
            <span className="text-xs text-gray-400 tabular-nums">{stages.flatMap(s => s.leads).length}</span>
          </button>

          {/* Tree groups */}
          {ORIGIN_TREE.map(group => (
            <div key={group.id}>
              <button
                onClick={() => toggleGroup(group.id)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <ChevronRight className={cn('w-3 h-3 transition-transform shrink-0', expandedGroups.has(group.id) && 'rotate-90')} />
                <span className="font-medium truncate flex-1">{group.label}</span>
                <span className="ml-auto text-xs text-gray-400 tabular-nums">{countForGroup(group)}</span>
              </button>

              <AnimatePresence initial={false}>
                {expandedGroups.has(group.id) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    {group.children.map(child => (
                      <button
                        key={child.id}
                        onClick={() => setSelectedOrigin(child.id)}
                        className={cn(
                          'w-full flex items-center gap-2 pl-8 pr-3 py-1.5 text-sm transition-colors',
                          selectedOrigin === child.id ? 'bg-sky-50 text-sky-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                        )}
                      >
                        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', selectedOrigin === child.id ? 'bg-sky-500' : 'bg-gray-300')} />
                        <span className="truncate flex-1">{child.label}</span>
                        <span className="text-xs text-gray-400 tabular-nums">{countForChild(child.id)}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Negocios da Origem</p>
              <h1 className="text-xl font-bold text-gray-900">{getSelectedLabel()}</h1>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors shadow-sm">
              <Plus className="w-4 h-4" /> Negocio +
            </button>
          </div>

          {/* Filters bar */}
          <div className="flex items-center gap-2 flex-wrap" ref={filterRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar..." className="pl-9 pr-4 py-2 w-56 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 bg-gray-50"
              />
            </div>

            {/* Data filter */}
            <div className="relative">
              <button onClick={() => setOpenFilter(openFilter === 'data' ? null : 'data')} className={cn('flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors', filterDate ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'text-gray-600 border-gray-200 hover:bg-gray-50')}>
                <Calendar className="w-3.5 h-3.5" /> Data {filterDate && <span className="text-xs bg-indigo-100 text-indigo-600 px-1.5 rounded-full">1</span>} <ChevronDown className="w-3 h-3" />
              </button>
              <AnimatePresence>
                {openFilter === 'data' && (
                  <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} className="absolute top-full left-0 mt-1 w-52 bg-white border border-gray-200 rounded-xl shadow-lg p-3 z-50 space-y-1">
                    {['Hoje', 'Ultimos 7 dias', 'Ultimos 30 dias', 'Este mes', 'Mes passado'].map((d) => (
                      <button key={d} onClick={() => { setFilterDate(filterDate === d ? '' : d); setOpenFilter(null) }} className={cn('w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center justify-between', filterDate === d ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50')}>
                        {d} {filterDate === d && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                      </button>
                    ))}
                    {filterDate && <button onClick={() => { setFilterDate(''); setOpenFilter(null) }} className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-rose-500 hover:bg-rose-50 mt-1">Limpar filtro</button>}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Tags filter */}
            <div className="relative">
              <button onClick={() => setOpenFilter(openFilter === 'tags' ? null : 'tags')} className={cn('flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors', filterTag ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'text-gray-600 border-gray-200 hover:bg-gray-50')}>
                <Tag className="w-3.5 h-3.5" /> Tags {filterTag && <span className="text-xs bg-indigo-100 text-indigo-600 px-1.5 rounded-full">1</span>} <ChevronDown className="w-3 h-3" />
              </button>
              <AnimatePresence>
                {openFilter === 'tags' && (
                  <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-lg p-3 z-50 space-y-1 max-h-64 overflow-y-auto">
                    {['Botao whatsapp site', 'Home_NEW', 'RMKT 1 MES', 'LP - Ingles MSI', 'ex_alunos_MSI_300_50%', 'ex_alunos_MSI_50%off', 'Black_MSI_EX', 'MSI', 'RENOVACAO MSI', 'ultima semana cliente'].map((t) => (
                      <button key={t} onClick={() => { setFilterTag(filterTag === t ? '' : t); setOpenFilter(null) }} className={cn('w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center justify-between', filterTag === t ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50')}>
                        <span className="truncate">{t}</span> {filterTag === t && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                      </button>
                    ))}
                    {filterTag && <button onClick={() => { setFilterTag(''); setOpenFilter(null) }} className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-rose-500 hover:bg-rose-50 mt-1">Limpar filtro</button>}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Dono do negocio filter */}
            <div className="relative">
              <button onClick={() => setOpenFilter(openFilter === 'owner' ? null : 'owner')} className={cn('flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors', filterOwner ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'text-gray-600 border-gray-200 hover:bg-gray-50')}>
                <User className="w-3.5 h-3.5" /> Dono {filterOwner && <span className="text-xs bg-indigo-100 text-indigo-600 px-1.5 rounded-full">1</span>} <ChevronDown className="w-3 h-3" />
              </button>
              <AnimatePresence>
                {openFilter === 'owner' && (
                  <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-lg p-3 z-50 space-y-1">
                    {['Gustavo', 'Ana', 'Carlos', 'Pedro', 'Maria'].map((o) => (
                      <button key={o} onClick={() => { setFilterOwner(filterOwner === o ? '' : o); setOpenFilter(null) }} className={cn('w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center justify-between', filterOwner === o ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50')}>
                        {o} {filterOwner === o && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                      </button>
                    ))}
                    {filterOwner && <button onClick={() => { setFilterOwner(''); setOpenFilter(null) }} className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-rose-500 hover:bg-rose-50 mt-1">Limpar filtro</button>}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Status filter */}
            <div className="relative">
              <button onClick={() => setOpenFilter(openFilter === 'status' ? null : 'status')} className={cn('flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors', filterStatus ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'text-gray-600 border-gray-200 hover:bg-gray-50')}>
                <Activity className="w-3.5 h-3.5" /> Status {filterStatus && <span className="text-xs bg-indigo-100 text-indigo-600 px-1.5 rounded-full">1</span>} <ChevronDown className="w-3 h-3" />
              </button>
              <AnimatePresence>
                {openFilter === 'status' && (
                  <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-lg p-3 z-50 space-y-1">
                    {[{ v: 'new', l: 'Novo' }, { v: 'contacted', l: 'Contatado' }, { v: 'qualified', l: 'Qualificado' }, { v: 'negotiating', l: 'Negociando' }, { v: 'converted', l: 'Convertido' }, { v: 'lost', l: 'Perdido' }].map((s) => (
                      <button key={s.v} onClick={() => { setFilterStatus(filterStatus === s.v ? '' : s.v); setOpenFilter(null) }} className={cn('w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center justify-between', filterStatus === s.v ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50')}>
                        {s.l} {filterStatus === s.v && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                      </button>
                    ))}
                    {filterStatus && <button onClick={() => { setFilterStatus(''); setOpenFilter(null) }} className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-rose-500 hover:bg-rose-50 mt-1">Limpar filtro</button>}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Active filters indicator */}
            {(filterDate || filterTag || filterOwner || filterStatus) && (
              <button onClick={() => { setFilterDate(''); setFilterTag(''); setFilterOwner(''); setFilterStatus('') }} className="flex items-center gap-1 px-2 py-1 text-xs text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                <X className="w-3 h-3" /> Limpar tudo
              </button>
            )}
          </div>

          {/* Summary */}
          <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
            <span className="font-medium text-gray-900">{totalLeads.toLocaleString('pt-BR')} oportunidades</span>
            <span>de Negocio</span>
            {totalValue > 0 && <span className="text-emerald-600 font-medium">R${totalValue.toLocaleString('pt-BR')}</span>}
            <div className="ml-auto flex items-center gap-2">
              <button onClick={fetchPipeline} className="p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
              </button>
              <button className="p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"><Download className="w-4 h-4" /></button>
              <button className="p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"><SlidersHorizontal className="w-4 h-4" /></button>
            </div>
          </div>
        </div>

        {/* Kanban */}
        <div className="flex-1 overflow-hidden px-4 py-4 bg-gray-50">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
            </div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full">
              <KanbanBoard
                filteredStages={filteredStages}
                onMoveLead={handleMoveLead}
                onAddLead={() => { /* TODO: open add-lead modal */ }}
                onCardClick={(card) => setSelectedLeadId(card.id)}
                onAddStage={handleAddStage}
                onRenameStage={handleRenameStage}
                onUpdateStageColor={handleUpdateStageColor}
                onDeleteStage={handleDeleteStage}
              />
            </motion.div>
          )}
        </div>
      </div>

      {/* Slide-over: Painel de operacoes do lead */}
      <AnimatePresence>
        {selectedLeadId && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/20"
              onClick={() => setSelectedLeadId(null)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed right-0 top-0 z-50 h-full w-[380px] bg-white border-l border-gray-200 shadow-xl overflow-y-auto"
            >
              <LeadOperationPanel
                leadId={selectedLeadId}
                onClose={() => setSelectedLeadId(null)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
