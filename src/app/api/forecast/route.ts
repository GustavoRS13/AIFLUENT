import { NextResponse } from 'next/server'
import { requireAuth, checkRateLimit } from '@/lib/api-auth'
import { apiLimiter } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

export async function GET(request: Request) {
  const rl = checkRateLimit(request, apiLimiter); if (rl) return rl
  const { error, session } = await requireAuth(); if (error) return error

  try {
    const { prisma } = await import('@/lib/prisma')
    const orgId = (session!.user as Record<string, unknown>).organizationId as string

    const deals = await prisma.deal.findMany({
      where: { status: 'open', lead: { organizationId: orgId } },
      include: { stage: true },
    })

    // Calculate weighted forecast
    let totalWeighted = 0
    let totalUnweighted = 0
    let bestCase = 0
    let worstCase = 0

    const byStage: Record<string, { count: number; value: number; weighted: number }> = {}

    for (const deal of deals) {
      const value = deal.value || 0
      const prob = deal.probability / 100
      const weighted = value * prob

      totalWeighted += weighted
      totalUnweighted += value
      bestCase += value // 100% close rate
      worstCase += value * Math.max(0, prob - 0.2) // pessimistic

      const stageName = deal.stage?.name || 'Sem estagio'
      if (!byStage[stageName]) byStage[stageName] = { count: 0, value: 0, weighted: 0 }
      byStage[stageName].count++
      byStage[stageName].value += value
      byStage[stageName].weighted += weighted
    }

    // Won deals this month
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0)
    const wonThisMonth = await prisma.deal.aggregate({
      where: { status: 'won', closedAt: { gte: monthStart }, lead: { organizationId: orgId } },
      _sum: { value: true },
      _count: true,
    })

    logger.info('Forecast calculated', { orgId, totalDeals: deals.length })

    return NextResponse.json({
      forecast: {
        weighted: Math.round(totalWeighted),
        unweighted: Math.round(totalUnweighted),
        bestCase: Math.round(bestCase),
        worstCase: Math.round(worstCase),
      },
      pipeline: {
        totalDeals: deals.length,
        byStage,
      },
      realized: {
        revenue: wonThisMonth._sum.value || 0,
        deals: wonThisMonth._count || 0,
      },
    })
  } catch (err) {
    logger.error('GET /api/forecast error', err)
    return NextResponse.json({ forecast: { weighted: 0, unweighted: 0, bestCase: 0, worstCase: 0 }, pipeline: { totalDeals: 0, byStage: {} }, realized: { revenue: 0, deals: 0 } })
  }
}
