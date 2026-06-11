import { NextRequest, NextResponse } from "next/server";
import { requireAuth, checkRateLimit, requireOrgId } from "@/lib/api-auth";
import { apiLimiter } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

// Registra uma ligação (tel:) feita a partir do CRM, vinculada ao lead.
export async function POST(request: NextRequest) {
  const rl = checkRateLimit(request, apiLimiter);
  if (rl) return rl;
  const { error, session } = await requireAuth();
  if (error) return error;
  const { orgId, error: orgError } = requireOrgId(session);
  if (orgError) return orgError;
  const userId = (session!.user as Record<string, unknown>).id as string;

  try {
    const body = await request.json();
    const phoneNumber = (body.phoneNumber as string)?.trim();
    if (!phoneNumber) {
      return NextResponse.json(
        { error: "Telefone obrigatório" },
        { status: 400 },
      );
    }
    const leadId = (body.leadId as string) || null;
    const { prisma } = await import("@/lib/prisma");

    const call = await prisma.phoneCall.create({
      data: {
        direction: (body.direction as string) || "outbound",
        status: (body.status as string) || "initiated",
        phoneNumber,
        duration: typeof body.duration === "number" ? body.duration : null,
        notes: (body.notes as string) || null,
        organizationId: orgId,
        userId,
        leadId,
      },
      select: { id: true, startedAt: true },
    });

    // histórico no lead (timeline)
    if (leadId) {
      await prisma.activity
        .create({
          data: {
            type: "call",
            title: `Ligação para ${phoneNumber}`,
            description: (body.notes as string) || "Ligação iniciada pelo CRM",
            leadId,
            userId,
          },
        })
        .catch(() => {});
    }

    return NextResponse.json({ id: call.id, startedAt: call.startedAt });
  } catch (err) {
    logger.error("POST /api/calls error", err);
    return NextResponse.json(
      { error: "Falha ao registrar ligação" },
      { status: 500 },
    );
  }
}

// Atualiza uma ligação (ex.: duração/status ao encerrar).
export async function PATCH(request: NextRequest) {
  const rl = checkRateLimit(request, apiLimiter);
  if (rl) return rl;
  const { error, session } = await requireAuth();
  if (error) return error;
  const { orgId, error: orgError } = requireOrgId(session);
  if (orgError) return orgError;
  try {
    const body = await request.json();
    const id = body.id as string;
    if (!id)
      return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
    const { prisma } = await import("@/lib/prisma");
    const existing = await prisma.phoneCall.findUnique({
      where: { id },
      select: { organizationId: true },
    });
    if (!existing || existing.organizationId !== orgId) {
      return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    }
    await prisma.phoneCall.update({
      where: { id },
      data: {
        status: (body.status as string) || undefined,
        duration: typeof body.duration === "number" ? body.duration : undefined,
        notes: (body.notes as string) || undefined,
        endedAt: body.ended ? new Date() : undefined,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error("PATCH /api/calls error", err);
    return NextResponse.json({ error: "Falha" }, { status: 500 });
  }
}

// Histórico de ligações de um lead.
export async function GET(request: NextRequest) {
  const { error, session } = await requireAuth();
  if (error) return error;
  const { orgId, error: orgError } = requireOrgId(session);
  if (orgError) return orgError;
  try {
    const leadId = new URL(request.url).searchParams.get("leadId");
    const { prisma } = await import("@/lib/prisma");
    const calls = await prisma.phoneCall.findMany({
      where: { organizationId: orgId, ...(leadId ? { leadId } : {}) },
      orderBy: { startedAt: "desc" },
      take: 50,
      select: {
        id: true,
        phoneNumber: true,
        direction: true,
        status: true,
        duration: true,
        startedAt: true,
        user: { select: { name: true } },
      },
    });
    return NextResponse.json({ calls });
  } catch (err) {
    logger.error("GET /api/calls error", err);
    return NextResponse.json({ calls: [] }, { status: 500 });
  }
}
