'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bot, Sparkles, ArrowRight, Clock, Flame, Zap, Loader2, AlertTriangle,
  MessageSquare, Copy, Check, Play, Shield, TrendingUp, BarChart3,
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface AICopilotProps {
  temperature?: string | null
  score?: number | null
  stageName?: string | null
  lastContactAt?: string | null
  leadId: string
  className?: string
  onRefresh?: () => void
}

interface AIFullAnalysis {
  suggestion: string
  action: string
  probability: number
  risk: string
  riskLevel: 'low' | 'medium' | 'high'
  suggestedReply: string
  summary: string
  scoreExplanation: { factor: string; points: number; reason: string }[]
}

export function AICopilot({ temperature, score, stageName, lastContactAt, leadId, className, onRefresh }: AICopilotProps) {
  const [analysis, setAnalysis] = useState<AIFullAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [executeSuccess, setExecuteSuccess] = useState(false)

  const fetchFullAnalysis = useCallback(async () => {
    if (!leadId) return
    setLoading(true)
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'full-analysis', context: { leadId } }),
      })
      if (res.ok) {
        const data = await res.json()
        setAnalysis(data)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [leadId])

  useEffect(() => {
    setAnalysis(null)
    setCopied(false)
    setExecuteSuccess(false)
    if (leadId) {
      fetchFullAnalysis()
    }
  }, [leadId, temperature, score, stageName, lastContactAt, fetchFullAnalysis])

  async function handleCopyReply() {
    if (!analysis?.suggestedReply) return
    try {
      await navigator.clipboard.writeText(analysis.suggestedReply)
      setCopied(true)
      toast.success('Resposta copiada!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Erro ao copiar')
    }
  }

  async function handleExecuteAll() {
    if (!analysis || !leadId) return
    setExecuting(true)
    try {
      // 1. Move stage if applicable
      if (analysis.action === 'move_and_propose') {
        const pipelineRes = await fetch('/api/pipeline')
        const pipeline = await pipelineRes.json()
        if (pipeline?.stages) {
          const currentIdx = pipeline.stages.findIndex((s: { name: string }) =>
            s.name === stageName
          )
          const nextStage = pipeline.stages[currentIdx + 1]
          if (nextStage) {
            await fetch(`/api/leads/${leadId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ stageId: nextStage.id }),
            })
          }
        }
      }

      // 2. Create activity
      await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'stage_change',
          title: `IA executou: ${analysis.suggestion.substring(0, 80)}`,
          description: `Acao automatica do copiloto IA. Probabilidade: ${analysis.probability}%`,
          leadId,
        }),
      })

      // 3. Create follow-up task
      if (analysis.action === 'move_and_propose' || analysis.action === 'create_followup') {
        await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `Follow-up: ${analysis.suggestion.substring(0, 50)}`,
            priority: 'high',
            dueDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          }),
        })
      }

      // 4. Copy suggested reply to clipboard
      if (analysis.suggestedReply) {
        try {
          await navigator.clipboard.writeText(analysis.suggestedReply)
        } catch {
          // clipboard may not be available
        }
      }

      // Refresh panel
      onRefresh?.()
      setExecuteSuccess(true)
      toast.success('Executado! Stage movido, tarefa criada, resposta copiada.')
      setTimeout(() => setExecuteSuccess(false), 3000)
    } catch (err) {
      console.error('Execute all failed:', err)
      toast.error('Erro ao executar acoes')
    } finally {
      setExecuting(false)
    }
  }

  // Probability gauge color
  function getProbColor(prob: number) {
    if (prob >= 70) return 'text-emerald-600 bg-emerald-50 border-emerald-200'
    if (prob >= 40) return 'text-amber-600 bg-amber-50 border-amber-200'
    return 'text-gray-600 bg-gray-50 border-gray-200'
  }

  // Risk badge color
  function getRiskColor(level: string) {
    if (level === 'high') return 'text-rose-700 bg-rose-50 border-rose-200'
    if (level === 'medium') return 'text-amber-700 bg-amber-50 border-amber-200'
    return 'text-emerald-700 bg-emerald-50 border-emerald-200'
  }

  function getRiskLabel(level: string) {
    if (level === 'high') return 'Alto'
    if (level === 'medium') return 'Medio'
    return 'Baixo'
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-1.5 px-1">
        <Bot className="h-3.5 w-3.5 text-violet-500" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-500">Copiloto IA</span>
        {loading && <Loader2 className="h-3 w-3 animate-spin text-violet-400" />}
      </div>

      {/* Loading state */}
      {loading && !analysis && (
        <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-4 flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-violet-400" />
          <span className="text-sm text-violet-600">Analisando lead...</span>
        </div>
      )}

      <AnimatePresence mode="wait">
        {analysis && (
          <motion.div
            key="analysis"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="space-y-2"
          >
            {/* Summary */}
            <div className="rounded-xl border border-gray-200 bg-white p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-500">Resumo</span>
              </div>
              <p className="text-sm text-gray-700 leading-snug">{analysis.summary}</p>
            </div>

            {/* Probability + Risk row */}
            <div className="flex gap-2">
              {/* Probability gauge */}
              <div className={cn('flex-1 rounded-xl border p-3', getProbColor(analysis.probability))}>
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider">Probabilidade</span>
                </div>
                <div className="flex items-end gap-1">
                  <span className="text-2xl font-bold">{analysis.probability}%</span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-gray-200">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      analysis.probability >= 70 ? 'bg-emerald-500' : analysis.probability >= 40 ? 'bg-amber-500' : 'bg-gray-400'
                    )}
                    style={{ width: `${analysis.probability}%` }}
                  />
                </div>
              </div>

              {/* Risk badge */}
              <div className={cn('w-24 rounded-xl border p-3 flex flex-col items-center justify-center', getRiskColor(analysis.riskLevel))}>
                <Shield className="h-4 w-4 mb-1" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">Risco</span>
                <span className="text-sm font-bold">{getRiskLabel(analysis.riskLevel)}</span>
              </div>
            </div>

            {/* Risk detail */}
            {analysis.riskLevel !== 'low' && (
              <div className={cn(
                'rounded-xl border p-3',
                analysis.riskLevel === 'high'
                  ? 'border-rose-200 bg-gradient-to-r from-rose-50 to-red-50'
                  : 'border-amber-200 bg-amber-50'
              )}>
                <div className="flex items-start gap-2">
                  <AlertTriangle className={cn('h-4 w-4 shrink-0 mt-0.5', analysis.riskLevel === 'high' ? 'text-rose-500' : 'text-amber-500')} />
                  <p className="text-sm text-gray-700 leading-snug">{analysis.risk}</p>
                </div>
              </div>
            )}

            {/* Suggestion + Execute All */}
            <div className="rounded-xl border border-sky-200 bg-gradient-to-r from-sky-50 to-blue-50 p-3">
              <div className="flex items-start gap-2">
                <Flame className="h-4 w-4 shrink-0 mt-0.5 text-sky-600" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 leading-snug">{analysis.suggestion}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {analysis.action !== 'monitor' && (
                      <button
                        onClick={handleExecuteAll}
                        disabled={executing || executeSuccess}
                        className={cn(
                          'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all shadow-sm',
                          executeSuccess
                            ? 'bg-emerald-500 text-white'
                            : 'bg-sky-500 hover:bg-sky-600 text-white disabled:opacity-50'
                        )}
                      >
                        {executing ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : executeSuccess ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <Play className="h-3 w-3" />
                        )}
                        {executeSuccess ? 'Executado!' : 'Executar Tudo'}
                      </button>
                    )}
                    <button
                      onClick={fetchFullAnalysis}
                      disabled={loading}
                      className="rounded-lg bg-white/80 border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-white"
                    >
                      Reanalisar
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Execute success banner */}
            <AnimatePresence>
              {executeSuccess && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <p className="text-sm text-emerald-700 font-medium">Executado! Stage movido, tarefa criada, resposta copiada.</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Score Explanation */}
            {analysis.scoreExplanation && analysis.scoreExplanation.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <BarChart3 className="h-3.5 w-3.5 text-gray-500" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Score - Fatores</span>
                </div>
                <div className="space-y-1.5">
                  {analysis.scoreExplanation.map((factor, i) => {
                    const maxPoints = 25
                    const barWidth = Math.abs(factor.points) / maxPoints * 100
                    const isPositive = factor.points > 0
                    return (
                      <div key={i} className="space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-gray-600">{factor.factor}</span>
                          <span className={cn('text-[11px] font-semibold', isPositive ? 'text-emerald-600' : 'text-rose-600')}>
                            {isPositive ? '+' : ''}{factor.points}
                          </span>
                        </div>
                        <div className="h-1 rounded-full bg-gray-100">
                          <div
                            className={cn('h-full rounded-full transition-all', isPositive ? 'bg-emerald-400' : 'bg-rose-400')}
                            style={{ width: `${Math.min(barWidth, 100)}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-gray-400">{factor.reason}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Suggested Reply */}
            {analysis.suggestedReply && (
              <div className="rounded-xl border border-violet-200 bg-gradient-to-r from-violet-50 to-purple-50 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-violet-500" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-500">Resposta sugerida</span>
                  </div>
                  <button
                    onClick={handleCopyReply}
                    className="flex items-center gap-1 rounded-md bg-white/80 border border-violet-200 px-2 py-0.5 text-[10px] font-medium text-violet-600 transition-colors hover:bg-white"
                  >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{analysis.suggestedReply}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
