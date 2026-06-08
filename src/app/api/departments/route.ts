import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, checkRateLimit, requireOrgId } from "@/lib/api-auth";
import { apiLimiter } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const createDepartmentSchema = z.object({
  name: z.string().min(1),
  type: z.string().default("commercial"),
  color: z.string().optional(),
  description: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export async function GET(request: Request) {
  const rl = checkRateLimit(request, apiLimiter);
  if (rl) return rl;
  const { error, session } = await requireAuth();
  if (error) return error;
  const { orgId, error: orgError } = requireOrgId(session);
  if (orgError) return orgError;

  try {
    const { prisma } = await import("@/lib/prisma");
    const departments = await prisma.team.findMany({
      where: { organizationId: orgId },
      include: {
        _count: { select: { members: true, leads: true, conversations: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ departments });
  } catch (err) {
    logger.error("GET /api/departments error", err);
    return NextResponse.json({ departments: [] });
  }
}

export async function POST(request: NextRequest) {
  const rl = checkRateLimit(request, apiLimiter);
  if (rl) return rl;
  const { error, session } = await requireAuth("admin");
  if (error) return error;
  const { orgId, error: orgError } = requireOrgId(session);
  if (orgError) return orgError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const parsed = createDepartmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    if (!orgId) {
      return NextResponse.json(
        { error: "Organizacao nao encontrada" },
        { status: 400 },
      );
    }

    const department = await prisma.team.create({
      data: {
        name: parsed.data.name,
        type: parsed.data.type,
        color: parsed.data.color,
        description: parsed.data.description,
        isDefault: parsed.data.isDefault ?? false,
        organizationId: orgId,
      },
      include: {
        _count: { select: { members: true, leads: true, conversations: true } },
      },
    });

    logger.info("Department created", {
      departmentId: department.id,
      name: department.name,
    });
    return NextResponse.json(department, { status: 201 });
  } catch (err) {
    logger.error("POST /api/departments error", err);
    return NextResponse.json(
      { error: "Falha ao criar departamento" },
      { status: 500 },
    );
  }
}
