import { NextResponse } from 'next/server'
import { requireAuth, checkRateLimit } from '@/lib/api-auth'
import { apiLimiter } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

export async function GET(request: Request) {
  const rl = checkRateLimit(request, apiLimiter); if (rl) return rl
  const { error, session } = await requireAuth('gestor'); if (error) return error

  try {
    const { prisma } = await import('@/lib/prisma')
    const orgId = (session!.user as Record<string, unknown>).organizationId as string

    const users = await prisma.user.findMany({
      where: { organizationId: orgId, isActive: true },
      select: { id: true, name: true, role: true, email: true },
    })

    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0)

    const performance = await Promise.all(users.map(async (user) => {
      const [totalLeads, activeLeads, wonDeals, activities, tasks] = await Promise.all([
        prisma.lead.count({ where: { consultantId: user.id, organizationId: orgId } }),
        prisma.lead.count({ where: { consultantId: user.id, organizationId: orgId, status: { notIn: ['converted', 'lost'] } } }),
        prisma.deal.aggregate({
          where: { status: 'won', closedAt: { gte: monthStart }, lead: { consultantId: user.id, organizationId: orgId } },
          _sum: { value: true },
          _count: true,
        }),
        prisma.activity.count({ where: { userId: user.id, createdAt: { gte: monthStart } } }),
        prisma.task.count({ where: { assigneeId: user.id, status: 'completed', organizationId: orgId } }),
      ])

      return {
        id: user.id,
        name: user.name,
        role: user.role,
        email: user.email,
        totalLeads,
        activeLeads,
        wonDeals: wonDeals._count || 0,
        revenue: wonDeals._sum.value || 0,
        activities,
        tasksCompleted: tasks,
        conversionRate: totalLeads > 0 ? Math.round(((wonDeals._count || 0) / totalLeads) * 100) : 0,
      }
    }))

    // Sort by revenue descending
    performance.sort((a, b) => b.revenue - a.revenue)

    logger.info('Team report generated', { orgId, teamSize: performance.length })

    return NextResponse.json({ team: performance, period: { start: monthStart.toISOString(), end: new Date().toISOString() } })
  } catch (err) {
    logger.error('GET /api/reports/team error', err)
    return NextResponse.json({ team: [], period: {} })
  }
}
