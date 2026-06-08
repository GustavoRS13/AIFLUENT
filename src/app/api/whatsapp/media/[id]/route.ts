import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireOrgId } from "@/lib/api-auth";
import { whatsapp } from "@/lib/whatsapp";
import { logger } from "@/lib/logger";

// Proxy de mídia recebida: o WhatsApp exige o token pra baixar o arquivo.
// Só serve mídia referenciada por uma mensagem da empresa do usuário.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, session } = await requireAuth();
  if (error) return error;
  const { orgId, error: orgError } = requireOrgId(session);
  if (orgError) return orgError;
  const { id } = await params;

  try {
    const { prisma } = await import("@/lib/prisma");
    // Verifica posse: a mídia precisa estar referenciada (match EXATO de mediaId)
    // por uma mensagem da empresa do usuário. Sem isso, IDOR/vazamento cross-tenant.
    const msg = await prisma.conversationMessage.findFirst({
      where: {
        mediaId: id,
        conversation: { organizationId: orgId },
      },
      select: { mediaId: true },
    });
    if (!msg?.mediaId) {
      return NextResponse.json(
        { error: "Midia nao encontrada" },
        { status: 404 },
      );
    }

    // Baixa o id CONFIRMADO como pertencente à org (não o cru da URL)
    const meta = await whatsapp.getMediaUrl(msg.mediaId);
    if ("error" in meta) {
      return NextResponse.json({ error: meta.error }, { status: 404 });
    }
    const dl = await whatsapp.downloadMedia(meta.url);
    if ("error" in dl) {
      return NextResponse.json({ error: dl.error }, { status: 502 });
    }

    return new NextResponse(Buffer.from(dl.bytes), {
      status: 200,
      headers: {
        "Content-Type": dl.contentType,
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (err) {
    logger.error("GET /api/whatsapp/media/[id] error", err);
    return NextResponse.json(
      { error: "Falha ao buscar midia" },
      { status: 500 },
    );
  }
}
