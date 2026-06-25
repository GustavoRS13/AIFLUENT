// Regra ÚNICA de visibilidade de leads por papel (Leads, Pipeline, Negócios,
// Dashboard). Retorna um fragmento de `where` para o modelo Lead, ou undefined
// (admin vê tudo).
//  - admin               → tudo
//  - gestor/supervisor   → leads do time deles (+ os próprios); sem time → só os próprios
//  - operador (vendedor) → só os leads onde ele é o consultor
export function leadVisibilityWhere(
  role: string | undefined,
  userId: string | undefined,
  teamId: string | undefined | null,
  scopeGroup?: string | null,
): Record<string, unknown> | undefined {
  // Escopo de grupo (ex.: acesso B2B): só vê leads dos funis desse grupo.
  // Tem prioridade sobre o papel (vê TODOS os leads do grupo).
  if (scopeGroup) {
    return { stage: { pipeline: { groupName: scopeGroup } } };
  }
  if (!userId || role === "admin") return undefined;
  if (role === "gestor" || role === "supervisor") {
    return teamId
      ? { OR: [{ teamId }, { consultantId: userId }] }
      : { consultantId: userId };
  }
  // operador e demais papéis não-admin → apenas os próprios
  return { consultantId: userId };
}
