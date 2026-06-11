// Núcleo de processamento de disparos — usado pelo /process (UI) e pelo
// /cron/broadcasts (agendador externo). Processa em lotes até esvaziar o job
// ou estourar o orçamento de tempo. Idempotente e seguro contra concorrência.

import { whatsapp } from "@/lib/whatsapp";

const BATCH_REAL = 20;
const BATCH_DRY = 500;

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
  const components = langParams?.length
    ? [
        {
          type: "body",
          parameters: langParams.map((t) => ({ type: "text", text: t })),
        },
      ]
    : undefined;

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
      `UPDATE "BroadcastRecipient" SET status='processing'
       WHERE id IN (
         SELECT id FROM "BroadcastRecipient"
         WHERE "jobId"=$1 AND status='pending'
         ORDER BY id LIMIT $2
         FOR UPDATE SKIP LOCKED
       ) RETURNING id, "leadId", phone`,
      jobId,
      batch,
    );
    if (claimed.length === 0) break;

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
      for (const r of claimed) {
        if (!r.phone || r.phone.length < 10) {
          await prisma.broadcastRecipient.update({
            where: { id: r.id },
            data: { status: "failed", error: "telefone inválido" },
          });
          failed++;
          continue;
        }
        try {
          let conv = await prisma.conversation.findFirst({
            where: {
              organizationId: orgId,
              leadId: r.leadId,
              channel: "whatsapp",
            },
            select: { id: true },
          });
          if (!conv) {
            conv = await prisma.conversation.create({
              data: {
                organizationId: orgId,
                leadId: r.leadId,
                channel: "whatsapp",
                status: "open",
                lastMessageAt: new Date(),
              },
              select: { id: true },
            });
          }
          const res = await whatsapp.sendTemplateMessage(
            r.phone,
            job.templateName,
            job.languageCode,
            components,
          );
          const ok = "messageId" in res;
          await prisma.conversationMessage.create({
            data: {
              conversationId: conv.id,
              direction: "outbound",
              content: `[disparo] ${job.templateName}`,
              contentType: "text",
              status: ok ? "sent" : "failed",
              externalId: ok ? res.messageId : undefined,
              metadata: JSON.stringify({ broadcast: true, jobId }),
              senderId,
            },
          });
          await prisma.conversation.update({
            where: { id: conv.id },
            data: { lastMessageAt: new Date() },
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
          if (ok) sent++;
          else failed++;
        } catch (e) {
          await prisma.broadcastRecipient.update({
            where: { id: r.id },
            data: {
              status: "failed",
              error: e instanceof Error ? e.message.slice(0, 200) : String(e),
            },
          });
          failed++;
        }
      }
    }

    await prisma.broadcastJob.update({
      where: { id: jobId },
      data: { sent: { increment: sent }, failed: { increment: failed } },
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
