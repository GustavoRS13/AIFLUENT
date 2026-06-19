/**
 * Funil ÚNICO de entrada de leads.
 *
 * TODO canal (cadastro manual, importação, WhatsApp, Meta Ads, formulários,
 * APIs externas) deve passar por `ingestLead`. Ele garante, de forma central:
 *  - organizationId correto (multi-tenant)
 *  - tag obrigatória (>= 1, fallback pela origem)
 *  - deduplicação por telefone/whatsapp/email dentro da empresa
 *  - auditoria (AuditLog)
 *  - histórico de origem (Activity type=lead_source a cada entrada)
 *  - ponto de extensão para regras de distribuição futuras
 */

import { notifyOwnerOrAdmins } from "./notifications";

export interface IngestLeadInput {
  organizationId: string;
  source: string; // canal de origem: manual | import | whatsapp | meta_ads | form | api ...
  sourceDetail?: string;
  channel?: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  company?: string;
  jobTitle?: string;
  temperature?: string;
  courseInterest?: string;
  languageLevel?: string;
  notes?: string;
  city?: string;
  state?: string;
  stageId?: string;
  tags?: string[];
  metaAdId?: string;
  fbLeadId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  createdById?: string;
  // Atribuição completa da origem (campanha/adset/ad/form) — salva no histórico.
  attribution?: Record<string, unknown>;
}

export interface IngestResult {
  lead: { id: string };
  deduped: boolean;
}

function onlyDigits(v?: string | null): string {
  return (v || "").replace(/\D/g, "");
}

export async function ingestLead(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prisma: any,
  input: IngestLeadInput,
): Promise<IngestResult> {
  const orgId = input.organizationId;
  if (!orgId) throw new Error("ingestLead: organizationId obrigatório");
  const source = (input.source || "manual").trim() || "manual";

  const phoneDigits = onlyDigits(input.phone);
  const waDigits = onlyDigits(input.whatsapp || input.phone);
  const email = input.email?.trim().toLowerCase() || undefined;

  // ── Deduplicação dentro da empresa: telefone/whatsapp (8 últimos dígitos) ou email ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orConds: any[] = [];
  if (waDigits.length >= 8)
    orConds.push({ whatsapp: { contains: waDigits.slice(-8) } });
  if (phoneDigits.length >= 8)
    orConds.push({ phone: { contains: phoneDigits.slice(-8) } });
  if (email) orConds.push({ email });

  const tagNames = (input.tags && input.tags.length ? input.tags : [source])
    .map((t) => t.trim())
    .filter(Boolean);
  const effectiveTags = tagNames.length ? tagNames : ["manual"];

  // Etapa padrão do funil quando não informada — senão o lead some do Kanban.
  // Best-effort: se não houver pipeline configurado, o lead ainda é criado
  // (sem etapa), nunca quebrando a ingestão.
  let stageId = input.stageId;
  if (!stageId) {
    try {
      const firstStage = await prisma.pipelineStage.findFirst({
        where: { pipeline: { organizationId: orgId, isDefault: true } },
        orderBy: { order: "asc" },
        select: { id: true },
      });
      stageId = firstStage?.id ?? undefined;
    } catch {
      stageId = undefined;
    }
  }

  // Find-or-create SERIALIZADO por telefone (advisory lock) — sob concorrência
  // de webhooks (várias msgs juntas) isto evita criar leads duplicados.
  const dedupeKey = `${orgId}:${waDigits.slice(-8) || phoneDigits.slice(-8) || email || input.firstName || ""}`;
  const { leadId, deduped } = await prisma.$transaction(
    async (tx: typeof prisma) => {
      await tx.$executeRawUnsafe(
        `SELECT pg_advisory_xact_lock(hashtext($1)::bigint)`,
        dedupeKey,
      );
      let ex: { id: string } | null = null;
      if (orConds.length) {
        ex = await tx.lead.findFirst({
          where: { organizationId: orgId, OR: orConds },
          select: { id: true },
        });
      }
      if (ex) return { leadId: ex.id, deduped: true };
      const lead = await tx.lead.create({
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          email,
          phone: input.phone,
          whatsapp: input.whatsapp,
          company: input.company,
          jobTitle: input.jobTitle,
          source,
          sourceDetail: input.sourceDetail,
          temperature: input.temperature || "warm",
          courseInterest: input.courseInterest,
          languageLevel: input.languageLevel,
          notes: input.notes,
          city: input.city,
          state: input.state,
          stageId,
          metaAdId: input.metaAdId,
          fbLeadId: input.fbLeadId,
          utmSource: input.utmSource,
          utmMedium: input.utmMedium,
          utmCampaign: input.utmCampaign,
          organizationId: orgId,
          createdById: input.createdById,
        },
        select: { id: true },
      });
      return { leadId: lead.id, deduped: false };
    },
  );

  await prisma.activity
    .create({
      data: {
        type: "lead_source",
        title: deduped ? `Re-entrada via ${source}` : `Origem: ${source}`,
        description: deduped
          ? `Lead recebido novamente pelo canal ${input.channel || source}`
          : `Lead capturado pelo canal ${input.channel || source}`,
        leadId,
        metadata: input.attribution
          ? JSON.stringify(input.attribution)
          : undefined,
      },
    })
    .catch(() => {});

  // ── Tag obrigatória: garante >= 1 (sem duplicar a relação) ──
  for (const name of effectiveTags) {
    let tag = await prisma.tag.findFirst({
      where: { name, organizationId: orgId },
    });
    if (!tag)
      tag = await prisma.tag.create({ data: { name, organizationId: orgId } });
    const rel = await prisma.leadTag.findFirst({
      where: { leadId, tagId: tag.id },
    });
    if (!rel) await prisma.leadTag.create({ data: { leadId, tagId: tag.id } });
  }

  // ── Auditoria ──
  await prisma.auditLog
    .create({
      data: {
        action: deduped ? "lead_ingest_dedup" : "lead_ingested",
        entity: "Lead",
        entityId: leadId,
        details: JSON.stringify({ source, channel: input.channel, deduped }),
        organizationId: orgId,
        userId: input.createdById,
      },
    })
    .catch(() => {});

  // ── Ponto de extensão: regras de distribuição (round-robin por time, etc.) ──
  // Aplicar atribuição automática de consultor aqui no futuro.

  // Notifica admins/gestores sobre lead NOVO (não reentrada) — best-effort
  if (!deduped) {
    await notifyOwnerOrAdmins(prisma, orgId, null, {
      type: "new_lead",
      title: `Novo lead: ${input.firstName}`,
      body: `Origem: ${source}`,
      link: "/leads",
    });
  }

  return { lead: { id: leadId }, deduped };
}
