import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, checkRateLimit, requireOrgId } from "@/lib/api-auth";
import { logger } from "@/lib/logger";
import { leadVisibilityWhere } from "@/lib/lead-visibility";

async function getPrisma() {
  try {
    const { prisma } = await import("@/lib/prisma");
    return prisma;
  } catch {
    return null;
  }
}

const createLeadSchema = z.object({
  firstName: z.string().min(1, "Nome obrigatorio"),
  lastName: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  source: z.string().default("manual"),
  temperature: z.enum(["cold", "warm", "hot"]).default("warm"),
  courseInterest: z.string().optional(),
  languageLevel: z.string().optional(),
  notes: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  tags: z.array(z.string()).optional(),
  stageId: z.string().optional(),
  // SECURITY: organizationId/consultantId/teamId/createdById are intentionally
  // NOT accepted from the client. The tenant and creator are always derived
  // from the authenticated session to prevent cross-tenant assignment.
});

export async function GET(request: NextRequest) {
  const rateLimited = checkRateLimit(request);
  if (rateLimited) return rateLimited;

  const { error, session } = await requireAuth();
  if (error) return error;

  const { orgId, error: orgError } = requireOrgId(session);
  if (orgError) return orgError;
  const userRole = (session!.user as Record<string, unknown>).role as string;
  const userId = (session!.user as Record<string, unknown>).id as string;
  const prisma = await getPrisma();

  if (prisma) {
    try {
      const { searchParams } = request.nextUrl;
      const search = searchParams.get("search") || "";
      const source = searchParams.get("source") || "";
      const temperature = searchParams.get("temperature") || "";
      const status = searchParams.get("status") || "";
      const stageId = searchParams.get("stageId") || "";
      const sortBy = searchParams.get("sortBy") || "createdAt";
      const sortOrder = (searchParams.get("sortOrder") || "desc") as
        | "asc"
        | "desc";
      const page = parseInt(searchParams.get("page") || "1");
      const limit = parseInt(searchParams.get("limit") || "50");

      const where: Record<string, unknown> = { organizationId: orgId };

      // Isolamento por papel (admin=tudo, gestor/supervisor=time, operador=próprio).
      // Via AND para não conflitar com o OR da busca.
      const userTeamId = (session!.user as Record<string, unknown>).teamId as
        | string
        | undefined;
      const vis = leadVisibilityWhere(userRole, userId, userTeamId, (session!.user as Record<string, unknown>).scopeGroup as string | null);
      if (vis) where.AND = [vis];
      if (search) {
        where.OR = [
          { firstName: { contains: search } },
          { lastName: { contains: search } },
          { email: { contains: search } },
          { phone: { contains: search } },
          { whatsapp: { contains: search } },
        ];
      }
      const teamId = searchParams.get("teamId") || "";
      if (source) where.source = source;
      if (temperature) where.temperature = temperature;
      if (status) where.status = status;
      if (stageId) where.stageId = stageId;
      if (teamId) where.teamId = teamId;

      const [leads, total] = await Promise.all([
        prisma.lead.findMany({
          where,
          include: {
            consultant: { select: { id: true, name: true, avatar: true } },
            stage: { select: { id: true, name: true, color: true } },
            tags: { include: { tag: true } },
            _count: { select: { activities: true, messages: true } },
          },
          orderBy: { [sortBy]: sortOrder },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.lead.count({ where }),
      ]);

      return NextResponse.json({
        leads,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      logger.error("GET /api/leads DB error", error);
    }
  }

  return NextResponse.json(
    { error: "Banco de dados indisponivel" },
    { status: 503 },
  );
}

export async function POST(request: NextRequest) {
  const rateLimited = checkRateLimit(request);
  if (rateLimited) return rateLimited;

  const { error: authError, session } = await requireAuth("gestor");
  if (authError) return authError;

  const { orgId, error: orgError } = requireOrgId(session);
  if (orgError) return orgError;
  const createdById = (session!.user as Record<string, unknown>).id as string;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const parsed = createLeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const data = parsed.data;

  try {
    const prisma = await getPrisma();
    if (prisma) {
      // Funil único: cadastro manual, criação rápida e importação entram por
      // ingestLead (garante org + tag obrigatória + deduplicação + auditoria +
      // histórico de origem).
      const { ingestLead } = await import("@/lib/lead-ingest");
      const { lead, deduped } = await ingestLead(prisma, {
        organizationId: orgId,
        source: data.source,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email || undefined,
        phone: data.phone,
        whatsapp: data.whatsapp,
        company: data.company,
        jobTitle: data.jobTitle,
        temperature: data.temperature,
        courseInterest: data.courseInterest,
        languageLevel: data.languageLevel,
        notes: data.notes,
        city: data.city,
        state: data.state,
        stageId: data.stageId,
        tags: data.tags,
        createdById,
      });
      return NextResponse.json(
        { id: lead.id, deduped },
        { status: deduped ? 200 : 201 },
      );
    }
  } catch (error) {
    logger.error("POST /api/leads DB error", error);
  }

  return NextResponse.json(
    { error: "Banco de dados indisponivel" },
    { status: 503 },
  );
}
