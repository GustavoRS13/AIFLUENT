"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { motion, AnimatePresence } from "framer-motion";
import { MoreHorizontal, Plus, Pencil, Palette, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { KanbanCard } from "./kanban-card";
import type { PipelineStage } from "@/stores/pipeline-store";
import type { KanbanCard as KanbanCardType } from "@/types";

const STAGE_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#ec4899",
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#10b981",
  "#06b6d4",
  "#3b82f6",
];

interface KanbanColumnProps {
  stage: PipelineStage;
  onCardClick?: (card: KanbanCardType) => void;
  onAddLead?: (stageId: string) => void;
  onRenameStage?: (stageId: string, name: string) => void;
  onUpdateStageColor?: (stageId: string, color: string) => void;
  onDeleteStage?: (stageId: string) => void;
}

export function KanbanColumn({
  stage,
  onCardClick,
  onAddLead,
  onRenameStage,
  onUpdateStageColor,
  onDeleteStage,
}: KanbanColumnProps) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(stage.name);
  const [menuOpen, setMenuOpen] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
    data: { type: "column", stageId: stage.id },
  });
  const cardIds = stage.leads.map((l) => l.id);
  const totalValue = stage.leads.reduce((s, l) => s + (l.dealValue || 0), 0);
  const canDelete = stage.leads.length === 0;

  // Auto-focus input when entering edit mode
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setColorPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const startEditing = useCallback(() => {
    setEditName(stage.name);
    setEditing(true);
    setMenuOpen(false);
  }, [stage.name]);

  const commitRename = useCallback(() => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== stage.name) {
      onRenameStage?.(stage.id, trimmed);
    }
    setEditing(false);
  }, [editName, stage.name, stage.id, onRenameStage]);

  const cancelEditing = useCallback(() => {
    setEditName(stage.name);
    setEditing(false);
  }, [stage.name]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commitRename();
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancelEditing();
      }
    },
    [commitRename, cancelEditing],
  );

  return (
    <div
      className={cn(
        "flex flex-col shrink-0 w-[300px] rounded-lg bg-white border border-gray-200 h-full",
        "transition-all duration-200",
        isOver &&
          "border-indigo-400 shadow-lg shadow-indigo-500/10 bg-indigo-50/30",
      )}
    >
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {/* Color dot */}
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: stage.color }}
            />
            {editing ? (
              <input
                ref={inputRef}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={commitRename}
                onKeyDown={handleKeyDown}
                className="text-sm font-semibold text-gray-800 bg-white border border-indigo-300 rounded px-1.5 py-0.5 outline-none focus:ring-2 focus:ring-indigo-500/20 w-full min-w-0"
              />
            ) : (
              <h3
                className="text-sm font-semibold text-gray-800 truncate cursor-default select-none"
                onDoubleClick={startEditing}
                title="Clique duas vezes para editar"
              >
                {stage.name}
              </h3>
            )}
            <span className="flex items-center justify-center min-w-[24px] h-5 rounded-full bg-gray-100 px-1.5 text-[11px] font-bold text-gray-500 tabular-nums shrink-0">
              {(stage.total ?? stage.leads.length).toLocaleString("pt-BR")}
            </span>
          </div>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => {
                setMenuOpen(!menuOpen);
                setColorPickerOpen(false);
              }}
              className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 4, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.95 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1 overflow-hidden"
                >
                  <button
                    onClick={startEditing}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Renomear
                  </button>
                  <button
                    onClick={() => setColorPickerOpen(!colorPickerOpen)}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Palette className="w-3.5 h-3.5" /> Alterar cor
                  </button>
                  <AnimatePresence>
                    {colorPickerOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="grid grid-cols-5 gap-1.5 px-3 py-2 border-t border-gray-100">
                          {STAGE_COLORS.map((color) => (
                            <button
                              key={color}
                              onClick={() => {
                                onUpdateStageColor?.(stage.id, color);
                                setColorPickerOpen(false);
                                setMenuOpen(false);
                              }}
                              className={cn(
                                "w-6 h-6 rounded-full border-2 transition-all hover:scale-110",
                                stage.color === color
                                  ? "border-gray-800 ring-2 ring-gray-300"
                                  : "border-transparent",
                              )}
                              style={{ backgroundColor: color }}
                              title={color}
                            />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div className="border-t border-gray-100 mt-1 pt-1">
                    <button
                      onClick={() => {
                        if (canDelete) {
                          onDeleteStage?.(stage.id);
                          setMenuOpen(false);
                        }
                      }}
                      disabled={!canDelete}
                      className={cn(
                        "flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors",
                        canDelete
                          ? "text-rose-600 hover:bg-rose-50"
                          : "text-gray-300 cursor-not-allowed",
                      )}
                      title={
                        canDelete
                          ? "Excluir etapa"
                          : "Remova os leads antes de excluir"
                      }
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Excluir
                      {!canDelete && (
                        <span className="text-[10px] text-gray-400 ml-auto">
                          tem leads
                        </span>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        {totalValue > 0 && (
          <p className="text-xs text-gray-400 mt-0.5">
            R${totalValue.toLocaleString("pt-BR")}
          </p>
        )}
      </div>

      {/* Cards */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-col gap-2 p-2 min-h-[80px] flex-1",
          "overflow-y-auto max-h-[calc(100vh-320px)]",
          "[&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full",
        )}
      >
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {stage.leads.map((card) => (
            <KanbanCard
              key={card.id}
              card={card}
              onClick={() => onCardClick?.(card)}
            />
          ))}
        </SortableContext>

        {stage.leads.length === 0 && (
          <div
            className={cn(
              "flex items-center justify-center h-20 rounded-lg border border-dashed border-gray-200 text-xs text-gray-400",
              isOver && "border-indigo-400 bg-indigo-50 text-indigo-500",
            )}
          >
            {isOver ? "Soltar aqui" : "Nenhum lead"}
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
  );
}
