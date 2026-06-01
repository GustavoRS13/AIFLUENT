import { create } from 'zustand'
import type {
  KanbanCard,
  LeadFilters,
  SortOrder,
  ViewMode,
} from '@/types'

interface LeadsState {
  leads: KanbanCard[]
  selectedLeads: Set<string>
  filters: LeadFilters
  sortBy: string
  sortOrder: SortOrder
  viewMode: ViewMode

  setLeads: (leads: KanbanCard[]) => void
  toggleSelectLead: (id: string) => void
  selectAll: () => void
  clearSelection: () => void
  setFilter: <K extends keyof LeadFilters>(key: K, value: LeadFilters[K]) => void
  clearFilters: () => void
  setSort: (field: string, order?: SortOrder) => void
  setViewMode: (mode: ViewMode) => void
}

const defaultFilters: LeadFilters = {
  source: null,
  temperature: null,
  status: null,
  consultant: null,
  tags: [],
  search: '',
  dateRange: { from: null, to: null },
}

export const useLeadsStore = create<LeadsState>((set) => ({
  leads: [],
  selectedLeads: new Set<string>(),
  filters: { ...defaultFilters },
  sortBy: 'entryDate',
  sortOrder: 'desc',
  viewMode: 'table',

  setLeads: (leads) => set({ leads }),

  toggleSelectLead: (id) =>
    set((s) => {
      const next = new Set(s.selectedLeads)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return { selectedLeads: next }
    }),

  selectAll: () =>
    set((s) => ({
      selectedLeads: new Set(s.leads.map((l) => l.id)),
    })),

  clearSelection: () => set({ selectedLeads: new Set<string>() }),

  setFilter: (key, value) =>
    set((s) => ({
      filters: { ...s.filters, [key]: value },
    })),

  clearFilters: () => set({ filters: { ...defaultFilters } }),

  setSort: (field, order) =>
    set((s) => ({
      sortBy: field,
      sortOrder: order ?? (s.sortBy === field && s.sortOrder === 'asc' ? 'desc' : 'asc'),
    })),

  setViewMode: (mode) => set({ viewMode: mode }),
}))
