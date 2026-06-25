import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireOrgId } from "@/lib/api-auth";
import { whatsapp } from "@/lib/whatsapp";
import { canMessageLeadWhere } from "@/lib/lead-optout";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Envia um texto LIVRE (session message) pra todas as conversas com janela de 24h
// ABERTA. Não usa template (sem custo/teto) e só funciona porque a janela está
// aberta. Ideal pra "bom dia" / follow-up de tratativas do dia anterior.
export async function POST(request: NextRequest) {
  const { error, session } = await requireAuth("gestor");
  if (error) return error;
  const { orgId, error: orgError } = requireOrgId(session);
  if (orgError) return orgError;
  const senderId = (session!.user as Record<string, unknown>).id as string;

  const body = await request.json();
  const text = (body.text as string)?.trim();
  if (!text) {
    return NextResponse.json({ error: "text obrigatório" }, { status: 400 });
  }

  const { prisma } = await import("@/lib/prisma");
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const raw = await prisma.conversation.findMany({
    where: {
      organizationId: orgId,
      channel: "whatsapp",
      lastInboundAt: { gt: since }, // janela aberta
      lead: canMessageLeadWhere(), // nunca PERDIDO / opt-out
    },
    select: {
      id: true,
      lead: { select: { whatsapp: true, phone: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { direction: true, content: true },
      },
    },
    take: 800,
  });

  // SÓ nudge onde NÓS mandamos a última mensagem (cliente ficou quieto).
  // Quem escreveu por último (aguardando resposta) NÃO recebe — precisa de
  // atendimento humano, não "bom dia" genérico. Pula também quem já recebeu este texto.
  const convs = (
    raw as Array<{
      id: string;
      lead: { whatsapp: string | null; phone: string | null } | null;
      messages: Array<{ direction: string; content: string | null }>;
    }>
  ).filter((c) => {
    const last = c.messages[0];
    if (!last || last.direction !== "outbound") return false; // cliente escreveu por último → fora
    if ((last.content || "").trim() === text) return false; // já recebeu o follow-up
    return true;
  });

  let sent = 0;
  let failed = 0;
  for (const c of convs) {
    const to = c.lead?.whatsapp || c.lead?.phone;
    if (!to) {
      failed++;
      continue;
    }
    try {
      const res = await whatsapp.sendTextMessage(to, text);
      const ok = "messageId" in res;
      await prisma.conversationMessage.create({
        data: {
          conversationId: c.id,
          direction: "outbound",
          content: text,
          contentType: "text",
          status: ok ? "sent" : "failed",
          externalId: ok ? res.messageId : undefined,
          senderId,
        },
      });
      await prisma.conversation.update({
        where: { id: c.id },
        data: { lastMessageAt: new Date() },
      });
      ok ? sent++ : failed++;
    } catch {
      failed++;
    }
    await sleep(300); // ritmo controlado
  }

  logger.info("bulk_followup", { sent, failed, total: convs.length });
  return NextResponse.json({ sent, failed, total: convs.length });
}
