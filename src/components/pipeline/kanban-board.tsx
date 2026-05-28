'use client'

import { useState, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePipelineStore, type PipelineStage } from '@/stores/pipeline-store'
import { KanbanColumn } from './kanban-column'
import { KanbanCard } from './kanban-card'
import type { KanbanCard as KanbanCardType } from '@/types'

interface KanbanBoardProps {
  onCardClick?: (card: KanbanCardType) => void
  onAddLead?: (stageId: string) => void
  onMoveLead?: (leadId: string, stageId: string, newOrder: number) => void
  filteredStages?: PipelineStage[]
  onAddStage?: () => void
  onRenameStage?: (stageId: string, name: string) => void
  onUpdateStageColor?: (stageId: string, color: string) => void
  onDeleteStage?: (stageId: string) => void
}

export function KanbanBoard({ onCardClick, onAddLead, onMoveLead, filteredStages, onAddStage, onRenameStage, onUpdateStageColor, onDeleteStage }: KanbanBoardProps) {
  const { stages, setStages, setDraggedLead } = usePipelineStore()
  const [activeCard, setActiveCard] = useState<KanbanCardType | null>(null)
  const displayStages = filteredStages || stages

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const findStageByCardId = useCallback(
    (cardId: string): PipelineStage | undefined => {
      return stages.find((stage) =>
        stage.leads.some((lead) => lead.id === cardId)
      )
    },
    [stages]
  )

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event
      const activeId = active.id as string

      setDraggedLead(activeId)

      const stage = findStageByCardId(activeId)
      if (stage) {
        const card = stage.leads.find((l) => l.id === activeId)
        if (card) setActiveCard(card)
      }
    },
    [findStageByCardId, setDraggedLead]
  )

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event
      if (!over) return

      const activeId = active.id as string
      const overId = over.id as string

      const activeStage = findStageByCardId(activeId)
      if (!activeStage) return

      // Check if hovering over a column directly
      const overStage = stages.find((s) => s.id === overId)
      // Or hovering over another card
      const overCardStage = findStageByCardId(overId)

      const targetStage = overStage || overCardStage
      if (!targetStage) return

      // If same column, skip (handled in dragEnd)
      if (activeStage.id === targetStage.id) return

      // Move card between columns during drag
      const newStages = stages.map((stage) => ({
        ...stage,
        leads: [...stage.leads],
      }))

      const fromStage = newStages.find((s) => s.id === activeStage.id)
      const toStage = newStages.find((s) => s.id === targetStage.id)
      if (!fromStage || !toStage) return

      const cardIndex = fromStage.leads.findIndex((l) => l.id === activeId)
      if (cardIndex === -1) return

      const [card] = fromStage.leads.splice(cardIndex, 1)

      // If hovering over a card, insert at that position
      if (overCardStage) {
        const overIndex = toStage.leads.findIndex((l) => l.id === overId)
        toStage.leads.splice(overIndex >= 0 ? overIndex : toStage.leads.length, 0, card)
      } else {
        toStage.leads.push(card)
      }

      setStages(newStages)
    },
    [stages, findStageByCardId, setStages]
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event

      setActiveCard(null)
      setDraggedLead(null)

      if (!over) return

      const activeId = active.id as string
      const overId = over.id as string

      if (activeId === overId) return

      const activeStage = findStageByCardId(activeId)
      if (!activeStage) return

      // Reorder within same column
      if (findStageByCardId(overId)?.id === activeStage.id) {
        const oldIndex = activeStage.leads.findIndex((l) => l.id === activeId)
        const newIndex = activeStage.leads.findIndex((l) => l.id === overId)

        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          const newStages = stages.map((stage) => {
            if (stage.id === activeStage.id) {
              return {
                ...stage,
                leads: arrayMove(stage.leads, oldIndex, newIndex),
              }
            }
            return stage
          })
          setStages(newStages)
        }
      }

      // Notify parent for API call
      const finalStage = findStageByCardId(activeId)
      if (finalStage) {
        const newOrder = finalStage.leads.findIndex((l) => l.id === activeId)
        onMoveLead?.(activeId, finalStage.id, newOrder)
      }
    },
    [stages, findStageByCardId, setStages, setDraggedLead, onMoveLead]
  )

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div
        className={cn(
          'flex gap-3 pb-4 overflow-x-auto h-full',
          '[&::-webkit-scrollbar]:h-1.5',
          '[&::-webkit-scrollbar-track]:bg-transparent',
          '[&::-webkit-scrollbar-thumb]:bg-gray-200',
          '[&::-webkit-scrollbar-thumb]:rounded-full',
          '[&::-webkit-scrollbar-thumb:hover]:bg-gray-300'
        )}
      >
        {displayStages.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            onCardClick={onCardClick}
            onAddLead={onAddLead}
            onRenameStage={onRenameStage}
            onUpdateStageColor={onUpdateStageColor}
            onDeleteStage={onDeleteStage}
          />
        ))}

        {/* Add stage column button */}
        {onAddStage && (
          <button
            onClick={onAddStage}
            className="flex flex-col items-center justify-center shrink-0 w-[300px] min-h-[200px] rounded-lg border-2 border-dashed border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30 text-gray-400 hover:text-indigo-500 transition-all duration-200 group"
          >
            <Plus className="w-6 h-6 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium">Nova etapa</span>
          </button>
        )}
      </div>

      {/* Drag overlay - rendered outside of columns for smooth cross-column dragging */}
      <DragOverlay dropAnimation={{
        duration: 200,
        easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
      }}>
        {activeCard ? (
          <KanbanCard card={activeCard} isDragOverlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
