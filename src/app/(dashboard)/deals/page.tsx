"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Handshake,
  DollarSign,
  TrendingUp,
  Trophy,
  LayoutList,
  Columns3,
  Plus,
  Building2,
  X,
  Check,
  Ban,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";

// ── Types ───────────────────────────────────────────────────────────────────

type DealStatus = "open" | "won" | "lost";

interface Stage {
  id: string;
  name: string;
  color?: string;
}

interface Deal {
  id: string;
  title: string;
  value: number;
  probability: number;
  status: DealStatus;
  stageId?: string;
  stageName: string;
  leadName: string;
  company: string;
}

const statusConfig: Record<
  DealStatus,
  { label: string; color: string; bg: string }
> = {
  open: {
    label: "Aberto",
    color: "text-amber-600",
    bg: "bg-amber-50 border-amber-200",
  },
  won: {
    label: "Ganho",
    color: "text-emerald-600",
    bg: "bg-emerald-50 border-emerald-200",
  },
  lost: {
    label: "Perdido",
    color: "text-rose-600",
    bg: "bg-rose-50 border-rose-200",
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDeal(d: any): Deal {
  return {
    id: d.id,
    title: d.title || "Sem titulo",
    value: d.value || 0,
    probability: d.probability ?? 50,
    status: (d.status as DealStatus) || "open",
    stageId: d.stage?.id || d.stageId,
    stageName: d.stage?.name || "—",
    leadName:
      `${d.lead?.firstName || ""} ${d.lead?.lastName || ""}`.trim() ||
      "Sem contato",
    company: d.lead?.company || "—",
  };
}

// ── Component ───────────────────────────────────────────────────────────────

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "pipeline">("table");
  const [statusFilter, setStatusFilter] = useState<"all" | DealStatus>("all");
  const [showNewDeal, setShowNewDeal] = useState(false);

  const loadDeals = useCallback(async () => {
    try {
      const res = await fetch("/api/deals");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDeals((data.deals || []).map(mapDeal));
      setError("");
    } catch {
      setError("Falha ao carregar negocios");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStages = useCallback(async () => {
    try {
      const res = await fetch("/api/pipeline");
      if (!res.ok) return;
      const pipeline = await res.json();
      const s = (pipeline?.stages || []).map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (st: any) => ({ id: st.id, name: st.name, color: st.color }),
      );
      setStages(s);
    } catch {
      /* estágios são opcionais para a tela funcionar */
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect -- carregamento inicial assíncrono */
  useEffect(() => {
    loadDeals();
    loadStages();
  }, [loadDeals, loadStages]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const moveStage = useCallback(
    async (dealId: string, stageId: string) => {
      setBusyId(dealId);
      try {
        await fetch(`/api/deals/${dealId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stageId }),
        });
        await loadDeals();
      } catch {
        setError("Falha ao mover estagio");
      } finally {
        setBusyId(null);
      }
    },
    [loadDeals],
  );

  const closeDeal = useCallback(
    async (dealId: string, status: "won" | "lost") => {
      setBusyId(dealId);
      try {
        await fetch(`/api/deals/${dealId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        await loadDeals();
      } catch {
        setError("Falha ao concluir negocio");
      } finally {
        setBusyId(null);
      }
    },
    [loadDeals],
  );

  const filtered = useMemo(() => {
    if (statusFilter === "all") return deals;
    return deals.filter((d) => d.status === statusFilter);
  }, [statusFilter, deals]);

  const stats = useMemo(() => {
    const open = deals.filter((d) => d.status === "open");
    const won = deals.filter((d) => d.status === "won");
    const totalValue = open.reduce((s, d) => s + d.value, 0);
    const closed = deals.filter((d) => d.status !== "open").length;
    return {
      totalDeals: open.length,
      totalValue,
      avgSize: open.length > 0 ? totalValue / open.length : 0,
      winRate: closed > 0 ? (won.length / closed) * 100 : 0,
    };
  }, [deals]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Negócios</h1>
          <p className="text-sm text-gray-400 mt-1">
            Gerencie suas negociações e acompanhe o pipeline de vendas
          </p>
        </div>
        <button
          onClick={() => setShowNewDeal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Negócio
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: Handshake,
            title: "Negócios Abertos",
            value: stats.totalDeals,
          },
          {
            icon: DollarSign,
            title: "Valor em Aberto",
            value: formatCurrency(stats.totalValue),
          },
          {
            icon: TrendingUp,
            title: "Ticket Médio",
            value: formatCurrency(stats.avgSize),
          },
          {
            icon: Trophy,
            title: "Taxa de Ganho",
            value: `${stats.winRate.toFixed(1)}%`,
          },
        ].map((stat) => (
          <div
            key={stat.title}
            className="bg-white border border-gray-200 rounded-2xl p-6"
          >
            <div className="p-2 bg-indigo-500/10 rounded-lg w-fit mb-4">
              <stat.icon className="w-5 h-5 text-indigo-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-sm text-gray-500 mt-1">{stat.title}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          {(
            [
              { key: "all", label: "Todos" },
              { key: "open", label: "Abertos" },
              { key: "won", label: "Ganhos" },
              { key: "lost", label: "Perdidos" },
            ] as const
          ).map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                statusFilter === f.key
                  ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-0.5">
          <button
            onClick={() => setViewMode("table")}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              viewMode === "table"
                ? "bg-gray-200 text-gray-900"
                : "text-gray-400 hover:text-gray-700",
            )}
            title="Lista"
          >
            <LayoutList className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("pipeline")}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              viewMode === "pipeline"
                ? "bg-gray-200 text-gray-900"
                : "text-gray-400 hover:text-gray-700",
            )}
            title="Pipeline"
          >
            <Columns3 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white border border-gray-200 rounded-2xl py-16 text-center text-sm text-gray-400">
          Carregando negócios...
        </div>
      ) : viewMode === "table" ? (
        <DealsTable
          deals={filtered}
          stages={stages}
          busyId={busyId}
          onMove={moveStage}
          onClose={closeDeal}
        />
      ) : (
        <DealsPipeline deals={filtered} stages={stages} />
      )}

      <AnimatePresence>
        {showNewDeal && (
          <NewDealModal
            stages={stages}
            onClose={() => setShowNewDeal(false)}
            onCreated={() => {
              setShowNewDeal(false);
              loadDeals();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Table View ──────────────────────────────────────────────────────────────

function DealsTable({
  deals,
  stages,
  busyId,
  onMove,
  onClose,
}: {
  deals: Deal[];
  stages: Stage[];
  busyId: string | null;
  onMove: (id: string, stageId: string) => void;
  onClose: (id: string, status: "won" | "lost") => void;
}) {
  if (deals.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl flex flex-col items-center justify-center py-16 text-center">
        <Handshake className="w-10 h-10 text-gray-400 mb-3" />
        <p className="text-sm text-gray-500">Nenhum negócio ainda</p>
        <p className="text-xs text-gray-400 mt-1">
          Crie um negócio a partir de um lead para começar o pipeline.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              {[
                "Negócio",
                "Valor",
                "Empresa",
                "Estágio",
                "Prob.",
                "Status",
                "Ações",
              ].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {deals.map((deal) => (
              <tr
                key={deal.id}
                className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-gray-900">
                    {deal.title}
                  </p>
                  <p className="text-xs text-gray-400">{deal.leadName}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm font-semibold text-emerald-600">
                    {formatCurrency(deal.value)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-sm text-gray-700">
                      {deal.company}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {deal.status === "open" && stages.length > 0 ? (
                    <select
                      value={deal.stageId || ""}
                      disabled={busyId === deal.id}
                      onChange={(e) => onMove(deal.id, e.target.value)}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 focus:outline-none focus:border-indigo-400"
                    >
                      {stages.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs text-gray-500">
                      {deal.stageName}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-gray-500">
                    {deal.probability}%
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border",
                      statusConfig[deal.status].bg,
                      statusConfig[deal.status].color,
                    )}
                  >
                    {statusConfig[deal.status].label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {deal.status === "open" ? (
                    <div className="flex items-center gap-1">
                      <button
                        disabled={busyId === deal.id}
                        onClick={() => onClose(deal.id, "won")}
                        title="Marcar como ganho"
                        className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        disabled={busyId === deal.id}
                        onClick={() => onClose(deal.id, "lost")}
                        title="Marcar como perdido"
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-300">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Pipeline View (por estágio real, somente abertos) ─────────────────────────

function DealsPipeline({ deals, stages }: { deals: Deal[]; stages: Stage[] }) {
  const openDeals = deals.filter((d) => d.status === "open");
  if (stages.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl py-16 text-center text-sm text-gray-400">
        Configure o pipeline para usar a visão por estágios.
      </div>
    );
  }
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {stages.map((stage) => {
        const stageDeals = openDeals.filter((d) => d.stageId === stage.id);
        const stageTotal = stageDeals.reduce((s, d) => s + d.value, 0);
        return (
          <div key={stage.id} className="min-w-[280px] flex-1">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">
                  {stage.name}
                </span>
                <span className="text-xs text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-full">
                  {stageDeals.length}
                </span>
              </div>
              <span className="text-xs text-gray-400">
                {formatCurrency(stageTotal)}
              </span>
            </div>
            <div className="space-y-2">
              {stageDeals.map((deal) => (
                <div
                  key={deal.id}
                  className="bg-white border border-gray-200 rounded-xl p-4"
                >
                  <h4 className="text-sm font-medium text-gray-900 leading-tight line-clamp-2">
                    {deal.title}
                  </h4>
                  <p className="text-lg font-bold text-emerald-600 my-2">
                    {formatCurrency(deal.value)}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Building2 className="w-3 h-3 shrink-0" />
                    <span className="truncate">{deal.company}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 truncate">
                    {deal.leadName} · {deal.probability}%
                  </p>
                </div>
              ))}
              {stageDeals.length === 0 && (
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
                  <p className="text-xs text-gray-400">Nenhum negócio</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── New Deal Modal ────────────────────────────────────────────────────────────

interface LeadOption {
  id: string;
  name: string;
}

function NewDealModal({
  stages,
  onClose,
  onCreated,
}: {
  stages: Stage[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [leads, setLeads] = useState<LeadOption[]>([]);
  const [form, setForm] = useState({
    title: "",
    value: "",
    probability: "50",
    leadId: "",
    stageId: stages[0]?.id || "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/api/leads?limit=100")
      .then((r) => r.json())
      .then((d) => {
        setLeads(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (d.leads || []).map((l: any) => ({
            id: l.id,
            name:
              `${l.firstName || ""} ${l.lastName || ""}`.trim() || "Sem nome",
          })),
        );
      })
      .catch(() => {});
  }, []);

  const canSubmit =
    !!form.title.trim() && !!form.leadId && !!form.stageId && !saving;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setErr("");
    try {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          value: Number(form.value) || 0,
          probability: Number(form.probability) || 50,
          leadId: form.leadId,
          stageId: form.stageId,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErr((d as { error?: string }).error || "Falha ao criar negocio");
        setSaving(false);
        return;
      }
      onCreated();
    } catch {
      setErr("Erro de conexao");
      setSaving(false);
    }
  };

  const inputClass =
    "w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none transition-colors";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-lg bg-white border border-gray-200 rounded-2xl shadow-2xl"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Novo Negócio</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-500 mb-2">Título *</label>
            <input
              value={form.title}
              onChange={(e) =>
                setForm((p) => ({ ...p, title: e.target.value }))
              }
              placeholder="Ex: Plano Anual - Business English"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-2">Lead *</label>
            <select
              value={form.leadId}
              onChange={(e) =>
                setForm((p) => ({ ...p, leadId: e.target.value }))
              }
              className={inputClass}
            >
              <option value="">Selecione um lead</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
            {leads.length === 0 && (
              <p className="text-xs text-gray-400 mt-1">
                Nenhum lead disponível — cadastre um lead primeiro.
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-500 mb-2">
                Valor (R$)
              </label>
              <input
                type="number"
                value={form.value}
                onChange={(e) =>
                  setForm((p) => ({ ...p, value: e.target.value }))
                }
                placeholder="0"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-2">
                Probabilidade (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={form.probability}
                onChange={(e) =>
                  setForm((p) => ({ ...p, probability: e.target.value }))
                }
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-2">
              Estágio *
            </label>
            <select
              value={form.stageId}
              onChange={(e) =>
                setForm((p) => ({ ...p, stageId: e.target.value }))
              }
              className={inputClass}
            >
              <option value="">Selecione um estágio</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          {err && <p className="text-sm text-rose-500">{err}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={cn(
              "px-5 py-2.5 text-white text-sm font-medium rounded-xl transition-colors",
              canSubmit
                ? "bg-indigo-600 hover:bg-indigo-500"
                : "bg-gray-300 cursor-not-allowed",
            )}
          >
            {saving ? "Criando..." : "Criar Negócio"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
