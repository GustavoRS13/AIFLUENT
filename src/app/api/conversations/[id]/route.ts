import { NextRequest, NextResponse } from "next/server";
import { requireAuth, checkRateLimit, requireOrgId } from "@/lib/api-auth";
import { apiLimiter } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

// Nunca cacheia — o Atendimento faz polling e precisa das msgs em tempo real.
export const dynamic = "force-dynamic";

// Histórico completo de uma conversa (mensagens em ordem) + dados do lead.
// Marca a conversa como lida ao abrir. Multi-tenant fail-closed.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = checkRateLimit(request, apiLimiter);
  if (rl) return rl;
  const { error, session } = await requireAuth();
  if (error) return error;
  const { orgId, error: orgError } = requireOrgId(session);
  if (orgError) return orgError;
  const { id } = await params;

  try {
    const { prisma } = await import("@/lib/prisma");
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            whatsapp: true,
            email: true,
            source: true,
            temperature: true,
            score: true,
            courseInterest: true,
          },
        },
        assignee: { select: { id: true, name: true } },
        // 200 mensagens MAIS RECENTES (não as mais antigas) — senão, em conversas
        // longas (muitos disparos), as respostas novas ficavam cortadas.
        messages: { orderBy: { createdAt: "desc" }, take: 200 },
      },
    });

    if (!conversation || conversation.organizationId !== orgId) {
      return NextResponse.json(
        { error: "Conversa nao encontrada" },
        { status: 404 },
      );
    }
    // volta à ordem cronológica (asc) para exibição
    if (conversation.messages) conversation.messages.reverse();

    // Marca como lida ao abrir
    if (conversation.unreadCount > 0) {
      await prisma.conversation
        .update({ where: { id }, data: { unreadCount: 0 } })
        .catch(() => {});
    }

    return NextResponse.json({ conversation });
  } catch (err) {
    logger.error("GET /api/conversations/[id] error", err);
    return NextResponse.json(
      { error: "Falha ao buscar conversa" },
      { status: 500 },
    );
  }
}
