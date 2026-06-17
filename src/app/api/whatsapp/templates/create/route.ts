import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const GRAPH = "https://graph.facebook.com/v21.0";

// Submete um template à Meta (admin). Body: { name, body, category?, language?, example? }.
// A Meta REVISA o conteúdo e pode recategorizar (UTILITY -> MARKETING se for promocional).
export async function POST(request: NextRequest) {
  const { error } = await requireAuth("admin");
  if (error) return error;

  const token = process.env.WHATSAPP_ACCESS_TOKEN || "";
  const waba = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "";
  if (!token || !waba) {
    return NextResponse.json(
      { error: "WhatsApp não configurado" },
      { status: 400 },
    );
  }

  try {
    const b = await request.json();
    const name = (b.name as string)?.trim();
    const body = (b.body as string)?.trim();
    const category = (b.category as string) || "UTILITY";
    const language = (b.language as string) || "pt_BR";
    const example = (b.example as string[]) || ["Maria"];
    const buttons = Array.isArray(b.buttons) ? (b.buttons as string[]) : [];
    if (!name || !body) {
      return NextResponse.json(
        { error: "name e body obrigatórios" },
        { status: 400 },
      );
    }

    const components: Record<string, unknown>[] = [
      {
        type: "BODY",
        text: body,
        ...(/\{\{\s*\d+\s*\}\}/.test(body)
          ? { example: { body_text: [example] } }
          : {}),
      },
    ];
    if (buttons.length) {
      components.push({
        type: "BUTTONS",
        buttons: buttons.slice(0, 3).map((t) => ({
          type: "QUICK_REPLY",
          text: t,
        })),
      });
    }

    const res = await fetch(`${GRAPH}/${waba}/message_templates`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, language, category, components }),
    }).then((r) => r.json());

    logger.info("template_create", { name, category, res });
    return NextResponse.json({ submitted: !res.error, result: res });
  } catch (e) {
    logger.error("template_create_error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
