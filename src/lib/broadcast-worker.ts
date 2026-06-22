// Núcleo de processamento de disparos — usado pelo /process (UI) e pelo
// /cron/broadcasts (agendador externo). Processa em lotes até esvaziar o job
// ou estourar o orçamento de tempo. Idempotente e seguro contra concorrência.

import { whatsapp } from "@/lib/whatsapp";

const BATCH_REAL = 20;
const BATCH_DRY = 500;

// Tokens de personalização aceitos no valor das variáveis do template.
const MERGE_RE =
  /\{\{?\s*(nome_completo|nomecompleto|fullname|nome|primeiro_nome|primeiro|first_name|firstname)\s*\}?\}/i;

// Capitaliza: "ELOIZA BERNARDES" -> "Eloiza Bernardes" (bases do Clint vêm em CAPS).
// Mantém conectores comuns em minúsculo (da, de, do, dos, e).
function titleCase(s: string): string {
  const small = new Set(["da", "de", "do", "das", "dos", "e", "di", "du"]);
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w, i) =>
      i > 0 && small.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1),
    )
    .join(" ")
    .trim();
}

// Substitui os tokens pelo nome real do lead. Fallback "aluno(a)" quando vazio.
function fillParams(
  params: string[],
  lead?: { firstName?: string | null; lastName?: string | null },
): string[] {
  // {nome} = só o PRIMEIRO nome, capitalizado (ex.: "Eloiza"), não o nome inteiro.
  const raw = (lead?.firstName || "").trim();
  const firstWord = raw.split(/\s+/)[0] || "";
  const first = firstWord ? titleCase(firstWord) : "aluno(a)";
  const full =
    titleCase(
      [lead?.firstName, lead?.lastName].filter(Boolean).join(" ").trim(),
    ) || first;
  return params.map((p) =>
    p
      // nome_completo PRIMEIRO (contém "nome")
      .replace(/\{\{?\s*(nome_completo|nomecompleto|fullname)\s*\}?\}/gi, full)
      .replace(
        /\{\{?\s*(nome|primeiro_nome|primeiro|first_name|firstname)\s*\}?\}/gi,
        first,
      ),
  );
}

interface Claimed {
  id: string;
  leadId: string;
  phone: string;
}

