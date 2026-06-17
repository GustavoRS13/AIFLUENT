import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";

export const runtime = "nodejs";

// Inicia o fluxo de reconexão por REDIRECIONAMENTO (sem popup JS SDK), assim o
// redirect_uri é fixo e controlado por nós (resolve o erro de redirect_uri).
export async function GET() {
  const { error } = await requireAuth("admin");
  if (error) return error;

  const redirectUri = "https://crm.aifluent.com.br/api/whatsapp/es/callback";
  const params = new URLSearchParams({
    client_id: "1295702451981433",
    config_id: "2444856826035632",
    response_type: "code",
    override_default_response_type: "true",
    redirect_uri: redirectUri,
  });
  return NextResponse.redirect(
    `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`,
  );
}
