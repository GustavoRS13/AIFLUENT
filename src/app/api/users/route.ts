import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { requireAuth, checkRateLimit, requireOrgId } from "@/lib/api-auth";
import { logger } from "@/lib/logger";

async function getPrisma() {
  try {
    const { prisma } = await import("@/lib/prisma");
    return prisma;
  } catch {
    return null;
  }
}

const createUserSchema = z.object({
  name: z.string().min(1, "Nome obrigatorio"),
  email: z.string().email("Email invalido"),
  password: z.string().min(6, "Senha deve ter no minimo 6 caracteres"),
  role: z
    .enum(["admin", "gestor", "supervisor", "operador"])
    .default("operador"),
  phone: z.string().optional(),
  // SECURITY: organizationId is NOT accepted from the client — the tenant is
  // always derived from the authenticated session.
});

export async function GET(request: NextRequest) {
  const rateLimited = checkRateLimit(request);
  if (rateLimited) return rateLimited;

  const { error, session } = await requireAuth("gestor");
  if (error) return error;

  const prisma = await getPrisma();
  if (!prisma) {
    return NextResponse.json(
      { error: "Banco de dados indisponivel" },
      { status: 503 },
    );
  }

  const { orgId, error: orgError } = requireOrgId(session);
  if (orgError) return orgError;

  try {
    const users = await prisma.user.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        isActive: true,
        scopeGroup: true,
        lastLoginAt: true,
        createdAt: true,
        organization: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      users,
      total: users.length,
      requestedBy: session?.user?.email,
    });
  } catch (err) {
    logger.error("GET /api/users error", err);
    return NextResponse.json(
      { error: "Erro ao buscar usuarios" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const rateLimited = checkRateLimit(request);
  if (rateLimited) return rateLimited;

  const { error: authError, session: postSession } =
    await requireAuth("gestor");
  if (authError) return authError;

  // Gestor can only create operador/supervisor. Admin can create any role.
  const creatorRole = (postSession!.user as Record<string, unknown>)
    .role as string;

  const { orgId: postOrgId, error: postOrgError } = requireOrgId(postSession);
  if (postOrgError) return postOrgError;
  const prisma = await getPrisma();
  if (!prisma) {
    return NextResponse.json(
      { error: "Banco de dados indisponivel" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const data = parsed.data;

  // Role restriction: gestor can only create operador/supervisor
  if (
    creatorRole === "gestor" &&
    data.role &&
    !["operador", "supervisor"].includes(data.role)
  ) {
    return NextResponse.json(
      { error: "Gestores podem criar apenas operadores e supervisores" },
      { status: 403 },
    );
  }

  try {
    // Check if email already exists
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Email ja cadastrado" },
        { status: 409 },
      );
    }

    // Tenant is always the session's organization (never from the request body)
    const userOrgId = postOrgId;

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        passwordHash,
        role: data.role,
        phone: data.phone,
        organizationId: userOrgId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        isActive: true,
        createdAt: true,
      },
    });

    // E-mail de boas-vindas (best-effort — não falha a criação)
    try {
      const { sendWelcomeEmail } = await import("@/lib/email-service");
      const res = await sendWelcomeEmail({
        to: user.email,
        name: user.name,
        role: user.role,
        tempPassword: data.password,
      });
      if ("error" in res) {
        logger.warn("welcome_email_skipped", {
          email: user.email,
          reason: res.error,
        });
      } else {
        logger.info("welcome_email_sent", { email: user.email });
      }
    } catch (e) {
      logger.warn("welcome_email_error", {
        email: user.email,
        error: String(e),
      });
    }

    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    logger.error("POST /api/users error", err);
    return NextResponse.json(
      { error: "Erro ao criar usuario" },
      { status: 500 },
    );
  }
}
