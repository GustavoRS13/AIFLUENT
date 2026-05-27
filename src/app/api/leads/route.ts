import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'


export async function GET(request: NextRequest) {
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
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  const lead = await prisma.lead.create({
    data: {
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone,
      whatsapp: body.whatsapp,
      source: body.source || 'manual',
      temperature: body.temperature || 'warm',
      courseInterest: body.courseInterest,
      notes: body.notes,
      city: body.city,
      state: body.state,
      stageId: body.stageId,
      consultantId: body.consultantId,
      organizationId: body.organizationId,
      createdById: body.createdById,
    },
    include: {
      consultant: { select: { id: true, name: true, avatar: true } },
      stage: { select: { id: true, name: true, color: true } },
      tags: { include: { tag: true } },
    },
  })

  return NextResponse.json(lead, { status: 201 })
}
