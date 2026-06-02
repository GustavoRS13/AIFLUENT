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

    const pipeline = await prisma.pipeline.findFirst({
      where: { organizationId: orgId, isDefault: true },
      include: {
        stages: {
          orderBy: { order: 'asc' },
          include: { _count: { select: { leads: true } } },
        },
      },
    })

    if (!pipeline) return NextResponse.json({ stages: [], conversion: [], lostReasons: {} })

    const stages = pipeline.stages.map((s) => ({
      name: s.name,
      color: s.color,
      count: s._count.leads,
      isWon: s.isWon,
      isLost: s.isLost,
    }))

    // Calculate conversion rates between stages
    const conversion = stages.map((s, i) => ({
      from: i > 0 ? stages[i-1].name : 'Entrada',
      to: s.name,
      rate: i > 0 && stages[i-1].count > 0 ? Math.round((s.count / stages[i-1].count) * 100) : 100,
    }))

    // Lost reasons
    const lostLeads = await prisma.lead.findMany({
      where: { organizationId: orgId, status: 'lost', lostReason: { not: null } },
      select: { lostReason: true },
    })
    const reasons: Record<string, number> = {}
    for (const l of lostLeads) {
      const r = l.lostReason || 'Nao informado'
      reasons[r] = (reasons[r] || 0) + 1
    }

    logger.info('Funnel report generated', { orgId, stageCount: stages.length })

    return NextResponse.json({ stages, conversion, lostReasons: reasons })
  } catch (err) {
    logger.error('GET /api/reports/funnel error', err)
    return NextResponse.json({ stages: [], conversion: [], lostReasons: {} })
  }
}
