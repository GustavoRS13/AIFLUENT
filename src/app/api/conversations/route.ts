import { NextRequest, NextResponse } from "next/server";
import { requireAuth, checkRateLimit, requireOrgId } from "@/lib/api-auth";
import { apiLimiter } from "@/lib/rate-limit";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { whatsapp } from "@/lib/whatsapp";
import { canMessageLeadWhere } from "@/lib/lead-optout";

export async function GET(request: Request) {
  const rl = checkRateLimit(request, apiLimiter);
  if (rl) return rl;
  const { error, session } = await requireAuth();
  if (error) return error;
  const { orgId, error: orgError } = requireOrgId(session);
  if (orgError) return orgError;
  try {
    const url = new URL(request.url);
    const teamId = url.searchParams.get("teamId") || "";
    const q = (url.searchParams.get("q") || "").trim();
    const { prisma } = await import("@/lib/prisma");
    const where: Record<string, unknown> = { organizationId: orgId };
    // Lead PERDIDO / OPT-OUT sai do Atendimento (e dos "Não respondidos").
    // + escopo de grupo (B2B etc.): só conversas de leads do grupo do usuário.
    const scopeGroup = (session!.user as Record<string, unknown>).scopeGroup as
      | string
      | null;
    where.lead = canMessageLeadWhere();
    // Atendimento mostra só conversas onde o LEAD respondeu (enviou ao menos 1
    // mensagem). Disparos sem resposta não poluem o inbox; ao responder, o
    // webhook seta lastInboundAt e a conversa aparece automaticamente.
    // Ao BUSCAR (q), não exige lastInboundAt — acha por texto de qualquer msg.
    if (!q) where.lastInboundAt = { not: null };
    if (teamId) where.teamId = teamId;
    // Isolamento por papel (Atendimento):
    //  - admin  → todas as conversas da empresa
    //  - gestor/supervisor → conversas do TIME/DEPARTAMENTO deles (+ as suas)
    //  - operador (vendedor) → só as atribuídas a ele / de leads onde é consultor
    const userRole = (session!.user as Record<string, unknown>).role as string;
    const userId = (session!.user as Record<string, unknown>).id as string;
    const userTeamId = (session!.user as Record<string, unknown>).teamId as
      | string
      | undefined;
    const ownConvos = [
      { assigneeId: userId },
      { lead: { consultantId: userId } },
    ];
    let visibilityOR: Record<string, unknown>[] | null = null;
    if (scopeGroup) {
      // usuário escopado (B2B): vê TUDO do grupo dele + o que for atribuído a ele
      visibilityOR = [
        { lead: { stage: { pipeline: { groupName: scopeGroup } } } },
        { assigneeId: userId },
      ];
    } else if (userRole === "operador" && userId) {
      visibilityOR = ownConvos;
    } else if ((userRole === "gestor" || userRole === "supervisor") && userId) {
      visibilityOR = userTeamId
        ? [
            { teamId: userTeamId },
            { lead: { teamId: userTeamId } },
            ...ownConvos,
          ]
        : ownConvos; // gestor sem time → vê só as dele (seguro)
    }
    // Busca por NOME, telefone ou CONTEÚDO de qualquer mensagem (igual WhatsApp)
    const searchOR = q
      ? [
          { lead: { firstName: { contains: q, mode: "insensitive" } } },
          { lead: { lastName: { contains: q, mode: "insensitive" } } },
          { lead: { phone: { contains: q.replace(/\D/g, "") || q } } },
          { lead: { whatsapp: { contains: q.replace(/\D/g, "") || q } } },
          {
            messages: {
              some: { content: { contains: q, mode: "insensitive" } },
            },
          },
        ]
      : null;
    // Combina visibilidade (OR) + busca (OR) via AND quando ambos existem.
    const ands: Record<string, unknown>[] = [];
    if (visibilityOR) ands.push({ OR: visibilityOR });
    if (searchOR) ands.push({ OR: searchOR });
    if (ands.length) where.AND = ands;
    const conversations = await prisma.conversation.findMany({
      where,
      orderBy: { lastMessageAt: "desc" },
      take: Math.min(
        3000,
        Math.max(
          50,
          parseInt(url.searchParams.get("limit") || "200", 10) || 200,
        ),
      ),
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            whatsapp: true,
          },
        },
        assignee: { select: { id: true, name: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    return NextResponse.json({ conversations });
  } catch {
    return NextResponse.json({ conversations: [] });
  }
}

const sendMessageSchema = z.object({
  conversationId: z.string(),
  content: z.string().min(1),
  contentType: z.string().default("text"),
  replyTo: z.string().optional(), // wamid da mensagem citada (responder)
});

export async function POST(request: NextRequest) {
  const rl = checkRateLimit(request, apiLimiter);
  if (rl) return rl;
  const { error, session } = await requireAuth();
  if (error) return error;
  const { orgId, error: orgError } = requireOrgId(session);
  if (orgError) return orgError;
  try {
    const body = await request.json();
    const parsed = sendMessageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Dados invalidos",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { prisma } = await import("@/lib/prisma");
    const userId = (session!.user as Record<string, unknown>).id as string;

    // SECURITY: verify the conversation belongs to the caller's organization
    // before writing — otherwise any authenticated user could post into any
    // tenant's conversation (cross-tenant IDOR).
    const conversation = await prisma.conversation.findUnique({
      where: { id: parsed.data.conversationId },
      select: {
        organizationId: true,
        channel: true,
        lead: { select: { phone: true, whatsapp: true } },
      },
    });
    if (!conversation || conversation.organizationId !== orgId) {
      return NextResponse.json(
        { error: "Conversa nao encontrada" },
        { status: 404 },
      );
    }

    // Envio real pelo canal WhatsApp (quando configurado): guarda o wamid como
    // externalId para que os webhooks de status (entregue/lido/falhou) casem.
    let externalId: string | undefined;
    let status = "sent";
    if (conversation.channel === "whatsapp" && whatsapp.isConfigured) {
      const to = conversation.lead?.whatsapp || conversation.lead?.phone;
      if (to) {
        const result = await whatsapp.sendTextMessage(
          to,
          parsed.data.content,
          parsed.data.replyTo,
        );
        if ("messageId" in result && result.messageId) {
          externalId = result.messageId;
        } else {
          status = "failed";
          logger.error("WhatsApp send failed", {
            conversationId: parsed.data.conversationId,
          });
        }
      }
    }

    const message = await prisma.conversationMessage.create({
      data: {
        conversationId: parsed.data.conversationId,
        content: parsed.data.content,
        contentType: parsed.data.contentType,
        direction: "outbound",
        status,
        externalId,
        senderId: userId,
      },
    });

    // Update conversation lastMessageAt
    await prisma.conversation.update({
      where: { id: parsed.data.conversationId },
      data: { lastMessageAt: new Date() },
    });

    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    logger.error("Send message error", err);
    return NextResponse.json(
      { error: "Falha ao enviar mensagem" },
      { status: 500 },
    );
  }
}
