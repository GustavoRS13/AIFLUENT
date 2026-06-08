import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, checkRateLimit, requireOrgId } from '@/lib/api-auth'
import { apiLimiter } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  const rl = checkRateLimit(request, apiLimiter)
  if (rl) return rl
  const { error, session } = await requireAuth()
  if (error) return error
  const { orgId, error: orgError } = requireOrgId(session)
  if (orgError) return orgError

  try {
    const { prisma } = await import('@/lib/prisma')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const org = { lead: { organizationId: orgId } }

    const [stageChanges, dealsWon, dealsLost, notesCreated, tasksCreated, totalActivities] =
      await Promise.all([
        prisma.activity.count({
          where: { type: 'stage_change', createdAt: { gte: today }, ...org },
        }),
        prisma.activity.count({
          where: { type: 'deal_won', createdAt: { gte: today }, ...org },
        }),
        prisma.activity.count({
          where: { type: 'deal_lost', createdAt: { gte: today }, ...org },
        }),
        prisma.activity.count({
          where: { type: 'note', createdAt: { gte: today }, ...org },
        }),
        prisma.task.count({
          where: { createdAt: { gte: today }, organizationId: orgId },
        }),
        prisma.activity.count({
          where: { createdAt: { gte: today }, ...org },
        }),
      ])

    return NextResponse.json({
      stageChanges,
      dealsWon,
      dealsLost,
      notesCreated,
      tasksCreated,
      totalActivities,
      date: today.toISOString(),
    })
  } catch {
    return NextResponse.json({
      stageChanges: 0,
      dealsWon: 0,
      dealsLost: 0,
      notesCreated: 0,
      tasksCreated: 0,
      totalActivities: 0,
    })
  }
}
