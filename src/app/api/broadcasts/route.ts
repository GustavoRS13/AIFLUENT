import { NextRequest, NextResponse } from "next/server";
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
    return NextResponse.json({ jobs });
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
