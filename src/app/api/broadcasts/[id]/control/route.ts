import { NextRequest, NextResponse } from "next/server";
import { requireAuth, checkRateLimit, requireOrgId } from "@/lib/api-auth";
import { apiLimiter } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

// Pausa / retoma / cancela um disparo.
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
    const action = (await request.json()).action as string;
    const map: Record<string, string> = {
      pause: "paused",
      resume: "running",
      cancel: "cancelled",
    };
    const next = map[action];
    if (!next) {
      return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
    }
    const { prisma } = await import("@/lib/prisma");
    const job = await prisma.broadcastJob.findUnique({
      where: { id },
      select: { organizationId: true, status: true },
    });
    if (!job || job.organizationId !== orgId) {
      return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    }
    if (job.status === "completed" || job.status === "cancelled") {
      return NextResponse.json(
        { error: "Disparo já finalizado" },
        { status: 400 },
      );
    }
    await prisma.broadcastJob.update({
      where: { id },
      data: {
        status: next,
        ...(next === "cancelled" ? { completedAt: new Date() } : {}),
      },
    });
    return NextResponse.json({ ok: true, status: next });
  } catch (err) {
    logger.error("POST /api/broadcasts/[id]/control error", err);
    return NextResponse.json({ error: "Falha" }, { status: 500 });
  }
}
