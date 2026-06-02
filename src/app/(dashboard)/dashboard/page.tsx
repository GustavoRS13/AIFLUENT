'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CalendarDays, Sparkles, TrendingUp, Bot, Flame, Target,
  ArrowRight, Phone, X, Zap, ArrowRightLeft, Users,
} from 'lucide-react'
import Link from 'next/link'
import { StatsGrid } from '@/components/dashboard/stats-grid'
import { RevenueChart } from '@/components/dashboard/revenue-chart'
import { LeadsBySource } from '@/components/dashboard/leads-by-source'
import { RecentLeads } from '@/components/dashboard/recent-leads'
import { ActiveCampaigns } from '@/components/dashboard/active-campaigns'
import { ActivityTimeline } from '@/components/dashboard/activity-timeline'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { DashboardStats } from '@/types'

const emptyStats: DashboardStats = {
  totalLeads: 0,
  newLeadsToday: 0,
  conversionRate: 0,
  activeDeals: 0,
  totalRevenue: 0,
  campaignsSent: 0,
  responseRate: 0,
  avgResponseTime: 0,
}

interface ForecastData {
  forecast: { weighted: number; unweighted: number; bestCase: number; worstCase: number }
  pipeline: { totalDeals: number; byStage: Record<string, { count: number; value: number; weighted: number }> }
  realized: { revenue: number; deals: number }
}

interface FunnelStage {
  name: string
  color: string
  count: number
  isWon: boolean
  isLost: boolean
}

interface FunnelConversion {
  from: string
  to: string
  rate: number
}

interface FunnelData {
  stages: FunnelStage[]
  conversion: FunnelConversion[]
  lostReasons: Record<string, number>
}

