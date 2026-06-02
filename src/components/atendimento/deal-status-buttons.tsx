'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, X, AlertTriangle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DealStatusButtonsProps {
  dealId: string
  currentStatus: string
  onStatusChange?: (status: string) => void
}

export function DealStatusButtons({ dealId, currentStatus, onStatusChange }: DealStatusButtonsProps) {
  const [status, setStatus] = useState(currentStatus)
  const [loading, setLoading] = useState(false)
  const [showLostReason, setShowLostReason] = useState(false)
  const [lostReason, setLostReason] = useState('')

  async function updateStatus(newStatus: string, reason?: string) {
    setLoading(true)
    try {
      const body: Record<string, unknown> = { status: newStatus }
      if (reason) body.lostReason = reason
      const res = await fetch(`/api/deals/${dealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setStatus(newStatus)
        onStatusChange?.(newStatus)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
      setShowLostReason(false)
      setLostReason('')
    }
  }

  function handleLost() {
    setShowLostReason(true)
  }

  function confirmLost() {
    updateStatus('lost', lostReason || 'Sem motivo informado')
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          onClick={() => updateStatus('won')}
          disabled={loading}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
            status === 'won'
              ? 'bg-emerald-500 text-white shadow-sm'
              : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
          )}
        >
          {loading && status !== 'won' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trophy className="h-3.5 w-3.5" />}
          Ganho
        </button>

        <button
          onClick={handleLost}
          disabled={loading}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
            status === 'lost'
              ? 'bg-rose-500 text-white shadow-sm'
              : 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
          )}
        >
          {loading && status !== 'lost' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
          Perdido
        </button>

        {status !== 'open' && (
          <button
            onClick={() => updateStatus('open')}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-sky-200 bg-white px-3 py-1.5 text-xs font-medium text-sky-600 transition-all hover:bg-sky-50"
          >
            Reabrir
          </button>
        )}
      </div>

      <AnimatePresence>
        {showLostReason && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-rose-700">
                <AlertTriangle className="h-3.5 w-3.5" />
                Motivo da perda
              </div>
              <textarea
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                placeholder="Descreva o motivo da perda..."
                rows={2}
                className="w-full rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-rose-300 focus:outline-none resize-none"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={confirmLost}
                  disabled={loading}
                  className="rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-rose-600 disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : 'Confirmar perda'}
                </button>
                <button
                  onClick={() => { setShowLostReason(false); setLostReason('') }}
                  className="rounded-lg px-3 py-1.5 text-xs text-gray-500 transition-colors hover:text-gray-700"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
