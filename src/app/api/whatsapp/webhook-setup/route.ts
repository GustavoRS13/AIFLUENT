import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const GRAPH = "https://graph.facebook.com/v21.0";

// Diagnostica e RE-INSCREVE o webhook do WhatsApp (subscribed_apps do WABA),
// forçando o callback pro nosso endpoint. Admin-only. Corrige inbound parado.
export async function POST() {
  const { error } = await requireAuth("admin");
  if (error) return error;

  const token = process.env.WHATSAPP_ACCESS_TOKEN || "";
  const waba = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "";
  const verify = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "";
  const callback = "https://crm.aifluent.com.br/api/whatsapp";
  if (!token || !waba) {
    return NextResponse.json(
      { error: "WHATSAPP_ACCESS_TOKEN/BUSINESS_ACCOUNT_ID ausentes" },
      { status: 400 },
    );
  }

  const auth = { Authorization: `Bearer ${token}` };
  try {
    const before = await fetch(`${GRAPH}/${waba}/subscribed_apps`, {
      headers: auth,
    }).then((r) => r.json());

    // 1) inscrição simples (app passa a receber o campo "messages" no webhook do app)
    const sub = await fetch(`${GRAPH}/${waba}/subscribed_apps`, {
      method: "POST",
      headers: auth,
    }).then((r) => r.json());

    // 2) tenta forçar o callback pro nosso endpoint (best-effort; pode falhar se
    //    o app já entrega no webhook configurado no painel — que é o nosso)
    let override: unknown = null;
    if (verify) {
      override = await fetch(`${GRAPH}/${waba}/subscribed_apps`, {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({
          override_callback_uri: callback,
          verify_token: verify,
        }),
      })
        .then((r) => r.json())
        .catch((e) => ({ error: String(e) }));
    }

    const after = await fetch(`${GRAPH}/${waba}/subscribed_apps`, {
      headers: auth,
    }).then((r) => r.json());

    logger.info("whatsapp_webhook_resubscribe", { callback, sub, override });
    return NextResponse.json({ callback, before, sub, override, after });
  } catch (e) {
    logger.error("whatsapp_webhook_resubscribe_error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
