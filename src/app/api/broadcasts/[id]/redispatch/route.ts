import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireOrgId } from "@/lib/api-auth";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

// Re-disparo: cria um NOVO disparo só com os leads que FALHARAM no disparo de
// origem (ex.: para reenviar com um template UTILITY depois).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, session } = await requireAuth("gestor");
  if (error) return error;
  const { orgId, error: orgError } = requireOrgId(session);
  if (orgError) return orgError;
  const { id } = await params;

  try {
    const body = await request.json();
    const templateName = (body.templateName as string)?.trim();
    const languageCode = (body.languageCode as string) || "pt_BR";
    const tplParams = Array.isArray(body.params)
      ? (body.params as string[])
      : undefined;
    const name = (body.name as string)?.trim() || `Re-disparo (falhas)`;
    if (!templateName) {
      return NextResponse.json(
        { error: "templateName obrigatório" },
        { status: 400 },
      );
    }

    const { prisma } = await import("@/lib/prisma");
    const origin = await prisma.broadcastJob.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true },
    });
    if (!origin)
      return NextResponse.json(
        { error: "Disparo de origem não encontrado" },
        { status: 404 },
      );

    // leads que falharam (status real da mensagem) nesse disparo
    const failedMsgs = await prisma.conversationMessage.findMany({
      where: { metadata: { contains: id }, status: "failed" },
      select: { conversation: { select: { leadId: true } } },
    });
    const leadIds = [
      ...new Set(
        (
          failedMsgs as Array<{
            conversation: { leadId: string | null } | null;
          }>
        )
          .map((m) => m.conversation?.leadId)
          .filter(Boolean) as string[],
      ),
    ];
    if (!leadIds.length) {
      return NextResponse.json(
        { error: "Nenhuma falha para re-disparar" },
        { status: 400 },
      );
    }

    const leads = await prisma.lead.findMany({
      where: { id: { in: leadIds }, organizationId: orgId },
      select: { id: true, whatsapp: true, phone: true },
    });
    const recipients = leads
      .map(
        (l: { id: string; whatsapp: string | null; phone: string | null }) => ({
          leadId: l.id,
          phone: (l.whatsapp || l.phone || "").replace(/\D/g, ""),
        }),
      )
      .filter((r: { phone: string }) => r.phone.length >= 10);
    if (!recipients.length) {
      return NextResponse.json(
        { error: "Sem telefones válidos" },
        { status: 400 },
      );
    }

    const userId = (session!.user as Record<string, unknown>).id as string;
    const job = await prisma.broadcastJob.create({
      data: {
        name,
        templateName,
        languageCode,
        params: tplParams ? JSON.stringify(tplParams) : null,
        dryRun: false,
        total: recipients.length,
        status: "running",
        startedAt: new Date(),
        organizationId: orgId,
        createdById: userId,
      },
      select: { id: true },
    });
    // snapshot recipients
    for (let i = 0; i < recipients.length; i += 500) {
      await prisma.broadcastRecipient.createMany({
        data: recipients
          .slice(i, i + 500)
          .map((r: { leadId: string; phone: string }) => ({
            jobId: job.id,
            leadId: r.leadId,
            phone: r.phone,
            status: "pending",
          })),
        skipDuplicates: true,
      });
    }

    logger.info("broadcast_redispatch", {
      from: id,
      newJob: job.id,
      count: recipients.length,
    });
    return NextResponse.json({ jobId: job.id, total: recipients.length });
  } catch (e) {
    logger.error("broadcast_redispatch_error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
