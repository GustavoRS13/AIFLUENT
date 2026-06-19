import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";

export const runtime = "nodejs";

const GRAPH = "https://graph.facebook.com/v21.0";

// Diagnóstico do número/WABA: tier de mensagens, quality rating, status — o que
// realmente determina a entrega de disparos MARKETING (erro 131049).
export async function GET() {
  const { error } = await requireAuth("admin");
  if (error) return error;

  const token = process.env.WHATSAPP_ACCESS_TOKEN || "";
  const waba = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "";
  const ourPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
  const j = (r: Response) => r.json();

  // Todos os números do WABA com tier + qualidade
  const phones = await fetch(
    `${GRAPH}/${waba}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating,messaging_limit_tier,status,name_status,throughput&access_token=${encodeURIComponent(token)}`,
  )
    .then(j)
    .catch((e) => ({ error: String(e) }));

  // Info do WABA (verificação de negócio, etc.)
  const wabaInfo = await fetch(
    `${GRAPH}/${waba}?fields=id,name,timezone_id,message_template_namespace,account_review_status,business_verification_status,ownership_type&access_token=${encodeURIComponent(token)}`,
  )
    .then(j)
    .catch((e) => ({ error: String(e) }));

  return NextResponse.json({
    nossoPhoneNumberId: ourPhoneId,
    wabaId: waba,
    waba: wabaInfo,
    numeros: phones?.data || phones,
  });
}
