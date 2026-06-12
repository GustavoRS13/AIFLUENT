import { NextRequest, NextResponse } from "next/server";
import { requireAuth, checkRateLimit, requireOrgId } from "@/lib/api-auth";
import { apiLimiter } from "@/lib/rate-limit";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { leadVisibilityWhere } from "@/lib/lead-visibility";

const createDealSchema = z.object({
  title: z.string().min(1),
  value: z.number().optional(),
  probability: z.number().min(0).max(100).default(50),
  status: z.string().default("open"),
  leadId: z.string(),
  stageId: z.string(),
  expectedCloseAt: z.string().optional(),
});

export async function GET(request: Request) {
  const rl = checkRateLimit(request, apiLimiter);
  if (rl) return rl;
  const { error, session } = await requireAuth();
  if (error) return error;
  const { orgId, error: orgError } = requireOrgId(session);
  if (orgError) return orgError;
  const userRole = (session!.user as Record<string, unknown>).role as string;
  const userId = (session!.user as Record<string, unknown>).id as string;
  try {
    const { prisma } = await import("@/lib/prisma");
    const where: Record<string, unknown> = { lead: { organizationId: orgId } };

    // Isolamento por papel (admin=tudo, gestor/supervisor=time, operador=próprio).
    const userTeamId = (session!.user as Record<string, unknown>).teamId as
      | string
      | undefined;
    const vis = leadVisibilityWhere(userRole, userId, userTeamId);
    if (vis) {
      where.lead = {
        ...((where.lead as Record<string, unknown>) || {}),
        ...vis,
      };
    }

    const deals = await prisma.deal.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        lead: {
          select: { id: true, firstName: true, lastName: true, company: true },
        },
        stage: { select: { id: true, name: true, color: true } },
      },
    });
    return NextResponse.json({ deals });
  } catch {
    return NextResponse.json({ deals: [] });
  }
}

export async function POST(request: NextRequest) {
  const rl = checkRateLimit(request, apiLimiter);
  if (rl) return rl;
  const { error, session } = await requireAuth();
  if (error) return error;
  const { orgId, error: orgError } = requireOrgId(session);
  if (orgError) return orgError;
  try {
    const body = await request.json();
    const parsed = createDealSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Dados invalidos",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { prisma } = await import("@/lib/prisma");
    const ownLead = await prisma.lead.findFirst({
      where: { id: parsed.data.leadId, organizationId: orgId },
      select: { id: true },
    });
    if (!ownLead)
      return NextResponse.json(
        { error: "Lead nao encontrado" },
        { status: 404 },
      );
    const deal = await prisma.deal.create({
      data: {
        ...parsed.data,
        expectedCloseAt: parsed.data.expectedCloseAt
          ? new Date(parsed.data.expectedCloseAt)
          : undefined,
      },
    });
    return NextResponse.json(deal, { status: 201 });
  } catch (err) {
    logger.error("Create deal error", err);
    return NextResponse.json(
      { error: "Falha ao criar negocio" },
      { status: 500 },
    );
  }
}
