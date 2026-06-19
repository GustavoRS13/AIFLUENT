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
interface TemplateButtonT {
  text?: string;
}
interface TemplateComponentT {
  type?: string;
  text?: string;
  buttons?: TemplateButtonT[];
}
interface TemplateT {
  name: string;
  language: string;
  category?: string;
  components?: TemplateComponentT[];
}

// Texto do corpo (BODY) do template + contagem de variáveis {{n}}.
function templateBody(t?: TemplateT): string {
  const b = t?.components?.find((c) => (c.type || "").toUpperCase() === "BODY");
  return b?.text || "";
}
function templateButtons(t?: TemplateT): string[] {
  const b = t?.components?.find(
    (c) => (c.type || "").toUpperCase() === "BUTTONS",
  );
  return (b?.buttons || []).map((x) => x.text || "").filter(Boolean);
}
function countVars(text: string): number {
  const m = text.match(/\{\{\s*\d+\s*\}\}/g);
  if (!m) return 0;
  return Math.max(...m.map((x) => parseInt(x.replace(/[^\d]/g, ""), 10)));
}
// token de personalização ({nome}, {primeiro_nome}...) no valor de uma variável
const MERGE_UI_RE = /\{\{?\s*(nome|primeiro|first)/i;
// monta o texto do preview substituindo {{n}} pelo valor (nome → exemplo "Maria")
function fillPreview(body: string, params: string[]): string {
  let t = body;
  params.forEach((p, i) => {
    const val = !p.trim() ? `{{${i + 1}}}` : MERGE_UI_RE.test(p) ? "Maria" : p;
    t = t.replace(new RegExp(`\\{\\{\\s*${i + 1}\\s*\\}\\}`, "g"), val);
  });
  return t;
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
  entregues?: number;
  lidos?: number;
  falhas?: number;
  aguardando?: number;
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
  const [params, setParams] = useState<string[]>([]);
  const [dryRun, setDryRun] = useState(false);
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
  // detalhe/inteligência de um disparo
  const [detailJob, setDetailJob] = useState<JobRow | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [detail, setDetail] = useState<any>(null);
  const [redispatching, setRedispatching] = useState(false);

  const openDetail = useCallback(async (j: JobRow) => {
    setDetailJob(j);
    setDetail(null);
    const d = await fetch(`/api/broadcasts/${j.id}/detail`)
      .then((r) => r.json())
      .catch(() => null);
    setDetail(d);
  }, []);

  async function redispatchFailures(includePending = false) {
    if (!detailJob || !templateName) return;
    const alvo = includePending
      ? "não entregues (falhas + aguardando)"
      : "que falharam";
    if (
      !confirm(`Re-disparar para os ${alvo} usando o modelo "${templateName}"?`)
    )
      return;
    setRedispatching(true);
    try {
      const res = await fetch(`/api/broadcasts/${detailJob.id}/redispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateName,
          languageCode: language,
          params: params.length ? params : undefined,
          includePending,
        }),
      });
      const d = await res.json();
      if (res.ok && d.jobId) {
        setDetailJob(null);
        loadJobs();
        driveJob(d.jobId);
        alert(`Re-disparo criado para ${d.total} leads!`);
      } else {
        alert(d.error || "Falha ao re-disparar");
      }
    } finally {
      setRedispatching(false);
    }
  }

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
          setParams(Array(countVars(templateBody(t[0]))).fill(""));
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

  // Poll de progresso ao vivo — a barra anda mesmo durante o lote (ou se o cron
  // server-side estiver processando), sem depender só do loop do navegador.
  useEffect(() => {
    if (!job?.id || ["completed", "cancelled", "paused"].includes(job.status))
      return;
    const id = setInterval(() => {
      fetch(`/api/broadcasts/${job.id}`)
        .then((r) => r.json())
        .then((p) => {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          if (p?.id) setJob(p);
        })
        .catch(() => {});
    }, 2500);
    return () => clearInterval(id);
  }, [job?.id, job?.status]);

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
    if (params.some((p) => !p.trim())) {
      alert(
        "Este modelo tem variáveis. Preencha todos os campos de variável antes de disparar.",
      );
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || `Disparo ${new Date().toLocaleString("pt-BR")}`,
          templateName,
          languageCode: language,
          params: params.length ? params : undefined,
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
    <div className="mx-auto max-w-5xl space-y-5">
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
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900">
          <Send className="h-4 w-4" /> 2. Modelo
        </h2>
        <div className="mt-3 grid gap-5 lg:grid-cols-[1fr_300px]">
          {/* ESQUERDA: formulário */}
          <div className="space-y-3">
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
                setParams(Array(countVars(templateBody(t))).fill(""));
              }}
              className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm"
            >
              {templates.length === 0 && (
                <option value="">Nenhum modelo aprovado</option>
              )}
              {[...templates]
                // UTILITY primeiro (melhor entrega), depois o resto
                .sort((a, b) => {
                  const rank = (c?: string) =>
                    (c || "").toUpperCase() === "UTILITY" ? 0 : 1;
                  return rank(a.category) - rank(b.category);
                })
                .map((t) => {
                  const cat = (t.category || "").toUpperCase();
                  const tag =
                    cat === "UTILITY"
                      ? "🟢 UTILITY"
                      : cat === "MARKETING"
                        ? "🟡 MARKETING"
                        : cat || "—";
                  return (
                    <option key={`${t.name}-${t.language}`} value={t.name}>
                      {tag} · {t.name} ({t.language})
                    </option>
                  );
                })}
            </select>

            {/* Variáveis do template ({{1}}...) */}
            {params.length > 0 && (
              <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-medium text-amber-700">
                  Este modelo tem {params.length} variável(is). Digite um valor
                  fixo ou use{" "}
                  <code className="rounded bg-white px-1">{"{nome}"}</code> para
                  o primeiro nome de cada lead.
                </p>
                {params.map((p, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] text-gray-500">{`Variável {{${i + 1}}}`}</label>
                      <button
                        type="button"
                        onClick={() =>
                          setParams((arr) =>
                            arr.map((v, j) =>
                              j === i ? (v ? v + " {nome}" : "{nome}") : v,
                            ),
                          )
                        }
                        className="text-[11px] font-medium text-indigo-600 hover:underline"
                      >
                        + Nome do lead
                      </button>
                    </div>
                    <input
                      value={p}
                      onChange={(e) =>
                        setParams((arr) =>
                          arr.map((v, j) => (j === i ? e.target.value : v)),
                        )
                      }
                      placeholder={`Valor para {{${i + 1}}}`}
                      className="mt-0.5 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* DIREITA: preview do WhatsApp */}
          <div className="rounded-2xl bg-[#e5ddd5] p-3">
            <p className="mb-2 text-center text-[11px] font-medium text-gray-500">
              Pré-visualização
            </p>
            <div className="rounded-lg bg-white p-3 shadow-sm">
              <p className="whitespace-pre-wrap text-sm text-gray-800">
                {templateBody(templates.find((x) => x.name === templateName))
                  ? fillPreview(
                      templateBody(
                        templates.find((x) => x.name === templateName),
                      ),
                      params,
                    )
                  : "Selecione um modelo…"}
              </p>
              <div className="mt-1 text-right text-[10px] text-gray-400">
                agora ✓✓
              </div>
              {templateButtons(templates.find((x) => x.name === templateName))
                .length > 0 && (
                <div className="mt-2 space-y-1 border-t border-gray-100 pt-2">
                  {templateButtons(
                    templates.find((x) => x.name === templateName),
                  ).map((b, i) => (
                    <div
                      key={i}
                      className="rounded-md py-1.5 text-center text-sm font-medium text-[#00a5f4]"
                    >
                      {b}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
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
                <button
                  onClick={() => openDetail(j)}
                  className="flex-1 truncate text-left font-medium text-gray-800 hover:text-indigo-600 hover:underline"
                  title="Ver detalhes (entregues, lidos, falhas)"
                >
                  {j.dryRun && "🧪 "}
                  {j.name}
                </button>
                <span className="text-gray-400">{j.templateName}</span>
                {/* Entregue (delivered+read) · aguardando · falhas — número REAL */}
                <span className="text-emerald-600" title="Entregues (+ lidos)">
                  {(j.entregues ?? 0) + (j.lidos ?? 0)}✓
                </span>
                {(j.aguardando ?? 0) > 0 && (
                  <span
                    className="text-amber-500"
                    title="Aguardando confirmação"
                  >
                    {j.aguardando}⏳
                  </span>
                )}
                {(j.falhas ?? j.failed) > 0 && (
                  <span className="text-rose-500" title="Falhas">
                    {j.falhas ?? j.failed}✗
                  </span>
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

      {/* Modal de detalhe / inteligência do disparo */}
      {detailJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">
                {detailJob.name}
              </h2>
              <button
                onClick={() => setDetailJob(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {!detail ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-emerald-50 p-3 text-center">
                    <div className="text-2xl font-bold text-emerald-600">
                      {detail.entregues ?? 0}
                    </div>
                    <div className="text-xs text-emerald-700">Entregues</div>
                  </div>
                  <div className="rounded-lg bg-sky-50 p-3 text-center">
                    <div className="text-2xl font-bold text-sky-600">
                      {detail.lidos ?? 0}
                    </div>
                    <div className="text-xs text-sky-700">Lidos</div>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-3 text-center">
                    <div className="text-2xl font-bold text-amber-600">
                      {detail.aguardando ?? 0}
                    </div>
                    <div className="text-xs text-amber-700">Aguardando</div>
                  </div>
                  <div className="rounded-lg bg-rose-50 p-3 text-center">
                    <div className="text-2xl font-bold text-rose-600">
                      {detail.falhas ?? 0}
                    </div>
                    <div className="text-xs text-rose-700">Falhas</div>
                  </div>
                </div>
                <p className="mt-2 text-center text-xs text-gray-400">
                  Total: {detail.total} · dados reais (status da Meta)
                </p>

                {detail.errors?.length > 0 && (
                  <div className="mt-3 space-y-1 rounded-lg bg-gray-50 p-3">
                    <p className="text-xs font-medium text-gray-600">
                      Motivos das falhas:
                    </p>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {detail.errors.map((e: any) => (
                      <div
                        key={e.code}
                        className="flex justify-between text-xs text-gray-600"
                      >
                        <span>{e.title}</span>
                        <span className="font-semibold text-rose-500">
                          {e.count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {(detail.falhas > 0 || detail.aguardando > 0) && (
                  <div className="mt-4 space-y-2 rounded-lg border border-indigo-200 bg-indigo-50 p-3">
                    <p className="text-xs text-indigo-700">
                      Reenviar usando o modelo selecionado em “2. Modelo” (
                      <b>{templateName || "nenhum"}</b>). Dica: escolha um{" "}
                      <b>UTILITY</b> pra entregar melhor.
                    </p>
                    {detail.falhas > 0 && (
                      <button
                        onClick={() => redispatchFailures(false)}
                        disabled={redispatching || !templateName}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
                      >
                        {redispatching ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : null}
                        Re-disparar {detail.falhas} falhas
                      </button>
                    )}
                    {detail.falhas + detail.aguardando > 0 && (
                      <button
                        onClick={() => redispatchFailures(true)}
                        disabled={redispatching || !templateName}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                      >
                        {redispatching ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : null}
                        Re-disparar {detail.falhas + detail.aguardando} não
                        entregues (falhas + aguardando)
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
