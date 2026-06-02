import { NextResponse } from 'next/server'
import { requireAuth, checkRateLimit } from '@/lib/api-auth'
import { apiLimiter } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  const rl = checkRateLimit(request, apiLimiter); if (rl) return rl
  const { error, session } = await requireAuth('gestor'); if (error) return error

  try {
    const { prisma } = await import('@/lib/prisma')
    const orgId = (session!.user as Record<string, unknown>).organizationId as string

    const pipeline = await prisma.pipeline.findFirst({
      where: { organizationId: orgId, isDefault: true },
      include: { stages: { orderBy: { order: 'asc' } } },
    })

    if (!pipeline || pipeline.stages.length < 2) {
      return NextResponse.json({ message: 'Pipeline sem estagios suficientes', moved: 0 })
    }

    // Move leads with recent activity to the next stage
    const twoDaysAgo = new Date()
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

    let moved = 0
    for (let i = 0; i < pipeline.stages.length - 1; i++) {
      const currentStage = pipeline.stages[i]
      const nextStage = pipeline.stages[i + 1]

      if (currentStage.isWon || currentStage.isLost || nextStage.isLost) continue

      // Find leads in this stage with recent activity
      const leadsWithActivity = await prisma.lead.findMany({
        where: {
          organizationId: orgId,
          stageId: currentStage.id,
          activities: { some: { createdAt: { gte: twoDaysAgo } } },
        },
        select: { id: true },
        take: 30,
      })

      if (leadsWithActivity.length > 0) {
        await prisma.lead.updateMany({
          where: { id: { in: leadsWithActivity.map(l => l.id) } },
          data: { stageId: nextStage.id },
        })
        moved += leadsWithActivity.length
      }
    }

    logger.info('Auto stage executed', { orgId, moved })

    return NextResponse.json({
      message: `${moved} lead(s) movido(s) de estagio`,
      moved,
    })
  } catch (err) {
    logger.error('POST /api/automation/stage error', err)
    return NextResponse.json({ error: 'Falha ao executar auto stage' }, { status: 500 })
  }
}
