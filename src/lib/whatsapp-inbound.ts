import { ingestLead } from "./lead-ingest";
import { notifyOwnerOrAdmins } from "./notifications";
import { isOptOutMessage, STOP_TAG } from "./lead-optout";
import type { InboundMessage, StatusUpdate } from "./whatsapp-webhook";

/**
 * Persistência de WhatsApp inbound — multi-tenant.
 * Resolve a empresa pelo phone_number_id e usa o funil único `ingestLead`.
 */

/**
 * Resolve a organização dona do número que recebeu a mensagem.
 * Ordem: env WHATSAPP_ORG_ID → Integration(type=whatsapp) mapeada → única org existente.
 * Retorna null quando não há como resolver com segurança (multi-tenant sem mapeamento).
 */
export async function resolveOrgForPhoneNumber(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prisma: any,
  phoneNumberId?: string,
): Promise<string | null> {
  if (process.env.WHATSAPP_ORG_ID) return process.env.WHATSAPP_ORG_ID;

  if (phoneNumberId) {
    const integ = await prisma.integration.findFirst({
      where: {
        type: "whatsapp",
        isActive: true,
        config: { contains: phoneNumberId },
      },
      select: { organizationId: true },
    });
    if (integ) return integ.organizationId;
  }

  // Fallback single-tenant: só usa a empresa se existir exatamente uma.
  const count = await prisma.organization.count();
  if (count === 1) {
    const org = await prisma.organization.findFirst({ select: { id: true } });
    return org?.id || null;
  }
  return null;
}

export interface PersistInboundResult {
  deduped: boolean;
  leadId?: string;
  conversationId?: string;
}

/**
 * Persiste uma mensagem recebida: lead (via funil) → conversa → mensagem → histórico.
 * Idempotente por externalId (wamid).
 */
