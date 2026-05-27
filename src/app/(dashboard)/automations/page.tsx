'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Workflow, Plus, Play, Pause, Zap, Clock, Users, MessageCircle,
  Mail, Tag, ArrowRight, MoreHorizontal, Activity, Sparkles,
  GitBranch, Target, Bell, Bot, CheckCircle2, XCircle,
  ChevronRight, Filter, Search,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Automation {
  id: string
  name: string
  description: string
  trigger: string
  triggerLabel: string
  isActive: boolean
  lastRunAt?: string
  runCount: number
  stepsCount: number
  successRate: number
}

const mockAutomations: Automation[] = [
  { id: '1', name: 'Boas-vindas WhatsApp', description: 'Envia mensagem de boas-vindas para novos leads via WhatsApp', trigger: 'new_lead', triggerLabel: 'Novo Lead', isActive: true, lastRunAt: '5 min atras', runCount: 1247, stepsCount: 3, successRate: 98 },
  { id: '2', name: 'Follow-up Automatico', description: 'Segue up com leads que nao responderam em 24h', trigger: 'no_response', triggerLabel: 'Sem Resposta', isActive: true, lastRunAt: '1h atras', runCount: 892, stepsCount: 5, successRate: 85 },
  { id: '3', name: 'Lead Scoring IA', description: 'Analisa e classifica leads automaticamente com IA', trigger: 'new_lead', triggerLabel: 'Novo Lead', isActive: true, lastRunAt: '10 min atras', runCount: 3450, stepsCount: 4, successRate: 96 },
  { id: '4', name: 'Captacao Meta Ads', description: 'Sincroniza leads de Facebook Lead Ads e distribui automaticamente', trigger: 'meta_ad_lead', triggerLabel: 'Meta Ad Lead', isActive: true, lastRunAt: '15 min atras', runCount: 567, stepsCount: 6, successRate: 99 },
  { id: '5', name: 'Remarketing Abandonados', description: 'Envia campanha de remarketing para leads inativos ha 7 dias', trigger: 'scheduled', triggerLabel: 'Agendado', isActive: false, runCount: 234, stepsCount: 4, successRate: 72 },
  { id: '6', name: 'Distribuicao Round-Robin', description: 'Distribui novos leads igualmente entre consultores', trigger: 'new_lead', triggerLabel: 'Novo Lead', isActive: true, lastRunAt: '30 min atras', runCount: 2100, stepsCount: 2, successRate: 100 },
  { id: '7', name: 'Notificacao Lead Quente', description: 'Alerta equipe quando um lead atinge score alto', trigger: 'lead_status_change', triggerLabel: 'Mudanca Status', isActive: true, lastRunAt: '2h atras', runCount: 456, stepsCount: 3, successRate: 100 },
  { id: '8', name: 'Sequencia Nurturing', description: 'Envia serie de conteudos educativos por 14 dias', trigger: 'tag_added', triggerLabel: 'Tag Adicionada', isActive: false, runCount: 189, stepsCount: 8, successRate: 81 },
]

const triggerIcons: Record<string, React.ElementType> = {
  new_lead: Users,
  no_response: Clock,
  lead_status_change: Activity,
  meta_ad_lead: Target,
  scheduled: Clock,
  tag_added: Tag,
  form_submission: Zap,
}

const triggerColors: Record<string, string> = {
  new_lead: 'text-emerald-400 bg-emerald-500/10',
  no_response: 'text-amber-400 bg-amber-500/10',
  lead_status_change: 'text-blue-400 bg-blue-500/10',
  meta_ad_lead: 'text-purple-400 bg-purple-500/10',
  scheduled: 'text-cyan-400 bg-cyan-500/10',
  tag_added: 'text-pink-400 bg-pink-500/10',
  form_submission: 'text-orange-400 bg-orange-500/10',
}

