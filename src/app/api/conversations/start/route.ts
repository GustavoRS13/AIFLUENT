import { NextRequest, NextResponse } from "next/server";
import { requireAuth, checkRateLimit, requireOrgId } from "@/lib/api-auth";
import { apiLimiter } from "@/lib/rate-limit";
import { ingestLead } from "@/lib/lead-ingest";
import { logger } from "@/lib/logger";

// Cria (ou reutiliza) um lead + conversa de WhatsApp a partir do Atendimento,
// para iniciar um disparo manual. O 1º envio a um lead novo exige template
// (regra das 24h) — o seletor de Modelos resolve isso.
export async function POST(request: NextRequest) {
  const rl = checkRateLimit(request, apiLimiter);
  if (rl) return rl;
  const { error, session } = await requireAuth();
  if (error) return error;
  const { orgId, error: orgError } = requireOrgId(session);
  if (orgError) return orgError;

  try {
    const body = await request.json();
    const { prisma } = await import("@/lib/prisma");

    let leadId: string;

    // Caminho A: lead já existente (ex.: card do pipeline) → abre/cria a conversa dele.
    if (body.leadId) {
      const existing = await prisma.lead.findUnique({
        where: { id: body.leadId as string },
        select: { id: true, organizationId: true },
      });
      if (!existing || existing.organizationId !== orgId) {
        return NextResponse.json(
          { error: "Lead não encontrado" },
          { status: 404 },
        );
      }
      leadId = existing.id;
    } else {
      // Caminho B: lead novo pelo nome + telefone (funil + dedup + etapa padrão).
      const firstName = (body.firstName as string)?.trim();
      const phone = (body.phone as string)?.trim()?.replace(/\D/g, "");
      if (!firstName || !phone || phone.length < 10) {
        return NextResponse.json(
          { error: "Nome e telefone (com DDD/país) são obrigatórios" },
          { status: 400 },
        );
      }
      const result = await ingestLead(prisma, {
        organizationId: orgId,
        firstName,
        phone,
        whatsapp: phone,
        source: "manual",
        channel: "whatsapp",
        tags: ["atendimento"],
      });
      leadId = result.lead.id;
    }

    // Multi-número: de qual número esta conversa é (null = padrão env).
    const envPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
    const reqNum = (body.phoneNumberId as string)?.trim();
    const numId = !reqNum || reqNum === envPhoneId ? null : reqNum;

    // 2. cria/reutiliza a conversa de WhatsApp DO NÚMERO escolhido
    let conversation = await prisma.conversation.findFirst({
      where: {
        organizationId: orgId,
        leadId,
        channel: "whatsapp",
        phoneNumberId: numId,
      },
      select: { id: true },
    });
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          organizationId: orgId,
          leadId,
          channel: "whatsapp",
          status: "open",
          lastMessageAt: new Date(),
          phoneNumberId: numId,
        },
        select: { id: true },
      });
    }

    return NextResponse.json({
      conversationId: conversation.id,
      leadId,
      phoneNumberId: numId,
    });
  } catch (err) {
    logger.error("POST /api/conversations/start error", err);
    return NextResponse.json(
      { error: "Falha ao iniciar conversa" },
      { status: 500 },
    );
  }
}
