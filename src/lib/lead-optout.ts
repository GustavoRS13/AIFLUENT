// "Não perturbe": leads que NÃO podem receber mensagem (perdido / opt-out).
// Usado tanto nos disparos quanto no Atendimento (some da lista / não respondidos).

// Tags que significam "parar de enviar" / perdido (não incluir listas de disparo
// como "PARA DISPARAR").
export const OPTOUT_TAGS = [
  "PARAR ENVIO MSG",
  "PARAR MSG MSI",
  "Perdido 1",
  "número inválido",
];

// Fragmento Prisma (nível Lead) p/ quem PODE receber mensagem.
// Combine com AND no where do Lead, ou use como `where.lead = canMessageLeadWhere()`.
export function canMessageLeadWhere(): Record<string, unknown> {
  return {
    status: { not: "lost" },
    NOT: [
      { stage: { isLost: true } },
      { tags: { some: { tag: { name: { in: OPTOUT_TAGS } } } } },
    ],
  };
}

// Versão SQL (para queries raw): condições a colocar no WHERE, referenciando o
// alias do Lead (ex.: "l"). Não envia pra perdido/opt-out.
export function canMessageSql(leadAlias = "l"): string {
  const l = `"${leadAlias}"`;
  const tags = OPTOUT_TAGS.map((t) => `'${t.replace(/'/g, "''")}'`).join(",");
  return `${l}.status <> 'lost'
    AND NOT EXISTS (SELECT 1 FROM "PipelineStage" s WHERE s.id=${l}."stageId" AND s."isLost"=true)
    AND NOT EXISTS (SELECT 1 FROM "LeadTag" lt JOIN "Tag" t ON t.id=lt."tagId" WHERE lt."leadId"=${l}.id AND t.name IN (${tags}))`;
}
