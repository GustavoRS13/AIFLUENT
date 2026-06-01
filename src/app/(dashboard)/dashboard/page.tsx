'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CalendarDays, Sparkles, TrendingUp, Bot, Flame, Target,
  ArrowRight, Phone, X,
} from 'lucide-react'
import { StatsGrid } from '@/components/dashboard/stats-grid'
import { RevenueChart } from '@/components/dashboard/revenue-chart'
import { LeadsBySource } from '@/components/dashboard/leads-by-source'
import { RecentLeads } from '@/components/dashboard/recent-leads'
import { ActiveCampaigns } from '@/components/dashboard/active-campaigns'
import { ActivityTimeline } from '@/components/dashboard/activity-timeline'
import { cn } from '@/lib/utils'
import type { DashboardStats } from '@/types'

const mockStats: DashboardStats = {
  totalLeads: 4892,
  newLeadsToday: 47,
  conversionRate: 18.4,
  activeDeals: 234,
  totalRevenue: 948500,
  campaignsSent: 156,
  responseRate: 72.3,
  avgResponseTime: 4,
}

const kpiBreakdowns: Record<string, { items: { label: string; value: string }[]; link: string }> = {
  'Forecast Mensal': {
    items: [
      { label: 'Negócios em Fechamento', value: 'R$ 68.400' },
      { label: 'Negócios em Negociação', value: 'R$ 42.300' },
      { label: 'Propostas Enviadas', value: 'R$ 24.500' },
      { label: 'Qualificações Ativas', value: 'R$ 10.000' },
    ],
    link: '/deals',
  },
  'ROI Meta Ads': {
    items: [
      { label: 'Campanha Business English', value: '5.1x' },
      { label: 'Campanha MBA Executivo', value: '4.8x' },
      { label: 'Campanha Vestibular 2026', value: '3.9x' },
      { label: 'Campanha Pós-Graduação', value: '3.2x' },
    ],
    link: '/campaigns',
  },
  'Leads Quentes': {
    items: [
      { label: 'Maria Silva (Score 92)', value: 'Administração' },
      { label: 'Lucas Almeida (Score 95)', value: 'Arquitetura' },
      { label: 'Fernanda Costa (Score 88)', value: 'Direito' },
      { label: 'Gabriela Nunes (Score 84)', value: 'Computação' },
    ],
    link: '/leads',
  },
  'Chamadas Hoje': {
    items: [
      { label: 'Maria Consultora', value: '8 chamadas' },
      { label: 'Carlos Vendedor', value: '7 chamadas' },
      { label: 'Pedro Closer', value: '6 chamadas' },
      { label: 'Ana Especialista', value: '7 chamadas' },
    ],
    link: '/team',
  },
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

function getFormattedDate(): string {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())
}

export default function DashboardPage() {
  const [stats] = useState<DashboardStats>(mockStats)
  const [kpiModal, setKpiModal] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row items-start justify-between gap-3"
      >
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">
              {getGreeting()}
            </h1>
            <Sparkles className="h-5 w-5 text-amber-400" />
          </div>
          <p className="mt-1 text-sm text-gray-400">
            Aqui esta o resumo da sua operacao.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-500">
          <CalendarDays className="h-4 w-4 text-gray-400" />
          <span className="capitalize">{getFormattedDate()}</span>
        </div>
      </motion.div>

      {/* AI Insight Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900 font-medium">Insight IA: 12 leads quentes precisam de contato hoje</p>
          <p className="text-xs text-gray-500 mt-0.5">A campanha &ldquo;Business English&rdquo; gerou 23% mais leads esta semana. Sugestao: aumentar budget em 20%.</p>
        </div>
        <button className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 text-xs font-medium rounded-lg transition-colors shrink-0">
          Ver detalhes <ArrowRight className="w-3 h-3" />
        </button>
      </motion.div>

      {/* Stats grid - 8 cards */}
      <StatsGrid stats={stats} />

      {/* Executive KPIs Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Forecast Mensal', value: 'R$145.200', subtext: 'Baseado no pipeline atual', icon: TrendingUp, color: 'from-emerald-500/10 to-cyan-500/10 border-emerald-500/20', iconColor: 'text-emerald-400' },
          { label: 'ROI Meta Ads', value: '4.2x', subtext: 'ROAS medio das campanhas', icon: Target, color: 'from-purple-500/10 to-pink-500/10 border-purple-500/20', iconColor: 'text-purple-400' },
          { label: 'Leads Quentes', value: '34', subtext: 'Score IA acima de 80', icon: Flame, color: 'from-rose-500/10 to-orange-500/10 border-rose-500/20', iconColor: 'text-rose-400' },
          { label: 'Chamadas Hoje', value: '28', subtext: '18 atendidas · 4.3 min media', icon: Phone, color: 'from-blue-500/10 to-indigo-500/10 border-blue-500/20', iconColor: 'text-blue-400' },
        ].map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.05 }}
            onClick={() => setKpiModal(kpi.label)}
            className={cn('bg-gradient-to-br border rounded-2xl p-4 cursor-pointer hover:scale-[1.02] transition-transform', kpi.color)}
          >
            <div className="flex items-center gap-2 mb-2">
              <kpi.icon className={cn('w-4 h-4', kpi.iconColor)} />
              <span className="text-xs text-gray-500">{kpi.label}</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{kpi.value}</p>
            <p className="text-[10px] text-gray-400 mt-1">{kpi.subtext}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <RevenueChart />
        </div>
        <div className="lg:col-span-2">
          <LeadsBySource />
        </div>
      </div>

      {/* Leads table + Campaigns */}
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <RecentLeads />
        </div>
        <div className="lg:col-span-2">
          <ActiveCampaigns />
        </div>
      </div>

      {/* Activity timeline */}
      <ActivityTimeline />

      {/* KPI Detail Modal */}
      <AnimatePresence>
        {kpiModal && kpiBreakdowns[kpiModal] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
            onClick={(e) => e.target === e.currentTarget && setKpiModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-2xl"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">{kpiModal}</h2>
                <button onClick={() => setKpiModal(null)} className="text-gray-500 hover:text-gray-900 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6">
                {/* Current Value */}
                <div className="text-center mb-6">
                  <p className="text-3xl font-bold text-gray-900">
                    {kpiModal === 'Forecast Mensal' && 'R$ 145.200'}
                    {kpiModal === 'ROI Meta Ads' && '4.2x'}
                    {kpiModal === 'Leads Quentes' && '34'}
                    {kpiModal === 'Chamadas Hoje' && '28'}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">Valor atual</p>
                </div>

                {/* Breakdown */}
                <div className="space-y-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Detalhamento</p>
                  {kpiBreakdowns[kpiModal].items.map((item) => (
                    <div key={item.label} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <span className="text-sm text-gray-700">{item.label}</span>
                      <span className="text-sm font-semibold text-gray-900">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-6 border-t border-gray-200">
                <a
                  href={kpiBreakdowns[kpiModal].link}
                  className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
                >
                  Ver todos <ArrowRight className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => setKpiModal(null)}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
