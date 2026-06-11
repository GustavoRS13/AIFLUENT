import { NextRequest, NextResponse } from "next/server";
import { requireAuth, checkRateLimit, requireOrgId } from "@/lib/api-auth";
import { apiLimiter } from "@/lib/rate-limit";
import { whatsapp } from "@/lib/whatsapp";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

const BATCH_REAL = 25; // envios reais por chamada (cabe folgado em 60s)
const BATCH_DRY = 500; // dry-run: só DB, processa muito mais por chamada

interface Claimed {
  id: string;
  leadId: string;
  phone: string;
}

// Processa um LOTE de destinatários pendentes do disparo. Chamado repetidamente
// (pela UI ou cron) até zerar. Idempotente e seguro contra concorrência.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = checkRateLimit(request, apiLimiter);
  if (rl) return rl;
  const { error, session } = await requireAuth("gestor");
  if (error) return error;
  const { orgId, error: orgError } = requireOrgId(session);
  if (orgError) return orgError;
  const { id } = await params;

  try {
    const { prisma } = await import("@/lib/prisma");
    const job = await prisma.broadcastJob.findUnique({ where: { id } });
    if (!job || job.organizationId !== orgId) {
      return NextResponse.json(
        { error: "Disparo não encontrado" },
        { status: 404 },
      );
    }
    if (job.status === "cancelled" || job.status === "completed") {
      return NextResponse.json({
        status: job.status,
        remaining: 0,
        processed: 0,
      });
    }
    if (job.status === "paused") {
      const remaining = await prisma.broadcastRecipient.count({
        where: { jobId: id, status: "pending" },
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
    const senderId = (session!.user as Record<string, unknown>).id as string;
    const langParams = job.params ? (JSON.parse(job.params) as string[]) : null;
    const components = langParams?.length
      ? [
          {
            type: "body",
            parameters: langParams.map((t) => ({ type: "text", text: t })),
          },
        ]
      : undefined;

    // Claim atômico: marca um lote como 'processing' usando SKIP LOCKED (sem
    // duas chamadas pegarem o mesmo destinatário).
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

    if (claimed.length === 0) {
      // nada pendente → conclui
      const stillProcessing = await prisma.broadcastRecipient.count({
        where: { jobId: id, status: "processing" },
      });
      if (stillProcessing === 0) {
        await prisma.broadcastJob.update({
          where: { id },
          data: { status: "completed", completedAt: new Date() },
        });
      }
      return NextResponse.json({
        status: stillProcessing === 0 ? "completed" : "running",
        remaining: 0,
        processed: 0,
      });
    }

    let sent = 0;
    let failed = 0;

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
        if (job.dryRun) {
          await prisma.broadcastRecipient.update({
            where: { id: r.id },
            data: { status: "sent", sentAt: new Date(), externalId: "dry-run" },
          });
          sent++;
          continue;
        }
        // envio real
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

    const updated = await prisma.broadcastJob.update({
      where: { id },
      data: { sent: { increment: sent }, failed: { increment: failed } },
      select: { sent: true, failed: true, total: true, status: true },
    });
    const remaining = await prisma.broadcastRecipient.count({
      where: { jobId: id, status: { in: ["pending", "processing"] } },
    });
    if (remaining === 0 && updated.status === "running") {
      await prisma.broadcastJob.update({
        where: { id },
        data: { status: "completed", completedAt: new Date() },
      });
    }

    return NextResponse.json({
      status: remaining === 0 ? "completed" : updated.status,
      processed: claimed.length,
      sent,
      failed,
      remaining,
      totalSent: updated.sent,
      totalFailed: updated.failed,
      total: updated.total,
    });
  } catch (err) {
    logger.error("POST /api/broadcasts/[id]/process error", err);
    return NextResponse.json(
      { error: "Falha ao processar lote" },
      { status: 500 },
    );
  }
}
