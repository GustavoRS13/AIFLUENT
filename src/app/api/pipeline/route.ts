import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, checkRateLimit, requireOrgId } from "@/lib/api-auth";
import { logger } from "@/lib/logger";
import { leadVisibilityWhere } from "@/lib/lead-visibility";

const moveLeadSchema = z.object({
  leadId: z.string().min(1, "leadId e obrigatorio"),
  stageId: z.string().min(1, "stageId e obrigatorio"),
  newOrder: z.number().int().nonnegative().optional().default(0),
});

export async function GET(request: NextRequest) {
  const rateLimited = checkRateLimit(request);
  if (rateLimited) return rateLimited;

  const { error, session } = await requireAuth();
  if (error) return error;

  const { orgId, error: orgError } = requireOrgId(session);
  if (orgError) return orgError;

  // Isolamento por papel (admin=tudo, gestor/supervisor=time, operador=próprio).
  const userRole = (session!.user as Record<string, unknown>).role as string;
  const userId = (session!.user as Record<string, unknown>).id as string;
  const userTeamId = (session!.user as Record<string, unknown>).teamId as
    | string
    | undefined;
  const leadFilter = leadVisibilityWhere(userRole, userId, userTeamId);

  // Funil específico (?pipelineId=) ou o padrão.
  const pipelineId = new URL(request.url).searchParams.get("pipelineId");

  try {
    const pipeline = await prisma.pipeline.findFirst({
      where: pipelineId
        ? { id: pipelineId, organizationId: orgId }
        : { isDefault: true, organizationId: orgId },
      include: {
        stages: {
          orderBy: { order: "asc" },
          include: {
            leads: {
              where: leadFilter,
              orderBy: { updatedAt: "desc" },
              take: 200, // paginação: carrega no máx. 200/etapa (funis com 100k não travam)
              include: {
                consultant: { select: { id: true, name: true, avatar: true } },
                tags: { include: { tag: true } },
                _count: { select: { activities: true, messages: true } },
              },
            },
            _count: { select: { leads: true } },
          },
        },
      },
    });

    return NextResponse.json(pipeline);
  } catch (error) {
    logger.error("GET /api/pipeline error", error);
    return NextResponse.json(
      { error: "Erro ao buscar pipeline" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  const rateLimited = checkRateLimit(request);
  if (rateLimited) return rateLimited;

  const { error: authError, session } = await requireAuth("gestor");
  if (authError) return authError;
  const { orgId, error: orgError } = requireOrgId(session);
  if (orgError) return orgError;

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
    }

    const parsed = moveLeadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Dados invalidos",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { leadId, stageId, newOrder } = parsed.data;

    const own = await prisma.lead.findFirst({
      where: { id: leadId, organizationId: orgId },
      select: { id: true },
    });
    if (!own)
      return NextResponse.json(
        { error: "Lead nao encontrado" },
        { status: 404 },
      );

    await prisma.lead.update({
      where: { id: leadId },
      data: { stageId, stageOrder: newOrder },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("PATCH /api/pipeline error", error);
    return NextResponse.json({ error: "Erro ao mover lead" }, { status: 500 });
  }
}
