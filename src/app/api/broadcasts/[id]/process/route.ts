import { NextRequest, NextResponse } from "next/server";
import { requireAuth, checkRateLimit, requireOrgId } from "@/lib/api-auth";
import { apiLimiter } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { runBroadcastBatch } from "@/lib/broadcast-worker";

export const runtime = "nodejs";
export const maxDuration = 60;

// Processa um grande lote do disparo (~45s). Chamado pela UI (sessão gestor) ou
// pelo worker/cron (Bearer CRON_SECRET).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = checkRateLimit(request, apiLimiter);
  if (rl) return rl;
  const { id } = await params;

  const secret = process.env.CRON_SECRET;
  const isWorker =
    !!secret && request.headers.get("authorization") === `Bearer ${secret}`;
  let sessionOrgId: string | null = null;
  if (!isWorker) {
    const { error, session } = await requireAuth("gestor");
    if (error) return error;
    const { orgId, error: orgError } = requireOrgId(session);
    if (orgError) return orgError;
    sessionOrgId = orgId;
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    if (!isWorker) {
      const job = await prisma.broadcastJob.findUnique({
        where: { id },
        select: { organizationId: true },
      });
      if (!job || job.organizationId !== sessionOrgId) {
        return NextResponse.json(
          { error: "Disparo não encontrado" },
          { status: 404 },
        );
      }
    }
    const result = await runBroadcastBatch(prisma, id, 45000);
    if (!result) {
      return NextResponse.json(
        { error: "Disparo não encontrado" },
        { status: 404 },
      );
    }
    return NextResponse.json(result);
  } catch (err) {
    logger.error("POST /api/broadcasts/[id]/process error", err);
    return NextResponse.json(
      { error: "Falha ao processar lote" },
      { status: 500 },
    );
  }
}
