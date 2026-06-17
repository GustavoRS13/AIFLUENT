import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";

export const runtime = "nodejs";

// Expõe appId + configId pro fluxo de Embedded Signup (valores públicos do client).
export async function GET() {
  const { error } = await requireAuth("admin");
  if (error) return error;
  return NextResponse.json({
    appId: process.env.META_APP_ID || "1295702451981433",
    configId: "2444856826035632",
  });
}
