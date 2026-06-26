import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireOrgId } from "@/lib/api-auth";
import { whatsapp } from "@/lib/whatsapp";

export const runtime = "nodejs";

// Reage (emoji) a uma mensagem do cliente — igual o WhatsApp. Envia a reação
// pela Cloud API (o cliente vê) e guarda o emoji na mensagem (p/ exibir aqui).
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
  const wamid = (body.wamid as string)?.trim();
  const emoji = (body.emoji as string) ?? "";
  if (!wamid) {
    return NextResponse.json({ error: "wamid obrigatório" }, { status: 400 });
  }

  const { prisma } = await import("@/lib/prisma");
  const conv = await prisma.conversation.findFirst({
    where: { id, organizationId: orgId },
    select: { lead: { select: { whatsapp: true, phone: true } } },
  });
  if (!conv) {
    return NextResponse.json(
      { error: "Conversa não encontrada" },
      { status: 404 },
    );
  }
  const to = conv.lead?.whatsapp || conv.lead?.phone;
  if (to && whatsapp.isConfigured) {
    await whatsapp.sendReaction(to, wamid, emoji).catch(() => null);
  }

  // guarda a reação na mensagem (merge no metadata) p/ exibir no reload
  const msg = await prisma.conversationMessage.findFirst({
    where: { externalId: wamid },
    select: { id: true, metadata: true },
  });
  if (msg) {
    let meta: Record<string, unknown> = {};
    try {
      meta = JSON.parse(msg.metadata || "{}");
    } catch {
      /* metadata inválido */
    }
    meta.reaction = emoji || undefined;
    await prisma.conversationMessage
      .update({
        where: { id: msg.id },
        data: { metadata: JSON.stringify(meta) },
      })
      .catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
