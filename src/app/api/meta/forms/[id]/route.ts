import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth, checkRateLimit, requireOrgId } from '@/lib/api-auth'
import { apiLimiter } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

const schema = z.object({ isLinked: z.boolean() })

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = checkRateLimit(request, apiLimiter)
  if (rl) return rl
  const { error, session } = await requireAuth('gestor')
  if (error) return error
  const { orgId, error: orgError } = requireOrgId(session)
  if (orgError) return orgError
  const { id } = await params

  try {
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados invalidos' }, { status: 400 })
    }
    const { prisma } = await import('@/lib/prisma')
    const form = await prisma.metaLeadForm.findUnique({ where: { id } })
    if (!form || form.organizationId !== orgId) {
      return NextResponse.json(
        { error: 'Formulario nao encontrado' },
        { status: 404 },
      )
    }
    const updated = await prisma.metaLeadForm.update({
      where: { id },
      data: { isLinked: parsed.data.isLinked },
    })
    return NextResponse.json({ id: updated.id, isLinked: updated.isLinked })
  } catch (err) {
    logger.error('PATCH /api/meta/forms/[id] error', err)
    return NextResponse.json({ error: 'Falha ao vincular' }, { status: 500 })
  }
}
