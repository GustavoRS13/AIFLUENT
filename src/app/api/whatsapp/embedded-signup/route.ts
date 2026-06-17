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

  // App MSI (o que controla o WhatsApp) — o code do Embedded Signup foi emitido
  // por ele, então a troca tem que usar as credenciais DELE.
  const appId = "1295702451981433";
  const appSecret =
    process.env.WHATSAPP_APP_SECRET || process.env.META_APP_SECRET || "";
  const envWaba = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "";

  try {
    const body = await request.json();
    const code = body.code as string;
    const wabaId = (body.waba_id as string) || envWaba;
    if (!code) {
      return NextResponse.json({ error: "code ausente" }, { status: 400 });
    }

    // 1) troca o code por token. Segredo do app MSI + várias formas de
    //    redirect_uri (o popup do JS SDK pode usar diferentes valores).
    const sec =
      process.env.WA_ES_APP_SECRET ||
      process.env.WHATSAPP_APP_SECRET ||
      process.env.META_APP_SECRET ||
      "";
    const base = `${GRAPH}/oauth/access_token?client_id=${appId}&client_secret=${sec}&code=${encodeURIComponent(code)}`;
    const variants = [
      base, // sem redirect_uri
      `${base}&redirect_uri=`, // redirect_uri vazio
      `${base}&redirect_uri=${encodeURIComponent("https://crm.aifluent.com.br/conectar-whatsapp")}`,
      `${base}&redirect_uri=${encodeURIComponent("https://crm.aifluent.com.br/")}`,
    ];
    let bizToken = "";
    const attempts: unknown[] = [];
    for (const url of variants) {
      const res = await fetch(url)
        .then((r) => r.json())
        .catch((e) => ({ error: String(e) }));
      attempts.push(res?.error?.message || "ok");
      if (res?.access_token) {
        bizToken = res.access_token;
        break;
      }
    }
    if (!bizToken) {
      logger.error("embedded_signup_token_fail", { attempts });
      return NextResponse.json(
        { error: "Falha ao trocar o code por token", detail: attempts },
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
