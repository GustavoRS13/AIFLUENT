import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { requireAuth, checkRateLimit } from '@/lib/api-auth'

async function getPrisma() {
  try {
    const { prisma } = await import('@/lib/prisma')
    return prisma
  } catch {
    return null
  }
}

const createUserSchema = z.object({
  name: z.string().min(1, 'Nome obrigatorio'),
  email: z.string().email('Email invalido'),
  password: z.string().min(6, 'Senha deve ter no minimo 6 caracteres'),
  role: z.enum(['admin', 'gestor', 'operador']).default('operador'),
  phone: z.string().optional(),
  organizationId: z.string().optional(),
})

export async function GET(request: NextRequest) {
  const rateLimited = checkRateLimit(request)
  if (rateLimited) return rateLimited

  const { error, session } = await requireAuth('admin')
  if (error) return error

  const prisma = await getPrisma()
  if (!prisma) {
    return NextResponse.json({ error: 'Banco de dados indisponivel' }, { status: 503 })
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        organization: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ users, total: users.length, requestedBy: session?.user?.email })
  } catch (err) {
    console.error('GET /api/users error:', err)
    return NextResponse.json({ error: 'Erro ao buscar usuarios' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const rateLimited = checkRateLimit(request)
  if (rateLimited) return rateLimited

  const { error: authError } = await requireAuth('admin')
  if (authError) return authError

  const prisma = await getPrisma()
  if (!prisma) {
    return NextResponse.json({ error: 'Banco de dados indisponivel' }, { status: 503 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalido' }, { status: 400 })
  }

  const parsed = createUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados invalidos', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const data = parsed.data

  try {
    // Check if email already exists
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    })
    if (existing) {
      return NextResponse.json({ error: 'Email ja cadastrado' }, { status: 409 })
    }

    // Find or create default organization
    let orgId = data.organizationId
    if (!orgId) {
      const org = await prisma.organization.findFirst()
      if (org) {
        orgId = org.id
      } else {
        const newOrg = await prisma.organization.create({
          data: { name: 'AIFLUENT', slug: 'aifluent' },
        })
        orgId = newOrg.id
      }
    }

    const passwordHash = await bcrypt.hash(data.password, 10)

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        passwordHash,
        role: data.role,
        phone: data.phone,
        organizationId: orgId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        isActive: true,
        createdAt: true,
      },
    })

    return NextResponse.json(user, { status: 201 })
  } catch (err) {
    console.error('POST /api/users error:', err)
    return NextResponse.json({ error: 'Erro ao criar usuario' }, { status: 500 })
  }
}
