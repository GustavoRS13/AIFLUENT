'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  Plus,
  Upload,
  LayoutGrid,
  LayoutList,
  Columns3,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { SearchInput } from '@/components/ui/search-input'
import { Skeleton } from '@/components/ui/skeleton'
import { useLeadsStore } from '@/stores/leads-store'
import { LeadFilters } from '@/components/leads/lead-filters'
import { LeadsTable } from '@/components/leads/leads-table'
import { LeadsGrid } from '@/components/leads/leads-grid'
import { LeadDetailModal } from '@/components/leads/lead-detail-modal'
import { ImportLeadsModal } from '@/components/leads/import-leads-modal'
import { NewLeadModal } from '@/components/leads/new-lead-modal'
import type { KanbanCard, ViewMode } from '@/types'

// ── View mode button ────────────────────────────────────────────────────────

function ViewModeToggle({
  mode,
  current,
  icon,
  label,
  onClick,
}: {
  mode: ViewMode
  current: ViewMode
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative inline-flex items-center justify-center rounded-md p-2 text-sm transition-colors',
        mode === current
          ? 'text-gray-900 bg-gray-100'
          : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
      )}
      title={label}
    >
      {icon}
    </button>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function LeadsPage() {
  const {
    leads,
    setLeads,
    filters,
    setFilter,
    viewMode,
    setViewMode,
    clearSelection,
  } = useLeadsStore()

  const [loading, setLoading] = React.useState(true)
  const [totalLeads, setTotalLeads] = React.useState(0)
  const [page, setPage] = React.useState(1)
  const [totalPages, setTotalPages] = React.useState(1)
  const [filtersOpen, setFiltersOpen] = React.useState(false)
  const [selectedLead, setSelectedLead] = React.useState<KanbanCard | null>(null)
  const [detailOpen, setDetailOpen] = React.useState(false)
  const [importOpen, setImportOpen] = React.useState(false)
  const [newLeadOpen, setNewLeadOpen] = React.useState(false)

  React.useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('new') === '1') {
      setNewLeadOpen(true)
      window.history.replaceState({}, '', '/leads')
    }
  }, [])

  // ── Fetch leads ─────────────────────────────────────────────────────────

  const fetchLeads = React.useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', '50')
      if (filters.search) params.set('search', filters.search)
      if (filters.source) params.set('source', filters.source)
      if (filters.temperature) params.set('temperature', filters.temperature)
      if (filters.status) params.set('status', filters.status)
      if (filters.consultant) params.set('consultantId', filters.consultant)

      const res = await fetch(`/api/leads?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch')

      const data = await res.json()

      // Map API response to KanbanCard format
      const mapped: KanbanCard[] = (data.leads ?? []).map(
        (l: Record<string, unknown>) => ({
          id: l.id as string,
          name: `${l.firstName ?? ''} ${l.lastName ?? ''}`.trim(),
          photo: (l.photo as string) ?? null,
          phone: (l.phone as string) ?? null,
          whatsapp: (l.whatsapp as string) ?? null,
          email: (l.email as string) ?? null,
          source: (l.source as string) ?? 'manual',
          consultant:
            l.consultant && typeof l.consultant === 'object'
              ? (l.consultant as Record<string, string>).name ?? null
              : null,
          lastInteraction: (l.lastInteractionAt as string) ?? (l.updatedAt as string) ?? null,
          temperature: (l.temperature as string) ?? 'warm',
          aiScore: (l.aiScore as number) ?? null,
          tags:
            Array.isArray(l.tags)
              ? (l.tags as { tag?: { name?: string } }[]).map((t) => t.tag?.name ?? '').filter(Boolean)
              : [],
          courseInterest: (l.courseInterest as string) ?? null,
          status: (l.status as string) ?? 'new',
          entryDate: (l.createdAt as string) ?? new Date().toISOString(),
        })
      )

      setLeads(mapped)
      setTotalLeads(data.total ?? mapped.length)
      setTotalPages(data.totalPages ?? 1)
    } catch {
      // fallback to empty
      setLeads([])
      setTotalLeads(0)
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }, [page, filters.search, filters.source, filters.temperature, filters.status, filters.consultant, setLeads])

  React.useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleView = (lead: KanbanCard) => {
    setSelectedLead(lead)
    setDetailOpen(true)
  }

  const handleDelete = async (lead: KanbanCard) => {
    if (!confirm(`Deseja deletar o lead "${lead.name}"?`)) return
    try {
      await fetch(`/api/leads/${lead.id}`, { method: 'DELETE' })
      fetchLeads()
    } catch {
      // ignore
    }
  }

  const handleSearch = React.useCallback(
    (value: string) => {
      setFilter('search', value)
      setPage(1)
    },
    [setFilter]
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10">
            <Users className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Leads</h1>
            <p className="text-sm text-gray-400">
              {loading ? '...' : `${totalLeads} lead${totalLeads !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-gray-200 bg-white p-0.5">
            <ViewModeToggle
              mode="table"
              current={viewMode}
              icon={<LayoutList className="h-4 w-4" />}
              label="Tabela"
              onClick={() => setViewMode('table')}
            />
            <ViewModeToggle
              mode="grid"
              current={viewMode}
              icon={<LayoutGrid className="h-4 w-4" />}
              label="Grid"
              onClick={() => setViewMode('grid')}
            />
            <ViewModeToggle
              mode="kanban"
              current={viewMode}
              icon={<Columns3 className="h-4 w-4" />}
              label="Kanban"
              onClick={() => setViewMode('kanban')}
            />
          </div>

          {/* Search */}
          <div className="w-56">
            <SearchInput
              placeholder="Buscar leads..."
              onSearch={handleSearch}
              debounce={400}
            />
          </div>

          {/* Filter toggle */}
          <LeadFilters
            open={filtersOpen}
            onToggle={() => setFiltersOpen((prev) => !prev)}
          />

          {/* Import */}
          <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" />
            Importar
          </Button>

          {/* New lead */}
          <Button size="sm" onClick={() => setNewLeadOpen(true)}>
            <Plus className="h-4 w-4" />
            Novo Lead
          </Button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSkeleton viewMode={viewMode} />
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={viewMode}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {viewMode === 'table' && (
              <LeadsTable
                leads={leads}
                onView={handleView}
                onEdit={handleView}
                onDelete={handleDelete}
              />
            )}
            {viewMode === 'grid' && (
              <LeadsGrid leads={leads} onView={handleView} />
            )}
            {viewMode === 'kanban' && (
              <div className="flex items-center justify-center py-20 text-center">
                <div>
                  <Columns3 className="mx-auto h-10 w-10 text-gray-400 mb-3" />
                  <p className="text-sm text-gray-400">
                    Visualizacao Kanban disponivel na pagina Pipeline.
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 pt-4">
          <p className="text-sm text-gray-400">
            Pagina {page} de {totalPages} ({totalLeads} total)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => {
                setPage((p) => Math.max(1, p - 1))
                clearSelection()
              }}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const pageNum = i + 1
                return (
                  <button
                    key={pageNum}
                    onClick={() => {
                      setPage(pageNum)
                      clearSelection()
                    }}
                    className={cn(
                      'h-8 w-8 rounded-md text-sm font-medium transition-colors',
                      pageNum === page
                        ? 'bg-indigo-500/20 text-indigo-300'
                        : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    {pageNum}
                  </button>
                )
              })}
              {totalPages > 5 && (
                <span className="px-1 text-gray-400">...</span>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => {
                setPage((p) => Math.min(totalPages, p + 1))
                clearSelection()
              }}
            >
              Proximo
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Modals */}
      <LeadDetailModal
        lead={selectedLead}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onEdit={(lead) => {
          setDetailOpen(false)
          // Could open an edit modal
        }}
      />

      <ImportLeadsModal
        open={importOpen}
        onOpenChange={setImportOpen}
        onImportComplete={() => fetchLeads()}
      />

      <NewLeadModal
        open={newLeadOpen}
        onOpenChange={setNewLeadOpen}
        onCreated={() => fetchLeads()}
      />
    </div>
  )
}

// ── Loading skeleton ────────────────────────────────────────────────────────

function LoadingSkeleton({ viewMode }: { viewMode: ViewMode }) {
  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-8 w-full rounded-md" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
      <div className="border-b border-gray-200 p-3">
        <div className="flex gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-20" />
          ))}
        </div>
      </div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-gray-200 px-3 py-3">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-40 ml-auto" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  )
}
