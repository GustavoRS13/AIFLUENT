import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/api-auth'

const moveLeadSchema = z.object({
  leadId: z.string().min(1, 'leadId e obrigatorio'),
  stageId: z.string().min(1, 'stageId e obrigatorio'),
  newOrder: z.number().int().nonnegative().optional().default(0),
})

export async function GET() {
  const { error } = await requireAuth()
  if (error) return error

  try {
    const pipeline = await prisma.pipeline.findFirst({
      where: { isDefault: true },
      include: {
        stages: {
          orderBy: { order: 'asc' },
          include: {
            leads: {
              orderBy: { stageOrder: 'asc' },
              include: {
                consultant: { select: { id: true, name: true, avatar: true } },
                tags: { include: { tag: true } },
                _count: { select: { activities: true, messages: true } },
              },
            },
            _count: { select: { leads: true } },
          },
        },
      },
    })

    return NextResponse.json(pipeline)
  } catch (error) {
    console.error('GET /api/pipeline error:', error)
    return NextResponse.json({ error: 'Erro ao buscar pipeline' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const { error: authError } = await requireAuth('gestor')
  if (authError) return authError

  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'JSON invalido' }, { status: 400 })
    }

    const parsed = moveLeadSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados invalidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const { leadId, stageId, newOrder } = parsed.data

    await prisma.lead.update({
      where: { id: leadId },
      data: { stageId, stageOrder: newOrder },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('PATCH /api/pipeline error:', error)
    return NextResponse.json({ error: 'Erro ao mover lead' }, { status: 500 })
  }
}
