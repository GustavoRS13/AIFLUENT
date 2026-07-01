import { NextResponse } from "next/server";
import { requireAuth, requireOrgId } from "@/lib/api-auth";
import { listWhatsappNumbers } from "@/lib/whatsapp-numbers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lista os números de WhatsApp da org (pro seletor multi-número do Atendimento).
export async function GET() {
  const { error, session } = await requireAuth();
  if (error) return error;
  const { orgId, error: orgError } = requireOrgId(session);
  if (orgError) return orgError;
  const { prisma } = await import("@/lib/prisma");
  const numbers = await listWhatsappNumbers(prisma, orgId);
  return NextResponse.json({ numbers });
}
