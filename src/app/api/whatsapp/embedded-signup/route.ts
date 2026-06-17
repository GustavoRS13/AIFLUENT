import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const GRAPH = "https://graph.facebook.com/v21.0";

// Conclui o Embedded Signup: troca o code por token e inscreve nosso app no WABA
// (re-registra o webhook no AIFLUENT, apagando o override herdado do Kommo).
export async function POST(request: NextRequest) {
  const { error } = await requireAuth("admin");
  if (error) return error;

  const appId = process.env.META_APP_ID || "";
  const appSecret =
    process.env.META_APP_SECRET || process.env.WHATSAPP_APP_SECRET || "";
  const envWaba = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "";

  try {
    const body = await request.json();
    const code = body.code as string;
    const wabaId = (body.waba_id as string) || envWaba;
    if (!code) {
      return NextResponse.json({ error: "code ausente" }, { status: 400 });
    }

    // 1) troca o code do Embedded Signup por um token de integração (business)
    const tokenRes = await fetch(
      `${GRAPH}/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&code=${encodeURIComponent(code)}`,
    ).then((r) => r.json());
    const bizToken = tokenRes?.access_token;
    if (!bizToken) {
      logger.error("embedded_signup_token_fail", tokenRes);
      return NextResponse.json(
        { error: "Falha ao trocar o code por token", detail: tokenRes },
        { status: 400 },
      );
    }

    // 2) inscreve nosso app no WABA com o token do signup (re-registra o webhook)
    const sub = await fetch(`${GRAPH}/${wabaId}/subscribed_apps`, {
      method: "POST",
      headers: { Authorization: `Bearer ${bizToken}` },
    }).then((r) => r.json());

    // 3) confirma os apps inscritos
    const after = await fetch(`${GRAPH}/${wabaId}/subscribed_apps`, {
      headers: { Authorization: `Bearer ${bizToken}` },
    })
      .then((r) => r.json())
      .catch(() => null);

    logger.info("embedded_signup_done", { wabaId, sub });
    return NextResponse.json({ ok: !sub?.error, wabaId, sub, after });
  } catch (e) {
    logger.error("embedded_signup_error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
