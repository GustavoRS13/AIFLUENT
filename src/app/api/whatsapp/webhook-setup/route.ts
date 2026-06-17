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
  // App MSI (o que controla o WhatsApp) — token de app = appId|appSecret
  const appId = "1295702451981433";
  const appSecret =
    process.env.WA_ES_APP_SECRET ||
    process.env.WHATSAPP_APP_SECRET ||
    process.env.META_APP_SECRET ||
    "";
  const appToken = `${appId}|${appSecret}`;
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

    // 0) RESET: remove a inscrição atual (limpa override/roteamento herdado do
    //    Kommo) antes de re-inscrever limpo.
    const reset = await fetch(`${GRAPH}/${waba}/subscribed_apps`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${userToken}` },
    })
      .then(j)
      .catch((e) => ({ error: String(e) }));

    // 1) re-inscreve limpo (campo messages) com token de usuário
    const sub = await fetch(`${GRAPH}/${waba}/subscribed_apps`, {
      method: "POST",
      headers: { Authorization: `Bearer ${userToken}` },
    })
      .then(j)
      .catch((e) => ({ error: String(e) }));

    // 1b) GARANTE o webhook DO APP MSI apontando pro nosso endpoint (campo
    //     messages). Se MSI estava sem callback, é por isso que nada chegava.
    const appWebhookBefore = await fetch(
      `${GRAPH}/${appId}/subscriptions?access_token=${encodeURIComponent(appToken)}`,
    )
      .then(j)
      .catch((e) => ({ error: String(e) }));
    const appWebhookSet = await fetch(`${GRAPH}/${appId}/subscriptions`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        object: "whatsapp_business_account",
        callback_url: callback,
        verify_token: verify,
        fields: "messages,message_template_status_update,messaging_handovers",
        access_token: appToken,
      }),
    })
      .then(j)
      .catch((e) => ({ error: String(e) }));

    // espera a inscrição propagar antes de forçar o override
    await new Promise((r) => setTimeout(r, 8000));

    // 2) força o override do callback (retoma o controle do Kommo).
    const doOverride = (tokenInBody?: string) =>
      fetch(`${GRAPH}/${waba}/subscribed_apps`, {
        method: "POST",
        headers: tokenInBody
          ? { "Content-Type": "application/json" }
          : {
              Authorization: `Bearer ${userToken}`,
              "Content-Type": "application/json",
            },
        body: JSON.stringify({
          override_callback_uri: callback,
          verify_token: verify,
          ...(tokenInBody ? { access_token: tokenInBody } : {}),
        }),
      })
        .then(j)
        .catch((e) => ({ error: String(e) }));

    let overrideUser = await doOverride();
    // fallback: tenta com token de APP (app_id|app_secret)
    if (overrideUser?.error && appToken !== userToken) {
      await new Promise((r) => setTimeout(r, 3000));
      const overrideApp = await doOverride(appToken);
      overrideUser = { withUserToken: overrideUser, withAppToken: overrideApp };
    }

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
      reset,
      subscribe: sub,
      appWebhookBefore,
      appWebhookSet,
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
