import { NextRequest, NextResponse } from "next/server";
import { requireAuth, checkRateLimit, requireOrgId } from "@/lib/api-auth";
import { apiLimiter } from "@/lib/rate-limit";
import { whatsappFor } from "@/lib/whatsapp-numbers";
import { logger } from "@/lib/logger";

// Envia um template aprovado numa conversa e persiste a mensagem.
// Permite iniciar conversa mesmo fora da janela de 24h (regra do WhatsApp).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = checkRateLimit(request, apiLimiter);
  if (rl) return rl;
  const { error, session } = await requireAuth();
  if (error) return error;
  const { orgId, error: orgError } = requireOrgId(session);
  if (orgError) return orgError;
  const { id } = await params;

  try {
    const body = await request.json();
    const templateName = (body.templateName as string)?.trim();
    const languageCode = (body.languageCode as string)?.trim() || "pt_BR";
    const templateParams: string[] = Array.isArray(body.params)
      ? body.params.map((p: unknown) => String(p))
      : [];
    const preview = (body.preview as string) || `[template] ${templateName}`;
    if (!templateName) {
      return NextResponse.json(
        { error: "templateName obrigatorio" },
        { status: 400 },
      );
    }

    const { prisma } = await import("@/lib/prisma");
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      select: {
        organizationId: true,
        channel: true,
        phoneNumberId: true,
        lead: { select: { phone: true, whatsapp: true } },
      },
    });
    if (!conversation || conversation.organizationId !== orgId) {
      return NextResponse.json(
        { error: "Conversa nao encontrada" },
        { status: 404 },
      );
    }

    // Multi-número: envia pelo número dono da conversa (padrão env se null).
    const whatsapp = await whatsappFor(
      prisma,
      orgId,
      conversation.phoneNumberId,
    );

    let externalId: string | undefined;
    let status = "sent";
    let sendError: string | undefined;
    const to = conversation.lead?.whatsapp || conversation.lead?.phone;

    if (conversation.channel === "whatsapp" && whatsapp.isConfigured && to) {
      const components = templateParams.length
        ? [
            {
              type: "body",
              parameters: templateParams.map((t) => ({
                type: "text",
                text: t,
              })),
            },
          ]
        : undefined;
      const sent = await whatsapp.sendTemplateMessage(
        to,
        templateName,
        languageCode,
        components,
      );
      if ("messageId" in sent) externalId = sent.messageId;
      else {
        status = "failed";
        sendError = sent.error;
        logger.error("WhatsApp template send failed", { error: sent.error });
      }
    }

    const message = await prisma.conversationMessage.create({
      data: {
        conversationId: id,
        direction: "outbound",
        content: preview,
        contentType: "text",
        status,
        externalId,
        metadata: JSON.stringify({ template: templateName, languageCode }),
        senderId: (session!.user as Record<string, unknown>).id as string,
      },
    });
    await prisma.conversation.update({
      where: { id },
      data: { lastMessageAt: new Date() },
    });

    return NextResponse.json({
      ok: status !== "failed",
      message,
      error: sendError,
    });
  } catch (err) {
    logger.error("POST /api/conversations/[id]/template error", err);
    return NextResponse.json(
      { error: "Falha ao enviar template" },
      { status: 500 },
    );
  }
}
