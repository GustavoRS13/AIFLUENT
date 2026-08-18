import { NextRequest, NextResponse } from "next/server";
import { runBroadcastBatch } from "@/lib/broadcast-worker";
import { ingestLead } from "@/lib/lead-ingest";
import { canMessageSql } from "@/lib/lead-optout";
import { requireAuth } from "@/lib/api-auth";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

const CLINT = "https://api.clint.digital/v1";
// Origens B2C do Clint monitoradas p/ auto-disparo (todas recebem o mesmo fluxo
// UTILITY + tag 'b2c'). NÃO incluir origens de alunos ativos nem B2B aqui.
const B2C_ORIGINS = [
  "865287d4-ed64-4b06-afa3-83545b503b8b", // "Leads B2C" (Alumni)
  "33cc5795-470b-477d-b106-5a58192fcfd6", // "Remarketing B2C"
];
const TEMPLATE = "retomar_atendimento"; // UTILITY (94742 está RED; UTILITY entrega)
const DELAY_MIN = 20; // só dispara p/ lead com +20 min de cadastro
const WINDOW_DAYS = 2; // janela de busca no Clint
const CANDIDATE_DAYS = 3; // janela p/ considerar "recém-criado" no disparo
const IMPORT_BUDGET_MS = 30_000; // teto p/ importar (deixa tempo p/ disparar)
const TOTAL_BUDGET_MS = 55_000; // teto total (Hobby corta em ~60s)
const DIGITS = `regexp_replace(coalesce(l.whatsapp,l.phone,''),'\\D','','g')`;

async function clintGet(path: string) {
  const token = process.env.CLINT_TOKEN || "";
  const r = await fetch(`${CLINT}${path}`, { headers: { "api-token": token } });
  return r.json();
}

