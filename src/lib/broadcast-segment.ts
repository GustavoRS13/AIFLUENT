// Constrói o filtro Prisma de audiência a partir de uma segmentação.
// Todas as categorias são combinadas com AND (ex.: tag VIP E etapa X E consultor Y).

export interface BroadcastSegment {
  tags?: string[]; // nomes de tag (qualquer uma)
  stageIds?: string[]; // etapas específicas (qualquer uma)
  pipelineId?: string; // funil inteiro (todas as etapas dele)
  consultantId?: string; // responsável
  teamId?: string; // departamento/time
  source?: string; // origem (whatsapp|meta_ads|manual|clint|api...)
  createdAfter?: string; // ISO date
  createdBefore?: string; // ISO date
}

export function buildAudienceWhere(
  organizationId: string,
  seg: BroadcastSegment,
): Record<string, unknown> {
  const where: Record<string, unknown> = {
    organizationId,
    whatsapp: { not: null }, // só quem tem WhatsApp
  };

  if (seg.tags?.length) {
    where.tags = { some: { tag: { name: { in: seg.tags } } } };
  }
  if (seg.stageIds?.length) {
    where.stageId = { in: seg.stageIds };
  } else if (seg.pipelineId) {
    where.stage = { pipelineId: seg.pipelineId };
  }
  if (seg.consultantId) {
    where.consultantId = seg.consultantId;
  }
  if (seg.teamId) {
    where.teamId = seg.teamId;
  }
  if (seg.source) {
    where.source = seg.source;
  }
  const createdAt: Record<string, Date> = {};
  if (seg.createdAfter) createdAt.gte = new Date(seg.createdAfter);
  if (seg.createdBefore) createdAt.lte = new Date(seg.createdBefore);
  if (Object.keys(createdAt).length) where.createdAt = createdAt;

  return where;
}
