import { NextRequest, NextResponse } from "next/server";
import { requireAuth, checkRateLimit, requireOrgId } from "@/lib/api-auth";
import { apiLimiter } from "@/lib/rate-limit";
import { z } from "zod";
import { logger } from "@/lib/logger";

const createTaskSchema = z.object({
  title: z.string().min(1),
  type: z.string().default("task"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  dueDate: z.string().optional(),
  assigneeId: z.string().optional(),
  description: z.string().optional(),
  leadId: z.string().optional(),
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
    const where: Record<string, unknown> = { organizationId: orgId };

    // Role-based data isolation: operador sees only tasks assigned to or created by them
    if (userRole === "operador" && userId) {
      where.OR = [{ assigneeId: userId }, { creatorId: userId }];
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        assignee: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json({ tasks });
  } catch {
    return NextResponse.json({ tasks: [] });
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
    const parsed = createTaskSchema.safeParse(body);
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
    const userId = (session!.user as Record<string, unknown>).id as string;

    const task = await prisma.task.create({
      data: {
        ...parsed.data,
        dueDate: parsed.data.dueDate
          ? new Date(parsed.data.dueDate)
          : undefined,
        creatorId: userId,
        organizationId: orgId,
      },
    });
    return NextResponse.json(task, { status: 201 });
  } catch (err) {
    logger.error("Create task error", err);
    return NextResponse.json(
      { error: "Falha ao criar tarefa" },
      { status: 500 },
    );
  }
}
