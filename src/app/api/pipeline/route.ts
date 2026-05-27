import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'


export async function GET() {
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
}

export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const { leadId, stageId, newOrder } = body

  await prisma.lead.update({
    where: { id: leadId },
    data: { stageId, stageOrder: newOrder ?? 0 },
  })

  return NextResponse.json({ success: true })
}
