import crypto from "crypto";

/**
 * Validação e parsing do webhook do WhatsApp Cloud API (Meta).
 * Funções puras — não tocam no banco (ver whatsapp-inbound.ts para persistência).
 */

/**
 * Verifica a assinatura X-Hub-Signature-256 (HMAC-SHA256 com o App Secret).
 * Retorna false quando não há App Secret/assinatura — o chamador decide a política.
 */
export function verifySignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string,
): boolean {
  if (!appSecret || !signatureHeader) return false;
  const expected =
    "sha256=" +
    crypto
      .createHmac("sha256", appSecret)
      .update(rawBody, "utf8")
      .digest("hex");
  const a = Buffer.from(signatureHeader);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export interface InboundMessage {
  externalId: string;
  from: string;
  timestamp: string;
  type: string;
  content: string;
  contentType: string; // text | image | audio | video | document | location | unknown
  mediaId?: string;
  mediaType?: string; // mime-type
  caption?: string;
}

export interface StatusUpdate {
  externalId: string;
  status: string; // sent | delivered | read | failed
  recipientId?: string;
  timestamp?: string;
  errorCode?: number;
  errorTitle?: string;
}

export interface ParsedInbound {
  phoneNumberId?: string;
  contactName?: string;
  messages: InboundMessage[];
  statuses: StatusUpdate[];
}

const MEDIA_TYPES = ["image", "audio", "video", "document", "sticker"];

/** Faz o parse de um payload `whatsapp_business_account` em mensagens + status. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseWebhook(body: Record<string, any>): ParsedInbound {
  const result: ParsedInbound = { messages: [], statuses: [] };
  try {
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    if (!value) return result;

    result.phoneNumberId = value.metadata?.phone_number_id;
    result.contactName = value.contacts?.[0]?.profile?.name;

    for (const m of value.messages || []) {
      const type: string = m.type;
      let content = "";
      let contentType = type;
      let mediaId: string | undefined;
      let mediaType: string | undefined;
      let caption: string | undefined;

      if (type === "text") {
        content = m.text?.body || "";
        contentType = "text";
      } else if (MEDIA_TYPES.includes(type)) {
        const media = m[type] || {};
        mediaId = media.id;
        mediaType = media.mime_type;
        caption = media.caption;
        content = media.caption || `[${type}]`;
        contentType = type === "sticker" ? "image" : type;
      } else if (type === "location") {
        const loc = m.location || {};
        content = `[location] ${loc.latitude},${loc.longitude}`;
        contentType = "location";
      } else if (type === "button") {
        content = m.button?.text || "[button]";
        contentType = "text";
      } else if (type === "interactive") {
        content =
          m.interactive?.button_reply?.title ||
          m.interactive?.list_reply?.title ||
          "[interactive]";
        contentType = "text";
      } else if (type === "reaction") {
        content = m.reaction?.emoji || "[reação]";
        contentType = "text";
      } else if (type === "contacts") {
        const nome = m.contacts?.[0]?.name?.formatted_name || "";
        content = `[contato] ${nome}`.trim();
        contentType = "text";
      } else if (type === "order") {
        content = "[pedido recebido]";
        contentType = "text";
      } else if (type === "unsupported") {
        // A Meta não entrega o conteúdo deste tipo (ex.: enquete, view-once,
        // figurinha especial). Mostra algo claro pro atendente em vez de "[unsupported]".
        const reason = m.errors?.[0]?.title || "";
        content = reason
          ? `⚠️ Mensagem não exibível (${reason}). Peça pro cliente reenviar como texto.`
          : "⚠️ O cliente enviou uma mensagem que o WhatsApp não entrega por aqui. Peça pra reenviar como texto.";
        contentType = "text";
      } else {
        content = `[${type}]`;
        contentType = type;
      }

      // Clique em anúncio (Click-to-WhatsApp): anexa a origem do anúncio.
      if (m.referral?.source_id || m.referral?.headline) {
        const ref = m.referral;
        content =
          `📣 Veio de um anúncio${ref.headline ? `: "${ref.headline}"` : ""}` +
          (content && !content.startsWith("⚠️") ? `\n${content}` : "");
        if (contentType === "unsupported") contentType = "text";
      }

      result.messages.push({
        externalId: m.id,
        from: m.from,
        timestamp: m.timestamp,
        type,
        content,
        contentType,
        mediaId,
        mediaType,
        caption,
      });
    }

    for (const s of value.statuses || []) {
      const err = s.errors?.[0];
      result.statuses.push({
        externalId: s.id,
        status: s.status,
        recipientId: s.recipient_id,
        timestamp: s.timestamp,
        errorCode: err?.code,
        errorTitle: err?.title,
      });
    }
  } catch {
    /* payload malformado — retorna o que conseguiu */
  }
  return result;
}
