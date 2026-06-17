import { NextRequest, NextResponse } from "next/server";
import { requireAuth, checkRateLimit } from "@/lib/api-auth";
import { whatsapp } from "@/lib/whatsapp";
import { verifySignature, parseWebhook } from "@/lib/whatsapp-webhook";
import {
  resolveOrgForPhoneNumber,
  persistInboundMessage,
  persistStatusUpdate,
} from "@/lib/whatsapp-inbound";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  // Verificacao do webhook (Meta chama isto)
  const sp = request.nextUrl.searchParams;
  const mode = sp.get("hub.mode") || "";
  const verifyToken = sp.get("hub.verify_token") || "";
  const challenge = sp.get("hub.challenge") || "";

  const result = whatsapp.verifyWebhook(mode, verifyToken, challenge);
  if (result) return new NextResponse(result, { status: 200 });
  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  // Le o corpo cru — necessario para validar a assinatura HMAC.
  const raw = await request.text();

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  // Case 1: webhook da Meta (inbound + status) — multi-tenant
  if (body.object === "whatsapp_business_account") {
    // A Meta assina com o segredo do APP que entrega (MSI). Aceita qualquer um
    // dos segredos configurados (MSI/WA_ES, WHATSAPP, META).
    const secrets = [
      process.env.WA_ES_APP_SECRET,
      process.env.WHATSAPP_APP_SECRET,
      process.env.META_APP_SECRET,
    ].filter(Boolean) as string[];
    if (secrets.length) {
      const sig = request.headers.get("x-hub-signature-256");
      const valid = secrets.some((s) => verifySignature(raw, sig, s));
      if (!valid) {
        logger.warn("[WhatsApp Webhook] assinatura invalida");
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 403 },
        );
      }
    } else {
      logger.warn(
        "[WhatsApp Webhook] sem app secret — assinatura nao verificada",
      );
    }

    try {
      const parsed = parseWebhook(body);
      // FILTRO CRÍTICO: o app pode estar inscrito numa WABA com vários números
      // (ex.: o número do Clint). Só processamos as mensagens do NOSSO número.
      const ourPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
      if (
        ourPhoneId &&
        parsed.phoneNumberId &&
        parsed.phoneNumberId !== ourPhoneId
      ) {
        logger.info("[WhatsApp Webhook] ignorado (outro numero)", {
          recebidoEm: parsed.phoneNumberId,
          nosso: ourPhoneId,
        });
        return NextResponse.json({ status: "ignored" }, { status: 200 });
      }
      if (parsed.messages.length || parsed.statuses.length) {
        const { prisma } = await import("@/lib/prisma");
        const orgId = await resolveOrgForPhoneNumber(
          prisma,
          parsed.phoneNumberId,
        );
        if (!orgId) {
          logger.warn("[WhatsApp Webhook] organizacao nao resolvida", {
            phoneNumberId: parsed.phoneNumberId,
          });
        } else {
          for (const m of parsed.messages) {
            try {
              await persistInboundMessage(prisma, orgId, m, parsed.contactName);
            } catch (e) {
              logger.error("[WhatsApp Webhook] falha ao persistir mensagem", {
                error: e instanceof Error ? e.message : String(e),
              });
            }
          }
          for (const s of parsed.statuses) {
            await persistStatusUpdate(prisma, s);
          }
          logger.info("[WhatsApp Webhook] processado", {
            organizationId: orgId,
            messages: parsed.messages.length,
            statuses: parsed.statuses.length,
          });
        }
      }
    } catch (e) {
      logger.error("[WhatsApp Webhook] erro", {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    return NextResponse.json({ status: "received" }, { status: 200 });
  }

  // Case 2: acao de envio pela UI (requer auth + rate limit)
  const rateLimited = checkRateLimit(request);
  if (rateLimited) return rateLimited;

  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const { action, to, message, templateName, mediaUrl, mediaType } = body as {
    action?: string;
    to?: string;
    message?: string;
    templateName?: string;
    mediaUrl?: string;
    mediaType?: "image" | "document" | "audio" | "video";
  };

  if (!whatsapp.isConfigured) {
    return NextResponse.json(
      {
        error:
          "WhatsApp Business API nao configurado. Defina WHATSAPP_PHONE_NUMBER_ID e WHATSAPP_ACCESS_TOKEN.",
        configured: false,
      },
      { status: 503 },
    );
  }

  if (!to) {
    return NextResponse.json(
      { error: 'Campo "to" obrigatorio' },
      { status: 400 },
    );
  }

  switch (action) {
    case "send_text":
      if (!message)
        return NextResponse.json(
          { error: 'Campo "message" obrigatorio' },
          { status: 400 },
        );
      return NextResponse.json(await whatsapp.sendTextMessage(to, message));
    case "send_template":
      if (!templateName)
        return NextResponse.json(
          { error: 'Campo "templateName" obrigatorio' },
          { status: 400 },
        );
      return NextResponse.json(
        await whatsapp.sendTemplateMessage(to, templateName, "pt_BR"),
      );
    case "send_media":
      if (!mediaUrl || !mediaType)
        return NextResponse.json(
          { error: 'Campos "mediaUrl" e "mediaType" obrigatorios' },
          { status: 400 },
        );
      return NextResponse.json(
        await whatsapp.sendMediaMessage(to, mediaType, mediaUrl, message),
      );
    default:
      return NextResponse.json(
        { error: "Acao invalida. Use: send_text, send_template, send_media" },
        { status: 400 },
      );
  }
}