// TODO: Connect KPI breakdowns to real APIs when backend is ready
const kpiBreakdowns: Record<string, { items: { label: string; value: string }[]; link: string }> = {}

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

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value)
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>(emptyStats)
  const [kpiModal, setKpiModal] = useState<string | null>(null)
  const [forecastData, setForecastData] = useState<ForecastData | null>(null)
  const [funnelData, setFunnelData] = useState<FunnelData | null>(null)
  const [automationLoading, setAutomationLoading] = useState<string | null>(null)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)

  useEffect(() => {
    fetch('/api/dashboard')
      .then((res) => res.json())
      .then((data) => {
        setStats(data)
        if (data.totalLeads === 0) setNeedsOnboarding(true)
      })
      .catch(() => setStats(emptyStats))

    fetch('/api/forecast')
      .then((res) => res.json())
      .then((data) => setForecastData(data))
      .catch(() => {})

    fetch('/api/reports/funnel')
      .then((res) => res.json())
      .then((data) => setFunnelData(data))
      .catch(() => {})
  }, [])

  const runAutomation = useCallback(async (endpoint: string, label: string) => {
    setAutomationLoading(endpoint)
    try {
      const res = await fetch(`/api/automation/${endpoint}`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        const msg = data.message
          || (data.created != null ? `${data.created} tarefa(s) de follow-up criada(s)` : null)
          || (data.distributed != null ? `${data.distributed} lead(s) distribuido(s)` : null)
          || (data.moved != null ? `${data.moved} lead(s) movido(s)` : null)
          || `${label} executado com sucesso`
        toast.success(msg)
      } else {
        toast.error(data.error || `Falha ao executar ${label}`)
      }
    } catch {
      toast.error(`Erro de conexao ao executar ${label}`)
    } finally {
      setAutomationLoading(null)
    }
  }, [])

  const maxFunnelCount = funnelData?.stages?.length
    ? Math.max(...funnelData.stages.map(s => s.count), 1)
    : 1

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

      {/* Onboarding Banner */}
      {needsOnboarding && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-purple-500/10 border border-sky-500/20 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/20 shrink-0">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900 font-medium">Complete o onboarding para comecar</p>
            <p className="text-xs text-gray-500 mt-0.5">Configure seu pipeline, importe leads e deixe o copiloto IA pronto em 2 minutos.</p>
          </div>
          <Link
            href="/onboarding"
            className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-500 hover:to-indigo-400 shrink-0"
          >
            Iniciar configuracao <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </motion.div>
      )}

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
          <p className="text-sm text-gray-900 font-medium">Insight IA: Nenhum insight disponivel</p>
          <p className="text-xs text-gray-500 mt-0.5">Adicione leads e campanhas para receber insights automaticos da IA.</p>
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
          {
            label: 'Forecast Mensal',
            value: forecastData ? formatCurrency(forecastData.forecast.weighted) : 'R$ 0',
            subtext: forecastData ? `Melhor cenario: ${formatCurrency(forecastData.forecast.bestCase)}` : 'Baseado no pipeline atual',
            icon: TrendingUp,
            color: 'from-emerald-500/10 to-cyan-500/10 border-emerald-500/20',
            iconColor: 'text-emerald-400',
          },
          {
            label: 'ROI Meta Ads',
            value: '0x',
            subtext: 'ROAS medio das campanhas',
            icon: Target,
            color: 'from-purple-500/10 to-pink-500/10 border-purple-500/20',
            iconColor: 'text-purple-400',
          },
          {
            label: 'Leads Quentes',
            value: '0',
            subtext: 'Score IA acima de 80',
            icon: Flame,
            color: 'from-rose-500/10 to-orange-500/10 border-rose-500/20',
            iconColor: 'text-rose-400',
          },
          {
            label: 'Chamadas Hoje',
            value: '0',
            subtext: 'Nenhuma chamada registrada',
            icon: Phone,
            color: 'from-blue-500/10 to-indigo-500/10 border-blue-500/20',
            iconColor: 'text-blue-400',
          },
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

      {/* Forecast + Funnel Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Forecast Summary */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white border border-gray-200 rounded-2xl p-6"
        >
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            Forecast Preditivo
          </h3>
          {forecastData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-wider text-emerald-600 font-medium">Receita Prevista</p>
                  <p className="text-lg font-bold text-emerald-700 mt-1">{formatCurrency(forecastData.forecast.weighted)}</p>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-wider text-blue-600 font-medium">Melhor Cenario</p>
                  <p className="text-lg font-bold text-blue-700 mt-1">{formatCurrency(forecastData.forecast.bestCase)}</p>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-wider text-amber-600 font-medium">Pior Cenario</p>
                  <p className="text-lg font-bold text-amber-700 mt-1">{formatCurrency(forecastData.forecast.worstCase)}</p>
                </div>
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-wider text-purple-600 font-medium">Ja Realizado</p>
                  <p className="text-lg font-bold text-purple-700 mt-1">{formatCurrency(forecastData.realized.revenue)}</p>
                  <p className="text-[10px] text-purple-500 mt-0.5">{forecastData.realized.deals} negocio(s) fechado(s)</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
                <span>{forecastData.pipeline.totalDeals} negocio(s) no pipeline</span>
                <span>Pipeline total: {formatCurrency(forecastData.forecast.unweighted)}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400">
              Carregando previsao...
            </div>
          )}
        </motion.div>

        {/* Mini Funnel Chart */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="bg-white border border-gray-200 rounded-2xl p-6"
        >
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-indigo-500" />
            Funil de Conversao
          </h3>
          {funnelData && funnelData.stages.length > 0 ? (
            <div className="space-y-3">
              {funnelData.stages.map((stage, i) => {
                const conversionEntry = funnelData.conversion[i]
                const barWidth = Math.max((stage.count / maxFunnelCount) * 100, 4)
                return (
                  <div key={stage.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-700 font-medium truncate max-w-[60%]">{stage.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-900 font-semibold">{stage.count}</span>
                        {conversionEntry && i > 0 && (
                          <span className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                            conversionEntry.rate >= 50
                              ? 'bg-emerald-50 text-emerald-600'
                              : conversionEntry.rate >= 25
                                ? 'bg-amber-50 text-amber-600'
                                : 'bg-red-50 text-red-600'
                          )}>
                            {conversionEntry.rate}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${barWidth}%`,
                          backgroundColor: stage.color || '#6366f1',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
              {Object.keys(funnelData.lostReasons).length > 0 && (
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium mb-2">Motivos de Perda</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(funnelData.lostReasons).slice(0, 4).map(([reason, count]) => (
                      <span key={reason} className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full">
                        {reason} ({count})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400">
              {funnelData ? 'Nenhum estagio no pipeline' : 'Carregando funil...'}
            </div>
          )}
        </motion.div>
      </div>

      {/* Automation Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Bot className="w-4 h-4 text-indigo-500" />
          Automacoes Rapidas
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={() => runAutomation('follow-up', 'Auto Follow-up')}
            disabled={automationLoading !== null}
            className="flex flex-col items-start gap-2 rounded-2xl border border-gray-200 bg-white p-4 text-left hover:border-indigo-300 hover:bg-indigo-50/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-semibold text-gray-900">
                {automationLoading === 'follow-up' ? 'Executando...' : 'Auto Follow-up'}
              </span>
            </div>
            <span className="text-xs text-gray-500">Criar tarefas para leads sem resposta</span>
          </button>
          <button
            onClick={() => runAutomation('stage', 'Auto Stage')}
            disabled={automationLoading !== null}
            className="flex flex-col items-start gap-2 rounded-2xl border border-gray-200 bg-white p-4 text-left hover:border-indigo-300 hover:bg-indigo-50/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-semibold text-gray-900">
                {automationLoading === 'stage' ? 'Executando...' : 'Auto Stage'}
              </span>
            </div>
            <span className="text-xs text-gray-500">Mover leads baseado em atividade</span>
          </button>
          <button
            onClick={() => runAutomation('distribute', 'Distribuir Leads')}
            disabled={automationLoading !== null}
            className="flex flex-col items-start gap-2 rounded-2xl border border-gray-200 bg-white p-4 text-left hover:border-indigo-300 hover:bg-indigo-50/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-semibold text-gray-900">
                {automationLoading === 'distribute' ? 'Executando...' : 'Distribuir Leads'}
              </span>
            </div>
            <span className="text-xs text-gray-500">Atribuir leads sem dono</span>
          </button>
        </div>
      </motion.div>

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
                    {kpiModal === 'Forecast Mensal' && (forecastData ? formatCurrency(forecastData.forecast.weighted) : 'R$ 0')}
                    {kpiModal === 'ROI Meta Ads' && '0x'}
                    {kpiModal === 'Leads Quentes' && '0'}
                    {kpiModal === 'Chamadas Hoje' && '0'}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">Valor atual</p>
                </div>

                {/* Breakdown */}
                <div className="space-y-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Detalhamento</p>
                  {kpiBreakdowns[kpiModal]?.items?.map((item) => (
                    <div key={item.label} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <span className="text-sm text-gray-700">{item.label}</span>
                      <span className="text-sm font-semibold text-gray-900">{item.value}</span>
                    </div>
                  )) || (
                    <p className="text-sm text-gray-400 text-center py-4">Nenhum dado encontrado</p>
                  )}
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
