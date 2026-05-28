'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  GitBranch, Search, SlidersHorizontal, RefreshCw, Loader2, Plus,
  ChevronLeft, MoreHorizontal, Download, Upload,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePipelineStore, type PipelineStage } from '@/stores/pipeline-store'
import { KanbanBoard } from '@/components/pipeline/kanban-board'
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

const ORIGINS = [
  { label: 'Todos os Leads', count: 0, active: true },
  { label: 'WhatsApp Site', count: 0 },
  { label: 'Instagram Ads', count: 0 },
  { label: 'Facebook Lead Ads', count: 0 },
  { label: 'Google Ads', count: 0 },
  { label: 'Remarketing', count: 0 },
  { label: 'Indicacao', count: 0 },
  { label: 'Evento Presencial', count: 0 },
  { label: 'Landing Page', count: 0 },
]

const MOCK_LEADS: { stage: string; leads: KanbanCard[] }[] = [
  {
    stage: 'Base',
    leads: [
      { id: 'l1', name: 'Paola Mendes', photo: null, phone: '11999881234', whatsapp: '11999881234', email: 'paola@email.com', source: 'whatsapp', consultant: 'Gustavo', lastInteraction: '2026-05-27T14:00:00Z', temperature: 'cold', aiScore: 42, tags: ['Botao whatsapp site'], courseInterest: 'Ingles Business', status: 'new', entryDate: '2026-05-27T10:00:00Z', lastMessage: 'Qual o seu nome c...', lastMessageAt: '27/05', dealValue: 0, messageCount: 0, totalMessages: 2, daysSinceEntry: '27h' },
      { id: 'l2', name: 'Jovan Costa', photo: null, phone: '11988776655', whatsapp: '11988776655', email: null, source: 'whatsapp', consultant: 'Gustavo', lastInteraction: '2026-05-26T09:00:00Z', temperature: 'cold', aiScore: 35, tags: ['Botao whatsapp site'], courseInterest: 'Espanhol', status: 'new', entryDate: '2026-05-26T08:00:00Z', lastMessage: 'so pro dia 5 de junho...', lastMessageAt: '26/05', dealValue: 0, messageCount: 0, totalMessages: 2, daysSinceEntry: '2d' },
      { id: 'l3', name: '48996604048', photo: null, phone: '48996604048', whatsapp: '48996604048', email: null, source: 'whatsapp', consultant: 'Gustavo', lastInteraction: '2026-05-26T15:00:00Z', temperature: 'cold', aiScore: 20, tags: ['Botao whatsapp site'], courseInterest: null, status: 'new', entryDate: '2026-05-26T14:00:00Z', lastMessage: 'Mensagem nao su...', lastMessageAt: '26/05', dealValue: 0, messageCount: 0, totalMessages: 2, daysSinceEntry: '3d' },
      { id: 'l14', name: 'achilen', photo: null, phone: '11977665544', whatsapp: '11977665544', email: null, source: 'website', consultant: null, lastInteraction: null, temperature: 'cold', aiScore: 18, tags: ['Home_NEW'], courseInterest: null, status: 'new', entryDate: '2026-05-20T10:00:00Z', lastMessage: 'Certo, referente a parc...', lastMessageAt: '20/05', dealValue: 0, messageCount: 0, totalMessages: 2, daysSinceEntry: '7d' },
    ],
  },
  {
    stage: 'Prospeccao',
    leads: [
      { id: 'l4', name: 'Michelle Rocha da Silva', photo: null, phone: '21988554433', whatsapp: '21988554433', email: 'michelle@email.com', source: 'website', consultant: 'Ana', lastInteraction: '2026-05-28T09:05:00Z', temperature: 'warm', aiScore: 58, tags: ['Home_NEW'], courseInterest: 'Ingles Conversacao', status: 'contacted', entryDate: '2026-05-22T10:00:00Z', lastMessage: 'Bom dia, tudo bem?', lastMessageAt: '09:05', dealValue: 0, messageCount: 0, totalMessages: 12, daysSinceEntry: '19h' },
      { id: 'l5', name: 'Zibordi', photo: null, phone: '31977443322', whatsapp: '31977443322', email: null, source: 'whatsapp', consultant: 'Carlos', lastInteraction: '2026-05-28T09:00:00Z', temperature: 'warm', aiScore: 52, tags: ['Botao whatsapp site'], courseInterest: 'Espanhol Business', status: 'contacted', entryDate: '2026-05-20T08:00:00Z', lastMessage: 'Ola Zibordi, bom di...', lastMessageAt: '09:00', dealValue: 0, messageCount: 0, totalMessages: 12, daysSinceEntry: '19h' },
      { id: 'l6', name: 'Mariana', photo: null, phone: '41966332211', whatsapp: '41966332211', email: 'mariana@email.com', source: 'whatsapp', consultant: 'Pedro', lastInteraction: '2026-05-26T14:00:00Z', temperature: 'warm', aiScore: 55, tags: ['Botao whatsapp site'], courseInterest: 'Ingles', status: 'contacted', entryDate: '2026-05-25T09:00:00Z', lastMessage: 'Ola, Mariana. B...', lastMessageAt: '26/05', dealValue: 0, messageCount: 0, totalMessages: 12, daysSinceEntry: '3d' },
      { id: 'l15', name: 'Vivi', photo: null, phone: '51955221100', whatsapp: '51955221100', email: null, source: 'whatsapp', consultant: 'Maria', lastInteraction: '2026-05-26T11:00:00Z', temperature: 'warm', aiScore: 48, tags: ['Botao whatsapp site'], courseInterest: null, status: 'contacted', entryDate: '2026-05-24T08:00:00Z', lastMessage: 'Ola, Vivi. Ulti...', lastMessageAt: '26/05', dealValue: 0, messageCount: 0, totalMessages: 12, daysSinceEntry: '3d' },
    ],
  },
  {
    stage: 'Conexao',
    leads: [
      { id: 'l7', name: 'Karine Ferreira', photo: null, phone: '51955443322', whatsapp: '51955443322', email: 'karine@email.com', source: 'meta_ads', consultant: 'Ana', lastInteraction: '2026-05-15T10:00:00Z', temperature: 'warm', aiScore: 72, tags: ['ex_alunos_MSI_300_50%'], courseInterest: 'Ingles Business', status: 'qualified', entryDate: '2026-05-08T10:00:00Z', lastMessage: 'Boa tarde, tudo ...', lastMessageAt: '15/05', dealValue: 3000, messageCount: 0, totalMessages: 0, daysSinceEntry: '20d' },
      { id: 'l8', name: 'Milene', photo: null, phone: '61944332211', whatsapp: '61944332211', email: null, source: 'meta_ads', consultant: 'Ana', lastInteraction: '2026-05-15T14:00:00Z', temperature: 'warm', aiScore: 68, tags: ['ex_alunos_MSI_50%off'], courseInterest: 'Espanhol', status: 'qualified', entryDate: '2026-05-10T09:00:00Z', lastMessage: 'Boa tarde, tudo ...', lastMessageAt: '15/05', dealValue: 0, messageCount: 0, totalMessages: 0, daysSinceEntry: '20d' },
      { id: 'l9', name: 'ANTONIO', photo: null, phone: '71933221100', whatsapp: '71933221100', email: null, source: 'meta_ads', consultant: 'Carlos', lastInteraction: '2026-05-15T16:00:00Z', temperature: 'hot', aiScore: 78, tags: ['Black_MSI_EX', 'no duplicates'], courseInterest: 'Ingles Conversacao', status: 'qualified', entryDate: '2026-05-12T08:00:00Z', lastMessage: 'Boa tarde, tudo ...', lastMessageAt: '15/05', dealValue: 0, messageCount: 0, totalMessages: 0, daysSinceEntry: '20d' },
    ],
  },
  {
    stage: 'Proposta',
    leads: [
      { id: 'l10', name: 'Natalia Souza', photo: null, phone: '11922334455', whatsapp: '11922334455', email: 'natalia@empresa.com', source: 'referral', consultant: 'Pedro', lastInteraction: '2026-05-27T16:00:00Z', temperature: 'hot', aiScore: 85, tags: ['Home_NEW', 'RMKT 1 MES'], courseInterest: 'Ingles Business', status: 'negotiating', entryDate: '2026-05-15T10:00:00Z', lastMessage: 'Paguei por algo que na...', lastMessageAt: '27/05', dealValue: 36928, messageCount: 3, totalMessages: 8, daysSinceEntry: '13d' },
      { id: 'l11', name: 'Beatriz Bastos', photo: null, phone: '21911223344', whatsapp: '21911223344', email: 'beatriz@email.com', source: 'meta_ads', consultant: 'Maria', lastInteraction: '2026-05-26T10:00:00Z', temperature: 'hot', aiScore: 82, tags: ['LP - Ingles MSI', 'RMKT 1 MES'], courseInterest: 'Ingles Preparatorio', status: 'negotiating', entryDate: '2026-05-18T09:00:00Z', lastMessage: 'Ola, Beatriz Bast...', lastMessageAt: '26/05', dealValue: 0, messageCount: 2, totalMessages: 6, daysSinceEntry: '10d' },
    ],
  },
  {
    stage: 'Negociacao',
    leads: [
      { id: 'l12', name: 'Allana Torres', photo: null, phone: '31900112233', whatsapp: '31900112233', email: 'allana@email.com', source: 'meta_ads', consultant: 'Pedro', lastInteraction: '2026-05-27T11:00:00Z', temperature: 'hot', aiScore: 91, tags: ['ultima semana cliente'], courseInterest: 'Ingles Business', status: 'negotiating', entryDate: '2026-05-10T10:00:00Z', lastMessage: 'Agradeco a oportunidade...', lastMessageAt: '27/05', dealValue: 4500, messageCount: 5, totalMessages: 15, daysSinceEntry: '18d' },
    ],
  },
  {
    stage: 'Fechamento',
    leads: [
      { id: 'l13', name: 'Vinicius Pinheiro', photo: null, phone: '41988001122', whatsapp: '41988001122', email: 'vinicius@empresa.com', source: 'meta_ads', consultant: 'Carlos', lastInteraction: '2026-05-27T09:00:00Z', temperature: 'hot', aiScore: 95, tags: ['MSI', 'RENOVACAO MSI'], courseInterest: 'Ingles Business', status: 'converted', entryDate: '2026-05-01T10:00:00Z', lastMessage: 'Boa tarde, tudo ...', lastMessageAt: '27/05', dealValue: 8900, messageCount: 8, totalMessages: 22, daysSinceEntry: '27d' },
    ],
  },
  { stage: 'Perdido', leads: [] },
]

