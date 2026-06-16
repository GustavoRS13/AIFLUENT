// Automação: quando um lead é marcado como GANHO, transfere automaticamente
// para o departamento Educacional. Best-effort (não quebra o fluxo principal).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function transferWonLeadToEducational(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prisma: any,
  leadId: string,
  orgId: string,
): Promise<void> {
  try {
    const team = await prisma.team.findFirst({
      where: {
        organizationId: orgId,
        name: { contains: "ducacional", mode: "insensitive" }, // "Educacional"/"Dep. Educacional"
      },
      select: { id: true, name: true },
    });
    if (!team) return; // sem depto educacional → não faz nada

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { teamId: true, consultantId: true },
    });
    if (!lead) return;
    if (lead.teamId === team.id) return; // já está no time

    await prisma.lead.update({
      where: { id: leadId },
      data: { teamId: team.id },
    });
    await prisma.activity
      .create({
        data: {
          type: "custom",
          title: `Transferido para ${team.name} (lead ganho)`,
          description: "Transferência automática ao marcar o lead como ganho.",
          leadId,
        },
      })
      .catch(() => {});
  } catch {
    /* automação best-effort */
  }
}
