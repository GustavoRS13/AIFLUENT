import { NextResponse } from 'next/server'
import { requireAuth, checkRateLimit, requireOrgId } from '@/lib/api-auth'
import { apiLimiter } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  const rl = checkRateLimit(request, apiLimiter); if (rl) return rl
  const { error, session } = await requireAuth('gestor'); if (error) return error

  try {
    const { prisma } = await import('@/lib/prisma')
    const { orgId, error: orgError } = requireOrgId(session)
    if (orgError) return orgError

    // Get active consultants
    const consultants = await prisma.user.findMany({
      where: { organizationId: orgId, isActive: true, role: { not: 'admin' } },
      select: { id: true, name: true },
    })
    if (consultants.length === 0) return NextResponse.json({ distributed: 0, message: 'Nenhum consultor disponivel' })

    // Get unassigned leads
    const unassigned = await prisma.lead.findMany({
      where: { organizationId: orgId, consultantId: null, status: { notIn: ['converted', 'lost'] } },
    })

    // Count current assignments per consultant
    const counts = await Promise.all(
      consultants.map(async c => ({
        id: c.id,
        name: c.name,
        count: await prisma.lead.count({ where: { consultantId: c.id, organizationId: orgId, status: { notIn: ['converted', 'lost'] } } }),
      }))
    )

    let distributed = 0
    for (const lead of unassigned) {
      // Assign to consultant with fewest leads (round-robin)
      counts.sort((a, b) => a.count - b.count)
      const target = counts[0]

      await prisma.lead.update({
        where: { id: lead.id },
        data: { consultantId: target.id },
      })
      await prisma.activity.create({
        data: {
          type: 'custom',
          title: `Distribuido para ${target.name}`,
          description: 'Distribuicao automatica (round-robin)',
          leadId: lead.id,
        },
      })

      target.count++
      distributed++
    }

    logger.info('Auto-distribute executed', { distributed, orgId })
    return NextResponse.json({ distributed, consultants: counts.map(c => ({ name: c.name, leads: c.count })) })
  } catch (err) {
    logger.error('Auto-distribute error', err)
    return NextResponse.json({ error: 'Falha na distribuicao' }, { status: 500 })
  }
}
