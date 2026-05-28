import { create } from 'zustand'
import type { KanbanCard, PipelineStageConfig } from '@/types'

export interface PipelineStage extends PipelineStageConfig {
  leads: KanbanCard[]
}

interface PipelineState {
  stages: PipelineStage[]
  draggedLead: string | null

  setStages: (stages: PipelineStage[]) => void
  moveLead: (leadId: string, fromStageId: string, toStageId: string, newIndex?: number) => void
  setDraggedLead: (id: string | null) => void
  addStage: (name: string, color: string) => void
  renameStage: (stageId: string, name: string) => void
  updateStageColor: (stageId: string, color: string) => void
  deleteStage: (stageId: string) => boolean
}

export const usePipelineStore = create<PipelineState>((set) => ({
  stages: [],
  draggedLead: null,

  setStages: (stages) => set({ stages }),

  moveLead: (leadId, fromStageId, toStageId, newIndex) =>
    set((s) => {
      const stages = s.stages.map((stage) => ({
        ...stage,
        leads: [...stage.leads],
      }))

      const fromStage = stages.find((st) => st.id === fromStageId)
      const toStage = stages.find((st) => st.id === toStageId)

      if (!fromStage || !toStage) return s

      const leadIndex = fromStage.leads.findIndex((l) => l.id === leadId)
      if (leadIndex === -1) return s

      const [lead] = fromStage.leads.splice(leadIndex, 1)

      if (newIndex !== undefined && newIndex >= 0) {
        toStage.leads.splice(newIndex, 0, lead)
      } else {
        toStage.leads.push(lead)
      }

      return { stages }
    }),

  setDraggedLead: (id) => set({ draggedLead: id }),

  addStage: (name, color) =>
    set((s) => {
      const maxOrder = s.stages.reduce((max, st) => Math.max(max, st.order), -1)
      const newStage: PipelineStage = {
        id: `stage-${Date.now()}`,
        name,
        color,
        order: maxOrder + 1,
        isWon: false,
        isLost: false,
        leads: [],
      }
      return { stages: [...s.stages, newStage] }
    }),

  renameStage: (stageId, name) =>
    set((s) => ({
      stages: s.stages.map((st) =>
        st.id === stageId ? { ...st, name } : st
      ),
    })),

  updateStageColor: (stageId, color) =>
    set((s) => ({
      stages: s.stages.map((st) =>
        st.id === stageId ? { ...st, color } : st
      ),
    })),

  deleteStage: (stageId) => {
    const state = usePipelineStore.getState()
    const stage = state.stages.find((st) => st.id === stageId)
    if (!stage || stage.leads.length > 0) return false
    set({ stages: state.stages.filter((st) => st.id !== stageId) })
    return true
  },
}))
