import { NextRequest, NextResponse } from "next/server";
import { runBroadcastBatch } from "@/lib/broadcast-worker";
import { ingestLead } from "@/lib/lead-ingest";
import { canMessageSql } from "@/lib/lead-optout";
import { requireAuth } from "@/lib/api-auth";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

const CLINT = "https://api.clint.digital/v1";
const LEADS_B2C = "865287d4-ed64-4b06-afa3-83545b503b8b"; // origem "Leads B2C" (Alumni)
const TEMPLATE = "retomar_atendimento"; // UTILITY (reabertura neutra; oferta na resposta 24h)
// Etapas de INTERESSE que devem receber o disparo diário (stage_id no Clint).
// Puxamos por stage_id (server-side, completo) — NÃO varrendo os 30k+ deals da
// origem. Lead que ENTRA nessas etapas cai automático (fonte = Clint, lida todo dia).
const STAGE_IDS: Record<string, string> = {
  Base: "6c37aa48-7dac-4d0a-b0b7-4be13cbbdc11",
  "1º Contato": "ed76dbd7-c541-4139-a666-095939aa3138",
  "Follow Up": "b8fe0866-c629-47f0-a9b6-9c89dd0993cd",
  "Private Classes | Alumni Black": "8ad9b872-3afd-457c-8b85-795e4a7ebfd2",
  "infos/preço": "3dc89954-318f-494b-9827-244d9b64fda1",
  "Link de Pagamento": "f9907dd9-08d9-43ab-9208-8caeb38ee3e9",
};
const COOL_DAYS = 15; // cada lead recebe no máx. 1x a cada 15 dias (auto-throttle)
const IMPORT_BUDGET_MS = 30_000;
const TOTAL_BUDGET_MS = 55_000;
const DIGITS = `regexp_replace(coalesce(l.whatsapp,l.phone,''),'\\D','','g')`;

async function clintGet(path: string) {
  const token = process.env.CLINT_TOKEN || "";
  const r = await fetch(`${CLINT}${path}`, { headers: { "api-token": token } });
  return r.json();
}

