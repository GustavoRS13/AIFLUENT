import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireOrgId } from "@/lib/api-auth";

export const runtime = "nodejs";

// Marca uma conversa como NÃO LIDA (volta pro filtro "Não lidos" + badge).
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, session } = await requireAuth();
  if (error) return error;
  const { orgId, error: orgError } = requireOrgId(session);
  if (orgError) return orgError;
  const { id } = await params;

  const { prisma } = await import("@/lib/prisma");
  const conv = await prisma.conversation.findFirst({
    where: { id, organizationId: orgId },
    select: { id: true, unreadCount: true },
  });
  if (!conv) {
    return NextResponse.json(
      { error: "Conversa não encontrada" },
      { status: 404 },
    );
  }
  await prisma.conversation.update({
    where: { id },
    data: { unreadCount: conv.unreadCount > 0 ? conv.unreadCount : 1 },
  });
  return NextResponse.json({ ok: true });
}
