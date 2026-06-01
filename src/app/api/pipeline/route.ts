import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'


export async function GET() {
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
  try {
    const body = await request.json()
    const { leadId, stageId, newOrder } = body

    if (!leadId || typeof leadId !== 'string') {
      return NextResponse.json({ error: 'leadId e obrigatorio' }, { status: 400 })
    }
    if (!stageId || typeof stageId !== 'string') {
      return NextResponse.json({ error: 'stageId e obrigatorio' }, { status: 400 })
    }

    await prisma.lead.update({
      where: { id: leadId },
      data: { stageId, stageOrder: newOrder ?? 0 },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('PATCH /api/pipeline error:', error)
    return NextResponse.json({ error: 'Erro ao mover lead' }, { status: 500 })
  }
}
