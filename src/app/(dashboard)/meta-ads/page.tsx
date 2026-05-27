'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Target, TrendingUp, TrendingDown, DollarSign, Eye, MousePointer, Users,
  BarChart3, Plus, Filter, RefreshCw, ExternalLink, Pause, Play,
  MessagesSquare, Camera, Sparkles, ArrowUpRight, ArrowDownRight,
  Layers, Megaphone, Zap, Calendar, Globe,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type TabType = 'campaigns' | 'leads' | 'audiences' | 'insights'

interface AdCampaign {
  id: string
  name: string
  platform: 'facebook' | 'instagram' | 'both'
  objective: string
  status: 'active' | 'paused' | 'draft' | 'completed'
  budget: number
  budgetType: 'daily' | 'lifetime'
  spend: number
  impressions: number
  clicks: number
  leads: number
  conversions: number
  cpc: number
  cpl: number
  ctr: number
  roas: number
}

const mockCampaigns: AdCampaign[] = [
  { id: '1', name: 'Business English - Lead Gen', platform: 'both', objective: 'Lead Generation', status: 'active', budget: 150, budgetType: 'daily', spend: 3247, impressions: 145000, clicks: 4350, leads: 187, conversions: 34, cpc: 0.75, cpl: 17.36, ctr: 3.0, roas: 4.2 },
  { id: '2', name: 'Espanhol Intensivo - Awareness', platform: 'instagram', objective: 'Awareness', status: 'active', budget: 80, budgetType: 'daily', spend: 1890, impressions: 230000, clicks: 6900, leads: 92, conversions: 18, cpc: 0.27, cpl: 20.54, ctr: 3.0, roas: 3.1 },
  { id: '3', name: 'Remarketing - Visitantes Site', platform: 'facebook', objective: 'Conversions', status: 'active', budget: 50, budgetType: 'daily', spend: 1120, impressions: 45000, clicks: 2250, leads: 56, conversions: 23, cpc: 0.50, cpl: 20.0, ctr: 5.0, roas: 6.8 },
  { id: '4', name: 'Francês para Negócios', platform: 'instagram', objective: 'Lead Generation', status: 'paused', budget: 100, budgetType: 'daily', spend: 2150, impressions: 98000, clicks: 2940, leads: 78, conversions: 12, cpc: 0.73, cpl: 27.56, ctr: 3.0, roas: 2.4 },
  { id: '5', name: 'Campanha Corporativo B2B', platform: 'facebook', objective: 'Lead Generation', status: 'active', budget: 5000, budgetType: 'lifetime', spend: 3800, impressions: 67000, clicks: 3350, leads: 145, conversions: 28, cpc: 1.13, cpl: 26.21, ctr: 5.0, roas: 3.8 },
  { id: '6', name: 'Kids & Teens - Matriculas', platform: 'both', objective: 'Traffic', status: 'draft', budget: 120, budgetType: 'daily', spend: 0, impressions: 0, clicks: 0, leads: 0, conversions: 0, cpc: 0, cpl: 0, ctr: 0, roas: 0 },
]

