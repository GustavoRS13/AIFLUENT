import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'


export async function GET() {
  const campaigns = await prisma.campaign.findMany({
    include: {
      createdBy: { select: { id: true, name: true, avatar: true } },
      _count: { select: { leads: true, sequences: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(campaigns)
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  const campaign = await prisma.campaign.create({
    data: {
      name: body.name,
      type: body.type || 'broadcast',
      channel: body.channel || 'whatsapp',
      subject: body.subject,
      content: body.content,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
      organizationId: body.organizationId,
      createdById: body.createdById,
    },
  })

  return NextResponse.json(campaign, { status: 201 })
}
