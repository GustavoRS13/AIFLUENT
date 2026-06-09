import { NextRequest, NextResponse } from "next/server";
import { requireAuth, checkRateLimit, requireOrgId } from "@/lib/api-auth";
import { apiLimiter } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

// Lista as notificações do usuário logado (+ contagem de não lidas).
export async function GET(request: NextRequest) {
  const rl = checkRateLimit(request, apiLimiter);
  if (rl) return rl;
  const { error, session } = await requireAuth();
  if (error) return error;
  const { orgId, error: orgError } = requireOrgId(session);
  if (orgError) return orgError;
  const userId = (session!.user as Record<string, unknown>).id as string;

  try {
    const { prisma } = await import("@/lib/prisma");
    const [items, unread] = await Promise.all([
      prisma.notification.findMany({
        where: { userId, organizationId: orgId },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.notification.count({
        where: { userId, organizationId: orgId, read: false },
      }),
    ]);
    return NextResponse.json({ notifications: items, unread });
  } catch (err) {
    logger.error("GET /api/notifications error", err);
    return NextResponse.json({ notifications: [], unread: 0 }, { status: 500 });
  }
}

// Marca notificações como lidas: { id } para uma, ou {} para todas.
export async function POST(request: NextRequest) {
  const rl = checkRateLimit(request, apiLimiter);
  if (rl) return rl;
  const { error, session } = await requireAuth();
  if (error) return error;
  const { orgId, error: orgError } = requireOrgId(session);
  if (orgError) return orgError;
  const userId = (session!.user as Record<string, unknown>).id as string;

  try {
    const body = await request.json().catch(() => ({}));
    const id = body.id as string | undefined;
    const { prisma } = await import("@/lib/prisma");
    await prisma.notification.updateMany({
      where: { userId, organizationId: orgId, ...(id ? { id } : {}) },
      data: { read: true },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error("POST /api/notifications error", err);
    return NextResponse.json({ error: "Falha" }, { status: 500 });
  }
}
