'use client'

import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown,
  ChevronRight,
  Plus,
} from 'lucide-react'
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

  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
    data: { type: 'column', stageId: stage.id },
  })

  const cardIds = stage.leads.map((l) => l.id)

  return (
    <div
      className={cn(
        'flex flex-col shrink-0 w-[300px] rounded-xl',
        'bg-gray-50 border border-gray-200',
        'transition-all duration-200',
        isOver && 'border-indigo-500/30 bg-gray-50 shadow-lg shadow-indigo-500/5'
      )}
    >
      {/* Colored top border */}
      <div
        className="h-1 rounded-t-xl"
        style={{ backgroundColor: stage.color }}
      />

      {/* Column header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          onClick={() => setCollapsed((prev) => !prev)}
          className="p-0.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>

        <span
          className="h-2 w-2 rounded-full shrink-0"
          style={{ backgroundColor: stage.color }}
        />

        <h3 className="text-sm font-semibold text-gray-800 truncate flex-1">
          {stage.name}
        </h3>

        <span className="flex items-center justify-center min-w-[20px] h-5 rounded-full bg-gray-50 px-1.5 text-[10px] font-bold text-gray-500 tabular-nums border border-gray-200">
          {stage.leads.length}
        </span>
      </div>

      {/* Collapsible cards area */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div
              ref={setNodeRef}
              className={cn(
                'flex flex-col gap-2 px-2 pb-2 min-h-[60px]',
                'overflow-y-auto max-h-[calc(100vh-280px)]',
                // Custom scrollbar
                'scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent',
                '[&::-webkit-scrollbar]:w-1',
                '[&::-webkit-scrollbar-track]:bg-transparent',
                '[&::-webkit-scrollbar-thumb]:bg-gray-100',
                '[&::-webkit-scrollbar-thumb]:rounded-full',
                '[&::-webkit-scrollbar-thumb:hover]:bg-gray-100'
              )}
            >
              <SortableContext
                items={cardIds}
                strategy={verticalListSortingStrategy}
              >
                {stage.leads.map((card) => (
                  <KanbanCard
                    key={card.id}
                    card={card}
                    onClick={() => onCardClick?.(card)}
                  />
                ))}
              </SortableContext>

              {/* Drop zone indicator when empty */}
              {stage.leads.length === 0 && (
                <div
                  className={cn(
                    'flex items-center justify-center h-24 rounded-lg border border-dashed border-gray-200 text-[11px] text-gray-400',
                    isOver && 'border-indigo-500/40 bg-indigo-500/5 text-indigo-400'
                  )}
                >
                  {isOver ? 'Soltar aqui' : 'Nenhum lead'}
                </div>
              )}
            </div>

            {/* Add lead button */}
            <div className="px-2 pb-2">
              <button
                onClick={() => onAddLead?.(stage.id)}
                className={cn(
                  'flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg text-[11px] font-medium',
                  'text-gray-400 hover:text-gray-700 hover:bg-gray-50',
                  'border border-dashed border-gray-200 hover:border-gray-200',
                  'transition-all duration-150'
                )}
              >
                <Plus className="h-3 w-3" />
                Adicionar lead
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed summary */}
      {collapsed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="px-3 pb-2.5 text-[10px] text-gray-400"
        >
          {stage.leads.length} lead{stage.leads.length !== 1 ? 's' : ''}
        </motion.div>
      )}
    </div>
  )
}
