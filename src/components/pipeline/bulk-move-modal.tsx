"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ArrowRightLeft, Loader2, Check } from "lucide-react";

interface Funnel {
  id: string;
  name: string;
  groupName: string | null;
}
interface NamedId {
  id: string;
  name: string;
}
interface Tag {
  id: string;
  name: string;
}

export function BulkMoveModal({
  sourceStage,
  sourceFunnelName,
  onClose,
  onDone,
}: {
  sourceStage: { id: string; name: string; total: number };
  sourceFunnelName?: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [destFunnel, setDestFunnel] = useState("");
  const [destStages, setDestStages] = useState<NamedId[]>([]);
  const [destStage, setDestStage] = useState("");
  const [selTags, setSelTags] = useState<string[]>([]);
  const [mode, setMode] = useState<"all" | "limit">("all");
  const [limit, setLimit] = useState(100);

  const [preview, setPreview] = useState<number | null>(sourceStage.total);
  const [moving, setMoving] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect -- carregamento */
  useEffect(() => {
    fetch("/api/pipelines")
      .then((r) => r.json())
      .then((d) => setFunnels(d.pipelines || []));
    fetch("/api/tags")
      .then((r) => r.json())
      .then((d) => setTags(d.tags || d || []));
  }, []);

  useEffect(() => {
    if (!destFunnel) {
      setDestStages([]);
      setDestStage("");
      return;
    }
    fetch(`/api/pipeline?pipelineId=${destFunnel}`)
      .then((r) => r.json())
      .then((d) =>
        setDestStages(
          (d?.stages || []).map((s: NamedId) => ({ id: s.id, name: s.name })),
        ),
      );
  }, [destFunnel]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // contagem ao vivo (origem + tags)
  const refreshPreview = useCallback(() => {
    fetch("/api/pipeline/bulk-move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromStageId: sourceStage.id,
        tags: selTags,
        preview: true,
      }),
    })
      .then((r) => r.json())
      .then((d) => setPreview(d.count ?? 0))
      .catch(() => setPreview(null));
  }, [sourceStage.id, selTags]);

  useEffect(() => {
    const t = setTimeout(refreshPreview, 300);
    return () => clearTimeout(t);
  }, [refreshPreview]);

  const matched = preview ?? 0;
  const willMove = mode === "limit" ? Math.min(limit, matched) : matched;

  function toggleTag(name: string) {
    setSelTags((p) =>
      p.includes(name) ? p.filter((t) => t !== name) : [...p, name],
    );
  }

  async function move() {
    if (!destStage || willMove < 1) return;
    if (!confirm(`Mover ${willMove.toLocaleString("pt-BR")} leads?`)) return;
    setMoving(true);
    setResult(null);
    try {
      const res = await fetch("/api/pipeline/bulk-move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromStageId: sourceStage.id,
          toStageId: destStage,
          tags: selTags,
          limit: mode === "limit" ? limit : undefined,
        }),
      });
      const d = await res.json();
      if (res.ok) {
        setResult(`✅ ${d.moved} leads movidos!`);
        setTimeout(() => {
          onDone();
          onClose();
        }, 900);
      } else {
        setResult(d.error || "Falha ao mover");
      }
    } catch {
      setResult("Falha ao mover");
    } finally {
      setMoving(false);
    }
  }

  const groups: { name: string; items: Funnel[] }[] = [];
  for (const f of funnels) {
    const g = f.groupName || "Sem grupo";
    let b = groups.find((x) => x.name === g);
    if (!b) {
      b = { name: g, items: [] };
      groups.push(b);
    }
    b.items.push(f);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
            <ArrowRightLeft className="h-4 w-4 text-indigo-600" /> Mover leads
            em massa
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Origem */}
        <div className="mb-3 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
          De:{" "}
          <b>
            {sourceFunnelName ? `${sourceFunnelName} · ` : ""}
            {sourceStage.name}
          </b>{" "}
          ({sourceStage.total.toLocaleString("pt-BR")} leads)
        </div>

        {/* Filtro por tags */}
        <label className="text-xs font-medium text-gray-500">
          Filtrar por tags (opcional)
        </label>
        <div className="mt-1 mb-3 flex max-h-24 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-gray-100 p-2">
          {tags.slice(0, 60).map((t) => (
            <button
              key={t.id}
              onClick={() => toggleTag(t.name)}
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                selTags.includes(t.name)
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>

        {/* Quantidade */}
        <label className="text-xs font-medium text-gray-500">Quantidade</label>
        <div className="mt-1 mb-3 space-y-1.5">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={mode === "all"}
              onChange={() => setMode("all")}
            />
            Todos os {matched.toLocaleString("pt-BR")} leads desta seleção
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={mode === "limit"}
              onChange={() => setMode("limit")}
            />
            Apenas os primeiros
            <input
              type="number"
              min={1}
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value) || 1)}
              onFocus={() => setMode("limit")}
              className="w-24 rounded-lg border border-gray-200 px-2 py-1 text-sm"
            />
          </label>
        </div>

        {/* Destino */}
        <label className="text-xs font-medium text-gray-500">
          Mover para (funil → etapa)
        </label>
        <div className="mt-1 grid grid-cols-2 gap-2">
          <select
            value={destFunnel}
            onChange={(e) => setDestFunnel(e.target.value)}
            className="rounded-lg border border-gray-200 px-2 py-2 text-sm"
          >
            <option value="">Funil…</option>
            {groups.map((g) =>
              g.items.map((f) => (
                <option key={f.id} value={f.id}>
                  {g.name} · {f.name}
                </option>
              )),
            )}
          </select>
          <select
            value={destStage}
            onChange={(e) => setDestStage(e.target.value)}
            disabled={!destFunnel}
            className="rounded-lg border border-gray-200 px-2 py-2 text-sm disabled:bg-gray-50"
          >
            <option value="">Etapa…</option>
            {destStages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={move}
          disabled={moving || !destStage || willMove < 1}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {moving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          Mover {willMove.toLocaleString("pt-BR")} leads
        </button>
        {result && (
          <p className="mt-2 text-center text-sm font-medium text-gray-700">
            {result}
          </p>
        )}
      </div>
    </div>
  );
}
