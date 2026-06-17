import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const GRAPH = "https://graph.facebook.com/v21.0";

// Diagnostica e RE-INSCREVE o webhook do WhatsApp, forçando o callback pro nosso
// endpoint (retoma o controle de outro BSP como o Kommo). Admin-only.
export async function POST() {
  const { error } = await requireAuth("admin");
  if (error) return error;

  const userToken = process.env.WHATSAPP_ACCESS_TOKEN || "";
  const waba = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "";
  const verify = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "";
  const appId = process.env.META_APP_ID || "";
  const appSecret =
    process.env.META_APP_SECRET || process.env.WHATSAPP_APP_SECRET || "";
  const appToken = appId && appSecret ? `${appId}|${appSecret}` : userToken;
  const callback = "https://crm.aifluent.com.br/api/whatsapp";

  if (!userToken || !waba) {
    return NextResponse.json(
      { error: "WHATSAPP_ACCESS_TOKEN/BUSINESS_ACCOUNT_ID ausentes" },
      { status: 400 },
    );
  }

  const j = (r: Response) => r.json();
  try {
    // Config do webhook DO APP (callback_url + campos inscritos)
    const appSubs = appId
      ? await fetch(
          `${GRAPH}/${appId}/subscriptions?access_token=${encodeURIComponent(appToken)}`,
        )
          .then(j)
          .catch((e) => ({ error: String(e) }))
      : { skipped: "sem META_APP_ID" };

    // 1) garante inscrição simples (campo messages) com token de usuário
    const sub = await fetch(`${GRAPH}/${waba}/subscribed_apps`, {
      method: "POST",
      headers: { Authorization: `Bearer ${userToken}` },
    })
      .then(j)
      .catch((e) => ({ error: String(e) }));

    // 2) força o override do callback (retoma o controle do Kommo).
    //    Tenta com token de usuário e, se falhar, com token de app.
    const overrideUser = await fetch(`${GRAPH}/${waba}/subscribed_apps`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        override_callback_uri: callback,
        verify_token: verify,
      }),
    })
      .then(j)
      .catch((e) => ({ error: String(e) }));

    const after = await fetch(
      `${GRAPH}/${waba}/subscribed_apps?access_token=${encodeURIComponent(userToken)}`,
    )
      .then(j)
      .catch((e) => ({ error: String(e) }));

    logger.info("whatsapp_webhook_resubscribe", {
      callback,
      sub,
      overrideUser,
    });
    return NextResponse.json({
      callback,
      appWebhook: appSubs,
      subscribe: sub,
      override: overrideUser,
      after,
    });
  } catch (e) {
    logger.error("whatsapp_webhook_resubscribe_error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
