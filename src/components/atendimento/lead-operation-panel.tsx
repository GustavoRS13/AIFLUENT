"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Building,
  ChevronDown,
  DollarSign,
  Loader2,
  RefreshCw,
  X,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { AICopilot } from "./ai-copilot";
import { StageSelector } from "./stage-selector";
import { DealStatusButtons } from "./deal-status-buttons";
import { NotesSection } from "./notes-section";
import { HistorySection } from "./history-section";
import { TasksSection } from "./tasks-section";
import { QuickActionsBar } from "./quick-actions-bar";
import { TransferButton } from "./transfer-button";

interface LeadData {
  id: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  temperature?: string | null;
  score?: number | null;
  stageId?: string | null;
  city?: string | null;
  state?: string | null;
  courseInterest?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  consultant?: { id: string; name: string; avatar?: string | null } | null;
  stage?: { id: string; name: string; color: string } | null;
  tags?: Array<{ tag: { id: string; name: string; color: string } }>;
  deals?: Array<{
    id: string;
    title: string;
    value?: number | null;
    status: string;
    probability?: number | null;
    stage?: { id: string; name: string; color: string } | null;
  }>;
  activities?: Array<{
    id: string;
    type: string;
    title: string;
    description?: string | null;
    createdAt: string;
    userId?: string | null;
    user?: { id: string; name: string } | null;
  }>;
  tasks?: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate?: string | null;
    assignee?: { id: string; name: string } | null;
  }>;
}

interface LeadOperationPanelProps {
  leadId: string | null;
  className?: string;
  onClose?: () => void;
}

