"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Send,
  Users,
  Loader2,
  Pause,
  Play,
  X,
  Tag as TagIcon,
  GitBranch,
  Filter,
  FlaskConical,
  Trash2,
} from "lucide-react";

interface Tag {
  id: string;
  name: string;
  leadCount?: number;
}
interface Funnel {
  id: string;
  name: string;
  groupName: string | null;
}
interface TemplateT {
  name: string;
  language: string;
  category?: string;
}
interface JobRow {
  id: string;
  name: string;
  templateName: string;
  status: string;
  dryRun: boolean;
  total: number;
  sent: number;
  failed: number;
  createdAt: string;
}

const SOURCES = [
  { v: "", l: "Qualquer origem" },
  { v: "whatsapp", l: "WhatsApp" },
  { v: "meta_ads", l: "Meta Ads" },
  { v: "manual", l: "Manual" },
  { v: "clint", l: "Clint (migrados)" },
  { v: "api", l: "API" },
];

export function BroadcastConsole() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [stages, setStages] = useState<{ id: string; name: string }[]>([]);
  const [templates, setTemplates] = useState<TemplateT[]>([]);

  // segmentação
  const [consultants, setConsultants] = useState<
    { id: string; name: string }[]
  >([]);
  const [departments, setDepartments] = useState<
    { id: string; name: string }[]
  >([]);
  const [selTags, setSelTags] = useState<string[]>([]);
  const [funnelId, setFunnelId] = useState("");
  const [stageId, setStageId] = useState("");
  const [source, setSource] = useState("");
  const [consultantId, setConsultantId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [createdAfter, setCreatedAfter] = useState("");
  const [preview, setPreview] = useState<number | null>(null);
  const [previewing, setPreviewing] = useState(false);

  // disparo
  const [name, setName] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [language, setLanguage] = useState("pt_BR");
  const [dryRun, setDryRun] = useState(true);
  const [creating, setCreating] = useState(false);

  // job em execução
  const [job, setJob] = useState<{
    id: string;
    status: string;
    total: number;
    sent: number;
    failed: number;
    pending: number;
  } | null>(null);
  const runningRef = useRef(false);
  const [jobs, setJobs] = useState<JobRow[]>([]);

  /* eslint-disable react-hooks/set-state-in-effect -- carregamento inicial */
  useEffect(() => {
    fetch("/api/tags")
      .then((r) => r.json())
      .then((d) => setTags(d.tags || d || []));
    fetch("/api/pipelines")
      .then((r) => r.json())
      .then((d) => setFunnels(d.pipelines || []));
    fetch("/api/whatsapp/templates")
      .then((r) => r.json())
      .then((d) => {
        const t = d.templates || d || [];
        setTemplates(t);
        if (t[0]) {
          setTemplateName(t[0].name);
          setLanguage(t[0].language || "pt_BR");
        }
      })
      .catch(() => {});
    fetch("/api/users")
      .then((r) => r.json())
      .then((d) =>
        setConsultants(
          (d.users || d || []).map((u: { id: string; name: string }) => ({
            id: u.id,
            name: u.name,
          })),
        ),
      )
      .catch(() => {});
    fetch("/api/departments")
      .then((r) => r.json())
      .then((d) =>
        setDepartments(
          (d.departments || d.teams || d || []).map(
            (t: { id: string; name: string }) => ({ id: t.id, name: t.name }),
          ),
        ),
      )
      .catch(() => {});
    loadJobs();
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // ao escolher funil, carrega as etapas dele
  /* eslint-disable react-hooks/set-state-in-effect -- reage à seleção do funil */
  useEffect(() => {
    if (!funnelId) {
      setStages([]);
      setStageId("");
      return;
    }
    fetch(`/api/pipeline?pipelineId=${funnelId}`)
      .then((r) => r.json())
      .then((d) =>
        setStages(
          (d?.stages || []).map((s: { id: string; name: string }) => ({
            id: s.id,
            name: s.name,
          })),
        ),
      )
      .catch(() => setStages([]));
  }, [funnelId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const segment = useCallback(() => {
    const seg: Record<string, unknown> = {};
    if (selTags.length) seg.tags = selTags;
    if (stageId) seg.stageIds = [stageId];
    else if (funnelId) seg.pipelineId = funnelId;
    if (source) seg.source = source;
    if (consultantId) seg.consultantId = consultantId;
    if (teamId) seg.teamId = teamId;
    if (createdAfter) seg.createdAfter = createdAfter;
    return seg;
  }, [selTags, stageId, funnelId, source, consultantId, teamId, createdAfter]);

  // preview ao mudar segmentação
  useEffect(() => {
    const seg = segment();
    setPreviewing(true); // eslint-disable-line react-hooks/set-state-in-effect
    const t = setTimeout(() => {
      fetch("/api/broadcasts/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segment: seg }),
      })
        .then((r) => r.json())
        .then((d) => setPreview(d.count ?? 0))
        .catch(() => setPreview(null))
        .finally(() => setPreviewing(false));
    }, 400);
    return () => clearTimeout(t);
  }, [segment]);

  async function loadJobs() {
    const d = await fetch("/api/broadcasts")
      .then((r) => r.json())
      .catch(() => ({}));
    setJobs(d.jobs || []);
  }

  function toggleTag(name: string) {
    setSelTags((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name],
    );
  }

  // loop de processamento (mantém a aba aberta durante o disparo)
  const driveJob = useCallback(async (jobId: string) => {
    runningRef.current = true;
    while (runningRef.current) {
      const res = await fetch(`/api/broadcasts/${jobId}/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      })
        .then((r) => r.json())
        .catch(() => null);
      if (!res) break;
      const prog = await fetch(`/api/broadcasts/${jobId}`).then((r) =>
        r.json(),
      );
      setJob(prog);
      if (["completed", "cancelled", "paused"].includes(prog.status)) break;
      await new Promise((r) => setTimeout(r, 800)); // ritmo (respeita throughput)
    }
    runningRef.current = false;
    loadJobs();
  }, []);

  async function startBroadcast() {
    if (!templateName || !preview) return;
    setCreating(true);
    try {
      const res = await fetch("/api/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || `Disparo ${new Date().toLocaleString("pt-BR")}`,
          templateName,
          languageCode: language,
          dryRun,
          segment: segment(),
        }),
      });
      const d = await res.json();
      if (!res.ok || !d.jobId) {
        alert(d.error || "Falha ao criar disparo");
        return;
      }
      setJob({
        id: d.jobId,
        status: "running",
        total: d.total,
        sent: 0,
        failed: 0,
        pending: d.total,
      });
      driveJob(d.jobId);
    } finally {
      setCreating(false);
    }
  }

  async function control(action: "pause" | "resume" | "cancel") {
    if (!job) return;
    runningRef.current = false; // para o loop local
    await fetch(`/api/broadcasts/${job.id}/control`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (action === "resume") driveJob(job.id);
    else {
      const prog = await fetch(`/api/broadcasts/${job.id}`).then((r) =>
        r.json(),
      );
      setJob(prog);
      loadJobs();
    }
  }

  const pct =
    job && job.total
      ? Math.round(((job.sent + job.failed) / job.total) * 100)
      : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Disparo em massa</h1>
        <p className="text-gray-500">
          Segmente, pré-visualize e dispare um modelo aprovado com fila,
          progresso e pausa/retomada.
        </p>
      </div>

      {/* SEGMENTAÇÃO */}
      <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900">
          <Filter className="h-4 w-4" /> 1. Segmentação
        </h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="flex items-center gap-1 text-xs text-gray-500">
              <GitBranch className="h-3 w-3" /> Funil
            </label>
            <select
              value={funnelId}
              onChange={(e) => setFunnelId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-2 text-sm"
            >
              <option value="">Qualquer funil</option>
              {funnels.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.groupName ? `${f.groupName} · ` : ""}
                  {f.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500">Etapa do funil</label>
            <select
              value={stageId}
              onChange={(e) => setStageId(e.target.value)}
              disabled={!funnelId}
              className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-2 text-sm disabled:bg-gray-50"
            >
              <option value="">Todas as etapas</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500">Origem</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-2 text-sm"
            >
              {SOURCES.map((s) => (
                <option key={s.v} value={s.v}>
                  {s.l}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500">Consultor</label>
            <select
              value={consultantId}
              onChange={(e) => setConsultantId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-2 text-sm"
            >
              <option value="">Qualquer consultor</option>
              {consultants.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500">Departamento / time</label>
            <select
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-2 text-sm"
            >
              <option value="">Qualquer departamento</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500">Criados a partir de</label>
            <input
              type="date"
              value={createdAfter}
              onChange={(e) => setCreatedAfter(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="flex items-center gap-1 text-xs text-gray-500">
            <TagIcon className="h-3 w-3" /> Tags (qualquer uma das selecionadas)
          </label>
          <div className="mt-1 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-gray-100 p-2">
            {tags.slice(0, 60).map((t) => (
              <button
                key={t.id}
                onClick={() => toggleTag(t.name)}
                className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${
                  selTags.includes(t.name)
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-700">
          <Users className="h-4 w-4" />
          {previewing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <span>
              <b>{(preview ?? 0).toLocaleString("pt-BR")}</b> leads com WhatsApp
              nesta segmentação
            </span>
          )}
        </div>
      </div>

      {/* MENSAGEM */}
      <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900">
          <Send className="h-4 w-4" /> 2. Modelo
        </h2>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome do disparo (opcional)"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <select
          value={templateName}
          onChange={(e) => {
            setTemplateName(e.target.value);
            const t = templates.find((x) => x.name === e.target.value);
            if (t) setLanguage(t.language || "pt_BR");
          }}
          className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm"
        >
          {templates.length === 0 && (
            <option value="">Nenhum modelo aprovado</option>
          )}
          {templates.map((t) => (
            <option key={`${t.name}-${t.language}`} value={t.name}>
              {t.name} ({t.language})
            </option>
          ))}
        </select>
      </div>

      {/* DISPARAR */}
      <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={dryRun}
            onChange={(e) => setDryRun(e.target.checked)}
          />
          <FlaskConical className="h-4 w-4 text-amber-500" />
          Modo teste (dry-run) — não envia ao WhatsApp, só simula
        </label>
        {!job && (
          <button
            onClick={startBroadcast}
            disabled={creating || !templateName || !preview}
            className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 ${
              dryRun
                ? "bg-amber-500 hover:bg-amber-400"
                : "bg-emerald-600 hover:bg-emerald-500"
            }`}
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {dryRun
              ? "Simular disparo (teste)"
              : `Disparar para ${(preview ?? 0).toLocaleString("pt-BR")}`}
          </button>
        )}

        {/* PROGRESSO */}
        {job && (
          <div className="space-y-3 rounded-xl border border-gray-200 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-gray-900">
                {job.status === "completed"
                  ? "✅ Concluído"
                  : job.status === "cancelled"
                    ? "Cancelado"
                    : job.status === "paused"
                      ? "Pausado"
                      : "Enviando..."}
              </span>
              <span className="text-gray-500">{pct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex gap-4 text-xs text-gray-600">
              <span>✅ {job.sent.toLocaleString("pt-BR")} enviados</span>
              <span>⚠️ {job.failed} falhas</span>
              <span>⏳ {job.pending.toLocaleString("pt-BR")} restantes</span>
            </div>
            <div className="flex gap-2">
              {job.status === "running" && (
                <button
                  onClick={() => control("pause")}
                  className="flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
                >
                  <Pause className="h-3.5 w-3.5" /> Pausar
                </button>
              )}
              {job.status === "paused" && (
                <button
                  onClick={() => control("resume")}
                  className="flex items-center gap-1 rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-200"
                >
                  <Play className="h-3.5 w-3.5" /> Retomar
                </button>
              )}
              {(job.status === "running" || job.status === "paused") && (
                <button
                  onClick={() => control("cancel")}
                  className="flex items-center gap-1 rounded-lg bg-rose-100 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-200"
                >
                  <X className="h-3.5 w-3.5" /> Cancelar
                </button>
              )}
              {["completed", "cancelled"].includes(job.status) && (
                <button
                  onClick={() => setJob(null)}
                  className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
                >
                  Novo disparo
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* HISTÓRICO */}
      {jobs.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-bold text-gray-900">Histórico</h2>
          <div className="space-y-1">
            {jobs.map((j) => (
              <div
                key={j.id}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-gray-50"
              >
                <span className="flex-1 truncate font-medium text-gray-800">
                  {j.dryRun && "🧪 "}
                  {j.name}
                </span>
                <span className="text-gray-400">{j.templateName}</span>
                <span className="text-emerald-600">{j.sent}✓</span>
                {j.failed > 0 && (
                  <span className="text-rose-500">{j.failed}✗</span>
                )}
                <span className="text-gray-400">/{j.total}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] ${
                    j.status === "completed"
                      ? "bg-emerald-50 text-emerald-600"
                      : j.status === "cancelled"
                        ? "bg-gray-100 text-gray-500"
                        : "bg-amber-50 text-amber-600"
                  }`}
                >
                  {j.status}
                </span>
                <button
                  onClick={async () => {
                    if (!confirm("Excluir este disparo do histórico?")) return;
                    await fetch(`/api/broadcasts/${j.id}`, {
                      method: "DELETE",
                    });
                    loadJobs();
                  }}
                  className="text-gray-300 hover:text-rose-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
