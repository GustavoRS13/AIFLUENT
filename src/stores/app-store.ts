import { create } from 'zustand'

interface AppState {
  sidebarOpen: boolean
  selectedOrganizationId: string | null
  currentView: string
  searchQuery: string

  toggleSidebar: () => void
  setOrganization: (id: string | null) => void
  setView: (view: string) => void
  setSearch: (query: string) => void
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  selectedOrganizationId: null,
  currentView: 'dashboard',
  searchQuery: '',

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setOrganization: (id) => set({ selectedOrganizationId: id }),
  setView: (view) => set({ currentView: view }),
  setSearch: (query) => set({ searchQuery: query }),
}))