export function LeadOperationPanel({
  leadId,
  className,
  onClose,
}: LeadOperationPanelProps) {
  const [lead, setLead] = useState<LeadData | null>(null);
  const [loading, setLoading] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [activeDealIdx, setActiveDealIdx] = useState(0);
  const [newDealOpen, setNewDealOpen] = useState(false);
  const [newDealTitle, setNewDealTitle] = useState("");
  const [newDealValue, setNewDealValue] = useState("");
  const [creatingDeal, setCreatingDeal] = useState(false);
  const [newTag, setNewTag] = useState("");

  const fetchLead = useCallback(async () => {
    if (!leadId) {
      setLead(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/leads/${leadId}`);
      if (res.ok) {
        const data = await res.json();
        setLead(data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  async function addTag() {
    const name = newTag.trim();
    if (!name || !leadId) return;
    setNewTag("");
    await fetch(`/api/leads/${leadId}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }).catch(() => {});
    fetchLead();
  }

  async function removeTag(tagId: string) {
    if (!leadId) return;
    await fetch(`/api/leads/${leadId}/tags?tagId=${tagId}`, {
      method: "DELETE",
    }).catch(() => {});
    fetchLead();
  }

  useEffect(() => {
    fetchLead();
  }, [fetchLead]);

  if (!leadId) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center p-6 text-center",
          className,
        )}
      >
        <User className="h-10 w-10 text-gray-300 mb-3" />
        <p className="text-sm font-medium text-gray-500">
          Selecione uma conversa
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Os dados do lead aparecerão aqui
        </p>
      </div>
    );
  }

  if (loading && !lead) {
    return (
      <div className={cn("flex items-center justify-center p-6", className)}>
        <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center p-6 text-center",
          className,
        )}
      >
        <User className="h-10 w-10 text-gray-300 mb-3" />
        <p className="text-sm font-medium text-gray-500">Lead nao encontrado</p>
      </div>
    );
  }

  const fullName = [lead.firstName, lead.lastName].filter(Boolean).join(" ");
  const notes = (lead.activities || []).filter((a) => a.type === "note");
  const activities = lead.activities || [];
  const tasks = lead.tasks || [];
  const deals = lead.deals || [];
  const activeDeal = deals[activeDealIdx] || deals[0] || null;

  async function handleCreateDeal() {
    if (!lead || !newDealTitle.trim() || !lead.stageId) return;
    const currentLead = lead;
    setCreatingDeal(true);
    try {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newDealTitle.trim(),
          value: newDealValue ? parseFloat(newDealValue) : undefined,
          leadId: currentLead.id,
          stageId: currentLead.stageId,
        }),
      });
      if (res.ok) {
        toast.success("Negocio criado!");
        setNewDealTitle("");
        setNewDealValue("");
        setNewDealOpen(false);
        await fetchLead();
        setActiveDealIdx(deals.length); // select the newly created deal
      } else {
        toast.error("Erro ao criar negocio");
      }
    } catch {
      toast.error("Erro de conexao");
    } finally {
      setCreatingDeal(false);
    }
  }

  return (
    <div className={cn("flex flex-col h-full overflow-y-auto", className)}>
      {/* Header */}
      <div className="border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-500">
              <span className="text-xs font-bold text-white">
                {lead.firstName?.[0]?.toUpperCase() || "?"}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {fullName}
              </p>
              {lead.company && (
                <p className="text-[10px] text-gray-500 truncate">
                  {lead.company}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={fetchLead}
              disabled={loading}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              title="Atualizar"
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", loading && "animate-spin")}
              />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                title="Fechar"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <QuickActionsBar
          phone={lead.phone || lead.whatsapp}
          email={lead.email}
          leadId={lead.id}
          onCallLogged={fetchLead}
          className="mt-3"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {/* AI Copilot */}
        <AICopilot
          temperature={lead.temperature}
          score={lead.score}
          stageName={lead.stage?.name}
          lastContactAt={lead.updatedAt}
          leadId={lead.id}
          onRefresh={fetchLead}
        />

        {/* Tags */}
        <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Tags
          </p>
          <div className="flex flex-wrap gap-1.5">
            {(lead.tags || []).map((lt) => (
              <span
                key={lt.tag.id}
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                style={{
                  backgroundColor: (lt.tag.color || "#6366f1") + "22",
                  color: lt.tag.color || "#6366f1",
                }}
              >
                {lt.tag.name}
                <button
                  onClick={() => removeTag(lt.tag.id)}
                  className="hover:opacity-60"
                  title="Remover"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            {(!lead.tags || lead.tags.length === 0) && (
              <span className="text-xs text-gray-400">Sem tags</span>
            )}
          </div>
          <div className="flex gap-1">
            <input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addTag();
              }}
              placeholder="Adicionar tag..."
              className="flex-1 rounded-lg border border-gray-200 px-2 py-1 text-xs focus:border-indigo-400 focus:outline-none"
            />
            <button
              onClick={addTag}
              className="rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-500"
            >
              Adicionar
            </button>
          </div>
        </div>

        {/* Deal Management */}
        <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Negocios {deals.length > 0 && `(${deals.length})`}
            </p>
            <StageSelector
              currentStageId={lead.stageId || null}
              leadId={lead.id}
              onStageChange={fetchLead}
            />
          </div>

          {/* Deal tabs when multiple deals */}
          {deals.length > 1 && (
            <div className="flex flex-wrap gap-1">
              {deals.map((deal, idx) => (
                <button
                  key={deal.id}
                  onClick={() => setActiveDealIdx(idx)}
                  className={cn(
                    "rounded-lg px-2 py-1 text-[11px] font-medium transition-colors truncate max-w-[120px]",
                    idx === activeDealIdx
                      ? "bg-sky-100 text-sky-700 border border-sky-200"
                      : "bg-gray-50 text-gray-500 border border-gray-100 hover:bg-gray-100",
                  )}
                  title={deal.title}
                >
                  {deal.title.length > 15
                    ? deal.title.slice(0, 15) + "..."
                    : deal.title}
                </button>
              ))}
            </div>
          )}

          {activeDeal ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">
                  {activeDeal.title}
                </span>
                {activeDeal.value != null && (
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(activeDeal.value)}
                  </span>
                )}
              </div>
              {activeDeal.probability != null && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-sky-500 transition-all"
                      style={{ width: `${activeDeal.probability}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-500">
                    {activeDeal.probability}%
                  </span>
                </div>
              )}
              <DealStatusButtons
                dealId={activeDeal.id}
                currentStatus={activeDeal.status}
                onStatusChange={fetchLead}
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <DollarSign className="h-3.5 w-3.5" />
              Nenhum negocio vinculado
            </div>
          )}

          {/* New deal form */}
          <AnimatePresence>
            {newDealOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 space-y-2">
                  <input
                    value={newDealTitle}
                    onChange={(e) => setNewDealTitle(e.target.value)}
                    placeholder="Titulo do negocio"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:border-sky-400 focus:outline-none"
                  />
                  <input
                    value={newDealValue}
                    onChange={(e) => setNewDealValue(e.target.value)}
                    placeholder="Valor (R$)"
                    type="number"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:border-sky-400 focus:outline-none"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCreateDeal}
                      disabled={creatingDeal || !newDealTitle.trim()}
                      className="flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-sky-600 disabled:opacity-50"
                    >
                      {creatingDeal ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Plus className="h-3 w-3" />
                      )}
                      Criar
                    </button>
                    <button
                      onClick={() => {
                        setNewDealOpen(false);
                        setNewDealTitle("");
                        setNewDealValue("");
                      }}
                      className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!newDealOpen && (
            <button
              onClick={() => setNewDealOpen(true)}
              className="flex items-center gap-1.5 text-xs text-sky-600 hover:text-sky-700 transition-colors font-medium"
            >
              <Plus className="h-3.5 w-3.5" />
              Novo Negocio
            </button>
          )}

          {/* Consultant */}
          {lead.consultant && (
            <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100">
                <User className="h-3 w-3 text-gray-400" />
              </div>
              <span className="text-xs text-gray-600">
                Responsavel: {lead.consultant.name}
              </span>
            </div>
          )}

          {/* Transfer */}
          <div className="pt-1 border-t border-gray-100">
            <TransferButton
              entityType="lead"
              entityId={lead.id}
              onTransferred={fetchLead}
            />
          </div>
        </div>

        {/* Contact info accordion */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <button
            onClick={() => setContactOpen((o) => !o)}
            className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-gray-50"
          >
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-sky-500" />
              <span className="text-sm font-medium text-gray-900">Contato</span>
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-gray-400 transition-transform",
                contactOpen && "rotate-180",
              )}
            />
          </button>
          <AnimatePresence>
            {contactOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="border-t border-gray-100 px-4 py-3 space-y-2">
                  {lead.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Phone className="h-3.5 w-3.5 text-gray-400" />
                      <a
                        href={`tel:${lead.phone}`}
                        className="hover:text-sky-600 transition-colors"
                      >
                        {lead.phone}
                      </a>
                    </div>
                  )}
                  {lead.whatsapp && lead.whatsapp !== lead.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Phone className="h-3.5 w-3.5 text-emerald-500" />
                      <span>{lead.whatsapp}</span>
                    </div>
                  )}
                  {lead.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Mail className="h-3.5 w-3.5 text-gray-400" />
                      <a
                        href={`mailto:${lead.email}`}
                        className="hover:text-sky-600 transition-colors truncate"
                      >
                        {lead.email}
                      </a>
                    </div>
                  )}
                  {(lead.city || lead.state) && (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <MapPin className="h-3.5 w-3.5 text-gray-400" />
                      <span>
                        {[lead.city, lead.state].filter(Boolean).join(", ")}
                      </span>
                    </div>
                  )}
                  {lead.company && (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Building className="h-3.5 w-3.5 text-gray-400" />
                      <span>
                        {lead.company}
                        {lead.jobTitle ? ` - ${lead.jobTitle}` : ""}
                      </span>
                    </div>
                  )}
                  {lead.courseInterest && (
                    <div className="mt-2 rounded-lg bg-sky-50 border border-sky-100 px-3 py-1.5">
                      <p className="text-[10px] text-sky-500 font-medium">
                        Interesse
                      </p>
                      <p className="text-xs text-gray-700">
                        {lead.courseInterest}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Notes Section */}
        <NotesSection leadId={lead.id} notes={notes} onNoteAdded={fetchLead} />

        {/* History Section */}
        <HistorySection activities={activities} />

        {/* Tasks Section */}
        <TasksSection
          leadId={lead.id}
          tasks={tasks}
          onTaskCreated={fetchLead}
          onTaskToggled={fetchLead}
        />
      </div>
    </div>
  );
}
