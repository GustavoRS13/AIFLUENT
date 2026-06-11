import { NextRequest, NextResponse } from "next/server";
import { requireAuth, checkRateLimit, requireOrgId } from "@/lib/api-auth";
import { apiLimiter } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

// Progresso do disparo (contadores reais por status).
export async function GET(
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
      return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    }
    const grouped = await prisma.broadcastRecipient.groupBy({
      by: ["status"],
      where: { jobId: id },
      _count: true,
    });
    const counts: Record<string, number> = {};
    for (const g of grouped) counts[g.status] = g._count;
    return NextResponse.json({
      id: job.id,
      name: job.name,
      status: job.status,
      dryRun: job.dryRun,
      total: job.total,
      sent: counts.sent || 0,
      failed: counts.failed || 0,
      pending: (counts.pending || 0) + (counts.processing || 0),
    });
  } catch (err) {
    logger.error("GET /api/broadcasts/[id] error", err);
    return NextResponse.json({ error: "Falha" }, { status: 500 });
  }
}

// Exclui um disparo e seus destinatários.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, session } = await requireAuth("gestor");
  if (error) return error;
  const { orgId, error: orgError } = requireOrgId(session);
  if (orgError) return orgError;
  const { id } = await params;
  try {
    const { prisma } = await import("@/lib/prisma");
    const job = await prisma.broadcastJob.findUnique({
      where: { id },
      select: { organizationId: true },
    });
    if (!job || job.organizationId !== orgId) {
      return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    }
    await prisma.broadcastJob.delete({ where: { id } }); // recipients em cascade
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error("DELETE /api/broadcasts/[id] error", err);
    return NextResponse.json({ error: "Falha" }, { status: 500 });
  }
}
