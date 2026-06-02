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

    const threshold = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24h ago

    // Find leads without recent contact and without pending follow-up task
    const staleLeads = await prisma.lead.findMany({
      where: {
        organizationId: orgId,
        status: { notIn: ['converted', 'lost'] },
        temperature: { not: 'cold' },
        OR: [
          { lastContactAt: { lt: threshold } },
          { lastContactAt: null },
        ],
      },
      include: { consultant: true, stage: true },
      take: 50,
    })

    let created = 0
    for (const lead of staleLeads) {
      // Check if already has a pending follow-up task
      const existingTask = await prisma.task.findFirst({
        where: {
          organizationId: orgId,
          title: { contains: lead.firstName },
          status: 'pending',
          type: 'follow_up',
        },
      })
      if (existingTask) continue

      await prisma.task.create({
        data: {
          title: `Follow-up automatico: ${lead.firstName} ${lead.lastName || ''}`,
          type: 'follow_up',
          priority: lead.temperature === 'hot' ? 'urgent' : 'high',
          dueDate: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4h from now
          creatorId: userId,
          assigneeId: lead.consultantId || userId,
          organizationId: orgId,
        },
      })

      await prisma.activity.create({
        data: {
          type: 'task',
          title: 'Follow-up automatico criado pela IA',
          description: `Lead sem contato ha mais de 24h. Tarefa de follow-up criada automaticamente.`,
          leadId: lead.id,
          userId,
        },
      })

      created++
    }

    logger.info('Auto follow-up executed', { created, orgId })
    return NextResponse.json({ created, total: staleLeads.length })
  } catch (err) {
    logger.error('Auto follow-up error', err)
    return NextResponse.json({ error: 'Falha ao executar auto follow-up' }, { status: 500 })
  }
}
