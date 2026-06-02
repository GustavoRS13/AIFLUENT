'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, Users, TrendingUp, Target, Trophy, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ---------- Types ---------- */

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

interface TeamMember {
  id: string
  name: string
  role: string
  email: string
  totalLeads: number
  activeLeads: number
  wonDeals: number
  revenue: number
  activities: number
  tasksCompleted: number
  conversionRate: number
}

interface TeamData {
  team: TeamMember[]
  period: { start: string; end: string }
}

interface ForecastData {
  forecast: { weighted: number; unweighted: number; bestCase: number; worstCase: number }
  pipeline: { totalDeals: number; byStage: Record<string, { count: number; value: number; weighted: number }> }
  realized: { revenue: number; deals: number }
}

/* ---------- Helpers ---------- */

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value)
}

const tabs = [
  { id: 'funnel', label: 'Funil de Conversao', icon: Target },
  { id: 'team', label: 'Performance da Equipe', icon: Users },
  { id: 'forecast', label: 'Forecast', icon: TrendingUp },
  { id: 'trends', label: 'Tendencias', icon: BarChart3 },
] as const

type TabId = (typeof tabs)[number]['id']

/* ---------- Sub-components ---------- */

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Carregando dados...</p>
      </div>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <BarChart3 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-400">{message}</p>
      </div>
    </div>
  )
}

/* Funnel Tab */
function FunnelTab({ data }: { data: FunnelData | null; loading: boolean }) {
  if (!data) return <EmptyState message="Nenhum dado de funil disponivel." />

  const maxCount = Math.max(...data.stages.map(s => s.count), 1)
  const totalLostReasons = Object.values(data.lostReasons).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-6">
      {/* Funnel bars */}
      <div className="space-y-4">
        {data.stages.map((stage, i) => {
          const barWidth = Math.max((stage.count / maxCount) * 100, 6)
          const convEntry = data.conversion[i]
          return (
            <motion.div
              key={stage.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 truncate max-w-[50%]">{stage.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900">{stage.count} leads</span>
                  {convEntry && i > 0 && (
                    <span className={cn(
                      'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium',
                      convEntry.rate >= 50
                        ? 'bg-emerald-50 text-emerald-600'
                        : convEntry.rate >= 25
                          ? 'bg-amber-50 text-amber-600'
                          : 'bg-red-50 text-red-600'
                    )}>
                      <ArrowRight className="w-3 h-3" />
                      {convEntry.rate}%
                    </span>
                  )}
                </div>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-6 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${barWidth}%` }}
                  transition={{ duration: 0.6, delay: i * 0.08 + 0.2 }}
                  className="h-6 rounded-full flex items-center justify-end pr-2"
                  style={{ backgroundColor: stage.color || '#0ea5e9' }}
                >
                  {barWidth > 15 && (
                    <span className="text-[10px] font-bold text-white">{stage.count}</span>
                  )}
                </motion.div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Lost reasons pie chart placeholder */}
      {Object.keys(data.lostReasons).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white border border-gray-200 rounded-2xl p-6"
        >
          <h4 className="text-sm font-semibold text-gray-900 mb-4">Motivos de Perda</h4>
          <div className="space-y-3">
            {Object.entries(data.lostReasons).sort((a, b) => b[1] - a[1]).map(([reason, count], i) => {
              const pct = totalLostReasons > 0 ? Math.round((count / totalLostReasons) * 100) : 0
              return (
                <motion.div
                  key={reason}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.05 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: `hsl(${(i * 60) + 0}, 60%, 55%)` }} />
                  <span className="text-sm text-gray-700 flex-1 truncate">{reason}</span>
                  <span className="text-sm font-semibold text-gray-900">{count}</span>
                  <span className="text-xs text-gray-400 w-10 text-right">{pct}%</span>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      )}
    </div>
  )
}

/* Team Tab */
function TeamTab({ data }: { data: TeamData | null }) {
  if (!data || data.team.length === 0) return <EmptyState message="Nenhum membro da equipe encontrado." />

  const topPerformer = data.team[0]
  const maxRevenue = Math.max(...data.team.map(m => m.revenue), 1)

  return (
    <div className="space-y-6">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Vendedor</th>
              <th className="text-right py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Leads</th>
              <th className="text-right py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Conversoes</th>
              <th className="text-right py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Receita</th>
              <th className="text-right py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Taxa</th>
              <th className="text-right py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Atividades</th>
              <th className="text-right py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tarefas</th>
            </tr>
          </thead>
          <tbody>
            {data.team.map((member, i) => (
              <motion.tr
                key={member.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  'border-b border-gray-100 hover:bg-gray-50 transition-colors',
                  member.id === topPerformer?.id && member.revenue > 0 && 'bg-amber-50/50'
                )}
              >
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    {member.id === topPerformer?.id && member.revenue > 0 && (
                      <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{member.name}</p>
                      <p className="text-xs text-gray-400">{member.role}</p>
                    </div>
                  </div>
                </td>
                <td className="text-right py-3 px-3 text-gray-700">{member.totalLeads}</td>
                <td className="text-right py-3 px-3 text-gray-700">{member.wonDeals}</td>
                <td className="text-right py-3 px-3 font-semibold text-gray-900">{formatCurrency(member.revenue)}</td>
                <td className="text-right py-3 px-3">
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded-full font-medium',
                    member.conversionRate >= 30 ? 'bg-emerald-50 text-emerald-600' :
                    member.conversionRate >= 15 ? 'bg-amber-50 text-amber-600' :
                    'bg-gray-100 text-gray-500'
                  )}>
                    {member.conversionRate}%
                  </span>
                </td>
                <td className="text-right py-3 px-3 text-gray-700">{member.activities}</td>
                <td className="text-right py-3 px-3 text-gray-700">{member.tasksCompleted}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Revenue bar chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white border border-gray-200 rounded-2xl p-6"
      >
        <h4 className="text-sm font-semibold text-gray-900 mb-4">Receita por Membro</h4>
        <div className="space-y-3">
          {data.team.map((member, i) => {
            const barWidth = Math.max((member.revenue / maxRevenue) * 100, 2)
            return (
              <div key={member.id} className="flex items-center gap-3">
                <span className="text-xs text-gray-600 w-28 truncate shrink-0">{member.name}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${barWidth}%` }}
                    transition={{ duration: 0.5, delay: 0.4 + i * 0.05 }}
                    className="h-4 rounded-full bg-sky-500"
                  />
                </div>
                <span className="text-xs font-semibold text-gray-700 w-24 text-right shrink-0">{formatCurrency(member.revenue)}</span>
              </div>
            )
          })}
        </div>
      </motion.div>
    </div>
  )
}

