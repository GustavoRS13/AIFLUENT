'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, Sparkles, ArrowRight, Clock, Snowflake, Flame, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AICopilotProps {
  temperature?: string | null
  score?: number | null
  stageName?: string | null
  lastContactAt?: string | null
  leadId: string
  className?: string
}

interface Suggestion {
  id: string
  message: string
  icon: React.ElementType
  type: 'move' | 'followup' | 'reactivate' | 'info'
  primaryAction?: string
  secondaryAction?: string
  color: string
}

export function AICopilot({ temperature, score, stageName, lastContactAt, leadId, className }: AICopilotProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  useEffect(() => {
    const newSuggestions: Suggestion[] = []

    // Calculate days since last contact
    let daysSinceContact = 0
    if (lastContactAt) {
      daysSinceContact = Math.floor((Date.now() - new Date(lastContactAt).getTime()) / (1000 * 60 * 60 * 24))
    }

    // Hot lead with high score
    if (temperature === 'hot' && (score ?? 0) > 70) {
      newSuggestions.push({
        id: 'move-proposta',
        message: 'Lead quente! Mover para Proposta?',
        icon: Flame,
        type: 'move',
        primaryAction: 'Sim',
        secondaryAction: 'Nao',
        color: 'border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50',
      })
    }

    // Warm lead without recent contact
    if (temperature === 'warm' && daysSinceContact >= 3) {
      newSuggestions.push({
        id: 'create-followup',
        message: `Sem contato ha ${daysSinceContact} dias. Criar follow-up?`,
        icon: Clock,
        type: 'followup',
        primaryAction: 'Criar',
        secondaryAction: 'Ignorar',
        color: 'border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50',
      })
    }

    // Cold lead
    if (temperature === 'cold') {
      newSuggestions.push({
        id: 'reactivate',
        message: 'Lead frio. Sugerir reativacao?',
        icon: Snowflake,
        type: 'reactivate',
        primaryAction: 'Reativar',
        secondaryAction: 'Ignorar',
        color: 'border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50',
      })
    }

    // Score info
    if (score !== null && score !== undefined) {
      const scoreLevel = score >= 70 ? 'alto' : score >= 40 ? 'medio' : 'baixo'
      newSuggestions.push({
        id: 'score-info',
        message: `Score de conversao: ${score}% (${scoreLevel})`,
        icon: Zap,
        type: 'info',
        color: score >= 70 ? 'border-emerald-200 bg-emerald-50' : score >= 40 ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-gray-50',
      })
    }

    // If no specific suggestions, show a general tip
    if (newSuggestions.length === 0) {
      newSuggestions.push({
        id: 'general-tip',
        message: 'IA analisando dados do lead...',
        icon: Sparkles,
        type: 'info',
        color: 'border-gray-200 bg-gray-50',
      })
    }

    setSuggestions(newSuggestions)
  }, [temperature, score, stageName, lastContactAt, leadId])

  function handleDismiss(id: string) {
    setDismissed((prev) => new Set(prev).add(id))
  }

  async function handlePrimary(suggestion: Suggestion) {
    if (suggestion.type === 'move') {
      // Try to call AI API for next step
      try {
        await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'suggest-follow-up',
            context: { leadId, temperature, score },
          }),
        })
      } catch {
        // silently fail
      }
    }
    handleDismiss(suggestion.id)
  }

  const visible = suggestions.filter((s) => !dismissed.has(s.id))

  if (visible.length === 0) return null

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-1.5 px-1">
        <Bot className="h-3.5 w-3.5 text-violet-500" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-500">Copiloto IA</span>
      </div>

      <AnimatePresence mode="popLayout">
        {visible.map((suggestion) => (
          <motion.div
            key={suggestion.id}
            layout
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'rounded-xl border p-3',
              suggestion.color
            )}
          >
            <div className="flex items-start gap-2">
              <suggestion.icon className="h-4 w-4 shrink-0 mt-0.5 text-gray-600" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 leading-snug">{suggestion.message}</p>
                {(suggestion.primaryAction || suggestion.secondaryAction) && (
                  <div className="flex items-center gap-2 mt-2">
                    {suggestion.primaryAction && (
                      <button
                        onClick={() => handlePrimary(suggestion)}
                        className="rounded-lg bg-white/80 border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-white shadow-sm"
                      >
                        {suggestion.primaryAction}
                      </button>
                    )}
                    {suggestion.secondaryAction && (
                      <button
                        onClick={() => handleDismiss(suggestion.id)}
                        className="px-2 py-1 text-xs text-gray-500 transition-colors hover:text-gray-700"
                      >
                        {suggestion.secondaryAction}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