export default function AutomationsPage() {
  const [search, setSearch] = useState('')
  const [showActiveOnly, setShowActiveOnly] = useState(false)

  const filtered = mockAutomations.filter((a) => {
    if (showActiveOnly && !a.isActive) return false
    if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const totalRuns = mockAutomations.reduce((s, a) => s + a.runCount, 0)
  const activeCount = mockAutomations.filter((a) => a.isActive).length

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Automacoes</h1>
          <p className="text-slate-400 mt-1">Fluxos automaticos e workflows inteligentes</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" />
          Nova Automacao
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Automacoes Ativas', value: activeCount, total: mockAutomations.length, icon: Workflow, color: 'text-emerald-400' },
          { label: 'Execucoes Totais', value: formatNumber(totalRuns), icon: Zap, color: 'text-indigo-400' },
          { label: 'Taxa de Sucesso', value: '94%', icon: CheckCircle2, color: 'text-emerald-400' },
          { label: 'Tempo Economizado', value: '187h', icon: Clock, color: 'text-amber-400' },
        ].map((stat) => (
          <div key={stat.label} className="bg-slate-800/30 backdrop-blur border border-white/5 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={cn('w-4 h-4', stat.color)} />
              <span className="text-xs text-slate-500">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {stat.value}
              {'total' in stat && <span className="text-sm text-slate-500 font-normal">/{stat.total}</span>}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar automacoes..."
            className="w-full pl-9 pr-4 py-2.5 bg-slate-800/50 border border-white/5 rounded-xl text-sm text-white placeholder-slate-500 focus:border-indigo-500/30 focus:outline-none transition-colors"
          />
        </div>
        <button
          onClick={() => setShowActiveOnly(!showActiveOnly)}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors',
            showActiveOnly ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-slate-300 bg-slate-800/50 border border-white/5'
          )}
        >
          <Filter className="w-4 h-4" />
          Somente Ativas
        </button>
      </div>

      {/* Automation Cards */}
      <div className="space-y-3">
        {filtered.map((automation, i) => {
          const TriggerIcon = triggerIcons[automation.trigger] || Zap

          return (
            <motion.div
              key={automation.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-slate-800/30 backdrop-blur border border-white/5 rounded-2xl p-5 hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                {/* Status / Icon */}
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                  automation.isActive ? 'bg-emerald-500/10' : 'bg-slate-500/10'
                )}>
                  <Workflow className={cn('w-5 h-5', automation.isActive ? 'text-emerald-400' : 'text-slate-500')} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-white">{automation.name}</h3>
                    <span className={cn(
                      'text-[10px] px-2 py-0.5 rounded font-medium',
                      automation.isActive ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400 bg-slate-500/10'
                    )}>
                      {automation.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{automation.description}</p>
                </div>

                {/* Trigger */}
                <div className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg shrink-0', triggerColors[automation.trigger])}>
                  <TriggerIcon className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">{automation.triggerLabel}</span>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-6 shrink-0">
                  <div className="text-center">
                    <p className="text-sm font-bold text-white">{automation.stepsCount}</p>
                    <p className="text-[10px] text-slate-500">Etapas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-white">{formatNumber(automation.runCount)}</p>
                    <p className="text-[10px] text-slate-500">Execucoes</p>
                  </div>
                  <div className="text-center">
                    <p className={cn('text-sm font-bold', automation.successRate >= 90 ? 'text-emerald-400' : automation.successRate >= 70 ? 'text-amber-400' : 'text-rose-400')}>
                      {automation.successRate}%
                    </p>
                    <p className="text-[10px] text-slate-500">Sucesso</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button className={cn(
                    'p-2 rounded-lg transition-colors',
                    automation.isActive ? 'text-amber-400 hover:bg-amber-500/10' : 'text-emerald-400 hover:bg-emerald-500/10'
                  )}>
                    {automation.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Steps Preview */}
              {automation.isActive && automation.lastRunAt && (
                <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-3">
                  <span className="text-[10px] text-slate-600">Ultima execucao: {automation.lastRunAt}</span>
                  <div className="flex-1" />
                  <div className="flex items-center gap-1 text-[10px] text-slate-500">
                    <span>Ver fluxo</span>
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Flow Builder Preview */}
      <div className="bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border border-indigo-500/10 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <GitBranch className="w-5 h-5 text-indigo-400" />
          <h3 className="text-lg font-semibold text-white">Exemplo de Fluxo: Boas-vindas WhatsApp</h3>
        </div>
        <div className="flex items-center gap-3 overflow-x-auto pb-2">
          {[
            { icon: Users, label: 'Novo Lead', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
            { icon: ArrowRight, label: '', color: 'text-slate-600' },
            { icon: Bot, label: 'IA Classifica', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
            { icon: ArrowRight, label: '', color: 'text-slate-600' },
            { icon: MessageCircle, label: 'Enviar WhatsApp', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
            { icon: ArrowRight, label: '', color: 'text-slate-600' },
            { icon: Clock, label: 'Aguardar 1h', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
            { icon: ArrowRight, label: '', color: 'text-slate-600' },
            { icon: Bell, label: 'Notificar Equipe', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
          ].map((step, i) => (
            <div key={i} className={cn(
              'flex items-center gap-2 shrink-0',
              step.label ? 'px-4 py-2.5 rounded-xl border' : '',
              step.color
            )}>
              <step.icon className="w-4 h-4" />
              {step.label && <span className="text-xs font-medium whitespace-nowrap">{step.label}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function formatNumber(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
  return value.toString()
}