const statusConfig = {
  active: { label: 'Ativo', color: 'text-emerald-400 bg-emerald-500/10' },
  paused: { label: 'Pausado', color: 'text-amber-400 bg-amber-500/10' },
  draft: { label: 'Rascunho', color: 'text-slate-400 bg-slate-500/10' },
  completed: { label: 'Concluido', color: 'text-blue-400 bg-blue-500/10' },
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function formatNumber(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
  return value.toString()
}

export default function MetaAdsPage() {
  const [tab, setTab] = useState<TabType>('campaigns')

  const totals = {
    spend: mockCampaigns.reduce((s, c) => s + c.spend, 0),
    impressions: mockCampaigns.reduce((s, c) => s + c.impressions, 0),
    clicks: mockCampaigns.reduce((s, c) => s + c.clicks, 0),
    leads: mockCampaigns.reduce((s, c) => s + c.leads, 0),
    conversions: mockCampaigns.reduce((s, c) => s + c.conversions, 0),
  }
  const avgCPL = totals.leads > 0 ? totals.spend / totals.leads : 0
  const avgCTR = totals.impressions > 0 ? (totals.clicks / totals.impressions * 100) : 0
  const avgROAS = 4.1

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Meta Ads</h1>
          <p className="text-slate-400 mt-1">Gerencie campanhas Facebook e Instagram Ads</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-slate-800/50 border border-white/5 rounded-xl text-sm text-slate-300 hover:text-white transition-colors">
            <RefreshCw className="w-4 h-4" />
            Sincronizar
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" />
            Nova Campanha
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-6 gap-4">
        {[
          { label: 'Investimento', value: formatCurrency(totals.spend), icon: DollarSign, change: '+12%', positive: false, color: 'text-indigo-400' },
          { label: 'Impressoes', value: formatNumber(totals.impressions), icon: Eye, change: '+28%', positive: true, color: 'text-blue-400' },
          { label: 'Cliques', value: formatNumber(totals.clicks), icon: MousePointer, change: '+15%', positive: true, color: 'text-cyan-400' },
          { label: 'Leads', value: totals.leads.toString(), icon: Users, change: '+22%', positive: true, color: 'text-emerald-400' },
          { label: 'CPL Medio', value: formatCurrency(avgCPL), icon: Target, change: '-8%', positive: true, color: 'text-amber-400' },
          { label: 'ROAS', value: `${avgROAS}x`, icon: TrendingUp, change: '+0.3x', positive: true, color: 'text-purple-400' },
        ].map((kpi) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-800/30 backdrop-blur border border-white/5 rounded-2xl p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <kpi.icon className={cn('w-5 h-5', kpi.color)} />
              <span className={cn('text-xs font-medium flex items-center gap-0.5', kpi.positive ? 'text-emerald-400' : 'text-rose-400')}>
                {kpi.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {kpi.change}
              </span>
            </div>
            <p className="text-xl font-bold text-white">{kpi.value}</p>
            <p className="text-xs text-slate-500 mt-1">{kpi.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        {[
          { key: 'campaigns' as const, label: 'Campanhas', icon: Megaphone },
          { key: 'leads' as const, label: 'Leads Captados', icon: Users },
          { key: 'audiences' as const, label: 'Audiencias', icon: Layers },
          { key: 'insights' as const, label: 'Insights IA', icon: Sparkles },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors',
              tab === t.key
                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
            )}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Campaigns Tab */}
      {tab === 'campaigns' && (
        <div className="space-y-3">
          {mockCampaigns.map((campaign, i) => (
            <motion.div
              key={campaign.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-slate-800/30 backdrop-blur border border-white/5 rounded-2xl p-5 hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                {/* Platform Icon */}
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                  campaign.platform === 'facebook' ? 'bg-blue-500/10' : campaign.platform === 'instagram' ? 'bg-pink-500/10' : 'bg-indigo-500/10'
                )}>
                  {campaign.platform === 'facebook' ? <MessagesSquare className="w-5 h-5 text-blue-400" /> :
                   campaign.platform === 'instagram' ? <Camera className="w-5 h-5 text-pink-400" /> :
                   <Globe className="w-5 h-5 text-indigo-400" />}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-white truncate">{campaign.name}</h3>
                    <span className={cn('text-[10px] px-2 py-0.5 rounded font-medium', statusConfig[campaign.status].color)}>
                      {statusConfig[campaign.status].label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {campaign.objective} · {campaign.budgetType === 'daily' ? `${formatCurrency(campaign.budget)}/dia` : formatCurrency(campaign.budget)}
                  </p>
                </div>

                {/* Metrics */}
                <div className="flex items-center gap-6 shrink-0">
                  <div className="text-center">
                    <p className="text-sm font-bold text-white">{formatCurrency(campaign.spend)}</p>
                    <p className="text-[10px] text-slate-500">Gasto</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-white">{formatNumber(campaign.impressions)}</p>
                    <p className="text-[10px] text-slate-500">Impressoes</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-white">{campaign.leads}</p>
                    <p className="text-[10px] text-slate-500">Leads</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-emerald-400">{formatCurrency(campaign.cpl)}</p>
                    <p className="text-[10px] text-slate-500">CPL</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-purple-400">{campaign.roas > 0 ? `${campaign.roas}x` : '-'}</p>
                    <p className="text-[10px] text-slate-500">ROAS</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {campaign.status === 'active' ? (
                    <button className="p-2 rounded-lg text-amber-400 hover:bg-amber-500/10 transition-colors">
                      <Pause className="w-4 h-4" />
                    </button>
                  ) : campaign.status === 'paused' ? (
                    <button className="p-2 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors">
                      <Play className="w-4 h-4" />
                    </button>
                  ) : null}
                  <button className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors">
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Leads Tab */}
      {tab === 'leads' && (
        <div className="space-y-4">
          <div className="bg-slate-800/30 backdrop-blur border border-white/5 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Leads Captados via Meta Ads</h3>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <Zap className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-emerald-400 font-medium">Sincronizacao automatica ativa</span>
              </div>
              <span className="text-xs text-slate-500">Ultimo sync: 5 min atras</span>
            </div>

            <div className="space-y-2">
              {[
                { name: 'Marcela Souza', campaign: 'Business English - Lead Gen', source: 'Facebook Lead Ad', time: '10 min', temp: 'hot' },
                { name: 'Bruno Almeida', campaign: 'Espanhol Intensivo', source: 'Instagram Story', time: '25 min', temp: 'warm' },
                { name: 'Carla Santos', campaign: 'Remarketing - Visitantes', source: 'Facebook Feed', time: '1h', temp: 'hot' },
                { name: 'Diego Costa', campaign: 'Business English - Lead Gen', source: 'Instagram Feed', time: '2h', temp: 'warm' },
                { name: 'Elena Ferreira', campaign: 'Campanha Corporativo B2B', source: 'Facebook Lead Ad', time: '3h', temp: 'cold' },
                { name: 'Felipe Martins', campaign: 'Business English - Lead Gen', source: 'Instagram Reels', time: '5h', temp: 'warm' },
              ].map((lead, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-slate-800/20 hover:bg-slate-800/40 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-white">{lead.name.split(' ').map((n) => n[0]).join('')}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{lead.name}</p>
                    <p className="text-xs text-slate-500">{lead.campaign}</p>
                  </div>
                  <span className="text-xs text-slate-500">{lead.source}</span>
                  <span className={cn(
                    'text-[10px] px-2 py-0.5 rounded font-medium',
                    lead.temp === 'hot' ? 'text-rose-400 bg-rose-500/10' : lead.temp === 'warm' ? 'text-amber-400 bg-amber-500/10' : 'text-blue-400 bg-blue-500/10'
                  )}>
                    {lead.temp === 'hot' ? 'Quente' : lead.temp === 'warm' ? 'Morno' : 'Frio'}
                  </span>
                  <span className="text-xs text-slate-500">{lead.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Audiences Tab */}
      {tab === 'audiences' && (
        <div className="grid grid-cols-2 gap-4">
          {[
            { name: 'Lookalike - Alunos Ativos', type: 'Lookalike', size: '2.3M', platform: 'facebook' },
            { name: 'Visitantes Site - 30 dias', type: 'Retargeting', size: '45K', platform: 'both' },
            { name: 'Engajamento Instagram', type: 'Custom', size: '120K', platform: 'instagram' },
            { name: 'Interesse: Idiomas', type: 'Interest', size: '8.5M', platform: 'both' },
            { name: 'Leads Nao Convertidos', type: 'Retargeting', size: '12K', platform: 'facebook' },
            { name: 'Lookalike - Clientes Premium', type: 'Lookalike', size: '1.8M', platform: 'both' },
          ].map((audience, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-slate-800/30 backdrop-blur border border-white/5 rounded-2xl p-5 hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                  <Layers className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">{audience.name}</h3>
                  <p className="text-xs text-slate-500">{audience.type} · {audience.size} pessoas</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {(audience.platform === 'facebook' || audience.platform === 'both') && (
                  <span className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">Facebook</span>
                )}
                {(audience.platform === 'instagram' || audience.platform === 'both') && (
                  <span className="text-[10px] text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded">Instagram</span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Insights Tab */}
      {tab === 'insights' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h3 className="text-lg font-semibold text-white">Insights Inteligentes</h3>
            </div>

            {[
              { title: 'Otimizar Budget', desc: 'A campanha "Remarketing" tem ROAS 6.8x — 62% acima da media. Considere aumentar o orcamento diario de R$50 para R$100.', type: 'opportunity' },
              { title: 'Pausar Campanha', desc: 'A campanha "Frances para Negocios" tem CPL de R$27.56, 35% acima da media. Recomendado otimizar criativos ou pausar.', type: 'warning' },
              { title: 'Melhor Horario', desc: 'Anuncios publicados entre 18h-21h geram 40% mais leads no Instagram. Ajuste a programacao de entrega.', type: 'insight' },
              { title: 'Audiencia Saturada', desc: 'A audiencia "Interesse: Idiomas" mostra sinais de fadiga (frequencia 4.2). Crie uma Lookalike a partir dos melhores leads.', type: 'warning' },
              { title: 'Criativo Top', desc: 'Videos curtos (15s) no formato Reels geram 3x mais leads que imagens estaticas. Priorize esse formato.', type: 'insight' },
            ].map((insight, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className={cn(
                  'p-4 rounded-xl border',
                  insight.type === 'opportunity' ? 'bg-emerald-500/5 border-emerald-500/20' :
                  insight.type === 'warning' ? 'bg-amber-500/5 border-amber-500/20' :
                  'bg-indigo-500/5 border-indigo-500/20'
                )}
              >
                <h4 className="text-sm font-semibold text-white mb-1">{insight.title}</h4>
                <p className="text-xs text-slate-300">{insight.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