/* Forecast Tab */
function ForecastTab({ data }: { data: ForecastData | null }) {
  if (!data) return <EmptyState message="Nenhum dado de forecast disponivel." />

  const stages = Object.entries(data.pipeline.byStage)
  const totalPipelineValue = stages.reduce((sum, [, s]) => sum + s.value, 0) || 1

  return (
    <div className="space-y-6">
      {/* 4 metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Receita Prevista', value: formatCurrency(data.forecast.weighted), color: 'bg-emerald-50 border-emerald-200 text-emerald-700', labelColor: 'text-emerald-600' },
          { label: 'Melhor Cenario', value: formatCurrency(data.forecast.bestCase), color: 'bg-blue-50 border-blue-200 text-blue-700', labelColor: 'text-blue-600' },
          { label: 'Pior Cenario', value: formatCurrency(data.forecast.worstCase), color: 'bg-amber-50 border-amber-200 text-amber-700', labelColor: 'text-amber-600' },
          { label: 'Receita Realizada', value: formatCurrency(data.realized.revenue), color: 'bg-purple-50 border-purple-200 text-purple-700', labelColor: 'text-purple-600' },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={cn('rounded-2xl border p-5', card.color)}
          >
            <p className={cn('text-[10px] uppercase tracking-wider font-semibold mb-2', card.labelColor)}>{card.label}</p>
            <p className="text-2xl font-bold">{card.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Pipeline breakdown by stage */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white border border-gray-200 rounded-2xl p-6"
      >
        <h4 className="text-sm font-semibold text-gray-900 mb-4">Pipeline por Estagio</h4>

        {stages.length > 0 ? (
          <>
            {/* Stacked bar */}
            <div className="w-full h-8 rounded-full overflow-hidden flex bg-gray-100 mb-4">
              {stages.map(([name, stage], i) => {
                const pct = (stage.value / totalPipelineValue) * 100
                const colors = ['#0ea5e9', '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#64748b']
                return (
                  <motion.div
                    key={name}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, delay: 0.5 + i * 0.05 }}
                    className="h-8 flex items-center justify-center"
                    style={{ backgroundColor: colors[i % colors.length], minWidth: pct > 0 ? '2px' : 0 }}
                    title={`${name}: ${formatCurrency(stage.value)}`}
                  >
                    {pct > 10 && (
                      <span className="text-[10px] font-bold text-white truncate px-1">{Math.round(pct)}%</span>
                    )}
                  </motion.div>
                )
              })}
            </div>

            {/* Stage details */}
            <div className="space-y-2">
              {stages.map(([name, stage], i) => {
                const colors = ['#0ea5e9', '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#64748b']
                return (
                  <div key={name} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
                      <span className="text-sm text-gray-700">{name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-gray-400">{stage.count} negocio(s)</span>
                      <span className="text-sm font-semibold text-gray-900">{formatCurrency(stage.value)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-400 text-center py-8">Nenhum negocio no pipeline.</p>
        )}

        <div className="flex items-center justify-between text-xs text-gray-400 pt-4 mt-4 border-t border-gray-100">
          <span>{data.pipeline.totalDeals} negocio(s) no total</span>
          <span>Pipeline total: {formatCurrency(data.forecast.unweighted)}</span>
        </div>
      </motion.div>
    </div>
  )
}

/* Trends Tab */
function TrendsTab() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-gray-200 rounded-2xl p-8"
    >
      <div className="flex flex-col items-center justify-center text-center py-12">
        <div className="w-16 h-16 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center mb-4">
          <BarChart3 className="w-8 h-8 text-sky-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Tendencias</h3>
        <p className="text-sm text-gray-500 max-w-md mb-6">
          Dados de tendencia estarao disponiveis apos 30 dias de uso.
        </p>
        {/* Placeholder line chart */}
        <div className="w-full max-w-lg">
          <div className="flex items-end gap-1 h-32 border-b border-l border-gray-200 px-2 pt-2">
            {[20, 35, 28, 45, 52, 40, 65, 58, 72, 68, 80, 75].map((h, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="flex-1 bg-sky-100 rounded-t"
              />
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-gray-300 px-2">
            <span>Jan</span>
            <span>Fev</span>
            <span>Mar</span>
            <span>Abr</span>
            <span>Mai</span>
            <span>Jun</span>
            <span>Jul</span>
            <span>Ago</span>
            <span>Set</span>
            <span>Out</span>
            <span>Nov</span>
            <span>Dez</span>
          </div>
        </div>
        <p className="text-xs text-gray-300 mt-4">Formato esperado: leads, receita e conversao por mes</p>
      </div>
    </motion.div>
  )
}

/* ---------- Main Page ---------- */

export default function RelatoriosPage() {
  const [activeTab, setActiveTab] = useState<TabId>('funnel')
  const [funnelData, setFunnelData] = useState<FunnelData | null>(null)
  const [teamData, setTeamData] = useState<TeamData | null>(null)
  const [forecastData, setForecastData] = useState<ForecastData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/reports/funnel').then(r => r.json()).catch(() => null),
      fetch('/api/reports/team').then(r => r.json()).catch(() => null),
      fetch('/api/forecast').then(r => r.json()).catch(() => null),
    ]).then(([funnel, team, forecast]) => {
      setFunnelData(funnel)
      setTeamData(team)
      setForecastData(forecast)
    }).finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl font-bold text-gray-900">Relatorios</h1>
        <p className="mt-1 text-sm text-gray-400">Acompanhe metricas de funil, equipe e previsao de receita.</p>
      </motion.div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Tabs">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap',
                  isActive
                    ? 'text-sky-600'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {isActive && (
                  <motion.div
                    layoutId="relatorios-tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-500 rounded-full"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        {loading ? (
          <LoadingState />
        ) : (
          <>
            {activeTab === 'funnel' && <FunnelTab data={funnelData} loading={loading} />}
            {activeTab === 'team' && <TeamTab data={teamData} />}
            {activeTab === 'forecast' && <ForecastTab data={forecastData} />}
            {activeTab === 'trends' && <TrendsTab />}
          </>
        )}
      </motion.div>
    </div>
  )
}
