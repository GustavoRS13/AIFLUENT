import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireAuth, checkRateLimit } from "@/lib/api-auth";
import { authLimiter } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

// Troca de senha do próprio usuário (exige a senha atual).
export async function POST(request: NextRequest) {
  const rl = checkRateLimit(request, authLimiter);
  if (rl) return rl;
  const { error, session } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as Record<string, unknown>).id as string;

  try {
    const body = await request.json();
    const currentPassword = body.currentPassword as string;
    const newPassword = body.newPassword as string;
    if (!currentPassword || !newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { error: "Informe a senha atual e uma nova senha (mín. 8 caracteres)" },
        { status: 400 },
      );
    }

    const { prisma } = await import("@/lib/prisma");
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (!user) {
      return NextResponse.json(
        { error: "Usuario nao encontrado" },
        { status: 404 },
      );
    }
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Senha atual incorreta" },
        { status: 400 },
      );
    }
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(newPassword, 10) },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error("POST /api/me/password error", err);
    return NextResponse.json(
      { error: "Falha ao trocar senha" },
      { status: 500 },
    );
  }
}
