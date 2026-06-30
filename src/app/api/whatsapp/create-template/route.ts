import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GRAPH = "https://graph.facebook.com/v21.0";

// Cria/submete um template de mensagem do WhatsApp na WABA, via Meta Cloud API.
// Autenticado por CRON_SECRET (permite submeter sem sessão de admin). O template
// entra como PENDING e precisa da aprovação da Meta antes de poder ser enviado.
// Body JSON: { name, category, language, bodyText }.
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }

  const waba = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "";
  const token = process.env.WHATSAPP_ACCESS_TOKEN || "";
  if (!waba || !token) {
    return NextResponse.json(
      { error: "WABA/token não configurados" },
      { status: 500 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const category = String(body.category || "MARKETING").toUpperCase();
  const language = String(body.language || "pt_BR");
  const bodyText = String(body.bodyText || "");
  if (!name || !bodyText) {
    return NextResponse.json(
      { error: "name e bodyText obrigatórios" },
      { status: 400 },
    );
  }

  const payload = {
    name,
    category,
    language,
    components: [{ type: "BODY", text: bodyText }],
  };

  const res = await fetch(
    `${GRAPH}/${waba}/message_templates?access_token=${encodeURIComponent(token)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  )
    .then((r) => r.json())
    .catch((e) => ({ error: String(e) }));

  logger.info("create_template", { name, category, result: res });
  return NextResponse.json({ submitted: payload, meta: res });
}
