'use client'

import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { motion, AnimatePresence } from 'framer-motion'
import { MoreHorizontal, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { KanbanCard } from './kanban-card'
import type { PipelineStage } from '@/stores/pipeline-store'
import type { KanbanCard as KanbanCardType } from '@/types'

interface KanbanColumnProps {
  stage: PipelineStage
  onCardClick?: (card: KanbanCardType) => void
  onAddLead?: (stageId: string) => void
}

export function KanbanColumn({ stage, onCardClick, onAddLead }: KanbanColumnProps) {
  const [collapsed, setCollapsed] = useState(false)
  const { setNodeRef, isOver } = useDroppable({ id: stage.id, data: { type: 'column', stageId: stage.id } })
  const cardIds = stage.leads.map((l) => l.id)
  const totalValue = stage.leads.reduce((s, l) => s + (l.dealValue || 0), 0)

  return (
    <div className={cn(
      'flex flex-col shrink-0 w-[300px] rounded-lg bg-white border border-gray-200',
      'transition-all duration-200',
      isOver && 'border-indigo-400 shadow-lg shadow-indigo-500/10'
    )}>
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-800">{stage.name}</h3>
            <span className="flex items-center justify-center min-w-[24px] h-5 rounded-full bg-gray-100 px-1.5 text-[11px] font-bold text-gray-500 tabular-nums">
              {stage.leads.length}
            </span>
          </div>
          <button className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
        {totalValue > 0 && (
          <p className="text-xs text-gray-400 mt-0.5">R${totalValue.toLocaleString('pt-BR')}</p>
        )}
      </div>

      {/* Cards */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex flex-col gap-2 p-2 min-h-[80px] flex-1',
          'overflow-y-auto max-h-[calc(100vh-320px)]',
          '[&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full'
        )}
      >
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {stage.leads.map((card) => (
            <KanbanCard key={card.id} card={card} onClick={() => onCardClick?.(card)} />
          ))}
        </SortableContext>

        {stage.leads.length === 0 && (
          <div className={cn(
            'flex items-center justify-center h-20 rounded-lg border border-dashed border-gray-200 text-xs text-gray-400',
            isOver && 'border-indigo-400 bg-indigo-50 text-indigo-500'
          )}>
            {isOver ? 'Soltar aqui' : 'Nenhum lead'}
          </div>
        )}
      </div>

      {/* Add button */}
      <div className="px-2 pb-2">
        <button
          onClick={() => onAddLead?.(stage.id)}
          className="flex items-center justify-center gap-1 w-full py-1.5 rounded-lg text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 border border-dashed border-gray-200 hover:border-gray-300 transition-all"
        >
          <Plus className="h-3 w-3" /> Adicionar
        </button>
      </div>
    </div>
  )
}
