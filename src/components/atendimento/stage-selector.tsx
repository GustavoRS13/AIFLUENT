'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Stage {
  id: string
  name: string
  color: string
}

interface StageSelectorProps {
  currentStageId: string | null
  leadId: string
  onStageChange?: (stageId: string) => void
  className?: string
}

export function StageSelector({ currentStageId, leadId, onStageChange, className }: StageSelectorProps) {
  const [stages, setStages] = useState<Stage[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(currentStageId)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function fetchStages() {
      try {
        const res = await fetch('/api/pipeline')
        if (!res.ok) throw new Error()
        const data = await res.json()
        if (data?.stages) {
          setStages(data.stages.map((s: Record<string, unknown>) => ({
            id: s.id as string,
            name: s.name as string,
            color: (s.color as string) || '#6b7280',
          })))
        }
      } catch {
        // Fallback stages
        setStages([
          { id: 'novo', name: 'Novo', color: '#3b82f6' },
          { id: 'contato', name: 'Contato', color: '#f59e0b' },
          { id: 'qualificado', name: 'Qualificado', color: '#8b5cf6' },
          { id: 'proposta', name: 'Proposta', color: '#ec4899' },
          { id: 'fechado', name: 'Fechado', color: '#10b981' },
        ])
      }
    }
    fetchStages()
  }, [])

  useEffect(() => {
    setSelected(currentStageId)
  }, [currentStageId])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const currentStage = stages.find((s) => s.id === selected)

  async function handleSelect(stageId: string) {
    if (stageId === selected) { setOpen(false); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageId }),
      })
      if (res.ok) {
        setSelected(stageId)
        onStageChange?.(stageId)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
      setOpen(false)
    }
  }

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={loading}
        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />
        ) : (
          <>
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: currentStage?.color || '#6b7280' }}
            />
            <span className="truncate max-w-[120px]">{currentStage?.name || 'Sem estagio'}</span>
          </>
        )}
        <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 top-full z-30 mt-1 w-48 rounded-xl border border-gray-200 bg-white p-1 shadow-lg"
          >
            {stages.map((stage) => (
              <button
                key={stage.id}
                onClick={() => handleSelect(stage.id)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-gray-50',
                  stage.id === selected ? 'bg-sky-50 text-sky-700 font-medium' : 'text-gray-700'
                )}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: stage.color }}
                />
                {stage.name}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
