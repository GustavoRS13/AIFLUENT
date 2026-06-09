import { NextRequest, NextResponse } from "next/server";
import { requireAuth, checkRateLimit, requireOrgId } from "@/lib/api-auth";
import { apiLimiter } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

// Dados do próprio usuário logado.
export async function GET() {
  const { error, session } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as Record<string, unknown>).id as string;
  try {
    const { prisma } = await import("@/lib/prisma");
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        avatar: true,
        createdAt: true,
        organization: { select: { name: true } },
      },
    });
    if (!user)
      return NextResponse.json(
        { error: "Usuario nao encontrado" },
        { status: 404 },
      );
    return NextResponse.json({ user });
  } catch (err) {
    logger.error("GET /api/me error", err);
    return NextResponse.json({ error: "Falha" }, { status: 500 });
  }
}

// Atualiza o próprio perfil (nome, telefone).
export async function PATCH(request: NextRequest) {
  const rl = checkRateLimit(request, apiLimiter);
  if (rl) return rl;
  const { error, session } = await requireAuth();
  if (error) return error;
  const { error: orgError } = requireOrgId(session);
  if (orgError) return orgError;
  const userId = (session!.user as Record<string, unknown>).id as string;
  try {
    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (typeof body.name === "string" && body.name.trim())
      data.name = body.name.trim();
    if (typeof body.phone === "string") data.phone = body.phone.trim() || null;
    if (Object.keys(data).length === 0)
      return NextResponse.json({ error: "Nada a atualizar" }, { status: 400 });

    const { prisma } = await import("@/lib/prisma");
    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, name: true, email: true, role: true, phone: true },
    });
    return NextResponse.json({ user });
  } catch (err) {
    logger.error("PATCH /api/me error", err);
    return NextResponse.json({ error: "Falha ao atualizar" }, { status: 500 });
  }
}