// Auto-disparo dos leads novos B2C do Clint pelo AIFLUENT (número padrão 94742).
// Resumível: importa com teto de tempo e dispara TODOS os candidatos ainda não
// disparados (não só os desta chamada), drenando o que couber no orçamento.
// ?dry=1 → só mostra o que sairia (sem importar/enviar). Auth: CRON_SECRET ou admin.
export async function GET(request: NextRequest) {
  const t0 = Date.now();
  const secret = process.env.CRON_SECRET;
  const authz = request.headers.get("authorization");
  const isCron = !!secret && authz === `Bearer ${secret}`;
  if (!isCron) {
    const { error } = await requireAuth("admin");
    if (error) return error;
  }
  if (!process.env.CLINT_TOKEN) {
    return NextResponse.json(
      { error: "CLINT_TOKEN não configurado" },
      { status: 500 },
    );
  }
  const dry = new URL(request.url).searchParams.get("dry") === "1";

  // 1) puxa Leads B2C criados na janela
  const sinceDate = new Date(Date.now() - WINDOW_DAYS * 86400_000)
    .toISOString()
    .slice(0, 10);
  const minAge = Date.now() - DELAY_MIN * 60_000;
  const windowStart = Date.now() - WINDOW_DAYS * 86400_000;
  const deals: Array<Record<string, unknown>> = [];
  for (const origin of B2C_ORIGINS) {
    for (let p = 1; p <= 20; p++) {
      const r = await clintGet(
        `/deals?origin_id=${origin}&created_at_start=${sinceDate}&limit=1000&page=${p}`,
      );
      deals.push(...((r?.data as Array<Record<string, unknown>>) || []));
      if (!r?.hasNext) break;
    }
  }

  // 2) normaliza + filtra por idade (>=20min, dentro da janela) + dedup no lote
  const seen = new Set<string>();
  const leads: {
    nome: string;
    phone: string;
    last8: string;
    created: string;
  }[] = [];
  for (const d of deals) {
    const contact = d.contact as Record<string, unknown> | undefined;
    const created = String(d.created_at || "");
    const t = created ? new Date(created).getTime() : 0;
    if (!t || t > minAge || t < windowStart) continue; // <20min ou fora da janela
    const ddi = String(contact?.ddi || "55").replace(/\D/g, "");
    const raw = String(contact?.phone || "").replace(/\D/g, "");
    if (!raw) continue;
    const full = raw.startsWith(ddi) ? raw : ddi + raw;
    if (full.length < 12 || full.length > 13 || seen.has(full)) continue;
    seen.add(full);
    leads.push({
      nome: String(contact?.name || "").trim() || "Lead",
      phone: full,
      last8: full.slice(-8),
      created,
    });
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

  // 3) MODO DRY: estima novos (dedup por 8 últimos dígitos, igual ingestLead)
  if (dry) {
    const last8s = [...new Set(leads.map((l) => l.last8))];
    const inCrm = new Set<string>();
    if (last8s.length) {
      const inList = last8s.map((p) => `'${p}'`).join(","); // dígitos = seguro
      const rows = await prisma.$queryRawUnsafe<{ tel: string }[]>(
        `SELECT DISTINCT right(regexp_replace(coalesce(whatsapp,phone,''),'\\D','','g'),8) AS tel
         FROM "Lead"
         WHERE right(regexp_replace(coalesce(whatsapp,phone,''),'\\D','','g'),8) IN (${inList})`,
      );
      for (const r of rows) inCrm.add(r.tel);
    }
    const novos = leads.filter((l) => !inCrm.has(l.last8));
    return NextResponse.json({
      dry: true,
      puxados_clint: deals.length,
      com_idade_ok: leads.length,
      ja_no_crm: leads.length - novos.length,
      NOVOS_a_disparar: novos.length,
      template: TEMPLATE,
      numero: "94742 (padrão)",
      amostra: novos.slice(0, 10).map((l) => ({ nome: l.nome, tel: l.phone })),
    });
  }

  // 4) FASE 1 — importa via ingestLead (dedup + etapa de funil + tags), com teto
  //    de tempo. É idempotente: um retry pula quem já foi importado.
  let imported = 0;
  let skipped = 0;
  let importTruncated = false;
  for (const l of leads) {
    if (Date.now() - t0 > IMPORT_BUDGET_MS) {
      importTruncated = true;
      break;
    }
    const res = await ingestLead(prisma, {
      organizationId: orgId,
      firstName: l.nome,
      phone: l.phone,
      whatsapp: l.phone,
      source: "clint",
      channel: "whatsapp",
      tags: ["clint", "b2c"],
    });
    if (res.deduped) skipped++;
    else imported++;
  }

  // 5) FASE 2 — candidatos: leads B2C do Clint recém-criados, com tag b2c, exclusões
  //    travadas, ainda NÃO disparados. Conta antes p/ não criar job vazio.
  const candWhere = `l.source = 'clint'
       AND l."createdAt" > now() - interval '${CANDIDATE_DAYS} days'
       AND l.whatsapp IS NOT NULL AND length(${DIGITS}) >= 10
       AND EXISTS (SELECT 1 FROM "LeadTag" lt JOIN "Tag" t ON t.id=lt."tagId"
                   WHERE lt."leadId"=l.id AND t.name='b2c')
       AND ${canMessageSql("l")}
       AND NOT EXISTS (
         SELECT 1 FROM "BroadcastRecipient" r
         JOIN "BroadcastJob" jj ON jj.id=r."jobId"
         WHERE r."leadId"=l.id AND jj.filters LIKE '%clint_b2c_auto%')`;
  const candRows = await prisma.$queryRawUnsafe<{ n: number }[]>(
    `SELECT count(*)::int AS n FROM "Lead" l WHERE ${candWhere}`,
  );
  const candCount = candRows[0]?.n ?? 0;

  // reaproveita um job ainda em execução (drena pendências antes de criar novo)
  const pendingJob = await prisma.broadcastJob.findFirst({
    where: {
      status: "running",
      filters: { contains: "clint_b2c_auto" },
      recipients: { some: { status: { in: ["pending", "processing"] } } },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (candCount === 0 && !pendingJob) {
    return NextResponse.json({
      imported,
      skipped,
      importTruncated,
      novosDestinatarios: 0,
      note: "nada a disparar",
    });
  }

  // job UTILITY (94742=padrão). Reaproveita o job em execução p/ não deixar
  // pendências órfãs; senão cria um novo.
  let job = await prisma.broadcastJob.findFirst({
    where: { status: "running", filters: { contains: "clint_b2c_auto" } },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (!job) {
    job = await prisma.broadcastJob.create({
      data: {
        name: "Auto Leads novos B2C Clint (UTILITY)",
        templateName: TEMPLATE,
        languageCode: "pt_BR",
        params: JSON.stringify(["{nome}"]),
        filters: JSON.stringify({ restSafe: true, kind: "clint_b2c_auto" }),
        phoneNumberId: null,
        dryRun: false,
        status: "running",
        startedAt: new Date(),
        total: 0,
        organizationId: orgId,
        createdById: admin.id,
      },
      select: { id: true },
    });
  }

  const inserted = await prisma.$executeRawUnsafe(
    `INSERT INTO "BroadcastRecipient" (id,"jobId","leadId",phone,status,"updatedAt")
     SELECT gen_random_uuid()::text, $1, l.id, ${DIGITS}, 'pending', now()
     FROM "Lead" l WHERE ${candWhere}`,
    job.id,
  );

  // total atual do job = destinatários acumulados
  const totalRec = await prisma.broadcastRecipient.count({
    where: { jobId: job.id },
  });
  await prisma.broadcastJob.update({
    where: { id: job.id },
    data: { total: totalRec },
  });

  // drena o que couber no orçamento restante
  const remainingMs = Math.max(3_000, TOTAL_BUDGET_MS - (Date.now() - t0));
  const result = await runBroadcastBatch(prisma, job.id, remainingMs);

  logger.info("clint_b2c_auto", {
    imported,
    skipped,
    importTruncated,
    novosDestinatarios: Number(inserted),
    jobId: job.id,
    result,
  });
  return NextResponse.json({
    imported,
    skipped,
    importTruncated,
    novosDestinatarios: Number(inserted),
    jobId: job.id,
    disparo: result,
  });
}
