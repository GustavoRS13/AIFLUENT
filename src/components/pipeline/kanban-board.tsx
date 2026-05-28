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
import { cn } from '@/lib/utils'
import { usePipelineStore, type PipelineStage } from '@/stores/pipeline-store'
import { KanbanColumn } from './kanban-column'
import { KanbanCard } from './kanban-card'
import type { KanbanCard as KanbanCardType } from '@/types'

interface KanbanBoardProps {
  onCardClick?: (card: KanbanCardType) => void
  onAddLead?: (stageId: string) => void
  onMoveLead?: (leadId: string, stageId: string, newOrder: number) => void
}

export function KanbanBoard({ onCardClick, onAddLead, onMoveLead }: KanbanBoardProps) {
  const { stages, setStages, setDraggedLead } = usePipelineStore()
  const [activeCard, setActiveCard] = useState<KanbanCardType | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
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
          'flex gap-3 pb-4 overflow-x-auto',
          // Custom horizontal scrollbar
          '[&::-webkit-scrollbar]:h-1.5',
          '[&::-webkit-scrollbar-track]:bg-transparent',
          '[&::-webkit-scrollbar-thumb]:bg-gray-100',
          '[&::-webkit-scrollbar-thumb]:rounded-full',
          '[&::-webkit-scrollbar-thumb:hover]:bg-gray-100'
        )}
      >
        {stages.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            onCardClick={onCardClick}
            onAddLead={onAddLead}
          />
        ))}
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
