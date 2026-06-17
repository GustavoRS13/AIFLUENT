import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireOrgId } from "@/lib/api-auth";

export const runtime = "nodejs";

// Detalhe/inteligência de um disparo: entregues, lidos, falhas (por motivo).
// As stats vêm do status REAL das mensagens (atualizado pelos webhooks da Meta).
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, session } = await requireAuth("gestor");
  if (error) return error;
  const { orgId, error: orgError } = requireOrgId(session);
  if (orgError) return orgError;
  const { id } = await params;

  const { prisma } = await import("@/lib/prisma");
  const job = await prisma.broadcastJob.findFirst({
    where: { id, organizationId: orgId },
    select: { id: true, name: true, templateName: true, total: true },
  });
  if (!job)
    return NextResponse.json(
      { error: "Disparo não encontrado" },
      { status: 404 },
    );

  // mensagens desse disparo (metadata guarda o jobId)
  const msgs = await prisma.conversationMessage.findMany({
    where: { metadata: { contains: id } },
    select: { status: true, errorCode: true, errorTitle: true, leadId: true },
  });

  const counts = { accepted: 0, delivered: 0, read: 0, sent: 0, failed: 0 };
  const byError: Record<string, { title: string; count: number }> = {};
  for (const m of msgs as Array<{
    status: string;
    errorCode: string | null;
    errorTitle: string | null;
    leadId: string | null;
  }>) {
    if (m.status === "delivered") counts.delivered++;
    else if (m.status === "read") counts.read++;
    else if (m.status === "failed") {
      counts.failed++;
      const code = m.errorCode || "outro";
      byError[code] = byError[code] || {
        title: m.errorTitle || "Falha",
        count: 0,
      };
      byError[code].count++;
    } else counts.sent++; // sent/accepted aguardando confirmação
  }
  counts.accepted = counts.delivered + counts.read + counts.sent;

  // motivo amigável dos principais erros
  const friendly: Record<string, string> = {
    "131049": "Limite de marketing da Meta (use UTILITY)",
    "131047": "Fora da janela de 24h",
    "131026": "Número sem WhatsApp / indisponível",
    "131053": "Mídia inválida",
  };
  const errors = Object.entries(byError)
    .map(([code, v]) => ({
      code,
      title: friendly[code] || v.title,
      count: v.count,
    }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({
    job,
    total: job.total,
    entregues: counts.delivered,
    lidos: counts.read,
    aguardando: counts.sent,
    falhas: counts.failed,
    errors,
  });
}