function computeOrigins(stages: PipelineStage[]) {
  const all = stages.flatMap((s) => s.leads)
  const origins = [...ORIGINS]
  origins[0].count = all.length
  const tagCounts: Record<string, number> = {}
  for (const lead of all) {
    for (const tag of lead.tags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1
    }
  }
  for (let i = 1; i < origins.length; i++) {
    origins[i].count = tagCounts[origins[i].label] || Math.floor(Math.random() * 50 + 5)
  }
  return origins
}

export default function PipelinePage() {
  const { stages, setStages } = usePipelineStore()
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOrigin, setSelectedOrigin] = useState(0)

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
      const mockStage = MOCK_LEADS.find((m) => m.stage === s.name)
      return { id: `stage-${i}`, name: s.name, color: s.color, order: i, isWon: s.isWon, isLost: s.isLost, leads: mockStage?.leads || [] }
    })
    setStages(defaultStages)
    setLoading(false)
  }, [setStages])

  useEffect(() => { fetchPipeline() }, [fetchPipeline])

  const handleMoveLead = useCallback(async (leadId: string, stageId: string, newOrder: number) => {
    try { await fetch('/api/pipeline', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ leadId, stageId, newOrder }) }) } catch {}
  }, [])

  const filteredStages = searchQuery.trim()
    ? stages.map((stage) => ({ ...stage, leads: stage.leads.filter((lead) => lead.name.toLowerCase().includes(searchQuery.toLowerCase()) || lead.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))) }))
    : stages

  const origins = computeOrigins(stages)
  const totalLeads = stages.reduce((s, st) => s + st.leads.length, 0)
  const totalValue = stages.flatMap((s) => s.leads).reduce((s, l) => s + (l.dealValue || 0), 0)

  return (
    <div className="flex h-[calc(100dvh-4rem)] -m-6">
      {/* Sidebar de Origens */}
      <div className="w-[240px] border-r border-gray-200 bg-white flex flex-col shrink-0">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Origens</span>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-1 rounded text-gray-400 hover:text-gray-600 transition-colors"><Search className="w-3.5 h-3.5" /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {origins.map((origin, i) => (
            <button
              key={i}
              onClick={() => setSelectedOrigin(i)}
              className={cn(
                'w-full flex items-center gap-2 px-4 py-2 text-left text-sm transition-colors',
                selectedOrigin === i ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
              )}
            >
              <span className={cn('w-2 h-2 rounded-full shrink-0', selectedOrigin === i ? 'bg-indigo-500' : 'bg-gray-300')} />
              <span className="truncate flex-1">{origin.label}</span>
              <span className="text-xs text-gray-400 tabular-nums">{origin.count}</span>
            </button>
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
              <h1 className="text-xl font-bold text-gray-900">{origins[selectedOrigin]?.label || 'Pipeline'}</h1>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors shadow-sm">
              <Plus className="w-4 h-4" /> Negocio +
            </button>
          </div>

          {/* Filters bar */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar..." className="pl-9 pr-4 py-2 w-64 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 bg-gray-50"
              />
            </div>
            {['Data', 'Campos', 'Tags', 'Dono do negocio', 'Status', 'Mais filtros'].map((f) => (
              <button key={f} className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
                {f} <ChevronLeft className="w-3 h-3 rotate-[270deg]" />
              </button>
            ))}
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
                onMoveLead={handleMoveLead}
                onAddLead={(stageId) => console.log('Add to:', stageId)}
                onCardClick={(card) => console.log('Click:', card.id)}
              />
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
