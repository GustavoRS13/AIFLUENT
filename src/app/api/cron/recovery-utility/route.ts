import { NextRequest, NextResponse } from "next/server";
import { runBroadcastBatch } from "@/lib/broadcast-worker";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

const GRAPH = "https://graph.facebook.com/v21.0";
const DAILY = 250; // volume moderado de recuperação por dia
const TEMPLATE = "retomar_atendimento"; // UTILITY

// Cron de RECUPERAÇÃO do número: 1x/dia dispara UTILITY pra leads novos (gera
// entrega + engajamento = sinal positivo que tira o número do RED). Para sozinho
// quando a qualidade volta pra GREEN. Autenticado por CRON_SECRET.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }

  const pid = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
  const token = process.env.WHATSAPP_ACCESS_TOKEN || "";

  // 1) Já está GREEN? para a recuperação (não dispara mais).
  try {
    const q = await fetch(
      `${GRAPH}/${pid}?fields=quality_rating&access_token=${encodeURIComponent(token)}`,
    )
      .then((r) => r.json())
      .catch(() => null);
    const quality = String(q?.quality_rating || "").toUpperCase();
    if (quality === "GREEN") {
      logger.info("recovery_cron_skip_green");
      return NextResponse.json({
        skipped: "número já GREEN — recuperação concluída",
      });
    }
  } catch {
    /* segue mesmo sem leitura de qualidade */
  }

  const { prisma } = await import("@/lib/prisma");
  const org = await prisma.organization.findFirst({ select: { id: true } });
  const admin = await prisma.user.findFirst({
    where: { role: "admin" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!org || !admin) {
    return NextResponse.json(
      { error: "org/admin não encontrados" },
      { status: 500 },
    );
  }
  const orgId = org.id;

  // 2) cria o job de recuperação
  const job = await prisma.broadcastJob.create({
    data: {
      name: "Recuperação diária (UTILITY)",
      templateName: TEMPLATE,
      languageCode: "pt_BR",
      params: JSON.stringify(["{nome}"]),
      dryRun: false,
      status: "running",
      startedAt: new Date(),
      total: 0,
      organizationId: orgId,
      createdById: admin.id,
    },
    select: { id: true },
  });

  // 3) destinatários: leads válidos AINDA NÃO disparados (mais chance de engajar),
  //    sem número inválido, ordenados pelos mais novos. Limite diário.
  const inserted = await prisma.$executeRawUnsafe(
    `INSERT INTO "BroadcastRecipient" (id,"jobId","leadId",phone,status,"updatedAt")
     SELECT gen_random_uuid()::text, $1, l.id,
            regexp_replace(coalesce(l.whatsapp,l.phone,''),'\\D','','g'), 'pending', now()
     FROM "Lead" l
     WHERE l.whatsapp IS NOT NULL
       AND l."organizationId" = $2
       AND length(regexp_replace(coalesce(l.whatsapp,l.phone,''),'\\D','','g')) >= 10
       AND NOT EXISTS (SELECT 1 FROM "LeadTag" lt JOIN "Tag" t ON t.id=lt."tagId"
                       WHERE lt."leadId"=l.id AND t.name='número inválido')
       AND NOT EXISTS (SELECT 1 FROM "Conversation" c JOIN "ConversationMessage" m
                       ON m."conversationId"=c.id
                       WHERE c."leadId"=l.id AND m.metadata LIKE '%broadcast%')
     ORDER BY l."createdAt" DESC
     LIMIT ${DAILY}`,
    job.id,
    orgId,
  );

  if (!inserted) {
    await prisma.broadcastJob.update({
      where: { id: job.id },
      data: { status: "completed", completedAt: new Date() },
    });
    return NextResponse.json({
      job: job.id,
      recipients: 0,
      note: "sem leads novos",
    });
  }

  await prisma.broadcastJob.update({
    where: { id: job.id },
    data: { total: Number(inserted) },
  });

  // 4) processa o lote inline (250 com ritmo controlado cabem no budget)
  const result = await runBroadcastBatch(prisma, job.id, 50000);
  logger.info("recovery_cron_done", {
    job: job.id,
    recipients: inserted,
    result,
  });
  return NextResponse.json({ job: job.id, recipients: inserted, result });
}
