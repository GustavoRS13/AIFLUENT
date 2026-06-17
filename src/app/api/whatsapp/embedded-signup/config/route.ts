import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";

export const runtime = "nodejs";

// Expõe appId + configId pro fluxo de Embedded Signup (valores públicos do client).
export async function GET() {
  const { error } = await requireAuth("admin");
  if (error) return error;
  // App MSI (onde a config de WhatsApp Embedded Signup foi criada) — NÃO usar o
  // META_APP_ID (que é o app AIFLUENT, de Ads/Login, sem essa config).
  return NextResponse.json({
    appId: "1295702451981433",
    configId: "2444856826035632",
  });
}
