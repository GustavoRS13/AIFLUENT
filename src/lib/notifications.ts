// Helpers para criar notificações (best-effort — nunca quebram o fluxo principal).

interface NotifyPayload {
  type: string;
  title: string;
  body?: string;
  link?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Prisma = any;

export async function notifyUser(
  prisma: Prisma,
  organizationId: string,
  userId: string,
  payload: NotifyPayload,
): Promise<void> {
  try {
    await prisma.notification.create({
      data: { organizationId, userId, ...payload },
    });
  } catch {
    /* notificação é best-effort */
  }
}

export async function notifyOrgAdmins(
  prisma: Prisma,
  organizationId: string,
  payload: NotifyPayload,
  leadGroup?: string | null,
): Promise<void> {
  try {
    const admins = await prisma.user.findMany({
      where: {
        organizationId,
        role: { in: ["admin", "gestor"] },
        isActive: true,
      },
      select: { id: true, scopeGroup: true },
    });
    // usuário ESCOPADO (ex.: B2B) só recebe se o lead for do grupo dele.
    const targets = admins.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (a: any) => !a.scopeGroup || a.scopeGroup === leadGroup,
    );
    await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      targets.map((a: any) =>
        notifyUser(prisma, organizationId, a.id, payload),
      ),
    );
  } catch {
    /* best-effort */
  }
}

// Notifica o dono do lead (consultor) se houver; senão, os admins/gestores
// (respeitando o escopo de grupo de cada um).
export async function notifyOwnerOrAdmins(
  prisma: Prisma,
  organizationId: string,
  consultantId: string | null | undefined,
  payload: NotifyPayload,
  leadGroup?: string | null,
): Promise<void> {
  if (consultantId) {
    await notifyUser(prisma, organizationId, consultantId, payload);
  } else {
    await notifyOrgAdmins(prisma, organizationId, payload, leadGroup);
  }
}
