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
}))
