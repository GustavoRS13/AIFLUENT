import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireOrgId } from "@/lib/api-auth";

export const runtime = "nodejs";

// Transfere/atribui a conversa a um USUÁRIO (responsável). Seta assigneeId na
// conversa + consultantId no lead, pra ela aparecer pra esse usuário.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, session } = await requireAuth();
  if (error) return error;
  const { orgId, error: orgError } = requireOrgId(session);
  if (orgError) return orgError;
  const { id } = await params;

  const body = await request.json();
  const userId = (body.userId as string)?.trim();
  if (!userId) {
    return NextResponse.json({ error: "userId obrigatório" }, { status: 400 });
  }

  const { prisma } = await import("@/lib/prisma");
  const conv = await prisma.conversation.findFirst({
    where: { id, organizationId: orgId },
    select: { id: true, leadId: true },
  });
  if (!conv) {
    return NextResponse.json(
      { error: "Conversa não encontrada" },
      { status: 404 },
    );
  }
  const target = await prisma.user.findFirst({
    where: { id: userId, organizationId: orgId, isActive: true },
    select: { id: true, name: true, teamId: true },
  });
  if (!target) {
    return NextResponse.json(
      { error: "Usuário não encontrado" },
      { status: 404 },
    );
  }

  await prisma.conversation.update({
    where: { id },
    data: { assigneeId: target.id },
  });
  if (conv.leadId) {
    await prisma.lead
      .update({ where: { id: conv.leadId }, data: { consultantId: target.id } })
      .catch(() => {});
  }
  // notifica o novo responsável
  await prisma.notification
    .create({
      data: {
        organizationId: orgId,
        userId: target.id,
        type: "transfer",
        title: "Conversa transferida para você",
        body: "Você recebeu um novo atendimento.",
        link: "/atendimento",
      },
    })
    .catch(() => {});

  return NextResponse.json({ ok: true, assignee: target.name });
}
