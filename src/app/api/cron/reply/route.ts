import { NextRequest, NextResponse } from "next/server";
import { whatsappFor } from "@/lib/whatsapp-numbers";
import { STOP_TAG } from "@/lib/lead-optout";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

// ── Resposta autenticada por cron (texto livre, janela de 24h) ───────────────
// Envia UMA resposta já aprovada para uma conversa específica, pelo número DONO
// da conversa (o número PADRÃO usa o token de env — que só existe em PROD). Isso
// destrava respostas que não dá pra mandar localmente (ex.: conversas no 3709),
// sem precisar de sessão de admin: o time chama com o CRON_SECRET.
//
// É a porta de ENVIO — invocada de propósito, com texto revisado. NÃO varre nem
// dispara em massa. O alerta que descobre quem está esperando é o
// /api/cron/orphan-inbounds (só notifica, não envia).
//
// POST /api/cron/reply
//   headers: Authorization: Bearer <CRON_SECRET>
//   body: { conversationId?, leadId?, phone?, text, force? }
//   - identifica a conversa por conversationId OU leadId OU phone (mais recente)
//   - pula lead com a tag "PARAR ENVIO MSG" (a menos que force=true)
//   - envia texto livre (só entrega dentro da janela de 24h da Meta) e persiste
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }

  let body: {
    conversationId?: string;
    leadId?: string;
    phone?: string;
    text?: string;
    force?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const text = (body.text || "").trim();
  if (!text) {
    return NextResponse.json({ error: "text obrigatório" }, { status: 400 });
  }
  if (!body.conversationId && !body.leadId && !body.phone) {
    return NextResponse.json(
      { error: "informe conversationId, leadId ou phone" },
      { status: 400 },
    );
  }

  const { prisma } = await import("@/lib/prisma");

  // 1) resolve a conversa
  let conv: {
    id: string;
    organizationId: string;
    channel: string;
    phoneNumberId: string | null;
    lead: { id: string; phone: string | null; whatsapp: string | null } | null;
  } | null = null;

  if (body.conversationId) {
    conv = await prisma.conversation.findUnique({
      where: { id: body.conversationId },
      select: {
        id: true,
        organizationId: true,
        channel: true,
        phoneNumberId: true,
        lead: { select: { id: true, phone: true, whatsapp: true } },
      },
    });
  } else {
    const digits = (body.phone || "").replace(/\D/g, "");
    conv = await prisma.conversation.findFirst({
      where: body.leadId
        ? { leadId: body.leadId }
        : {
            lead: {
              OR: [
                { phone: { contains: digits } },
                { whatsapp: { contains: digits } },
              ],
            },
          },
      orderBy: { lastMessageAt: "desc" },
      select: {
        id: true,
        organizationId: true,
        channel: true,
        phoneNumberId: true,
        lead: { select: { id: true, phone: true, whatsapp: true } },
      },
    });
  }

  if (!conv) {
    return NextResponse.json(
      { error: "conversa não encontrada" },
      { status: 404 },
    );
  }

  // 2) blindagem: nunca responder quem pediu pra parar (a rede real é a TAG,
  //    não um regex — ver memória "Reclamação Blindagem"). force=true ignora.
  if (!body.force && conv.lead) {
    const stop = await prisma.leadTag.findFirst({
      where: { leadId: conv.lead.id, tag: { name: STOP_TAG } },
      select: { id: true },
    });
    if (stop) {
      return NextResponse.json(
        {
          skipped:
            "lead com tag PARAR ENVIO MSG — use force:true se intencional",
        },
        { status: 409 },
      );
    }
  }

  const to = conv.lead?.whatsapp || conv.lead?.phone;
  if (conv.channel !== "whatsapp" || !to) {
    return NextResponse.json(
      { error: "conversa sem destino de WhatsApp" },
      { status: 422 },
    );
  }

  // 3) envia pelo número DONO da conversa (padrão env = token de PROD)
  const wa = await whatsappFor(prisma, conv.organizationId, conv.phoneNumberId);
  if (!wa.isConfigured) {
    return NextResponse.json(
      { error: "número não configurado neste ambiente (rode em PROD)" },
      { status: 503 },
    );
  }

  const result = await wa.sendTextMessage(to, text);
  const ok = "messageId" in result && !!result.messageId;
  if (!ok) {
    logger.error("cron/reply send failed", { conversationId: conv.id, result });
  }

  // 4) persiste no thread (senderId null = resposta de sistema/cron)
  const message = await prisma.conversationMessage.create({
    data: {
      conversationId: conv.id,
      content: text,
      contentType: "text",
      direction: "outbound",
      status: ok ? "sent" : "failed",
      externalId: ok ? (result as { messageId: string }).messageId : undefined,
      metadata: JSON.stringify({ kind: "cron_reply" }),
    },
  });
  await prisma.conversation.update({
    where: { id: conv.id },
    data: { lastMessageAt: new Date() },
  });

  return NextResponse.json(
    { ok, conversationId: conv.id, to, messageId: message.id },
    { status: ok ? 200 : 502 },
  );
}