// Disparo diário para os INTERESSADOS das etapas de compra do funil Leads B2C do
// Clint (Base, 1º Contato, Follow Up, Private Classes, infos/preço, Link de
// Pagamento). Puxa do Clint (inclui os que entraram hoje), importa (dedup),
// enfileira quem pode receber (não opt-out/reclamação, fora do cooldown de 15d) e
// drena o que couber. Idempotente/resumível. ?dry=1 = só mostra o que sairia.
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

  // 1) puxa por stage_id + status=OPEN (server-side): nessas etapas ~95% dos
  //    deals são LOST — o filtro corta de ~27k para ~1.5k, cabendo nos 60s.
  const deals: Array<Record<string, unknown>> = [];
  for (const sid of Object.values(STAGE_IDS)) {
    for (let p = 1; p <= 20; p++) {
      const r = await clintGet(
        `/deals?origin_id=${LEADS_B2C}&stage_id=${sid}&status=OPEN&limit=1000&page=${p}`,
      );
      deals.push(...((r?.data as Array<Record<string, unknown>>) || []));
      if (!r?.hasNext) break;
    }
  }

  // 2) só status não perdido/ganho; normaliza + dedup
  const seen = new Set<string>();
  const leads: { nome: string; phone: string; last8: string; stage: string }[] =
    [];
  const porEtapa: Record<string, number> = {};
  for (const d of deals) {
    const stage = String(d.stage || "");
    const status = String(d.status || "").toUpperCase();
    if (status === "LOST" || status === "WON") continue;
    const contact = d.contact as Record<string, unknown> | undefined;
    const ddi = String(contact?.ddi || "55").replace(/\D/g, "");
    const raw = String(contact?.phone || "").replace(/\D/g, "");
    if (!raw) continue;
    const full = raw.startsWith(ddi) ? raw : ddi + raw;
    if (full.length < 12 || full.length > 13 || seen.has(full)) continue;
    seen.add(full);
    porEtapa[stage] = (porEtapa[stage] || 0) + 1;
    leads.push({
      nome: String(contact?.name || "").trim() || "Lead",
      phone: full,
      last8: full.slice(-8),
      stage,
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

  // 3) DRY: estima elegíveis (no CRM ou não) fora do cooldown de 15d
  if (dry) {
    const last8s = [...new Set(leads.map((l) => l.last8))];
    let jaCooldown = 0;
    if (last8s.length) {
      const inList = last8s.map((p) => `'${p}'`).join(",");
      const rows = await prisma.$queryRawUnsafe<{ n: number }[]>(
        `SELECT count(DISTINCT right(regexp_replace(coalesce(l.whatsapp,l.phone,''),'\\D','','g'),8))::int AS n
         FROM "Lead" l JOIN "BroadcastRecipient" br ON br."leadId"=l.id
         WHERE br.status='sent' AND br."updatedAt" > now() - interval '${COOL_DAYS} days'
           AND right(regexp_replace(coalesce(l.whatsapp,l.phone,''),'\\D','','g'),8) IN (${inList})`,
      );
      jaCooldown = rows[0]?.n ?? 0;
    }
    return NextResponse.json({
      dry: true,
      deals_puxados: deals.length,
      nas_etapas_interesse: leads.length,
      por_etapa: porEtapa,
      em_cooldown_15d: jaCooldown,
      DISPARARIA_HOJE: leads.length - jaCooldown,
      template: TEMPLATE,
      numero: "padrão",
      amostra: leads.slice(0, 8).map((l) => ({ nome: l.nome, stage: l.stage })),
    });
  }

  // 4) importa SÓ os que ainda não existem no CRM (por 8 últimos dígitos) — assim
  //    o budget de tempo avança nos NOVOS em vez de re-deduplicar o mesmo topo a
  //    cada chamada (senão nunca converge). Idempotente/resumível.
  let imported = 0;
  let skipped = 0;
  let importTruncated = false;
  const allLast8 = [...new Set(leads.map((l) => l.last8))].filter(
    (x) => x.length >= 8,
  );
  const existing = new Set<string>();
  if (allLast8.length) {
    const inList = allLast8.map((p) => `'${p}'`).join(","); // dígitos = seguro
    const rows = await prisma.$queryRawUnsafe<{ tel: string }[]>(
      `SELECT DISTINCT right(regexp_replace(coalesce(whatsapp,phone,''),'\\D','','g'),8) AS tel
       FROM "Lead"
       WHERE right(regexp_replace(coalesce(whatsapp,phone,''),'\\D','','g'),8) IN (${inList})`,
    );
    for (const r of rows) existing.add(r.tel);
  }
  const faltam = leads.filter((l) => !existing.has(l.last8));
  for (const l of faltam) {
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
      tags: ["clint", "b2c", "nurture"],
    });
    if (res.deduped) skipped++;
    else imported++;
  }

  // 5) candidatos: leads (por telefone das etapas de interesse) que PODEM receber
  //    — não opt-out/reclamação (canMessageSql), fora do cooldown de 15d, sem
  //    disparo pendente. Enfileira por telefone (últimos 8 dígitos) do lote atual.
  const last8s = [...new Set(leads.map((l) => l.last8))].filter(
    (x) => x.length >= 8,
  );
  if (last8s.length === 0) {
    return NextResponse.json({ imported, skipped, note: "nada nas etapas" });
  }
  const inList = last8s.map((p) => `'${p}'`).join(","); // dígitos = seguro
  const candWhere = `right(${DIGITS},8) IN (${inList})
       AND l.whatsapp IS NOT NULL AND length(${DIGITS}) >= 10
       AND ${canMessageSql("l")}
       AND NOT EXISTS (SELECT 1 FROM "BroadcastRecipient" r
         WHERE r."leadId"=l.id AND r.status IN ('pending','processing'))
       AND NOT EXISTS (SELECT 1 FROM "BroadcastRecipient" r2
         WHERE r2."leadId"=l.id AND r2.status='sent'
           AND r2."updatedAt" > now() - interval '${COOL_DAYS} days')`;
  const candRows = await prisma.$queryRawUnsafe<{ n: number }[]>(
    `SELECT count(*)::int AS n FROM "Lead" l WHERE ${candWhere}`,
  );
  const candCount = candRows[0]?.n ?? 0;

  const pendingJob = await prisma.broadcastJob.findFirst({
    where: {
      status: "running",
      filters: { contains: "clint_nurture" },
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
      note: "nada a disparar (todos no cooldown ou opt-out)",
    });
  }

  let job = await prisma.broadcastJob.findFirst({
    where: { status: "running", filters: { contains: "clint_nurture" } },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (!job) {
    job = await prisma.broadcastJob.create({
      data: {
        name: "Diário interessados Leads B2C (UTILITY)",
        templateName: TEMPLATE,
        languageCode: "pt_BR",
        params: JSON.stringify(["{nome}"]),
        filters: JSON.stringify({ restSafe: true, kind: "clint_nurture" }),
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

  const totalRec = await prisma.broadcastRecipient.count({
    where: { jobId: job.id },
  });
  await prisma.broadcastJob.update({
    where: { id: job.id },
    data: { total: totalRec },
  });

  const remainingMs = Math.max(3_000, TOTAL_BUDGET_MS - (Date.now() - t0));
  const result = await runBroadcastBatch(prisma, job.id, remainingMs);

  logger.info("clint_nurture", {
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
