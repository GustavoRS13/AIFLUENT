"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  RefreshCw,
  Loader2,
  Plus,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePipelineStore, type PipelineStage } from "@/stores/pipeline-store";
import { KanbanBoard } from "@/components/pipeline/kanban-board";
import { LeadOperationPanel } from "@/components/atendimento/lead-operation-panel";
import type { KanbanCard, LeadSource, LeadTemperature } from "@/types";

interface Funnel {
  id: string;
  name: string;
  groupName: string | null;
  isDefault: boolean;
  hidden: boolean;
  leadCount: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapStages(stages: any[]): PipelineStage[] {
  return stages.map((stage) => ({
    id: stage.id,
    name: stage.name,
    color: stage.color,
    order: stage.order,
    isWon: stage.isWon,
    isLost: stage.isLost,
    total: stage._count?.leads ?? (stage.leads || []).length,
    leads: (stage.leads || []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (l: any): KanbanCard => ({
        id: l.id,
        name: [l.firstName, l.lastName].filter(Boolean).join(" "),
        photo: l.avatar ?? null,
        phone: l.phone ?? null,
        whatsapp: l.whatsapp ?? null,
        email: l.email ?? null,
        source: (l.source || "manual") as LeadSource,
        consultant: l.consultant?.name ?? null,
        lastInteraction: l.lastContactAt ?? null,
        temperature: (l.temperature || "warm") as LeadTemperature,
        aiScore: l.aiScore ?? null,
        tags: Array.isArray(l.tags)
          ? l.tags
              .map((t: { tag?: { name?: string } }) => t.tag?.name ?? "")
              .filter(Boolean)
          : [],
        courseInterest: l.courseInterest ?? null,
        status: l.status as KanbanCard["status"],
        entryDate: l.createdAt ?? new Date().toISOString(),
      }),
    ),
  }));
}

export default function PipelinePage() {
  const {
    stages,
    setStages,
    addStage,
    renameStage,
    updateStageColor,
    deleteStage,
  } = usePipelineStore();
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [boardLoading, setBoardLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newGroup, setNewGroup] = useState("");

  const loadFunnels = useCallback(async () => {
    try {
      const res = await fetch("/api/pipelines");
      const d = await res.json();
      const items: Funnel[] = d.pipelines || [];
      setFunnels(items);
      setExpanded((prev) => {
        if (prev.size > 0) return prev;
        return new Set(items.map((f) => f.groupName || "Sem grupo"));
      });
      setSelectedId((cur) =>
        cur && items.some((f) => f.id === cur)
          ? cur
          : (items.find((f) => f.isDefault)?.id ?? items[0]?.id ?? null),
      );
    } catch {
      /* mantém */
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBoard = useCallback(
    async (pid: string) => {
      setBoardLoading(true);
      try {
        const res = await fetch(`/api/pipeline?pipelineId=${pid}`);
        const data = await res.json();
        setStages(mapStages(data?.stages || []));
      } catch {
        setStages([]);
      } finally {
        setBoardLoading(false);
      }
    },
    [setStages],
  );

  /* eslint-disable react-hooks/set-state-in-effect -- carregamento assíncrono */
  useEffect(() => {
    loadFunnels();
  }, [loadFunnels]);

  useEffect(() => {
    if (selectedId) loadBoard(selectedId);
  }, [selectedId, loadBoard]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleMoveLead = useCallback(
    async (leadId: string, stageId: string, newOrder: number) => {
      try {
        await fetch("/api/pipeline", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadId, stageId, newOrder }),
        });
      } catch {
        /* otimista no board */
      }
    },
    [],
  );

  async function createFunnel() {
    if (!newName.trim()) return;
    await fetch("/api/pipelines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName.trim(),
        groupName: newGroup.trim(),
      }),
    });
    setNewOpen(false);
    setNewName("");
    setNewGroup("");
    loadFunnels();
  }

  async function renameFunnel(f: Funnel) {
    const name = window.prompt("Novo nome do funil:", f.name);
    if (!name || name.trim() === f.name) return;
    await fetch(`/api/pipelines/${f.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    setMenuId(null);
    loadFunnels();
  }

  async function deleteFunnel(f: Funnel) {
    if (
      !window.confirm(
        `Excluir o funil "${f.name}"? Os leads dele ficam sem etapa (não são apagados).`,
      )
    )
      return;
    const res = await fetch(`/api/pipelines/${f.id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(d.error || "Não foi possível excluir.");
      return;
    }
    setMenuId(null);
    if (selectedId === f.id) setSelectedId(null);
    loadFunnels();
  }

  function toggleGroup(g: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });
  }

  // Agrupa os funis por groupName (preservando ordem de chegada)
  const groups: { name: string; items: Funnel[] }[] = [];
  for (const f of funnels) {
    const g = f.groupName || "Sem grupo";
    let bucket = groups.find((x) => x.name === g);
    if (!bucket) {
      bucket = { name: g, items: [] };
      groups.push(bucket);
    }
    bucket.items.push(f);
  }

  const selectedFunnel = funnels.find((f) => f.id === selectedId);

  const filteredStages = stages.map((stage) => ({
    ...stage,
    leads: searchQuery.trim()
      ? stage.leads.filter(
          (l) =>
            l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            l.tags.some((t) =>
              t.toLowerCase().includes(searchQuery.toLowerCase()),
            ),
        )
      : stage.leads,
  }));
  // Com busca: conta os carregados filtrados. Sem busca: total real do funil.
  const totalLeads = searchQuery.trim()
    ? filteredStages.reduce((s, st) => s + st.leads.length, 0)
    : stages.reduce((s, st) => s + (st.total ?? st.leads.length), 0);

  return (
    <div className="flex h-[calc(100dvh-4rem)] -m-6">
      {/* Barra de Funis */}
      <div className="hidden lg:flex w-[260px] border-r border-gray-200 bg-white flex-col shrink-0">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Funis
          </span>
          <button
            onClick={() => setNewOpen(true)}
            title="Novo funil"
            className="flex h-6 w-6 items-center justify-center rounded text-indigo-600 hover:bg-indigo-50"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.name} className="mb-1">
                <button
                  onClick={() => toggleGroup(group.name)}
                  className="w-full flex items-center gap-1 px-3 py-1.5 text-left text-xs font-bold uppercase tracking-wide text-gray-500 hover:bg-gray-50"
                >
                  {expanded.has(group.name) ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                  {group.name}
                  <span className="ml-auto text-[10px] text-gray-400">
                    {group.items.length}
                  </span>
                </button>
                {expanded.has(group.name) &&
                  group.items.map((f) => (
                    <div
                      key={f.id}
                      className={cn(
                        "group relative flex items-center pl-7 pr-2 py-1.5 text-sm cursor-pointer transition-colors",
                        selectedId === f.id
                          ? "bg-indigo-50 text-indigo-700 font-medium"
                          : "text-gray-700 hover:bg-gray-50",
                      )}
                      onClick={() => setSelectedId(f.id)}
                    >
                      <span className="truncate flex-1">{f.name}</span>
                      <span className="text-[10px] text-gray-400 mr-1">
                        {f.leadCount}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuId(menuId === f.id ? null : f.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-gray-200"
                      >
                        <MoreVertical className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                      {menuId === f.id && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuId(null);
                            }}
                          />
                          <div className="absolute right-2 top-7 z-50 w-36 rounded-lg border border-gray-200 bg-white shadow-lg py-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                renameFunnel(f);
                              }}
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                            >
                              <Pencil className="w-3.5 h-3.5" /> Renomear
                            </button>
                            {!f.isDefault && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteFunnel(f);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Excluir
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-6 py-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-gray-400">
                Funil
              </p>
              <h1 className="text-xl font-bold text-gray-900">
                {selectedFunnel?.name || "Pipeline"}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar lead..."
                className="pl-9 pr-4 py-2 w-64 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 bg-gray-50"
              />
            </div>
            <span className="text-sm text-gray-500">
              <span className="font-medium text-gray-900">
                {totalLeads.toLocaleString("pt-BR")}
              </span>{" "}
              oportunidades
            </span>
            <button
              onClick={() => selectedId && loadBoard(selectedId)}
              className="ml-auto p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <RefreshCw
                className={cn("w-4 h-4", boardLoading && "animate-spin")}
              />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden px-4 py-4 bg-gray-50">
          {boardLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full"
            >
              <KanbanBoard
                filteredStages={filteredStages}
                onMoveLead={handleMoveLead}
                onAddLead={() => {}}
                onCardClick={(card) => setSelectedLeadId(card.id)}
                onAddStage={() =>
                  addStage(`Nova Etapa ${stages.length + 1}`, "#6366f1")
                }
                onRenameStage={renameStage}
                onUpdateStageColor={updateStageColor}
                onDeleteStage={deleteStage}
              />
            </motion.div>
          )}
        </div>
      </div>

      {/* Modal novo funil */}
      {newOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={() => setNewOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">Novo funil</h3>
              <button onClick={() => setNewOpen(false)}>
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <label className="text-xs text-gray-500">Nome</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex.: Prospecção ativa"
              className="mt-1 mb-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
            />
            <label className="text-xs text-gray-500">Grupo</label>
            <input
              value={newGroup}
              onChange={(e) => setNewGroup(e.target.value)}
              placeholder="Ex.: IM, B2C, B2B..."
              list="grupos"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
            />
            <datalist id="grupos">
              {groups.map((g) => (
                <option key={g.name} value={g.name} />
              ))}
            </datalist>
            <p className="mt-2 text-[11px] text-gray-400">
              O funil nasce com as 7 etapas padrão (Base → Perdido).
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setNewOpen(false)}
                className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={createFunnel}
                disabled={!newName.trim()}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                Criar funil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slide-over do lead */}
      <AnimatePresence>
        {selectedLeadId && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/20"
              onClick={() => setSelectedLeadId(null)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed right-0 top-0 z-50 h-full w-[380px] bg-white border-l border-gray-200 shadow-xl overflow-y-auto"
            >
              <LeadOperationPanel
                leadId={selectedLeadId}
                onClose={() => setSelectedLeadId(null)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
