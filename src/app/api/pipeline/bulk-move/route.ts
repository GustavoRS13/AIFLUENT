import { NextRequest, NextResponse } from "next/server";
import { requireAuth, checkRateLimit, requireOrgId } from "@/lib/api-auth";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

// Move leads em massa de uma etapa para outra (qualquer funil/etapa do CRM).
// Filtros: quantidade (limit) e tags. Conta no modo preview.
export async function POST(request: NextRequest) {
  const rl = checkRateLimit(request);
  if (rl) return rl;
  const { error, session } = await requireAuth("gestor");
  if (error) return error;
  const { orgId, error: orgError } = requireOrgId(session);
  if (orgError) return orgError;

  try {
    const body = await request.json();
    const fromStageId = (body.fromStageId as string) || "";
    const toStageId = (body.toStageId as string) || "";
    const tags = Array.isArray(body.tags) ? (body.tags as string[]) : [];
    const limit =
      typeof body.limit === "number" && body.limit > 0
        ? Math.min(body.limit, 50000)
        : undefined;
    const preview = body.preview === true;

    if (!fromStageId) {
      return NextResponse.json(
        { error: "Etapa de origem obrigatória" },
        { status: 400 },
      );
    }

    const { prisma } = await import("@/lib/prisma");

    const where: Record<string, unknown> = {
      organizationId: orgId,
      stageId: fromStageId,
    };
    if (tags.length) {
      where.tags = { some: { tag: { name: { in: tags } } } };
    }

    if (preview) {
      const count = await prisma.lead.count({ where });
      return NextResponse.json({ count });
    }

    if (!toStageId) {
      return NextResponse.json(
        { error: "Etapa de destino obrigatória" },
        { status: 400 },
      );
    }
    // valida que a etapa de destino é da empresa
    const dest = await prisma.pipelineStage.findFirst({
      where: { id: toStageId, pipeline: { organizationId: orgId } },
      select: { id: true },
    });
    if (!dest) {
      return NextResponse.json(
        { error: "Etapa de destino inválida" },
        { status: 400 },
      );
    }

    // Seleciona os ids (aplica o limite, se houver) e move
    const leads = await prisma.lead.findMany({
      where,
      select: { id: true },
      orderBy: [{ stageOrder: "asc" }, { createdAt: "desc" }],
      ...(limit ? { take: limit } : {}),
    });
    const ids = leads.map((l: { id: string }) => l.id);
    if (ids.length === 0) return NextResponse.json({ moved: 0 });

    const res = await prisma.lead.updateMany({
      where: { id: { in: ids } },
      data: { stageId: toStageId, stageOrder: 0 },
    });
    logger.info("pipeline_bulk_move", {
      orgId,
      fromStageId,
      toStageId,
      moved: res.count,
      tags,
    });
    return NextResponse.json({ moved: res.count });
  } catch (err) {
    logger.error("POST /api/pipeline/bulk-move error", err);
    return NextResponse.json(
      { error: "Falha ao mover leads" },
      { status: 500 },
    );
  }
}
