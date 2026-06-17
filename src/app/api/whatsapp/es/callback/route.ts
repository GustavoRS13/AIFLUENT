import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const GRAPH = "https://graph.facebook.com/v21.0";
const APP_ID = "1295702451981433";
const REDIRECT_URI = "https://crm.aifluent.com.br/api/whatsapp/es/callback";
const PAGE = "https://crm.aifluent.com.br/conectar-whatsapp";

// Recebe o code do redirecionamento, troca por token (redirect_uri IGUAL ao do
// dialog), e inscreve + força o override do webhook pro nosso app.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (!code) {
    const reason = url.searchParams.get("error_description") || "sem code";
    return NextResponse.redirect(
      `${PAGE}?es=err&msg=${encodeURIComponent(reason)}`,
    );
  }

  const secret =
    process.env.WA_ES_APP_SECRET || process.env.WHATSAPP_APP_SECRET || "";
  const waba = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "";
  const verify = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "";
  const callback = "https://crm.aifluent.com.br/api/whatsapp";

  try {
    // troca o code por token (redirect_uri IDÊNTICO ao usado no dialog)
    const tokenRes = await fetch(
      `${GRAPH}/oauth/access_token?client_id=${APP_ID}&client_secret=${secret}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&code=${encodeURIComponent(code)}`,
    ).then((r) => r.json());
    const token = tokenRes?.access_token;
    if (!token) {
      logger.error("es_callback_token_fail", tokenRes);
      return NextResponse.redirect(
        `${PAGE}?es=err&msg=${encodeURIComponent(tokenRes?.error?.message || "token")}`,
      );
    }

    // inscreve nosso app no WABA
    await fetch(`${GRAPH}/${waba}/subscribed_apps`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .catch(() => null);

    // força o override do callback pro nosso webhook (com o token do usuário admin)
    const override = await fetch(`${GRAPH}/${waba}/subscribed_apps`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        override_callback_uri: callback,
        verify_token: verify,
      }),
    })
      .then((r) => r.json())
      .catch((e) => ({ error: String(e) }));

    logger.info("es_callback_done", { override });
    const ok = !override?.error;
    return NextResponse.redirect(
      `${PAGE}?es=${ok ? "ok" : "warn"}&msg=${encodeURIComponent(ok ? "conectado" : override?.error?.message || "override")}`,
    );
  } catch (e) {
    logger.error("es_callback_error", e);
    return NextResponse.redirect(
      `${PAGE}?es=err&msg=${encodeURIComponent(String(e))}`,
    );
  }
}
