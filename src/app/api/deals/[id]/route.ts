import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, checkRateLimit, requireOrgId } from '@/lib/api-auth'
import { apiLimiter } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const updateDealSchema = z.object({
  status: z.enum(['open', 'won', 'lost']).optional(),
  value: z.number().optional(),
  probability: z.number().min(0).max(100).optional(),
  stageId: z.string().optional(),
  title: z.string().optional(),
  expectedCloseAt: z.string().optional(),
  lostReason: z.string().optional(),
})

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rl = checkRateLimit(request, apiLimiter); if (rl) return rl
  const { error, session } = await requireAuth('gestor'); if (error) return error
  const { id } = await params

  try {
    const body = await request.json()
    const parsed = updateDealSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Dados invalidos', details: parsed.error.flatten().fieldErrors }, { status: 400 })

    const { prisma } = await import('@/lib/prisma')
    const { orgId, error: orgError } = requireOrgId(session)
    if (orgError) return orgError

    const existing = await prisma.deal.findUnique({ where: { id }, include: { lead: true } })
    if (!existing) return NextResponse.json({ error: 'Negocio nao encontrado' }, { status: 404 })
    if (existing.lead.organizationId !== orgId) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const data: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(parsed.data)) {
      if (value !== undefined) data[key] = value
    }
    if (parsed.data.status === 'won' || parsed.data.status === 'lost') data.closedAt = new Date()
    if (parsed.data.expectedCloseAt) data.expectedCloseAt = new Date(parsed.data.expectedCloseAt as string)

    const updated = await prisma.deal.update({ where: { id }, data, include: { lead: true, stage: true } })

    // Create activity on lead
    try {
      await prisma.activity.create({
        data: {
          type: parsed.data.status === 'won' ? 'deal_won' : parsed.data.status === 'lost' ? 'deal_lost' : 'deal_updated',
          title: parsed.data.status === 'won' ? 'Negocio ganho!' : parsed.data.status === 'lost' ? 'Negocio perdido' : 'Negocio atualizado',
          description: parsed.data.value ? `Valor: R$${parsed.data.value}` : undefined,
          leadId: existing.leadId,
          userId: (session!.user as Record<string, unknown>).id as string,
        },
      })
    } catch {} // Don't fail if activity creation fails

    logger.info('Deal updated', { dealId: id, changes: Object.keys(parsed.data) })
    return NextResponse.json(updated)
  } catch (err) {
    logger.error('PATCH /api/deals/[id] error', err)
    return NextResponse.json({ error: 'Falha ao atualizar negocio' }, { status: 500 })
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rl = checkRateLimit(request, apiLimiter); if (rl) return rl
  const { error, session } = await requireAuth(); if (error) return error
  const { id } = await params

  try {
    const { prisma } = await import('@/lib/prisma')
    const { orgId, error: orgError } = requireOrgId(session)
    if (orgError) return orgError
    const deal = await prisma.deal.findUnique({
      where: { id },
      include: {
        lead: { select: { id: true, firstName: true, lastName: true, company: true, organizationId: true } },
        stage: { select: { id: true, name: true, color: true } },
      },
    })
    if (!deal || deal.lead.organizationId !== orgId) return NextResponse.json({ error: 'Negocio nao encontrado' }, { status: 404 })
    return NextResponse.json(deal)
  } catch (err) {
    logger.error('GET /api/deals/[id] error', err)
    return NextResponse.json({ error: 'Falha ao buscar negocio' }, { status: 500 })
  }
}
