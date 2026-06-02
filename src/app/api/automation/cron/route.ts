import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

// This endpoint can be called by Vercel Cron or external scheduler
// Auth is via a secret token instead of session (cron jobs don't have sessions)
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { prisma } = await import('@/lib/prisma')
    const results: Record<string, unknown> = { timestamp: new Date().toISOString() }

    // Get all organizations
    const orgs = await prisma.organization.findMany({ select: { id: true, name: true } })

    for (const org of orgs) {
      const orgResults: Record<string, number> = {}

      // 1. Auto Follow-up: Create tasks for leads without contact in 24h+
      const threshold = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const staleLeads = await prisma.lead.findMany({
        where: {
          organizationId: org.id,
          status: { notIn: ['converted', 'lost'] },
          temperature: { not: 'cold' },
          OR: [{ lastContactAt: { lt: threshold } }, { lastContactAt: null }],
        },
        take: 50,
      })

      let followUpsCreated = 0
      for (const lead of staleLeads) {
        const existing = await prisma.task.findFirst({
          where: { organizationId: org.id, title: { contains: lead.firstName }, status: 'pending', type: 'follow_up' },
        })
        if (!existing) {
          const creator = await prisma.user.findFirst({ where: { organizationId: org.id, role: 'admin' } })
          if (creator) {
            await prisma.task.create({
              data: {
                title: `Auto follow-up: ${lead.firstName} ${lead.lastName || ''}`,
                type: 'follow_up',
                priority: lead.temperature === 'hot' ? 'urgent' : 'high',
                dueDate: new Date(Date.now() + 4 * 60 * 60 * 1000),
                creatorId: creator.id,
                assigneeId: lead.consultantId || creator.id,
                organizationId: org.id,
              },
            })
            followUpsCreated++
          }
        }
      }
      orgResults.followUpsCreated = followUpsCreated

      // 2. Auto Stage: Move leads based on activity
      const pipeline = await prisma.pipeline.findFirst({
        where: { organizationId: org.id, isDefault: true },
        include: { stages: { orderBy: { order: 'asc' } } },
      })

      let stagesMoved = 0
      if (pipeline) {
        const stages = pipeline.stages
        const leads = await prisma.lead.findMany({
          where: { organizationId: org.id, status: { notIn: ['converted', 'lost'] }, stageId: { not: null } },
          include: { activities: { take: 10, orderBy: { createdAt: 'desc' } } },
        })

        for (const lead of leads) {
          const currentIdx = stages.findIndex(s => s.id === lead.stageId)
          if (currentIdx === -1 || currentIdx >= stages.length - 2) continue
          const next = stages[currentIdx + 1]
          if (!next || next.isWon || next.isLost) continue

          const shouldMove = (currentIdx === 0 && lead.activities.length >= 1) ||
            (currentIdx <= 2 && lead.temperature === 'hot' && lead.activities.length >= 3)

          if (shouldMove) {
            await prisma.lead.update({ where: { id: lead.id }, data: { stageId: next.id } })
            stagesMoved++
          }
        }
      }
      orgResults.stagesMoved = stagesMoved

      // 3. Auto Distribute: Assign unassigned leads
      const unassigned = await prisma.lead.findMany({
        where: { organizationId: org.id, consultantId: null, status: { notIn: ['converted', 'lost'] } },
      })

      let distributed = 0
      if (unassigned.length > 0) {
        const consultants = await prisma.user.findMany({
          where: { organizationId: org.id, isActive: true, role: { not: 'admin' } },
          select: { id: true },
        })
        if (consultants.length > 0) {
          for (let i = 0; i < unassigned.length; i++) {
            await prisma.lead.update({
              where: { id: unassigned[i].id },
              data: { consultantId: consultants[i % consultants.length].id },
            })
            distributed++
          }
        }
      }
      orgResults.distributed = distributed

      results[org.id] = orgResults
    }

    logger.info('Cron automation completed', results)
    return NextResponse.json({ success: true, results })
  } catch (err) {
    logger.error('Cron automation error', err)
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 })
  }
}
