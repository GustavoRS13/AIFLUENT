import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireOrgId } from "@/lib/api-auth";

export const runtime = "nodejs";

// Exclui uma mensagem do histórico DO CRM (não apaga no WhatsApp do cliente —
// a Meta não permite isso via API). Qualquer usuário logado da org pode.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, session } = await requireAuth();
  if (error) return error;
  const { orgId, error: orgError } = requireOrgId(session);
  if (orgError) return orgError;
  const { id } = await params;

  const { prisma } = await import("@/lib/prisma");
  // só apaga se a mensagem pertence a uma conversa DA organização do usuário
  const msg = await prisma.conversationMessage.findFirst({
    where: { id, conversation: { organizationId: orgId } },
    select: { id: true },
  });
  if (!msg) {
    return NextResponse.json(
      { error: "Mensagem não encontrada" },
      { status: 404 },
    );
  }
  await prisma.conversationMessage.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
