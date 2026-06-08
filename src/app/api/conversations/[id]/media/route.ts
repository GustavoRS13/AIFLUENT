import { NextRequest, NextResponse } from "next/server";
import { requireAuth, checkRateLimit, requireOrgId } from "@/lib/api-auth";
import { apiLimiter } from "@/lib/rate-limit";
import { whatsapp } from "@/lib/whatsapp";
import { logger } from "@/lib/logger";

// Envio de mídia (imagem/áudio/vídeo/documento) numa conversa de WhatsApp.
// Faz upload do arquivo para o WhatsApp, envia e persiste a mensagem.
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
    const form = await request.formData();
    const file = form.get("file");
    const caption = (form.get("caption") as string) || undefined;
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Arquivo obrigatorio" },
        { status: 400 },
      );
    }

    const { prisma } = await import("@/lib/prisma");
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      select: {
        organizationId: true,
        channel: true,
        lead: { select: { phone: true, whatsapp: true } },
      },
    });
    if (!conversation || conversation.organizationId !== orgId) {
      return NextResponse.json(
        { error: "Conversa nao encontrada" },
        { status: 404 },
      );
    }

    const mime = file.type || "application/octet-stream";
    const type: "image" | "audio" | "video" | "document" = mime.startsWith(
      "image/",
    )
      ? "image"
      : mime.startsWith("audio/")
        ? "audio"
        : mime.startsWith("video/")
          ? "video"
          : "document";

    let externalId: string | undefined;
    let status = "sent";
    let mediaId: string | undefined;

    if (conversation.channel === "whatsapp" && whatsapp.isConfigured) {
      const to = conversation.lead?.whatsapp || conversation.lead?.phone;
      if (to) {
        const bytes = await file.arrayBuffer();
        const up = await whatsapp.uploadMedia(bytes, mime, file.name);
        if ("id" in up) {
          mediaId = up.id;
          const sent = await whatsapp.sendMediaById(
            to,
            type,
            up.id,
            caption,
            type === "document" ? file.name : undefined,
          );
          if ("messageId" in sent) {
            externalId = sent.messageId;
          } else {
            status = "failed";
            logger.error("WhatsApp media send failed", { error: sent.error });
          }
        } else {
          status = "failed";
          logger.error("WhatsApp media upload failed", { error: up.error });
        }
      }
    }

    const message = await prisma.conversationMessage.create({
      data: {
        conversationId: id,
        direction: "outbound",
        content: caption || `[${type}] ${file.name}`,
        contentType: type,
        mediaType: mime,
        status,
        externalId,
        metadata: JSON.stringify({ mediaId, filename: file.name }),
        senderId: (session!.user as Record<string, unknown>).id as string,
      },
    });
    await prisma.conversation.update({
      where: { id },
      data: { lastMessageAt: new Date() },
    });

    return NextResponse.json({ ok: status !== "failed", message });
  } catch (err) {
    logger.error("POST /api/conversations/[id]/media error", err);
    return NextResponse.json(
      { error: "Falha ao enviar midia" },
      { status: 500 },
    );
  }
}
