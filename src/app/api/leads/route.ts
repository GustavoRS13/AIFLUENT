import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth, checkRateLimit } from '@/lib/api-auth'

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

const createLeadSchema = z.object({
  firstName: z.string().min(1, 'Nome obrigatorio'),
  lastName: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  source: z.string().default('manual'),
  temperature: z.enum(['cold', 'warm', 'hot']).default('warm'),
  courseInterest: z.string().optional(),
  languageLevel: z.string().optional(),
  notes: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  tags: z.array(z.string()).optional(),
  organizationId: z.string().optional(),
  stageId: z.string().optional(),
  consultantId: z.string().optional(),
  createdById: z.string().optional(),
})

export async function GET(request: NextRequest) {
  const rateLimited = checkRateLimit(request)
  if (rateLimited) return rateLimited

  const { error } = await requireAuth()
  if (error) return error

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
  const rateLimited = checkRateLimit(request)
  if (rateLimited) return rateLimited

  const { error: authError } = await requireAuth('gestor')
  if (authError) return authError

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalido' }, { status: 400 })
  }

  const parsed = createLeadSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados invalidos', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const data = parsed.data

  try {
    const prisma = await getPrisma()
    if (prisma) {
      const orgId = data.organizationId || await ensureDefaultOrg(prisma)
      const lead = await prisma.lead.create({
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          whatsapp: data.whatsapp,
          company: data.company,
          jobTitle: data.jobTitle,
          source: data.source,
          temperature: data.temperature,
          courseInterest: data.courseInterest,
          languageLevel: data.languageLevel,
          notes: data.notes,
          city: data.city,
          state: data.state,
          stageId: data.stageId,
          consultantId: data.consultantId,
          organizationId: orgId,
          createdById: data.createdById,
        },
        include: {
          consultant: { select: { id: true, name: true, avatar: true } },
          stage: { select: { id: true, name: true, color: true } },
          tags: { include: { tag: true } },
        },
      })

      if (data.tags && data.tags.length > 0) {
        for (const tagName of data.tags) {
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

      // Audit log
      try {
        await prisma.auditLog.create({
          data: {
            action: 'lead_created',
            entity: 'Lead',
            entityId: lead.id,
            details: JSON.stringify({ firstName: lead.firstName, source: lead.source }),
            organizationId: orgId,
          },
        })
      } catch {} // Don't fail if audit fails

      return NextResponse.json(lead, { status: 201 })
    }
  } catch (error) {
    console.error('POST /api/leads DB error:', error)
  }

  const fakeLead = {
    id: `lead_${Date.now()}`,
    ...data,
    status: 'new',
    score: 0,
    country: 'Brasil',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    consultant: null,
    stage: null,
    tags: (data.tags || []).map((t: string) => ({ tag: { name: t } })),
  }
  memoryLeads.unshift(fakeLead)
  return NextResponse.json(fakeLead, { status: 201 })
}
