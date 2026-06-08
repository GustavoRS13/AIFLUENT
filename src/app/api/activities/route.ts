import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, checkRateLimit, requireOrgId } from '@/lib/api-auth'
import { apiLimiter } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const createActivitySchema = z.object({
  type: z.enum(['note', 'call', 'email', 'meeting', 'task', 'stage_change', 'deal_won', 'deal_lost', 'deal_updated', 'custom']),
  title: z.string().min(1),
  description: z.string().optional(),
  leadId: z.string().min(1),
  metadata: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const rl = checkRateLimit(request, apiLimiter); if (rl) return rl
  const { error, session } = await requireAuth(); if (error) return error

  try {
    const body = await request.json()
    const parsed = createActivitySchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Dados invalidos', details: parsed.error.flatten().fieldErrors }, { status: 400 })

    const { prisma } = await import('@/lib/prisma')
    const { orgId, error: orgError } = requireOrgId(session)
    if (orgError) return orgError
    const userId = (session!.user as Record<string, unknown>).id as string
    const userRole = (session!.user as Record<string, unknown>).role as string

    // Verify lead belongs to org
    const lead = await prisma.lead.findUnique({ where: { id: parsed.data.leadId } })
    if (!lead) return NextResponse.json({ error: 'Lead nao encontrado' }, { status: 404 })
    if (lead.organizationId !== orgId) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    // Role-based isolation: operador can only create activities on their leads
    if (userRole === 'operador' && userId && lead.consultantId !== userId) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const activity = await prisma.activity.create({
      data: { ...parsed.data, userId },
      include: { user: { select: { id: true, name: true } } },
    })

    logger.info('Activity created', { type: parsed.data.type, leadId: parsed.data.leadId })
    return NextResponse.json(activity, { status: 201 })
  } catch (err) {
    logger.error('POST /api/activities error', err)
    return NextResponse.json({ error: 'Falha ao criar atividade' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const rl = checkRateLimit(request, apiLimiter); if (rl) return rl
  const { error, session } = await requireAuth(); if (error) return error

  try {
    const { searchParams } = request.nextUrl
    const leadId = searchParams.get('leadId')
    if (!leadId) return NextResponse.json({ error: 'leadId obrigatorio' }, { status: 400 })

    const { prisma } = await import('@/lib/prisma')
    const { orgId, error: orgError } = requireOrgId(session)
    if (orgError) return orgError
    const userRole = (session!.user as Record<string, unknown>).role as string
    const userId = (session!.user as Record<string, unknown>).id as string

    // Verify lead belongs to org
    const lead = await prisma.lead.findUnique({ where: { id: leadId } })
    if (!lead) return NextResponse.json({ error: 'Lead nao encontrado' }, { status: 404 })
    if (lead.organizationId !== orgId) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    // Role-based isolation: operador can only view activities on their leads
    if (userRole === 'operador' && userId && lead.consultantId !== userId) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const activities = await prisma.activity.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { user: { select: { id: true, name: true } } },
    })

    return NextResponse.json({ activities })
  } catch (err) {
    logger.error('GET /api/activities error', err)
    return NextResponse.json({ error: 'Falha ao buscar atividades' }, { status: 500 })
  }
}
