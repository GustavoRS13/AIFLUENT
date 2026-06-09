import { NextRequest, NextResponse } from "next/server";
import { requireAuth, checkRateLimit, requireOrgId } from "@/lib/api-auth";
import { apiLimiter } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

// Modelo padrão de etapas (kanban) — todo funil novo nasce com estas 7.
export const STAGE_TEMPLATE = [
  { name: "Base", color: "#6366f1", isWon: false, isLost: false },
  { name: "Prospeccao", color: "#8b5cf6", isWon: false, isLost: false },
  { name: "Conexao", color: "#06b6d4", isWon: false, isLost: false },
  { name: "Proposta", color: "#f59e0b", isWon: false, isLost: false },
  { name: "Negociacao", color: "#f97316", isWon: false, isLost: false },
  { name: "Fechamento", color: "#10b981", isWon: true, isLost: false },
  { name: "Perdido", color: "#ef4444", isWon: false, isLost: true },
];

// Lista os funis (não arquivados) agrupados, com contagem de leads.
export async function GET(request: NextRequest) {
  const rl = checkRateLimit(request, apiLimiter);
  if (rl) return rl;
  const { error, session } = await requireAuth();
  if (error) return error;
  const { orgId, error: orgError } = requireOrgId(session);
  if (orgError) return orgError;

  try {
    const { prisma } = await import("@/lib/prisma");
    const pipelines = await prisma.pipeline.findMany({
      where: { organizationId: orgId, archived: false },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        groupName: true,
        isDefault: true,
        hidden: true,
        stages: { select: { _count: { select: { leads: true } } } },
      },
    });
    const items = pipelines.map((p) => ({
      id: p.id,
      name: p.name,
      groupName: p.groupName,
      isDefault: p.isDefault,
      hidden: p.hidden,
      leadCount: p.stages.reduce(
        (s: number, st: { _count: { leads: number } }) => s + st._count.leads,
        0,
      ),
    }));
    return NextResponse.json({ pipelines: items });
  } catch (err) {
    logger.error("GET /api/pipelines error", err);
    return NextResponse.json({ pipelines: [] }, { status: 500 });
  }
}

// Cria um funil novo (name + groupName) já com as 7 etapas padrão. (admin)
export async function POST(request: NextRequest) {
  const rl = checkRateLimit(request, apiLimiter);
  if (rl) return rl;
  const { error, session } = await requireAuth("admin");
  if (error) return error;
  const { orgId, error: orgError } = requireOrgId(session);
  if (orgError) return orgError;

  try {
    const body = await request.json();
    const name = (body.name as string)?.trim();
    const groupName = (body.groupName as string)?.trim() || null;
    if (!name) {
      return NextResponse.json({ error: "Nome obrigatorio" }, { status: 400 });
    }
    const { prisma } = await import("@/lib/prisma");
    const count = await prisma.pipeline.count({
      where: { organizationId: orgId },
    });
    const pipeline = await prisma.pipeline.create({
      data: {
        name,
        groupName,
        organizationId: orgId,
        order: count,
        stages: {
          create: STAGE_TEMPLATE.map((s, i) => ({ ...s, order: i })),
        },
      },
      select: { id: true, name: true, groupName: true },
    });
    return NextResponse.json({ pipeline });
  } catch (err) {
    logger.error("POST /api/pipelines error", err);
    return NextResponse.json(
      { error: "Falha ao criar funil" },
      { status: 500 },
    );
  }
}
