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
    const userId = (session!.user as Record<string, unknown>).id as string

    // Get pipeline stages in order
    const pipeline = await prisma.pipeline.findFirst({
      where: { organizationId: orgId, isDefault: true },
      include: { stages: { orderBy: { order: 'asc' } } },
    })
    if (!pipeline) return NextResponse.json({ moved: 0, message: 'Pipeline nao encontrado' })

    const stages = pipeline.stages

    // Find leads that should be moved
    const leads = await prisma.lead.findMany({
      where: { organizationId: orgId, status: { notIn: ['converted', 'lost'] }, stageId: { not: null } },
      include: { stage: true, deals: true, activities: { take: 10, orderBy: { createdAt: 'desc' } } },
    })

    let moved = 0
    for (const lead of leads) {
      if (!lead.stageId) continue
      const currentStageIdx = stages.findIndex(s => s.id === lead.stageId)
      if (currentStageIdx === -1 || currentStageIdx >= stages.length - 2) continue // skip if at end (won/lost)

      const nextStage = stages[currentStageIdx + 1]
      if (!nextStage || nextStage.isWon || nextStage.isLost) continue

      // Decide if lead should move based on signals
      let shouldMove = false
      let reason = ''

      const recentActivities = lead.activities.length
      const hasDeals = lead.deals.length > 0
      const isHot = lead.temperature === 'hot'

      // Base -> next: if has any activity
      if (currentStageIdx === 0 && recentActivities >= 1) {
        shouldMove = true
        reason = 'Primeira interacao registrada'
      }
      // Early stages -> next: if hot + multiple interactions
      else if (currentStageIdx <= 2 && isHot && recentActivities >= 3) {
        shouldMove = true
        reason = `Lead quente com ${recentActivities} interacoes`
      }
      // Mid stages -> next: if has deal + hot
      else if (currentStageIdx >= 2 && hasDeals && isHot && recentActivities >= 5) {
        shouldMove = true
        reason = `Negocio vinculado + lead quente + ${recentActivities} interacoes`
      }

      if (shouldMove) {
        await prisma.lead.update({
          where: { id: lead.id },
          data: { stageId: nextStage.id },
        })
        await prisma.activity.create({
          data: {
            type: 'stage_change',
            title: `IA moveu para ${nextStage.name}`,
            description: reason,
            leadId: lead.id,
            userId,
          },
        })
        moved++
      }
    }

    logger.info('Auto-stage executed', { moved, orgId })
    return NextResponse.json({ moved, analyzed: leads.length })
  } catch (err) {
    logger.error('Auto-stage error', err)
    return NextResponse.json({ error: 'Falha ao executar auto-stage' }, { status: 500 })
  }
}
