'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Workflow, Plus, Play, Pause, Zap, Clock, Users, MessageCircle,
  Tag, ArrowRight, MoreHorizontal, Activity,
  GitBranch, Target, Bell, Bot, CheckCircle2,
  ChevronRight, Filter, Search, Loader2, Shuffle,
} from 'lucide-react'
import { toast } from 'sonner'
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

// TODO: Connect to /api/automations when backend is ready
const initialAutomations: Automation[] = []

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
  const [followUpLoading, setFollowUpLoading] = useState(false)
  const [autoStageLoading, setAutoStageLoading] = useState(false)
  const [distributeLoading, setDistributeLoading] = useState(false)

  async function handleFollowUp() {
    setFollowUpLoading(true)
    try {
      const res = await fetch('/api/automation/follow-up', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        toast.success(`${data.created} tarefa(s) de follow-up criada(s)`)
      } else {
        toast.error(data.error || 'Erro ao executar')
      }
    } catch {
      toast.error('Erro de conexao')
    } finally {
      setFollowUpLoading(false)
    }
  }

  async function handleAutoStage() {
    setAutoStageLoading(true)
    try {
      const res = await fetch('/api/automation/auto-stage', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        toast.success(`${data.moved} lead(s) movido(s) de estagio`)
      } else {
        toast.error(data.error || 'Erro ao executar')
      }
    } catch {
      toast.error('Erro de conexao')
    } finally {
      setAutoStageLoading(false)
    }
  }

  async function handleDistribute() {
    setDistributeLoading(true)
    try {
      const res = await fetch('/api/automation/distribute', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        toast.success(`${data.distributed} lead(s) distribuido(s)`)
      } else {
        toast.error(data.error || 'Erro ao executar')
      }
    } catch {
      toast.error('Erro de conexao')
    } finally {
      setDistributeLoading(false)
    }
  }

  const filtered = initialAutomations.filter((a) => {
    if (showActiveOnly && !a.isActive) return false
    if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const totalRuns = initialAutomations.reduce((s, a) => s + a.runCount, 0)
  const activeCount = initialAutomations.filter((a) => a.isActive).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Automacoes</h1>
          <p className="text-gray-500 mt-1">Fluxos automaticos e workflows inteligentes</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" />
          Nova Automacao
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Automacoes Ativas', value: activeCount, total: initialAutomations.length, icon: Workflow, color: 'text-emerald-400' },
          { label: 'Execucoes Totais', value: formatNumber(totalRuns), icon: Zap, color: 'text-indigo-400' },
          { label: 'Taxa de Sucesso', value: '94%', icon: CheckCircle2, color: 'text-emerald-400' },
          { label: 'Tempo Economizado', value: '187h', icon: Clock, color: 'text-amber-400' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-gray-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={cn('w-4 h-4', stat.color)} />
              <span className="text-xs text-gray-400">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {stat.value}
              {'total' in stat && <span className="text-sm text-gray-400 font-normal">/{stat.total}</span>}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar automacoes..."
            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500/30 focus:outline-none transition-colors"
          />
        </div>
        <button
          onClick={() => setShowActiveOnly(!showActiveOnly)}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors',
            showActiveOnly ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'text-gray-500 hover:text-gray-700 bg-gray-50 border border-gray-200'
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
              className="bg-white border border-gray-200 rounded-2xl p-5 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                {/* Status / Icon */}
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                  automation.isActive ? 'bg-emerald-500/10' : 'bg-gray-100'
                )}>
                  <Workflow className={cn('w-5 h-5', automation.isActive ? 'text-emerald-400' : 'text-gray-400')} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900">{automation.name}</h3>
                    <span className={cn(
                      'text-[10px] px-2 py-0.5 rounded font-medium',
                      automation.isActive ? 'text-emerald-400 bg-emerald-500/10' : 'text-gray-500 bg-gray-100'
                    )}>
                      {automation.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{automation.description}</p>
                </div>

                {/* Trigger */}
                <div className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg shrink-0', triggerColors[automation.trigger])}>
                  <TriggerIcon className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">{automation.triggerLabel}</span>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-6 shrink-0">
                  <div className="text-center">
                    <p className="text-sm font-bold text-gray-900">{automation.stepsCount}</p>
                    <p className="text-[10px] text-gray-400">Etapas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-gray-900">{formatNumber(automation.runCount)}</p>
                    <p className="text-[10px] text-gray-400">Execucoes</p>
                  </div>
                  <div className="text-center">
                    <p className={cn('text-sm font-bold', automation.successRate >= 90 ? 'text-emerald-400' : automation.successRate >= 70 ? 'text-amber-400' : 'text-rose-400')}>
                      {automation.successRate}%
                    </p>
                    <p className="text-[10px] text-gray-400">Sucesso</p>
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
                  <button className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Steps Preview */}
              {automation.isActive && automation.lastRunAt && (
                <div className="mt-3 pt-3 border-t border-gray-200 flex items-center gap-3">
                  <span className="text-[10px] text-gray-400">Ultima execucao: {automation.lastRunAt}</span>
                  <div className="flex-1" />
                  <div className="flex items-center gap-1 text-[10px] text-gray-400">
                    <span>Ver fluxo</span>
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* AI Automation Actions */}
      <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bot className="w-5 h-5 text-violet-500" />
          <h3 className="text-lg font-semibold text-gray-900">Automacoes IA</h3>
          <span className="text-xs text-violet-500 bg-violet-100 px-2 py-0.5 rounded-full font-medium">Novo</span>
        </div>
        <p className="text-sm text-gray-500 mb-4">Execute acoes automaticas baseadas em inteligencia artificial com um clique.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Auto Follow-up */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Auto Follow-up</p>
                <p className="text-[10px] text-gray-400">Leads sem contato 24h+</p>
              </div>
            </div>
            <p className="text-xs text-gray-500">Cria tarefas automaticas para leads sem contato nas ultimas 24 horas.</p>
            <button
              onClick={handleFollowUp}
              disabled={followUpLoading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50"
            >
              {followUpLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
              Executar
            </button>
          </div>

          {/* Auto Stage */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center">
                <ArrowRight className="w-4 h-4 text-sky-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Auto Stage</p>
                <p className="text-[10px] text-gray-400">Mover leads por sinais</p>
              </div>
            </div>
            <p className="text-xs text-gray-500">Analisa padroes de atividade e move leads para o proximo estagio automaticamente.</p>
            <button
              onClick={handleAutoStage}
              disabled={autoStageLoading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-sky-500 hover:bg-sky-600 text-white px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50"
            >
              {autoStageLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
              Executar
            </button>
          </div>

          {/* Distribute */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Shuffle className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Distribuir Leads</p>
                <p className="text-[10px] text-gray-400">Round-robin automatico</p>
              </div>
            </div>
            <p className="text-xs text-gray-500">Distribui leads sem dono entre consultores ativos de forma equilibrada.</p>
            <button
              onClick={handleDistribute}
              disabled={distributeLoading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50"
            >
              {distributeLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
              Executar
            </button>
          </div>
        </div>
      </div>

      {/* Flow Builder Preview */}
      <div className="bg-gradient-to-br from-indigo-500/5 to-blue-500/5 border border-indigo-500/10 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <GitBranch className="w-5 h-5 text-indigo-400" />
          <h3 className="text-lg font-semibold text-gray-900">Exemplo de Fluxo: Boas-vindas WhatsApp</h3>
        </div>
        <div className="flex items-center gap-3 overflow-x-auto pb-2">
          {[
            { icon: Users, label: 'Novo Lead', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
            { icon: ArrowRight, label: '', color: 'text-gray-400' },
            { icon: Bot, label: 'IA Classifica', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
            { icon: ArrowRight, label: '', color: 'text-gray-400' },
            { icon: MessageCircle, label: 'Enviar WhatsApp', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
            { icon: ArrowRight, label: '', color: 'text-gray-400' },
            { icon: Clock, label: 'Aguardar 1h', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
            { icon: ArrowRight, label: '', color: 'text-gray-400' },
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
