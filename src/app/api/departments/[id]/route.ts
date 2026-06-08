import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth, checkRateLimit, requireOrgId } from '@/lib/api-auth'
import { apiLimiter } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

const updateDepartmentSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.string().optional(),
  color: z.string().optional(),
  description: z.string().optional(),
})

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rl = checkRateLimit(request, apiLimiter)
  if (rl) return rl
  const { error, session } = await requireAuth('admin')
  if (error) return error
  const { id } = await params
  const { orgId, error: orgError } = requireOrgId(session)
  if (orgError) return orgError

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalido' }, { status: 400 })
  }

  const parsed = updateDepartmentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados invalidos', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  try {
    const { prisma } = await import('@/lib/prisma')

    const existing = await prisma.team.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Departamento nao encontrado' }, { status: 404 })
    if (existing.organizationId !== orgId) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const data: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(parsed.data)) {
      if (value !== undefined) data[key] = value
    }

    const updated = await prisma.team.update({
      where: { id },
      data,
      include: {
        _count: { select: { members: true, leads: true, conversations: true } },
      },
    })

    logger.info('Department updated', { departmentId: id, changes: Object.keys(parsed.data) })
    return NextResponse.json(updated)
  } catch (err) {
    logger.error('PATCH /api/departments/[id] error', err)
    return NextResponse.json({ error: 'Falha ao atualizar departamento' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rl = checkRateLimit(request, apiLimiter)
  if (rl) return rl
  const { error, session } = await requireAuth('admin')
  if (error) return error
  const { id } = await params
  const { orgId, error: orgError } = requireOrgId(session)
  if (orgError) return orgError

  try {
    const { prisma } = await import('@/lib/prisma')

    const existing = await prisma.team.findUnique({
      where: { id },
      include: {
        _count: { select: { members: true, leads: true } },
      },
    })
    if (!existing) return NextResponse.json({ error: 'Departamento nao encontrado' }, { status: 404 })
    if (existing.organizationId !== orgId) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    if (existing._count.leads > 0 || existing._count.members > 0) {
      return NextResponse.json(
        { error: 'Nao e possivel excluir departamento com leads ou membros associados' },
        { status: 409 },
      )
    }

    await prisma.team.delete({ where: { id } })

    logger.info('Department deleted', { departmentId: id })
    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('DELETE /api/departments/[id] error', err)
    return NextResponse.json({ error: 'Falha ao excluir departamento' }, { status: 500 })
  }
}
