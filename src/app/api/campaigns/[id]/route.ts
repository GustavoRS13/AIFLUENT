import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, checkRateLimit, requireOrgId } from "@/lib/api-auth";
import { apiLimiter } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const updateCampaignSchema = z.object({
  status: z.string().optional(),
  name: z.string().min(1).optional(),
  scheduledAt: z.string().optional().nullable(),
});

// Atualiza uma campanha (status/agendamento). Multi-tenant fail-closed + IDOR fechado.
export async function PATCH(
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
    const body = await request.json();
    const parsed = updateCampaignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados invalidos" }, { status: 400 });
    }

    const { prisma } = await import("@/lib/prisma");
    const existing = await prisma.campaign.findUnique({
      where: { id },
      select: { organizationId: true },
    });
    if (!existing || existing.organizationId !== orgId) {
      return NextResponse.json(
        { error: "Campanha nao encontrada" },
        { status: 404 },
      );
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.status) data.status = parsed.data.status;
    if (parsed.data.name) data.name = parsed.data.name;
    if (parsed.data.scheduledAt !== undefined) {
      data.scheduledAt = parsed.data.scheduledAt
        ? new Date(parsed.data.scheduledAt)
        : null;
    }

    const updated = await prisma.campaign.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (err) {
    logger.error("PATCH /api/campaigns/[id] error", err);
    return NextResponse.json(
      { error: "Falha ao atualizar campanha" },
      { status: 500 },
    );
  }
}
