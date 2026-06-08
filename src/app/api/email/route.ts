import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, checkRateLimit, requireOrgId } from '@/lib/api-auth'
import { apiLimiter } from '@/lib/rate-limit'
import { sendEmail } from '@/lib/email-service'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const sendEmailSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  html: z.string().optional(),
  text: z.string().optional(),
  leadId: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const rl = checkRateLimit(request, apiLimiter); if (rl) return rl
  const { error: authError, session } = await requireAuth('gestor'); if (authError) return authError
  const { orgId, error: orgError } = requireOrgId(session)
  if (orgError) return orgError

  try {
    const body = await request.json()
    const parsed = sendEmailSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Dados invalidos', details: parsed.error.flatten().fieldErrors }, { status: 400 })

    // Se um lead e referenciado, ele precisa pertencer a org da sessao
    if (parsed.data.leadId) {
      const { prisma } = await import('@/lib/prisma')
      const ownLead = await prisma.lead.findFirst({ where: { id: parsed.data.leadId, organizationId: orgId }, select: { id: true } })
      if (!ownLead) return NextResponse.json({ error: 'Lead nao encontrado' }, { status: 404 })
    }

    const result = await sendEmail(parsed.data)

    // Log activity if leadId provided
    if (parsed.data.leadId && 'id' in result) {
      try {
        const { prisma } = await import('@/lib/prisma')
        await prisma.activity.create({
          data: {
            type: 'email',
            title: `Email enviado: ${parsed.data.subject}`,
            description: `Para: ${parsed.data.to}`,
            leadId: parsed.data.leadId,
            userId: (session!.user as Record<string, unknown>).id as string,
          },
        })
      } catch { /* activity logging is best-effort */ }
    }

    if ('error' in result) {
      logger.error('Email send failed', result.error)
      return NextResponse.json(result, { status: 503 })
    }

    logger.info('Email sent', { to: parsed.data.to, subject: parsed.data.subject })
    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    logger.error('POST /api/email error', err)
    return NextResponse.json({ error: 'Falha ao enviar email' }, { status: 500 })
  }
}
