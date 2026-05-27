'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  CalendarDays, Sparkles, TrendingUp, Bot, Flame, Target,
  ArrowUpRight, ArrowRight, DollarSign, Users, Zap, Phone,
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

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-start justify-between"
      >
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-100">
              {getGreeting()}, Raphael
            </h1>
            <Sparkles className="h-5 w-5 text-amber-400" />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Aqui esta o resumo da sua operacao.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-slate-800/50 px-4 py-2 text-sm text-slate-400">
          <CalendarDays className="h-4 w-4 text-slate-500" />
          <span className="capitalize">{getFormattedDate()}</span>
        </div>
      </motion.div>

      {/* AI Insight Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-500/20 rounded-2xl p-4 flex items-center gap-4"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white font-medium">Insight IA: 12 leads quentes precisam de contato hoje</p>
          <p className="text-xs text-slate-400 mt-0.5">A campanha "Business English" gerou 23% mais leads esta semana. Sugestao: aumentar budget em 20%.</p>
        </div>
        <button className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 text-xs font-medium rounded-lg transition-colors shrink-0">
          Ver detalhes <ArrowRight className="w-3 h-3" />
        </button>
      </motion.div>

      {/* Stats grid - 8 cards */}
      <StatsGrid stats={stats} />

      {/* Executive KPIs Row */}
      <div className="grid grid-cols-4 gap-4">
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
            className={cn('bg-gradient-to-br border rounded-2xl p-4', kpi.color)}
          >
            <div className="flex items-center gap-2 mb-2">
              <kpi.icon className={cn('w-4 h-4', kpi.iconColor)} />
              <span className="text-xs text-slate-400">{kpi.label}</span>
            </div>
            <p className="text-xl font-bold text-white">{kpi.value}</p>
            <p className="text-[10px] text-slate-500 mt-1">{kpi.subtext}</p>
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
    </div>
  )
}
