import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, checkRateLimit, requireOrgId } from '@/lib/api-auth'
import { apiLimiter } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const updateLeadSchema = z.object({
  stageId: z.string().optional(),
  status: z.enum(['new', 'contacted', 'qualified', 'negotiating', 'converted', 'lost']).optional(),
  temperature: z.enum(['cold', 'warm', 'hot']).optional(),
  consultantId: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  notes: z.string().optional(),
  courseInterest: z.string().optional(),
  nextFollowUpAt: z.string().optional(),
  lostReason: z.string().optional(),
  teamId: z.string().optional(),
})

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rl = checkRateLimit(request, apiLimiter); if (rl) return rl
  const { error, session } = await requireAuth('gestor'); if (error) return error
  const { id } = await params

  try {
    const body = await request.json()
    const parsed = updateLeadSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Dados invalidos', details: parsed.error.flatten().fieldErrors }, { status: 400 })

    const { prisma } = await import('@/lib/prisma')
    const { orgId, error: orgError } = requireOrgId(session)
    if (orgError) return orgError

    // Verify lead belongs to this org
    const existing = await prisma.lead.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Lead nao encontrado' }, { status: 404 })
    if (existing.organizationId !== orgId) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const data: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(parsed.data)) {
      if (value !== undefined) data[key] = value
    }

    // Handle special date fields
    if (data.nextFollowUpAt) data.nextFollowUpAt = new Date(data.nextFollowUpAt as string)
    if (parsed.data.status === 'converted') data.convertedAt = new Date()
    if (parsed.data.status === 'lost') { data.lostAt = new Date() }

    const updated = await prisma.lead.update({
      where: { id },
      data,
      include: {
        consultant: { select: { id: true, name: true } },
        stage: { select: { id: true, name: true, color: true } },
        tags: { include: { tag: true } },
      },
    })

    // Audit log
    try {
      await prisma.auditLog.create({
        data: {
          action: 'lead_updated',
          entity: 'Lead',
          entityId: id,
          details: JSON.stringify(parsed.data),
          organizationId: existing.organizationId,
          userId: (session!.user as Record<string, unknown>).id as string,
        },
      })
    } catch {} // Don't fail if audit fails

    // Create activity for stage change
    if (parsed.data.stageId && parsed.data.stageId !== existing.stageId) {
      try {
        await prisma.activity.create({
          data: {
            type: 'stage_change',
            title: 'Estagio alterado',
            description: `Movido para novo estagio`,
            leadId: id,
            userId: (session!.user as Record<string, unknown>).id as string,
          },
        })
      } catch {} // Don't fail if activity creation fails
    }

    logger.info('Lead updated', { leadId: id, changes: Object.keys(parsed.data) })
    return NextResponse.json(updated)
  } catch (err) {
    logger.error('PATCH /api/leads/[id] error', err)
    return NextResponse.json({ error: 'Falha ao atualizar lead' }, { status: 500 })
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

    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        consultant: { select: { id: true, name: true, avatar: true } },
        stage: { select: { id: true, name: true, color: true } },
        tags: { include: { tag: true } },
        deals: { include: { stage: true } },
        activities: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    })
    if (!lead) return NextResponse.json({ error: 'Lead nao encontrado' }, { status: 404 })
    if (lead.organizationId !== orgId) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    return NextResponse.json(lead)
  } catch (err) {
    logger.error('GET /api/leads/[id] error', err)
    return NextResponse.json({ error: 'Falha ao buscar lead' }, { status: 500 })
  }
}
