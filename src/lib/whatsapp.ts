const WHATSAPP_API_URL = "https://graph.facebook.com/v21.0";

interface WhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
  businessAccountId: string;
  webhookVerifyToken: string;
}

function getConfig(): WhatsAppConfig {
  return {
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || "",
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "",
    webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "",
  };
}

export class WhatsAppService {
  private config: WhatsAppConfig;

  constructor() {
    this.config = getConfig();
  }

  get isConfigured(): boolean {
    return !!(this.config.phoneNumberId && this.config.accessToken);
  }

  private log(
    level: "info" | "warn" | "error",
    message: string,
    data?: Record<string, unknown>,
  ) {
    const timestamp = new Date().toISOString();
    const prefix = `[WhatsApp][${timestamp}][${level.toUpperCase()}]`;
    if (level === "error") console.error(prefix, message, data || "");
    else if (level === "warn") console.warn(prefix, message, data || "");
    else console.log(prefix, message, data || "");
  }

  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    maxRetries = 3,
  ): Promise<Response> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch(url, options);
        if (res.status === 429) {
          // Rate limited by Meta - wait and retry
          const retryAfter = parseInt(res.headers.get("retry-after") || "5");
          await new Promise((r) => setTimeout(r, retryAfter * 1000));
          continue;
        }
        return res;
      } catch (err) {
        if (attempt === maxRetries) throw err;
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
      }
    }
    throw new Error("Max retries exceeded");
  }

  async sendTextMessage(
    to: string,
    text: string,
  ): Promise<{ messageId: string } | { error: string }> {
    if (!this.isConfigured)
      return {
        error: "WhatsApp nao configurado. Configure as variaveis WHATSAPP_*",
      };
    this.log("info", "Sending text message", { to, textLength: text.length });
    try {
      const res = await this.fetchWithRetry(
        `${WHATSAPP_API_URL}/${this.config.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.config.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to,
            type: "text",
            text: { preview_url: false, body: text },
          }),
        },
      );
      const data = await res.json();
      if (data.messages?.[0]?.id) {
        this.log("info", "Text message sent successfully", {
          to,
          messageId: data.messages[0].id,
        });
        return { messageId: data.messages[0].id };
      }
      this.log("warn", "Text message failed", {
        to,
        error: data.error?.message,
      });
      return { error: data.error?.message || "Falha ao enviar" };
    } catch (err) {
      this.log("error", "Text message error", {
        to,
        error: err instanceof Error ? err.message : "unknown",
      });
      return { error: err instanceof Error ? err.message : "Erro de conexao" };
    }
  }

  async sendTemplateMessage(
    to: string,
    templateName: string,
    languageCode: string,
    components?: unknown[],
  ): Promise<{ messageId: string } | { error: string }> {
    if (!this.isConfigured) return { error: "WhatsApp nao configurado" };
    this.log("info", "Sending template message", {
      to,
      templateName,
      languageCode,
    });
    try {
      const res = await this.fetchWithRetry(
        `${WHATSAPP_API_URL}/${this.config.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.config.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to,
            type: "template",
            template: {
              name: templateName,
              language: { code: languageCode },
              components,
            },
          }),
        },
      );
      const data = await res.json();
      if (data.messages?.[0]?.id) {
        this.log("info", "Template message sent successfully", {
          to,
          messageId: data.messages[0].id,
        });
        return { messageId: data.messages[0].id };
      }
      this.log("warn", "Template message failed", {
        to,
        error: data.error?.message,
      });
      return { error: data.error?.message || "Falha ao enviar template" };
    } catch (err) {
      this.log("error", "Template message error", {
        to,
        error: err instanceof Error ? err.message : "unknown",
      });
      return { error: err instanceof Error ? err.message : "Erro de conexao" };
    }
  }

  async sendMediaMessage(
    to: string,
    type: "image" | "document" | "audio" | "video",
    mediaUrl: string,
    caption?: string,
  ): Promise<{ messageId: string } | { error: string }> {
    if (!this.isConfigured) return { error: "WhatsApp nao configurado" };
    this.log("info", "Sending media message", { to, type, mediaUrl });
    try {
      const body: Record<string, unknown> = {
        messaging_product: "whatsapp",
        to,
        type,
        [type]: { link: mediaUrl },
      };
      if (caption && (type === "image" || type === "document")) {
        (body[type] as Record<string, unknown>).caption = caption;
      }
      const res = await this.fetchWithRetry(
        `${WHATSAPP_API_URL}/${this.config.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.config.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
      );
      const data = await res.json();
      if (data.messages?.[0]?.id) {
        this.log("info", "Media message sent successfully", {
          to,
          messageId: data.messages[0].id,
        });
        return { messageId: data.messages[0].id };
      }
      this.log("warn", "Media message failed", {
        to,
        error: data.error?.message,
      });
      return { error: data.error?.message || "Falha ao enviar midia" };
    } catch (err) {
      this.log("error", "Media message error", {
        to,
        error: err instanceof Error ? err.message : "unknown",
      });
      return { error: err instanceof Error ? err.message : "Erro de conexao" };
    }
  }

  // Faz upload de um arquivo para o WhatsApp e retorna o media id.
  async uploadMedia(
    bytes: ArrayBuffer,
    mimeType: string,
    filename: string,
  ): Promise<{ id: string } | { error: string }> {
    if (!this.isConfigured) return { error: "WhatsApp nao configurado" };
    try {
      const form = new FormData();
      form.append("messaging_product", "whatsapp");
      form.append("type", mimeType);
      form.append("file", new Blob([bytes], { type: mimeType }), filename);
      const res = await this.fetchWithRetry(
        `${WHATSAPP_API_URL}/${this.config.phoneNumberId}/media`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${this.config.accessToken}` },
          body: form,
        },
      );
      const data = await res.json();
      if (data.id) return { id: data.id };
      return { error: data.error?.message || "Falha no upload de midia" };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Erro de conexao" };
    }
  }

  // Envia mídia já enviada ao WhatsApp (por media id).
  async sendMediaById(
    to: string,
    type: "image" | "document" | "audio" | "video",
    mediaId: string,
    caption?: string,
    filename?: string,
  ): Promise<{ messageId: string } | { error: string }> {
    if (!this.isConfigured) return { error: "WhatsApp nao configurado" };
    try {
      const media: Record<string, unknown> = { id: mediaId };
      if (caption && (type === "image" || type === "document"))
        media.caption = caption;
      if (filename && type === "document") media.filename = filename;
      const body = { messaging_product: "whatsapp", to, type, [type]: media };
      const res = await this.fetchWithRetry(
        `${WHATSAPP_API_URL}/${this.config.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.config.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
      );
      const data = await res.json();
      if (data.messages?.[0]?.id) return { messageId: data.messages[0].id };
      return { error: data.error?.message || "Falha ao enviar midia" };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Erro de conexao" };
    }
  }

  // Resolve a URL temporária de uma mídia recebida (por media id).
  async getMediaUrl(
    mediaId: string,
  ): Promise<{ url: string; mimeType: string } | { error: string }> {
    if (!this.isConfigured) return { error: "WhatsApp nao configurado" };
    try {
      const res = await fetch(`${WHATSAPP_API_URL}/${mediaId}`, {
        headers: { Authorization: `Bearer ${this.config.accessToken}` },
      });
      const data = await res.json();
      if (data.url)
        return {
          url: data.url,
          mimeType: data.mime_type || "application/octet-stream",
        };
      return { error: data.error?.message || "Midia nao encontrada" };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Erro de conexao" };
    }
  }

  // Baixa os bytes de uma mídia (a URL do WhatsApp exige o token).
  async downloadMedia(
    url: string,
  ): Promise<{ bytes: ArrayBuffer; contentType: string } | { error: string }> {
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${this.config.accessToken}` },
      });
      if (!res.ok) return { error: `Download falhou (${res.status})` };
      const bytes = await res.arrayBuffer();
      return {
        bytes,
        contentType:
          res.headers.get("content-type") || "application/octet-stream",
      };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Erro de conexao" };
    }
  }

  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    this.log("info", "Webhook verification attempt", { mode });
    if (mode === "subscribe" && token === this.config.webhookVerifyToken) {
      this.log("info", "Webhook verified successfully");
      return challenge;
    }
    this.log("warn", "Webhook verification failed", { mode });
    return null;
  }

  async refreshAccessToken(): Promise<boolean> {
    // WhatsApp Cloud API uses long-lived tokens (60 days)
    // To refresh: POST to https://graph.facebook.com/v21.0/oauth/access_token
    // with grant_type=fb_exchange_token&client_id=APP_ID&client_secret=APP_SECRET&fb_exchange_token=CURRENT_TOKEN
    this.log(
      "info",
      "Token refresh not implemented - use Meta Business Manager to generate new token",
    );
    return false;
  }

  processWebhookPayload(
    body: Record<string, unknown>,
  ): {
    from: string;
    message: string;
    messageId: string;
    timestamp: string;
  } | null {
    try {
      const entry = (body.entry as Array<Record<string, unknown>>)?.[0];
      const changes = (entry?.changes as Array<Record<string, unknown>>)?.[0];
      const value = changes?.value as Record<string, unknown>;
      const messages = value?.messages as Array<Record<string, unknown>>;
      if (!messages?.length) return null;

      const msg = messages[0];
      return {
        from: msg.from as string,
        message: (msg.text as Record<string, string>)?.body || "",
        messageId: msg.id as string,
        timestamp: msg.timestamp as string,
      };
    } catch {
      this.log("error", "Failed to parse webhook payload");
      return null;
    }
  }
}

export const whatsapp = new WhatsAppService();
