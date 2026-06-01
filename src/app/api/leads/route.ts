import { NextRequest, NextResponse } from 'next/server'

const memoryLeads: Record<string, unknown>[] = []

async function getPrisma() {
  try {
    const { prisma } = await import('@/lib/prisma')
    return prisma
  } catch {
    return null
  }
}

const DEFAULT_ORG_ID = 'default-org'

async function ensureDefaultOrg(prisma: Awaited<ReturnType<typeof getPrisma>>) {
  if (!prisma) return DEFAULT_ORG_ID
  try {
    const existing = await prisma.organization.findUnique({ where: { id: DEFAULT_ORG_ID } })
    if (!existing) {
      await prisma.organization.create({
        data: { id: DEFAULT_ORG_ID, name: 'AIFLUENT', slug: 'aifluent' },
      })
    }
  } catch { /* ignore */ }
  return DEFAULT_ORG_ID
}

export async function GET(request: NextRequest) {
  const prisma = await getPrisma()

  if (prisma) {
    try {
      const { searchParams } = request.nextUrl
      const search = searchParams.get('search') || ''
      const source = searchParams.get('source') || ''
      const temperature = searchParams.get('temperature') || ''
      const status = searchParams.get('status') || ''
      const stageId = searchParams.get('stageId') || ''
      const sortBy = searchParams.get('sortBy') || 'createdAt'
      const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc'
      const page = parseInt(searchParams.get('page') || '1')
      const limit = parseInt(searchParams.get('limit') || '50')

      const where: Record<string, unknown> = {}
      if (search) {
        where.OR = [
          { firstName: { contains: search } },
          { lastName: { contains: search } },
          { email: { contains: search } },
          { phone: { contains: search } },
          { whatsapp: { contains: search } },
        ]
      }
      if (source) where.source = source
      if (temperature) where.temperature = temperature
      if (status) where.status = status
      if (stageId) where.stageId = stageId

      const [leads, total] = await Promise.all([
        prisma.lead.findMany({
          where,
          include: {
            consultant: { select: { id: true, name: true, avatar: true } },
            stage: { select: { id: true, name: true, color: true } },
            tags: { include: { tag: true } },
            _count: { select: { activities: true, messages: true } },
          },
          orderBy: { [sortBy]: sortOrder },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.lead.count({ where }),
      ])

      return NextResponse.json({ leads, total, page, limit, totalPages: Math.ceil(total / limit) })
    } catch (error) {
      console.error('GET /api/leads DB error:', error)
    }
  }

  return NextResponse.json({
    leads: memoryLeads,
    total: memoryLeads.length,
    page: 1,
    limit: 50,
    totalPages: 1,
  })
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  try {
    const prisma = await getPrisma()
    if (prisma) {
      const orgId = body.organizationId || await ensureDefaultOrg(prisma)
      const lead = await prisma.lead.create({
        data: {
          firstName: body.firstName,
          lastName: body.lastName,
          email: body.email,
          phone: body.phone,
          whatsapp: body.whatsapp,
          company: body.company,
          jobTitle: body.jobTitle,
          source: body.source || 'manual',
          temperature: body.temperature || 'warm',
          courseInterest: body.courseInterest,
          languageLevel: body.languageLevel,
          notes: body.notes,
          city: body.city,
          state: body.state,
          stageId: body.stageId,
          consultantId: body.consultantId,
          organizationId: orgId,
          createdById: body.createdById,
        },
        include: {
          consultant: { select: { id: true, name: true, avatar: true } },
          stage: { select: { id: true, name: true, color: true } },
          tags: { include: { tag: true } },
        },
      })

      if (body.tags && Array.isArray(body.tags) && body.tags.length > 0) {
        for (const tagName of body.tags) {
          let tag = await prisma.tag.findFirst({
            where: { name: tagName, organizationId: orgId },
          })
          if (!tag) {
            tag = await prisma.tag.create({
              data: { name: tagName, organizationId: orgId },
            })
          }
          await prisma.leadTag.create({
            data: { leadId: lead.id, tagId: tag.id },
          })
        }
      }

      return NextResponse.json(lead, { status: 201 })
    }
  } catch (error) {
    console.error('POST /api/leads DB error:', error)
  }

  const fakeLead = {
    id: `lead_${Date.now()}`,
    ...body,
    status: 'new',
    score: 0,
    country: 'Brasil',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    consultant: null,
    stage: null,
    tags: (body.tags || []).map((t: string) => ({ tag: { name: t } })),
  }
  memoryLeads.unshift(fakeLead)
  return NextResponse.json(fakeLead, { status: 201 })
}
