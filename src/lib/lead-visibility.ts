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
): Record<string, unknown> | undefined {
  if (!userId || role === "admin") return undefined;
  if (role === "gestor" || role === "supervisor") {
    return teamId
      ? { OR: [{ teamId }, { consultantId: userId }] }
      : { consultantId: userId };
  }
  // operador e demais papéis não-admin → apenas os próprios
  return { consultantId: userId };
}