export async function persistInboundMessage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prisma: any,
  orgId: string,
  msg: InboundMessage,
  contactName?: string,
): Promise<PersistInboundResult> {
  // 0. idempotência: mesma mensagem entregue 2x pela Meta
  const already = await prisma.conversationMessage.findFirst({
    where: { externalId: msg.externalId },
    select: { id: true },
  });
  if (already) return { deduped: true };

  // 1. lead via funil único (cria/encontra + tag + auditoria + histórico de origem)
  const { lead } = await ingestLead(prisma, {
    organizationId: orgId,
    source: "whatsapp",
    channel: "whatsapp",
    firstName: contactName || `WhatsApp ${msg.from.slice(-4)}`,
    whatsapp: msg.from,
    phone: msg.from,
  });

  // 2. conversa aberta do canal whatsapp para esse lead
  let conversation = await prisma.conversation.findFirst({
    where: { organizationId: orgId, leadId: lead.id, channel: "whatsapp" },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        channel: "whatsapp",
        status: "open",
        leadId: lead.id,
        organizationId: orgId,
      },
      select: { id: true },
    });
  }

  // 3. salva a mensagem
  await prisma.conversationMessage.create({
    data: {
      conversationId: conversation.id,
      direction: "inbound",
      content: msg.content,
      contentType: msg.contentType,
      mediaType: msg.mediaType,
      mediaId: msg.mediaId,
      status: "received",
      externalId: msg.externalId,
      metadata: JSON.stringify({
        type: msg.type,
        from: msg.from,
        mediaId: msg.mediaId,
        caption: msg.caption,
      }),
    },
  });

  // 4. atualiza o histórico da conversa (lastInboundAt reinicia a janela de 24h)
  const inboundNow = new Date();
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      lastMessageAt: inboundNow,
      lastInboundAt: inboundNow,
      unreadCount: { increment: 1 },
      // lead respondeu → "desoculta" conversa de disparo (vira atendimento ativo)
      status: "open",
    },
  });

  // 4b. OPT-OUT automático: cliente pediu pra parar ("parar mensagem", "sair",
  //     "não quero mais"...) → tag de parar + move pro kanban "Parar Mensagem".
  //     A tag tira o lead de TODOS os disparos (filtro central) + do Atendimento.
  if (isOptOutMessage(msg.content)) {
    try {
      let tag = await prisma.tag.findFirst({
        where: { name: STOP_TAG, organizationId: orgId },
        select: { id: true },
      });
      if (!tag) {
        tag = await prisma.tag.create({
          data: { name: STOP_TAG, color: "#ef4444", organizationId: orgId },
          select: { id: true },
        });
      }
      const rel = await prisma.leadTag.findFirst({
        where: { leadId: lead.id, tagId: tag.id },
        select: { id: true },
      });
      if (!rel)
        await prisma.leadTag.create({
          data: { leadId: lead.id, tagId: tag.id },
        });
      // move pro kanban "Parar Mensagem" (se existir)
      const stop = await prisma.pipelineStage.findFirst({
        where: {
          pipeline: {
            organizationId: orgId,
            name: { contains: "Parar Mensagem" },
          },
        },
        select: { id: true },
      });
      if (stop)
        await prisma.lead.update({
          where: { id: lead.id },
          data: { stageId: stop.id },
        });
      await prisma.activity
        .create({
          data: {
            type: "optout",
            title: "Opt-out automático (pediu pra parar)",
            description: (msg.content || "").slice(0, 200),
            leadId: lead.id,
          },
        })
        .catch(() => {});
    } catch {
      /* opt-out best-effort */
    }
  }

  // 5. notifica o responsável (atribuído/consultor) ou os admins — best-effort
  try {
    const info = await prisma.lead.findUnique({
      where: { id: lead.id },
      select: { firstName: true, consultantId: true },
    });
    const conv = await prisma.conversation.findUnique({
      where: { id: conversation.id },
      select: { assigneeId: true },
    });
    await notifyOwnerOrAdmins(
      prisma,
      orgId,
      conv?.assigneeId || info?.consultantId || null,
      {
        type: "new_message",
        title: `Nova mensagem de ${info?.firstName || "contato"}`,
        body: (msg.content || "").slice(0, 80),
        link: "/atendimento",
      },
    );
  } catch {
    /* notificação best-effort */
  }

  return { deduped: false, leadId: lead.id, conversationId: conversation.id };
}

/**
 * Persiste atualização de status (enviado/entregue/lido/falhou) de uma mensagem
 * outbound, referenciada pelo externalId (wamid).
 */
export async function persistStatusUpdate(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prisma: any,
  st: StatusUpdate,
): Promise<void> {
  // pega o status anterior + metadata (p/ refletir falhas de disparo no contador)
  const msgs = await prisma.conversationMessage
    .findMany({
      where: { externalId: st.externalId },
      select: { id: true, status: true, metadata: true },
    })
    .catch(() => []);

  await prisma.conversationMessage
    .updateMany({
      where: { externalId: st.externalId },
      data: {
        status: st.status,
        errorCode: st.errorCode != null ? String(st.errorCode) : undefined,
        errorTitle: st.errorTitle,
      },
    })
    .catch(() => {});

  // Se uma mensagem de DISPARO falhou (ex.: 131049 limite de marketing), move 1
  // de "enviado" para "falhou" no contador do job — relatório fica verdadeiro.
  if (st.status === "failed") {
    for (const m of msgs as Array<{
      status: string;
      metadata: string | null;
    }>) {
      if (m.status === "failed") continue; // já contabilizado
      try {
        const meta = JSON.parse(m.metadata || "{}");
        if (meta.broadcast && meta.jobId) {
          await prisma.broadcastJob
            .update({
              where: { id: meta.jobId },
              data: { failed: { increment: 1 }, sent: { decrement: 1 } },
            })
            .catch(() => {});
        }
      } catch {
        /* metadata inválido */
      }
    }
  }
}
