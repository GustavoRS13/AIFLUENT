import { NextRequest, NextResponse } from "next/server";
import { requireAuth, checkRateLimit, requireOrgId } from "@/lib/api-auth";
import { apiLimiter } from "@/lib/rate-limit";
import { whatsappFor } from "@/lib/whatsapp-numbers";
import { logger } from "@/lib/logger";
import { needsTranscode, transcodeToOggOpus } from "@/lib/audio-transcode";

// ffmpeg-static + child_process exigem runtime Node.js (não Edge).
export const runtime = "nodejs";
export const maxDuration = 60;

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

  const correlationId = crypto.randomUUID();
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
    let sendError: string | undefined;

    if (conversation.channel === "whatsapp" && whatsapp.isConfigured) {
      const to = conversation.lead?.whatsapp || conversation.lead?.phone;
      if (to) {
        let bytes: ArrayBuffer = await file.arrayBuffer();
        let uploadMime = mime;
        let uploadName = file.name;

        // Áudio em formato não aceito pelo WhatsApp (ex.: webm do Chrome) →
        // transcodifica para OGG/Opus. Erro REAL é propagado (sem máscara).
        if (type === "audio" && needsTranscode(mime)) {
          const inExt = (mime.split("/")[1] || "webm").split(";")[0];
          try {
            const ogg = await transcodeToOggOpus(bytes, inExt);
            bytes = ogg.buffer.slice(
              ogg.byteOffset,
              ogg.byteOffset + ogg.byteLength,
            ) as ArrayBuffer;
            uploadMime = "audio/ogg";
            uploadName = uploadName.replace(/\.[^.]+$/, "") + ".ogg";
          } catch (e) {
            // Log estruturado APENAS de falha (sem dados sensíveis: só formatos/tamanho).
            logger.error("audio_transcode_failed", {
              correlationId,
              formatIn: mime,
              formatOut: "audio/ogg;codecs=opus",
              sizeIn: bytes.byteLength,
              reason: e instanceof Error ? e.message.slice(0, 300) : String(e),
            });
            throw e;
          }
        }

        const up = await whatsapp.uploadMedia(bytes, uploadMime, uploadName);
        if ("id" in up) {
          mediaId = up.id;
          const sent = await whatsapp.sendMediaById(
            to,
            type,
            up.id,
            caption,
            type === "document" ? uploadName : undefined,
          );
          if ("messageId" in sent) {
            externalId = sent.messageId;
          } else {
            status = "failed";
            sendError = sent.error;
            logger.error("WhatsApp media send failed", { error: sent.error });
          }
        } else {
          status = "failed";
          sendError = up.error;
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
        mediaId,
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

    return NextResponse.json({
      ok: status !== "failed",
      message,
      error: sendError,
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "erro desconhecido";
    logger.error("POST /api/conversations/[id]/media error", {
      correlationId,
      error: detail.slice(0, 300),
    });
    return NextResponse.json(
      { error: "Falha ao enviar midia", detail, correlationId },
      { status: 500 },
    );
  }
}