export interface BatchResult {
  status: string;
  processed: number;
  sent: number;
  failed: number;
  remaining: number;
  totalSent: number;
  totalFailed: number;
  total: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function runBroadcastBatch(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prisma: any,
  jobId: string,
  budgetMs: number,
): Promise<BatchResult | null> {
  const job = await prisma.broadcastJob.findUnique({ where: { id: jobId } });
  if (!job) return null;
  if (job.status === "cancelled" || job.status === "completed") {
    return {
      status: job.status,
      processed: 0,
      sent: 0,
      failed: 0,
      remaining: 0,
      totalSent: job.sent,
      totalFailed: job.failed,
      total: job.total,
    };
  }
  if (job.status === "paused") {
    const remaining = await prisma.broadcastRecipient.count({
      where: { jobId, status: { in: ["pending", "processing"] } },
    });
    return {
      status: "paused",
      processed: 0,
      sent: 0,
      failed: 0,
      remaining,
      totalSent: job.sent,
      totalFailed: job.failed,
      total: job.total,
    };
  }
  if (job.status !== "running") {
    await prisma.broadcastJob.update({
      where: { id: jobId },
      data: { status: "running", startedAt: job.startedAt ?? new Date() },
    });
  }

  const orgId = job.organizationId as string;
  const senderId = job.createdById as string;
  const batch = job.dryRun ? BATCH_DRY : BATCH_REAL;
  const langParams = job.params ? (JSON.parse(job.params) as string[]) : null;
  const buildComponents = (vals: string[] | null | undefined) =>
    vals?.length
      ? [
          {
            type: "body",
            parameters: vals.map((t) => ({ type: "text", text: t })),
          },
        ]
      : undefined;
  // Personalização: se algum parâmetro usa {nome}/{primeiro_nome}, montamos os
  // componentes POR destinatário (com o nome real do lead). Senão, é estático.
  const personalized = !!langParams?.some((p) => MERGE_RE.test(p));

  // Corpo do template (texto real) — pra salvar a MENSAGEM enviada, não só o nome.
  let templateBody = "";
  try {
    const tpls = await whatsapp.listTemplates();
    const list = "templates" in tpls ? tpls.templates : [];
    const t = list.find(
      (x) => x.name === job.templateName && x.language === job.languageCode,
    );
    const bodyComp = (t?.components || []).find(
      (c) => String(c.type || "").toUpperCase() === "BODY",
    );
    templateBody = (bodyComp as { text?: string })?.text || "";
  } catch {
    /* segue com fallback */
  }
  // Renderiza o corpo trocando {{1}}, {{2}}... pelos valores do destinatário.
  const renderBody = (vals: string[] | null | undefined): string => {
    if (!templateBody) return `[disparo] ${job.templateName}`;
    let out = templateBody;
    (vals || []).forEach((v, i) => {
      out = out.replace(new RegExp(`\\{\\{\\s*${i + 1}\\s*\\}\\}`, "g"), v);
    });
    return out;
  };

  const start = Date.now();
  let aggProcessed = 0;
  let aggSent = 0;
  let aggFailed = 0;
  let stopped: string | null = null;

  while (Date.now() - start < budgetMs) {
    const cur = await prisma.broadcastJob.findUnique({
      where: { id: jobId },
      select: { status: true },
    });
    if (!cur || cur.status === "paused" || cur.status === "cancelled") {
      stopped = cur?.status ?? "cancelled";
      break;
    }

    const claimed: Claimed[] = await prisma.$queryRawUnsafe(
      `UPDATE "BroadcastRecipient" SET status='processing', "updatedAt"=now()
       WHERE id IN (
         SELECT id FROM "BroadcastRecipient"
         WHERE "jobId"=$1 AND (
           status='pending'
           OR (status='processing' AND "updatedAt" < now() - interval '3 minutes')
         )
         ORDER BY id LIMIT $2
         FOR UPDATE SKIP LOCKED
       ) RETURNING id, "leadId", phone`,
      jobId,
      batch,
    );
    if (claimed.length === 0) break;

    // Nomes dos leads (só quando há personalização) para montar {nome} por contato
    const leadMap = new Map<
      string,
      { firstName?: string | null; lastName?: string | null }
    >();
    if (personalized) {
      const ids = [...new Set(claimed.map((r) => r.leadId).filter(Boolean))];
      if (ids.length) {
        const leads = await prisma.lead.findMany({
          where: { id: { in: ids } },
          select: { id: true, firstName: true, lastName: true },
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        leads.forEach((l: any) => leadMap.set(l.id, l));
      }
    }

    let sent = 0;
    let failed = 0;

    if (job.dryRun) {
      const okIds = claimed
        .filter((r) => r.phone && r.phone.length >= 10)
        .map((r) => r.id);
      const badIds = claimed
        .filter((r) => !r.phone || r.phone.length < 10)
        .map((r) => r.id);
      if (okIds.length)
        await prisma.broadcastRecipient.updateMany({
          where: { id: { in: okIds } },
          data: { status: "sent", sentAt: new Date(), externalId: "dry-run" },
        });
      if (badIds.length)
        await prisma.broadcastRecipient.updateMany({
          where: { id: { in: badIds } },
          data: { status: "failed", error: "telefone inválido" },
        });
      sent = okIds.length;
      failed = badIds.length;
    } else {
      // Envio de UM destinatário (retorna true se enviado)
      const sendOne = async (r: Claimed): Promise<boolean> => {
        if (!r.phone || r.phone.length < 10) {
          await prisma.broadcastRecipient.update({
            where: { id: r.id },
            data: { status: "failed", error: "telefone inválido" },
          });
          return false;
        }
        try {
          let conv = await prisma.conversation.findFirst({
            where: {
              organizationId: orgId,
              leadId: r.leadId,
              channel: "whatsapp",
            },
            select: { id: true, lastInboundAt: true },
          });
          if (!conv) {
            // Conversa de disparo nasce OCULTA (status "broadcast"); só aparece
            // no Atendimento quando o lead responder (inbound vira "open").
            conv = await prisma.conversation.create({
              data: {
                organizationId: orgId,
                leadId: r.leadId,
                channel: "whatsapp",
                status: "broadcast",
                lastMessageAt: new Date(),
              },
              select: { id: true, lastInboundAt: true },
            });
          }
          const vals =
            personalized && langParams
              ? fillParams(langParams, leadMap.get(r.leadId))
              : langParams;
          const comp = buildComponents(vals);
          const res = await whatsapp.sendTemplateMessage(
            r.phone,
            job.templateName,
            job.languageCode,
            comp,
          );
          const ok = "messageId" in res;
          await prisma.conversationMessage.create({
            data: {
              conversationId: conv.id,
              direction: "outbound",
              // mensagem REAL enviada (template renderizado com o nome)
              content: renderBody(vals),
              contentType: "text",
              status: ok ? "sent" : "failed",
              externalId: ok ? res.messageId : undefined,
              metadata: JSON.stringify({ broadcast: true, jobId }),
              senderId,
            },
          });
          await prisma.conversation.update({
            where: { id: conv.id },
            data: {
              lastMessageAt: new Date(),
              // re-oculta a conversa de disparo se o lead NUNCA respondeu;
              // se já tem inbound, é atendimento real → mantém visível.
              ...(conv.lastInboundAt ? {} : { status: "broadcast" }),
            },
          });
          await prisma.broadcastRecipient.update({
            where: { id: r.id },
            data: {
              status: ok ? "sent" : "failed",
              externalId: ok ? res.messageId : undefined,
              error: ok
                ? null
                : "error" in res
                  ? String(res.error)
                  : "falha no envio",
              sentAt: ok ? new Date() : undefined,
            },
          });
          return ok;
        } catch (e) {
          await prisma.broadcastRecipient.update({
            where: { id: r.id },
            data: {
              status: "failed",
              error: e instanceof Error ? e.message.slice(0, 200) : String(e),
            },
          });
          return false;
        }
      };

      // Envio em RITMO CONTROLADO (gota-a-gota) — protege a reputação do número
      // durante o aquecimento. Rajada de marketing derruba qualidade e dispara
      // mais 131049; envio espaçado imita comportamento orgânico.
      const CONCURRENCY = 3;
      const GAP_MS = 300; // ~10 envios/seg no total (3 paralelos x ~1/300ms)
      const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
      let cursor = 0;
      const workers = Array.from(
        { length: Math.min(CONCURRENCY, claimed.length) },
        async () => {
          while (cursor < claimed.length) {
            const r = claimed[cursor++];
            const ok = await sendOne(r);
            if (ok) sent++;
            else failed++;
            await sleep(GAP_MS);
          }
        },
      );
      await Promise.all(workers);
    }

    // Reconcilia o contador do job com a verdade (contagem real dos
    // destinatários) — evita drift quando navegador + cron rodam juntos.
    const [sentCount, failedCount] = await Promise.all([
      prisma.broadcastRecipient.count({ where: { jobId, status: "sent" } }),
      prisma.broadcastRecipient.count({ where: { jobId, status: "failed" } }),
    ]);
    await prisma.broadcastJob.update({
      where: { id: jobId },
      data: { sent: sentCount, failed: failedCount },
    });
    aggSent += sent;
    aggFailed += failed;
    aggProcessed += claimed.length;
  }

  const remaining = await prisma.broadcastRecipient.count({
    where: { jobId, status: { in: ["pending", "processing"] } },
  });
  if (remaining === 0 && !stopped) {
    await prisma.broadcastJob.update({
      where: { id: jobId },
      data: { status: "completed", completedAt: new Date() },
    });
  }
  const jobNow = await prisma.broadcastJob.findUnique({
    where: { id: jobId },
    select: { sent: true, failed: true, total: true, status: true },
  });

  return {
    status: jobNow?.status ?? "running",
    processed: aggProcessed,
    sent: aggSent,
    failed: aggFailed,
    remaining,
    totalSent: jobNow?.sent ?? 0,
    totalFailed: jobNow?.failed ?? 0,
    total: jobNow?.total ?? job.total,
  };
}
