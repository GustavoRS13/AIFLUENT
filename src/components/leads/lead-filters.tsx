'use client'

import * as React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronDown,
  Filter,
  Camera,
  MessagesSquare,
  Globe,
  MessageCircle,
  MapPin,
  Users,
  Calendar,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useLeadsStore } from '@/stores/leads-store'
import type { LeadSource, LeadStatus, LeadTemperature } from '@/types'

// ── Source config ───────────────────────────────────────────────────────────
const sourceOptions: { value: LeadSource; label: string; icon: React.ReactNode }[] = [
  { value: 'instagram', label: 'Instagram', icon: <Camera className="h-3.5 w-3.5" /> },
  { value: 'facebook', label: 'Facebook', icon: <MessagesSquare className="h-3.5 w-3.5" /> },
  { value: 'google', label: 'Google', icon: <Globe className="h-3.5 w-3.5" /> },
  { value: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle className="h-3.5 w-3.5" /> },
  { value: 'website', label: 'Site', icon: <Globe className="h-3.5 w-3.5" /> },
  { value: 'referral', label: 'Indicacao', icon: <Users className="h-3.5 w-3.5" /> },
  { value: 'event', label: 'Evento', icon: <MapPin className="h-3.5 w-3.5" /> },
]

const temperatureOptions: { value: LeadTemperature; label: string; variant: 'cold' | 'warm' | 'hot' }[] = [
  { value: 'cold', label: 'Frio', variant: 'cold' },
  { value: 'warm', label: 'Morno', variant: 'warm' },
  { value: 'hot', label: 'Quente', variant: 'hot' },
]

const statusOptions: { value: LeadStatus; label: string }[] = [
  { value: 'new', label: 'Novo' },
  { value: 'contacted', label: 'Contatado' },
  { value: 'qualified', label: 'Qualificado' },
  { value: 'negotiating', label: 'Negociando' },
  { value: 'converted', label: 'Convertido' },
  { value: 'lost', label: 'Perdido' },
]

interface LeadFiltersProps {
  open: boolean
  onToggle: () => void
  consultants?: { id: string; name: string }[]
}

export function LeadFilters({ open, onToggle, consultants = [] }: LeadFiltersProps) {
  const { filters, setFilter, clearFilters } = useLeadsStore()

  const activeCount = [
    filters.source,
    filters.temperature,
    filters.status,
    filters.consultant,
    filters.tags.length > 0 ? true : null,
    filters.dateRange.from || filters.dateRange.to ? true : null,
  ].filter(Boolean).length

  return (
    <div>
      {/* Toggle button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onToggle}
        className="relative"
      >
        <Filter className="h-4 w-4" />
        Filtros
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 transition-transform duration-200',
            open && 'rotate-180'
          )}
        />
        {activeCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-bold text-white">
            {activeCount}
          </span>
        )}
      </Button>

      {/* Filter panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
                {/* Source */}
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-wider text-gray-500">
                    Origem
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {sourceOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() =>
                          setFilter(
                            'source',
                            filters.source === opt.value ? null : opt.value
                          )
                        }
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-all',
                          filters.source === opt.value
                            ? 'bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/40'
                            : 'bg-gray-50 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                        )}
                      >
                        {opt.icon}
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Temperature */}
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-wider text-gray-500">
                    Temperatura
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {temperatureOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() =>
                          setFilter(
                            'temperature',
                            filters.temperature === opt.value ? null : opt.value
                          )
                        }
                        className={cn(
                          'inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs transition-all',
                          filters.temperature === opt.value
                            ? opt.variant === 'cold'
                              ? 'bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/40'
                              : opt.variant === 'warm'
                                ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40'
                                : 'bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/40'
                            : 'bg-gray-50 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                        )}
                      >
                        <Badge variant={opt.variant} size="sm" dot>
                          {opt.label}
                        </Badge>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {statusOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() =>
                          setFilter(
                            'status',
                            filters.status === opt.value ? null : opt.value
                          )
                        }
                        className={cn(
                          'rounded-md px-2.5 py-1 text-xs transition-all',
                          filters.status === opt.value
                            ? 'bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/40'
                            : 'bg-gray-50 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Consultant */}
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-wider text-gray-500">
                    Consultor
                  </label>
                  <select
                    value={filters.consultant ?? ''}
                    onChange={(e) =>
                      setFilter('consultant', e.target.value || null)
                    }
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    <option value="">Todos</option>
                    {consultants.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Range */}
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-wider text-gray-500">
                    <Calendar className="mr-1 inline h-3 w-3" />
                    Periodo
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={filters.dateRange.from ?? ''}
                      onChange={(e) =>
                        setFilter('dateRange', {
                          ...filters.dateRange,
                          from: e.target.value || null,
                        })
                      }
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                    <input
                      type="date"
                      value={filters.dateRange.to ?? ''}
                      onChange={(e) =>
                        setFilter('dateRange', {
                          ...filters.dateRange,
                          to: e.target.value || null,
                        })
                      }
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                  </div>
                </div>

                {/* Clear */}
                <div className="flex items-end">
                  {activeCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="text-gray-500 hover:text-gray-800"
                    >
                      <X className="h-3.5 w-3.5" />
                      Limpar filtros
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
