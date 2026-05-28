'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Handshake,
  DollarSign,
  TrendingUp,
  Trophy,
  LayoutList,
  Columns3,
  Filter,
  Plus,
  MoreHorizontal,
  Calendar,
  Building2,
  User,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency, formatDate } from '@/lib/utils'

// ── Types ───────────────────────────────────────────────────────────────────

type DealStage = 'prospeccao' | 'qualificacao' | 'proposta' | 'negociacao' | 'fechamento' | 'ganho' | 'perdido'

type Deal = {
  id: string
  title: string
  value: number
  company: string
  leadName: string
  stage: DealStage
  probability: number
  expectedClose: string
  assignedTo: string
  createdAt: string
}

// ── Config ──────────────────────────────────────────────────────────────────

const stageConfig: Record<DealStage, { label: string; color: string; bg: string }> = {
  prospeccao: { label: 'Prospecção', color: 'text-gray-500', bg: 'bg-gray-100 border-gray-300' },
  qualificacao: { label: 'Qualificação', color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20' },
  proposta: { label: 'Proposta', color: 'text-violet-400', bg: 'bg-violet-400/10 border-violet-400/20' },
  negociacao: { label: 'Negociação', color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/20' },
  fechamento: { label: 'Fechamento', color: 'text-cyan-400', bg: 'bg-cyan-400/10 border-cyan-400/20' },
  ganho: { label: 'Ganho', color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20' },
  perdido: { label: 'Perdido', color: 'text-rose-400', bg: 'bg-rose-400/10 border-rose-400/20' },
}

const pipelineStages: DealStage[] = ['prospeccao', 'qualificacao', 'proposta', 'negociacao', 'fechamento']

// ── Mock data ───────────────────────────────────────────────────────────────

const mockDeals: Deal[] = [
  { id: 'd1', title: 'MBA Executivo - Turma 2026', value: 89000, company: 'Tech Solutions Ltda', leadName: 'Carlos Eduardo', stage: 'negociacao', probability: 75, expectedClose: '2026-06-15', assignedTo: 'Maria Consultora', createdAt: '2026-04-10' },
  { id: 'd2', title: 'Pós-graduação em Data Science', value: 45000, company: 'Inovare Digital', leadName: 'Ana Paula', stage: 'proposta', probability: 50, expectedClose: '2026-06-20', assignedTo: 'Carlos Vendedor', createdAt: '2026-04-22' },
  { id: 'd3', title: 'Curso Intensivo de Inglês', value: 12000, company: 'Startup Brasil', leadName: 'Pedro Henrique', stage: 'qualificacao', probability: 30, expectedClose: '2026-07-01', assignedTo: 'Ana Especialista', createdAt: '2026-05-01' },
  { id: 'd4', title: 'Graduação em Administração', value: 156000, company: 'Grupo Empresarial XYZ', leadName: 'Fernanda Costa', stage: 'fechamento', probability: 90, expectedClose: '2026-06-05', assignedTo: 'Pedro Closer', createdAt: '2026-03-15' },
  { id: 'd5', title: 'Certificação PMP', value: 8500, company: 'Consultoria ABC', leadName: 'Roberto Lima', stage: 'ganho', probability: 100, expectedClose: '2026-05-20', assignedTo: 'Maria Consultora', createdAt: '2026-04-01' },
  { id: 'd6', title: 'Extensão em Marketing Digital', value: 18000, company: 'Agência Criativa', leadName: 'Juliana Martins', stage: 'prospeccao', probability: 15, expectedClose: '2026-07-15', assignedTo: 'Carlos Vendedor', createdAt: '2026-05-15' },
  { id: 'd7', title: 'MBA em Finanças', value: 95000, company: 'Banco Nacional S.A.', leadName: 'Ricardo Alves', stage: 'negociacao', probability: 65, expectedClose: '2026-06-30', assignedTo: 'Pedro Closer', createdAt: '2026-04-05' },
  { id: 'd8', title: 'Curso de Espanhol Corporativo', value: 24000, company: 'Importadora Latina', leadName: 'Mariana Souza', stage: 'ganho', probability: 100, expectedClose: '2026-05-10', assignedTo: 'Ana Especialista', createdAt: '2026-03-20' },
  { id: 'd9', title: 'Pós em Gestão de Projetos', value: 35000, company: 'Engenharia Total', leadName: 'Lucas Ferreira', stage: 'proposta', probability: 45, expectedClose: '2026-07-10', assignedTo: 'Maria Consultora', createdAt: '2026-05-05' },
  { id: 'd10', title: 'Graduação em TI', value: 120000, company: 'LogTech Soluções', leadName: 'Beatriz Oliveira', stage: 'perdido', probability: 0, expectedClose: '2026-05-25', assignedTo: 'Carlos Vendedor', createdAt: '2026-02-10' },
  { id: 'd11', title: 'Curso de Liderança', value: 15000, company: 'Varejo Express', leadName: 'Diego Santos', stage: 'qualificacao', probability: 25, expectedClose: '2026-07-20', assignedTo: 'Pedro Closer', createdAt: '2026-05-18' },
  { id: 'd12', title: 'MBA em Tecnologia', value: 78000, company: 'CloudNet Brasil', leadName: 'Camila Rocha', stage: 'prospeccao', probability: 10, expectedClose: '2026-08-01', assignedTo: 'Ana Especialista', createdAt: '2026-05-22' },
]

// ── Component ───────────────────────────────────────────────────────────────

export default function DealsPage() {
  const [viewMode, setViewMode] = useState<'table' | 'pipeline'>('table')
  const [stageFilter, setStageFilter] = useState<'all' | 'open' | 'ganho' | 'perdido'>('all')
  const [showNewDeal, setShowNewDeal] = useState(false)

  const filtered = useMemo(() => {
    if (stageFilter === 'all') return mockDeals
    if (stageFilter === 'open') return mockDeals.filter((d) => d.stage !== 'ganho' && d.stage !== 'perdido')
    return mockDeals.filter((d) => d.stage === stageFilter)
  }, [stageFilter])

  const stats = useMemo(() => {
    const openDeals = mockDeals.filter((d) => d.stage !== 'ganho' && d.stage !== 'perdido')
    const wonDeals = mockDeals.filter((d) => d.stage === 'ganho')
    const totalValue = openDeals.reduce((s, d) => s + d.value, 0)
    const avgSize = openDeals.length > 0 ? totalValue / openDeals.length : 0
    const winRate = mockDeals.length > 0 ? (wonDeals.length / mockDeals.length) * 100 : 0
    return {
      totalDeals: openDeals.length,
      totalValue,
      avgSize,
      winRate,
    }
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Negócios</h1>
          <p className="text-sm text-gray-400 mt-1">
            Gerencie suas negociações e acompanhe o pipeline de vendas
          </p>
        </div>
        <button
          onClick={() => setShowNewDeal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Negócio
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Handshake, title: 'Negócios Abertos', value: stats.totalDeals, change: 8.5 },
          { icon: DollarSign, title: 'Valor Total', value: formatCurrency(stats.totalValue), change: 15.2 },
          { icon: TrendingUp, title: 'Ticket Médio', value: formatCurrency(stats.avgSize), change: 4.8 },
          { icon: Trophy, title: 'Taxa de Ganho', value: `${stats.winRate.toFixed(1)}%`, change: 2.1 },
        ].map((stat, i) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white border border-gray-200 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-indigo-500/10 rounded-lg">
                <stat.icon className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="flex items-center gap-1 text-sm text-emerald-400">
                <ArrowUpRight className="w-3 h-3" />
                {stat.change}%
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{typeof stat.value === 'number' ? stat.value : stat.value}</p>
            <p className="text-sm text-gray-500 mt-1">{stat.title}</p>
          </motion.div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          {(
            [
              { key: 'all', label: 'Todos' },
              { key: 'open', label: 'Abertos' },
              { key: 'ganho', label: 'Ganhos' },
              { key: 'perdido', label: 'Perdidos' },
            ] as const
          ).map((f) => (
            <button
              key={f.key}
              onClick={() => setStageFilter(f.key)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                stageFilter === f.key
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-0.5">
          <button
            onClick={() => setViewMode('table')}
            className={cn(
              'p-1.5 rounded-md transition-colors',
              viewMode === 'table' ? 'bg-gray-200 text-gray-900' : 'text-gray-400 hover:text-gray-700'
            )}
            title="Lista"
          >
            <LayoutList className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('pipeline')}
            className={cn(
              'p-1.5 rounded-md transition-colors',
              viewMode === 'pipeline' ? 'bg-gray-200 text-gray-900' : 'text-gray-400 hover:text-gray-700'
            )}
            title="Pipeline"
          >
            <Columns3 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {viewMode === 'table' ? (
          <motion.div
            key="table"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <DealsTable deals={filtered} />
          </motion.div>
        ) : (
          <motion.div
            key="pipeline"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <DealsPipeline deals={filtered} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Deal Modal */}
      <AnimatePresence>
        {showNewDeal && <NewDealModal onClose={() => setShowNewDeal(false)} />}
      </AnimatePresence>
    </div>
  )
}

// ── Table View ──────────────────────────────────────────────────────────────

function DealsTable({ deals }: { deals: Deal[] }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              {['Negócio', 'Valor', 'Empresa', 'Estágio', 'Probabilidade', 'Previsão', 'Responsável'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {deals.map((deal, i) => (
              <motion.tr
                key={deal.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer group"
              >
                <td className="px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{deal.title}</p>
                    <p className="text-xs text-gray-400">{deal.leadName}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm font-semibold text-emerald-400">
                    {formatCurrency(deal.value)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-sm text-gray-700">{deal.company}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={cn(
                    'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border',
                    stageConfig[deal.stage].bg,
                    stageConfig[deal.stage].color
                  )}>
                    {stageConfig[deal.stage].label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          deal.probability >= 75 ? 'bg-emerald-500' :
                          deal.probability >= 50 ? 'bg-amber-500' :
                          deal.probability >= 25 ? 'bg-blue-500' : 'bg-gray-400'
                        )}
                        style={{ width: `${deal.probability}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">{deal.probability}%</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-sm text-gray-500">{formatDate(deal.expectedClose)}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-gray-900">
                        {deal.assignedTo.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 hidden lg:block">{deal.assignedTo.split(' ')[0]}</span>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {deals.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Handshake className="w-10 h-10 text-gray-400 mb-3" />
          <p className="text-sm text-gray-400">Nenhum negócio encontrado</p>
        </div>
      )}
    </div>
  )
}

// ── Pipeline View ───────────────────────────────────────────────────────────

function DealsPipeline({ deals }: { deals: Deal[] }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {pipelineStages.map((stage) => {
        const stageDeals = deals.filter((d) => d.stage === stage)
        const stageTotal = stageDeals.reduce((s, d) => s + d.value, 0)

        return (
          <div key={stage} className="min-w-[280px] flex-1">
            {/* Column header */}
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={cn('text-sm font-medium', stageConfig[stage].color)}>
                  {stageConfig[stage].label}
                </span>
                <span className="text-xs text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-full">
                  {stageDeals.length}
                </span>
              </div>
              <span className="text-xs text-gray-400">
                {formatCurrency(stageTotal)}
              </span>
            </div>

            {/* Column cards */}
            <div className="space-y-2">
              {stageDeals.map((deal, i) => (
                <motion.div
                  key={deal.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white border border-gray-200 rounded-xl p-4 hover:bg-gray-50 hover:border-gray-200 transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-900 leading-tight line-clamp-2">
                      {deal.title}
                    </h4>
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                      <MoreHorizontal className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>

                  <p className="text-lg font-bold text-emerald-400 mb-3">
                    {formatCurrency(deal.value)}
                  </p>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Building2 className="w-3 h-3 shrink-0" />
                      <span className="truncate">{deal.company}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <User className="w-3 h-3 shrink-0" />
                      <span className="truncate">{deal.leadName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Calendar className="w-3 h-3 shrink-0" />
                      <span>{formatDate(deal.expectedClose)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                        <span className="text-[8px] font-bold text-gray-900">
                          {deal.assignedTo.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">{deal.assignedTo.split(' ')[0]}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-10 h-1 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full',
                            deal.probability >= 75 ? 'bg-emerald-500' :
                            deal.probability >= 50 ? 'bg-amber-500' :
                            deal.probability >= 25 ? 'bg-blue-500' : 'bg-gray-400'
                          )}
                          style={{ width: `${deal.probability}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-400">{deal.probability}%</span>
                    </div>
                  </div>
                </motion.div>
              ))}

              {stageDeals.length === 0 && (
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
                  <p className="text-xs text-gray-400">Nenhum negócio</p>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── New Deal Modal ──────────────────────────────────────────────────────────

function NewDealModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-lg bg-white border border-gray-200 rounded-2xl shadow-2xl"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Novo Negócio</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-500 mb-2">Título do Negócio</label>
            <input
              placeholder="Ex: MBA Executivo - Empresa X"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none transition-colors"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-500 mb-2">Valor (R$)</label>
              <input
                type="number"
                placeholder="0,00"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-2">Probabilidade (%)</label>
              <input
                type="number"
                placeholder="50"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-2">Empresa</label>
            <input
              placeholder="Nome da empresa"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-2">Lead</label>
            <input
              placeholder="Nome do contato"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none transition-colors"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-500 mb-2">Estágio</label>
              <select className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:border-indigo-500 focus:outline-none transition-colors">
                {Object.entries(stageConfig).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-2">Previsão de Fechamento</label>
              <input
                type="date"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:border-indigo-500 focus:outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors"
          >
            Criar Negócio
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
