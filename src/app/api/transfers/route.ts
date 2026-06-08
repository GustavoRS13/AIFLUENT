import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth, checkRateLimit, requireOrgId } from '@/lib/api-auth'
import { apiLimiter } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

const transferSchema = z.object({
  entityType: z.enum(['lead', 'conversation']),
  entityId: z.string().min(1),
  toTeamId: z.string().min(1),
  reason: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const rl = checkRateLimit(request, apiLimiter)
  if (rl) return rl
  const { error, session } = await requireAuth('gestor')
  if (error) return error
  const { orgId, error: orgError } = requireOrgId(session)
  if (orgError) return orgError
  const userId = (session!.user as Record<string, unknown>).id as string
  const userName = (session!.user as Record<string, unknown>).name as string

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalido' }, { status: 400 })
  }

  const parsed = transferSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados invalidos', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const { entityType, entityId, toTeamId, reason } = parsed.data

  try {
    const { prisma } = await import('@/lib/prisma')

    // Verify toTeam exists and belongs to org
    const toTeam = await prisma.team.findUnique({ where: { id: toTeamId } })
    if (!toTeam) return NextResponse.json({ error: 'Departamento destino nao encontrado' }, { status: 404 })
    if (toTeam.organizationId !== orgId) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    let fromTeamId: string | null = null
    let fromTeamName = '(nenhum)'
    let leadId: string | null = null

    if (entityType === 'lead') {
      const lead = await prisma.lead.findUnique({ where: { id: entityId } })
      if (!lead) return NextResponse.json({ error: 'Lead nao encontrado' }, { status: 404 })
      if (lead.organizationId !== orgId) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

      fromTeamId = lead.teamId
      leadId = lead.id

      if (fromTeamId) {
        const fromTeam = await prisma.team.findUnique({ where: { id: fromTeamId } })
        if (fromTeam) fromTeamName = fromTeam.name
      }

      await prisma.lead.update({ where: { id: entityId }, data: { teamId: toTeamId } })
    } else {
      const conversation = await prisma.conversation.findUnique({
        where: { id: entityId },
        include: { lead: { select: { id: true } } },
      })
      if (!conversation) return NextResponse.json({ error: 'Conversa nao encontrada' }, { status: 404 })
      if (conversation.organizationId !== orgId) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

      fromTeamId = conversation.teamId
      leadId = conversation.leadId

      if (fromTeamId) {
        const fromTeam = await prisma.team.findUnique({ where: { id: fromTeamId } })
        if (fromTeam) fromTeamName = fromTeam.name
      }

      await prisma.conversation.update({ where: { id: entityId }, data: { teamId: toTeamId } })
    }

    // Create Transfer record
    const transfer = await prisma.transfer.create({
      data: {
        entityType,
        entityId,
        fromTeamId,
        toTeamId,
        fromUserId: userId,
        reason,
        organizationId: orgId,
      },
    })

    // Create Activity on the lead
    if (leadId) {
      try {
        await prisma.activity.create({
          data: {
            type: 'transfer',
            title: 'Transferencia de departamento',
            description: `Transferido de ${fromTeamName} para ${toTeam.name} por ${userName}`,
            leadId,
            userId,
          },
        })
      } catch {} // Don't fail if activity creation fails
    }

    logger.info('Transfer completed', { transferId: transfer.id, entityType, entityId, fromTeamId, toTeamId })
    return NextResponse.json(transfer, { status: 201 })
  } catch (err) {
    logger.error('POST /api/transfers error', err)
    return NextResponse.json({ error: 'Falha ao realizar transferencia' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const rl = checkRateLimit(request, apiLimiter)
  if (rl) return rl
  const { error, session } = await requireAuth()
  if (error) return error
  const { orgId, error: orgError } = requireOrgId(session)
  if (orgError) return orgError

  try {
    const url = new URL(request.url)
    const entityType = url.searchParams.get('entityType') || ''
    const entityId = url.searchParams.get('entityId') || ''

    if (!entityType || !entityId) {
      return NextResponse.json({ error: 'entityType e entityId sao obrigatorios' }, { status: 400 })
    }

    const { prisma } = await import('@/lib/prisma')
    const where: Record<string, unknown> = { entityType, entityId, organizationId: orgId }

    const transfers = await prisma.transfer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        fromTeam: { select: { id: true, name: true } },
        toTeam: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ transfers })
  } catch (err) {
    logger.error('GET /api/transfers error', err)
    return NextResponse.json({ transfers: [] })
  }
}
