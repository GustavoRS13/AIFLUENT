import { NextRequest, NextResponse } from "next/server";
import { requireAuth, checkRateLimit, requireOrgId } from "@/lib/api-auth";
import { apiLimiter } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { z } from "zod";
import bcrypt from "bcryptjs";

const updateUserSchema = z.object({
  name: z.string().optional(),
  role: z.enum(["admin", "gestor", "supervisor", "operador"]).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).optional(),
  phone: z.string().optional(),
  // escopo de grupo (ex.: "B2B - Alumni by better"); "" limpa o escopo.
  scopeGroup: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = checkRateLimit(request, apiLimiter);
  if (rl) return rl;
  const { error, session } = await requireAuth("admin");
  if (error) return error;
  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados invalidos" }, { status: 400 });
    }

    const { prisma } = await import("@/lib/prisma");
    const { orgId, error: orgError } = requireOrgId(session);
    if (orgError) return orgError;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json(
        { error: "Usuario nao encontrado" },
        { status: 404 },
      );
    }
    if (user.organizationId !== orgId) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.name) data.name = parsed.data.name;
    if (parsed.data.role) data.role = parsed.data.role;
    if (parsed.data.isActive !== undefined)
      data.isActive = parsed.data.isActive;
    if (parsed.data.phone) data.phone = parsed.data.phone;
    if (parsed.data.password) {
      data.passwordHash = await bcrypt.hash(parsed.data.password, 10);
    }
    if (parsed.data.scopeGroup !== undefined) {
      data.scopeGroup = parsed.data.scopeGroup.trim() || null;
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        phone: true,
      },
    });

    // Audit log
    try {
      await prisma.auditLog.create({
        data: {
          action: "user_updated",
          entity: "User",
          entityId: id,
          details: JSON.stringify(Object.keys(parsed.data)),
          organizationId: user.organizationId,
          userId: (session!.user as Record<string, unknown>).id as string,
        },
      });
    } catch {
      /* Don't fail if audit fails */
    }

    logger.info("User updated", {
      userId: id,
      changes: Object.keys(parsed.data),
    });
    return NextResponse.json(updated);
  } catch (err) {
    logger.error("PATCH /api/users/[id] error", err);
    return NextResponse.json(
      { error: "Falha ao atualizar usuario" },
      { status: 500 },
    );
  }
}
