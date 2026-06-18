import { NextRequest, NextResponse, after } from "next/server";
import { requireAuth, checkRateLimit, requireOrgId } from "@/lib/api-auth";
import { apiLimiter } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import {
  buildAudienceWhere,
  type BroadcastSegment,
} from "@/lib/broadcast-segment";

export const runtime = "nodejs";

const MAX_AUDIENCE = 5000; // teto de snapshot por disparo (proteção de memória)

// Lista os disparos (histórico) com progresso.
export async function GET(request: NextRequest) {
  const rl = checkRateLimit(request, apiLimiter);
  if (rl) return rl;
  const { error, session } = await requireAuth("gestor");
  if (error) return error;
  const { orgId, error: orgError } = requireOrgId(session);
  if (orgError) return orgError;
  try {
    const { prisma } = await import("@/lib/prisma");
    const jobs = await prisma.broadcastJob.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        name: true,
        templateName: true,
        status: true,
        dryRun: true,
        total: true,
        sent: true,
        failed: true,
        createdAt: true,
        startedAt: true,
        completedAt: true,
        createdBy: { select: { name: true } },
      },
    });

    // Stats REAIS por disparo (status confirmado pelos webhooks da Meta), não só
    // o "aceito" no envio. Em dry-run não há mensagens; usa o contador do job.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const withStats = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (jobs as any[]).map(async (j) => {
        if (j.dryRun) {
          return {
            ...j,
            entregues: j.sent,
            lidos: 0,
            falhas: j.failed,
            aguardando: 0,
          };
        }
        const grouped = await prisma.conversationMessage.groupBy({
          by: ["status"],
          where: { metadata: { contains: j.id } },
          _count: { _all: true },
        });
        const c: Record<string, number> = {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (grouped as any[]).forEach((g) => (c[g.status] = g._count._all));
        return {
          ...j,
          entregues: c.delivered || 0,
          lidos: c.read || 0,
          falhas: c.failed || 0,
          aguardando: c.sent || 0,
        };
      }),
    );
    return NextResponse.json({ jobs: withStats });
  } catch (err) {
    logger.error("GET /api/broadcasts error", err);
    return NextResponse.json({ jobs: [] }, { status: 500 });
  }
}

// Cria um disparo: segmenta a audiência e snapshota os destinatários (pending).
export async function POST(request: NextRequest) {
  const rl = checkRateLimit(request, apiLimiter);
  if (rl) return rl;
  const { error, session } = await requireAuth("gestor");
  if (error) return error;
  const { orgId, error: orgError } = requireOrgId(session);
  if (orgError) return orgError;
  const userId = (session!.user as Record<string, unknown>).id as string;

  try {
    const body = await request.json();
    const name = (body.name as string)?.trim() || "Disparo";
    const templateName = (body.templateName as string)?.trim();
    const languageCode = (body.languageCode as string)?.trim() || "pt_BR";
    const params = (body.params as string[]) || undefined;
    const dryRun = body.dryRun === true;
    const segment = (body.segment as BroadcastSegment) || {};
    if (!templateName) {
      return NextResponse.json(
        { error: "templateName obrigatório" },
        { status: 400 },
      );
    }

    const { prisma } = await import("@/lib/prisma");
    const where = buildAudienceWhere(orgId, segment);

    const leads = await prisma.lead.findMany({
      where,
      select: { id: true, whatsapp: true, phone: true },
      take: MAX_AUDIENCE,
    });
    if (leads.length === 0) {
      return NextResponse.json(
        { error: "Nenhum lead com WhatsApp encontrado para essa segmentação" },
        { status: 400 },
      );
    }

    const job = await prisma.broadcastJob.create({
      data: {
        name,
        templateName,
        languageCode,
        params: params ? JSON.stringify(params) : null,
        filters: JSON.stringify(segment),
        dryRun,
        total: leads.length,
        status: "pending",
        organizationId: orgId,
        createdById: userId,
      },
      select: { id: true },
    });

    // snapshot dos destinatários (dedup garantido pelo @@unique(jobId, leadId))
    const CHUNK = 1000;
    for (let i = 0; i < leads.length; i += CHUNK) {
      const chunk = leads.slice(i, i + CHUNK);
      await prisma.broadcastRecipient.createMany({
        data: chunk.map((l) => ({
          jobId: job.id,
          leadId: l.id,
          phone: (l.whatsapp || l.phone || "").replace(/\D/g, ""),
          status: "pending",
        })),
        skipDuplicates: true,
      });
    }

    // arranca o processamento no servidor (continua mesmo com a aba fechada)
    await prisma.broadcastJob.update({
      where: { id: job.id },
      data: { status: "running", startedAt: new Date() },
    });
    const secret = process.env.CRON_SECRET;
    const base =
      process.env.APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
    if (secret && base) {
      after(async () => {
        try {
          await fetch(`${base}/api/broadcasts/${job.id}/process`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${secret}`,
              "Content-Type": "application/json",
            },
            body: "{}",
          });
        } catch {
          /* cron-safety reanima */
        }
      });
    }

    return NextResponse.json({
      jobId: job.id,
      total: leads.length,
      capped: leads.length >= MAX_AUDIENCE,
    });
  } catch (err) {
    logger.error("POST /api/broadcasts error", err);
    return NextResponse.json(
      { error: "Falha ao criar disparo" },
      { status: 500 },
    );
  }
}
