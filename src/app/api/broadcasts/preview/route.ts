import { NextRequest, NextResponse } from "next/server";
import { requireAuth, checkRateLimit, requireOrgId } from "@/lib/api-auth";
import { apiLimiter } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import {
  buildAudienceWhere,
  type BroadcastSegment,
} from "@/lib/broadcast-segment";

// Conta quantos leads (com WhatsApp) atendem à segmentação — para o preview.
export async function POST(request: NextRequest) {
  const rl = checkRateLimit(request, apiLimiter);
  if (rl) return rl;
  const { error, session } = await requireAuth("gestor");
  if (error) return error;
  const { orgId, error: orgError } = requireOrgId(session);
  if (orgError) return orgError;
  try {
    const body = await request.json();
    const segment = (body.segment as BroadcastSegment) || {};
    const { prisma } = await import("@/lib/prisma");
    const count = await prisma.lead.count({
      where: buildAudienceWhere(orgId, segment),
    });
    return NextResponse.json({ count });
  } catch (err) {
    logger.error("POST /api/broadcasts/preview error", err);
    return NextResponse.json({ count: 0 }, { status: 500 });
  }
}
