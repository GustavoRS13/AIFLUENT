import { NextRequest, NextResponse } from "next/server";
import { requireAuth, checkRateLimit, requireOrgId } from "@/lib/api-auth";
import { apiLimiter } from "@/lib/rate-limit";
import { whatsapp } from "@/lib/whatsapp";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

const BATCH_REAL = 20; // envios reais por lote
const BATCH_DRY = 500; // dry-run: só DB
const BUDGET_MS = 45000; // tempo máximo de processamento por chamada (folga p/ os 60s)

interface Claimed {
  id: string;
  leadId: string;
  phone: string;
}

// Processa o MÁXIMO de destinatários pendentes que couber em ~45s. Idempotente,
// seguro contra concorrência (claim com SKIP LOCKED) e respeita pausa/cancelamento.
// Chamado pela UI, pelo cron de segurança ou pelo worker (Bearer CRON_SECRET).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = checkRateLimit(request, apiLimiter);
  if (rl) return rl;
  const { id } = await params;

  // Auth: worker interno (Bearer CRON_SECRET) OU sessão gestor+.
  const secret = process.env.CRON_SECRET;
  const authz = request.headers.get("authorization");
  const isWorker = !!secret && authz === `Bearer ${secret}`;
  let sessionOrgId: string | null = null;
  let sessionUserId: string | null = null;
  if (!isWorker) {
    const { error, session } = await requireAuth("gestor");
    if (error) return error;
    const { orgId, error: orgError } = requireOrgId(session);
    if (orgError) return orgError;
    sessionOrgId = orgId;
    sessionUserId = (session!.user as Record<string, unknown>).id as string;
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    const job = await prisma.broadcastJob.findUnique({ where: { id } });
    if (!job || (!isWorker && job.organizationId !== sessionOrgId)) {
      return NextResponse.json(
        { error: "Disparo não encontrado" },
        { status: 404 },
      );
    }
    const orgId = job.organizationId;

    if (job.status === "cancelled" || job.status === "completed") {
      return NextResponse.json({
        status: job.status,
        remaining: 0,
        processed: 0,
      });
    }
    if (job.status === "paused") {
      const remaining = await prisma.broadcastRecipient.count({
        where: { jobId: id, status: { in: ["pending", "processing"] } },
      });
      return NextResponse.json({ status: "paused", remaining, processed: 0 });
    }
    if (job.status !== "running") {
      await prisma.broadcastJob.update({
        where: { id },
        data: { status: "running", startedAt: job.startedAt ?? new Date() },
      });
    }

    const batch = job.dryRun ? BATCH_DRY : BATCH_REAL;
    const senderId = sessionUserId ?? job.createdById;
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

    // Loop interno: processa lotes até esvaziar ou estourar o orçamento de tempo.
    while (Date.now() - start < BUDGET_MS) {
      // respeita pausa/cancelamento em tempo real
      const cur = await prisma.broadcastJob.findUnique({
        where: { id },
        select: { status: true },
      });
      if (!cur || cur.status === "paused" || cur.status === "cancelled") {
        stopped = cur?.status ?? "cancelled";
        break;
      }

      // claim atômico de um lote
      const claimed = await prisma.$queryRawUnsafe<Claimed[]>(
        `UPDATE "BroadcastRecipient" SET status='processing'
         WHERE id IN (
           SELECT id FROM "BroadcastRecipient"
           WHERE "jobId"=$1 AND status='pending'
           ORDER BY id LIMIT $2
           FOR UPDATE SKIP LOCKED
         ) RETURNING id, "leadId", phone`,
        id,
        batch,
      );
      if (claimed.length === 0) break; // nada pendente

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
                metadata: JSON.stringify({ broadcast: true, jobId: id }),
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
        where: { id },
        data: { sent: { increment: sent }, failed: { increment: failed } },
      });
      aggSent += sent;
      aggFailed += failed;
      aggProcessed += claimed.length;
    }

    const remaining = await prisma.broadcastRecipient.count({
      where: { jobId: id, status: { in: ["pending", "processing"] } },
    });
    if (remaining === 0 && !stopped) {
      await prisma.broadcastJob.update({
        where: { id },
        data: { status: "completed", completedAt: new Date() },
      });
    }
    const jobNow = await prisma.broadcastJob.findUnique({
      where: { id },
      select: { sent: true, failed: true, total: true, status: true },
    });

    return NextResponse.json({
      status: jobNow?.status ?? "running",
      processed: aggProcessed,
      sent: aggSent,
      failed: aggFailed,
      remaining,
      totalSent: jobNow?.sent ?? 0,
      totalFailed: jobNow?.failed ?? 0,
      total: jobNow?.total ?? job.total,
    });
  } catch (err) {
    logger.error("POST /api/broadcasts/[id]/process error", err);
    return NextResponse.json(
      { error: "Falha ao processar lote" },
      { status: 500 },
    );
  }
}
