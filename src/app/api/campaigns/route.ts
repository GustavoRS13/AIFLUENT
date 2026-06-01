import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'


export async function GET() {
  try {
    const campaigns = await prisma.campaign.findMany({
      include: {
        createdBy: { select: { id: true, name: true, avatar: true } },
        _count: { select: { leads: true, sequences: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(campaigns)
  } catch (error) {
    console.error('GET /api/campaigns error:', error)
    return NextResponse.json({ error: 'Erro ao buscar campanhas' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return NextResponse.json({ error: 'Nome da campanha e obrigatorio' }, { status: 400 })
    }

    const campaign = await prisma.campaign.create({
      data: {
        name: body.name.trim(),
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
  } catch (error) {
    console.error('POST /api/campaigns error:', error)
    return NextResponse.json({ error: 'Erro ao criar campanha' }, { status: 500 })
  }
}
