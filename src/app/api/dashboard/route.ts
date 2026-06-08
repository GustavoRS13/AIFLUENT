import { NextResponse } from "next/server";
import { requireAuth, checkRateLimit, requireOrgId } from "@/lib/api-auth";
import { apiLimiter } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  const rateLimited = checkRateLimit(request, apiLimiter);
  if (rateLimited) return rateLimited;
  const { error, session } = await requireAuth();
  if (error) return error;
  const { orgId, error: orgError } = requireOrgId(session);
  if (orgError) return orgError;

  try {
    const url = new URL(request.url);
    const teamIdFilter = url.searchParams.get("teamId") || "";
    const { prisma } = await import("@/lib/prisma");
    const userRole = (session!.user as Record<string, unknown>).role as string;
    const userId = (session!.user as Record<string, unknown>).id as string;

    // Base org filter
    const leadWhere: Record<string, unknown> = { organizationId: orgId };
    if (teamIdFilter) leadWhere.teamId = teamIdFilter;
    const dealWhere: Record<string, unknown> = {
      status: "open",
      lead: { organizationId: orgId },
    };
    const wonDealWhere: Record<string, unknown> = {
      status: "won",
      lead: { organizationId: orgId },
    };
    const campaignWhere: Record<string, unknown> = { organizationId: orgId };

    // Role-based data isolation: operador sees only their own metrics
    if (userRole === "operador" && userId) {
      leadWhere.consultantId = userId;
      dealWhere.lead = {
        ...((dealWhere.lead as Record<string, unknown>) || {}),
        consultantId: userId,
      };
      wonDealWhere.lead = {
        ...((wonDealWhere.lead as Record<string, unknown>) || {}),
        consultantId: userId,
      };
    }

    const [
      totalLeads,
      newToday,
      activeDeals,
      totalRevenue,
      campaignsSent,
      org,
    ] = await Promise.all([
      prisma.lead.count({ where: leadWhere }),
      prisma.lead.count({
        where: {
          ...leadWhere,
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      prisma.deal.count({ where: dealWhere }),
      prisma.deal.aggregate({ _sum: { value: true }, where: wonDealWhere }),
      prisma.campaign.count({ where: campaignWhere }),
      prisma.organization.findUnique({
        where: { id: orgId },
        select: { name: true },
      }),
    ]);

    return NextResponse.json({
      totalLeads,
      newLeadsToday: newToday,
      conversionRate:
        totalLeads > 0 ? Math.round((activeDeals / totalLeads) * 1000) / 10 : 0,
      activeDeals,
      totalRevenue: totalRevenue._sum.value || 0,
      campaignsSent,
      responseRate: 0,
      avgResponseTime: 0,
      organizationName: org?.name || null,
    });
  } catch (err) {
    logger.error("Dashboard API error", err);
    return NextResponse.json({
      totalLeads: 0,
      newLeadsToday: 0,
      conversionRate: 0,
      activeDeals: 0,
      totalRevenue: 0,
      campaignsSent: 0,
      responseRate: 0,
      avgResponseTime: 0,
    });
  }
}
