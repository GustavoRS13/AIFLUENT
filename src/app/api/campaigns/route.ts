import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth, checkRateLimit } from '@/lib/api-auth'

const createCampaignSchema = z.object({
  name: z.string().min(1, 'Nome da campanha e obrigatorio').transform((v) => v.trim()),
  type: z.string().default('broadcast'),
  channel: z.string().default('whatsapp'),
  subject: z.string().optional(),
  content: z.string().optional(),
  scheduledAt: z.string().optional().nullable(),
  organizationId: z.string(),
  createdById: z.string(),
})

export async function GET(request: NextRequest) {
  const rateLimited = checkRateLimit(request)
  if (rateLimited) return rateLimited

  const { error } = await requireAuth()
  if (error) return error

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
  const rateLimited = checkRateLimit(request)
  if (rateLimited) return rateLimited

  const { error: authError } = await requireAuth('gestor')
  if (authError) return authError

  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'JSON invalido' }, { status: 400 })
    }

    const parsed = createCampaignSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados invalidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const data = parsed.data

    const campaign = await prisma.campaign.create({
      data: {
        name: data.name,
        type: data.type,
        channel: data.channel,
        subject: data.subject,
        content: data.content,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        organizationId: data.organizationId,
        createdById: data.createdById,
      },
    })

    return NextResponse.json(campaign, { status: 201 })
  } catch (error) {
    console.error('POST /api/campaigns error:', error)
    return NextResponse.json({ error: 'Erro ao criar campanha' }, { status: 500 })
  }
}
