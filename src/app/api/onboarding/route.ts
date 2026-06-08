import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, checkRateLimit, requireOrgId } from '@/lib/api-auth'
import { apiLimiter } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const onboardingSchema = z.object({
  companyName: z.string().min(1),
  segment: z.string(),
  createDemoData: z.boolean().default(false),
  customStages: z.array(z.string()).optional(),
  manualLeads: z
    .array(
      z.object({
        firstName: z.string().min(1),
        phone: z.string().optional(),
        source: z.string().optional(),
      }),
    )
    .optional(),
})

// Garante que todo lead criado no onboarding receba ao menos 1 tag (pela origem)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureLeadTag(prisma: any, leadId: string, orgId: string, source: string) {
  const name = (source || 'manual').trim() || 'manual'
  let tag = await prisma.tag.findFirst({ where: { name, organizationId: orgId } })
  if (!tag) tag = await prisma.tag.create({ data: { name, organizationId: orgId } })
  await prisma.leadTag.create({ data: { leadId, tagId: tag.id } })
}

export async function POST(request: NextRequest) {
  const rl = checkRateLimit(request, apiLimiter)
  if (rl) return rl
  const { error, session } = await requireAuth()
  if (error) return error

  try {
    const body = await request.json()
    const parsed = onboardingSchema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json({ error: 'Dados invalidos' }, { status: 400 })

    const { prisma } = await import('@/lib/prisma')
    const { orgId, error: orgError } = requireOrgId(session)
    if (orgError) return orgError
    const userId = (session!.user as Record<string, unknown>).id as string

    // 1. Update organization name
    if (orgId) {
      await prisma.organization.update({
        where: { id: orgId },
        data: { name: parsed.data.companyName },
      })
    }

    // 2. Create pipeline if none exists
    let pipeline = await prisma.pipeline.findFirst({
      where: orgId ? { organizationId: orgId } : {},
    })

    if (!pipeline && orgId) {
      const stages = parsed.data.customStages || [
        'Base',
        'Prospeccao',
        'Conexao',
        'Proposta',
        'Negociacao',
        'Fechamento',
      ]
      const stageColors = [
        '#6366f1',
        '#8b5cf6',
        '#06b6d4',
        '#f59e0b',
        '#f97316',
        '#10b981',
      ]

      pipeline = await prisma.pipeline.create({
        data: {
          name: 'Pipeline Principal',
          isDefault: true,
          organizationId: orgId,
          stages: {
            create: stages.map((name, i) => ({
              name,
              color: stageColors[i % stageColors.length],
              order: i,
              isWon: name === 'Fechamento',
              isLost: false,
            })),
          },
        },
        include: { stages: true },
      })
    }

    // 3. Create demo leads if requested
    let leadsCreated = 0
    if (parsed.data.createDemoData && orgId && pipeline) {
      const stages = await prisma.pipelineStage.findMany({
        where: { pipelineId: pipeline.id },
        orderBy: { order: 'asc' },
      })

      const demoLeads = [
        {
          firstName: 'Ana',
          lastName: 'Silva',
          phone: '11999001001',
          email: 'ana.silva@email.com',
          source: 'whatsapp',
          temperature: 'hot',
          courseInterest: 'Ingles Business',
        },
        {
          firstName: 'Bruno',
          lastName: 'Costa',
          phone: '11999001002',
          email: 'bruno.costa@email.com',
          source: 'instagram',
          temperature: 'warm',
          courseInterest: 'Espanhol Conversacao',
        },
        {
          firstName: 'Carla',
          lastName: 'Santos',
          phone: '11999001003',
          email: 'carla@empresa.com',
          source: 'google',
          temperature: 'hot',
          courseInterest: 'Ingles Preparatorio',
        },
        {
          firstName: 'Diego',
          lastName: 'Lima',
          phone: '11999001004',
          email: 'diego.lima@email.com',
          source: 'meta_ads',
          temperature: 'warm',
          courseInterest: 'Ingles Business',
        },
        {
          firstName: 'Elena',
          lastName: 'Ferreira',
          phone: '11999001005',
          email: 'elena@empresa.com',
          source: 'referral',
          temperature: 'cold',
          courseInterest: 'Espanhol Business',
        },
        {
          firstName: 'Fernando',
          lastName: 'Alves',
          phone: '11999001006',
          source: 'whatsapp',
          temperature: 'hot',
          courseInterest: 'Ingles Conversacao',
        },
        {
          firstName: 'Gabriela',
          lastName: 'Nunes',
          phone: '11999001007',
          email: 'gabi@email.com',
          source: 'website',
          temperature: 'warm',
          courseInterest: 'Ingles Kids',
        },
        {
          firstName: 'Hugo',
          lastName: 'Rocha',
          phone: '11999001008',
          source: 'meta_ads',
          temperature: 'warm',
          courseInterest: 'Espanhol Intensivo',
        },
        {
          firstName: 'Isabella',
          lastName: 'Martins',
          phone: '11999001009',
          email: 'isa@empresa.com',
          source: 'google',
          temperature: 'hot',
          courseInterest: 'Ingles Business',
        },
        {
          firstName: 'Joao',
          lastName: 'Pedro',
          phone: '11999001010',
          source: 'referral',
          temperature: 'cold',
          courseInterest: 'Espanhol Conversacao',
        },
      ]

      for (let i = 0; i < demoLeads.length; i++) {
        const lead = demoLeads[i]
        // Distribute across non-terminal stages
        const safeStages = stages.filter((s) => !s.isWon && !s.isLost)
        const stageIdx = i % Math.max(safeStages.length, 1)
        const created = await prisma.lead.create({
          data: {
            firstName: lead.firstName,
            lastName: lead.lastName,
            phone: lead.phone,
            email: lead.email,
            source: lead.source,
            temperature: lead.temperature,
            courseInterest: lead.courseInterest,
            stageId: safeStages[stageIdx]?.id ?? stages[0]?.id,
            organizationId: orgId,
            createdById: userId,
          },
        })
        await ensureLeadTag(prisma, created.id, orgId, lead.source)
        leadsCreated++
      }
    }

    // 4. Create manual leads if provided
    if (parsed.data.manualLeads?.length && orgId && pipeline) {
      const stages = await prisma.pipelineStage.findMany({
        where: { pipelineId: pipeline.id },
        orderBy: { order: 'asc' },
      })
      const firstStage = stages[0]

      for (const lead of parsed.data.manualLeads) {
        const created = await prisma.lead.create({
          data: {
            firstName: lead.firstName,
            phone: lead.phone,
            source: lead.source || 'manual',
            stageId: firstStage?.id,
            organizationId: orgId,
            createdById: userId,
          },
        })
        await ensureLeadTag(prisma, created.id, orgId, lead.source || 'manual')
        leadsCreated++
      }
    }

    const stageCount = pipeline
      ? await prisma.pipelineStage.count({ where: { pipelineId: pipeline.id } })
      : 0

    logger.info('Onboarding completed', { orgId, leadsCreated })
    return NextResponse.json({
      success: true,
      pipeline: pipeline?.name,
      stages: stageCount,
      leadsCreated,
    })
  } catch (err) {
    logger.error('Onboarding error', err)
    return NextResponse.json(
      { error: 'Falha no onboarding' },
      { status: 500 },
    )
  }
}
