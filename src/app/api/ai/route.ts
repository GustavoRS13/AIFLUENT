import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth, checkRateLimit } from '@/lib/api-auth'
import { aiLimiter } from '@/lib/rate-limit'

const aiRequestSchema = z.object({
  action: z.enum([
    'generate-campaign-message', 'score-lead', 'suggest-follow-up',
    'suggest-next-step', 'summarize-conversation', 'estimate-probability',
    'detect-risk', 'generate-response', 'full-analysis',
  ], {
    message: 'action invalida',
  }),
  channel: z.string().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
})

const campaignTemplates: Record<string, string[]> = {
  whatsapp: [
    'Olá {{nome}}! 👋 Aqui é a equipe AIFLUENT. Temos uma oportunidade incrível para você iniciar seus estudos de {{curso}}. Quer saber mais?',
    '🎓 {{nome}}, que tal dar o próximo passo na sua carreira? Nosso curso de {{curso}} está com condições especiais! Posso te contar mais?',
    'Oi {{nome}}! Vi que você tem interesse em {{curso}}. Temos vagas limitadas com desconto exclusivo. Vamos conversar? 🚀',
    '{{nome}}, sua jornada bilíngue começa aqui! 🌎 Curso de {{curso}} com metodologia exclusiva. Quer agendar uma aula experimental gratuita?',
  ],
  email: [
    'Assunto: {{nome}}, sua oportunidade de aprender {{curso}} chegou!\n\nOlá {{nome}},\n\nSabemos que aprender um novo idioma é um dos melhores investimentos. Por isso, preparamos uma condição especial para você.\n\nNosso curso de {{curso}} oferece:\n✅ Aulas ao vivo com professores nativos\n✅ Material didático incluso\n✅ Certificado internacional\n\nAgende sua aula experimental gratuita!\n\nAtenciosamente,\nEquipe AIFLUENT',
  ],
  sms: [
    'AIFLUENT: {{nome}}, vagas limitadas para {{curso}}! Desconto de 30% na matrícula. Responda SIM para saber mais.',
    'AIFLUENT: Oi {{nome}}! Sua aula experimental de {{curso}} está disponível. Agende grátis: link',
  ],
}

export async function POST(request: NextRequest) {
  const rateLimited = checkRateLimit(request, aiLimiter)
  if (rateLimited) return rateLimited

  const { error: authError } = await requireAuth()
  if (authError) return authError

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalido' }, { status: 400 })
  }

  const parsed = aiRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados invalidos', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const { action, channel } = parsed.data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const context = parsed.data.context as Record<string, any> | undefined

  if (action === 'generate-campaign-message') {
    const templates = campaignTemplates[channel || 'whatsapp'] || campaignTemplates.whatsapp
    const template = templates[Math.floor(Math.random() * templates.length)]
    const message = template
      .replace(/\{\{nome\}\}/g, context?.name || '{{nome}}')
      .replace(/\{\{curso\}\}/g, context?.course || '{{curso}}')

    return NextResponse.json({
      message,
      suggestions: [
        'Adicionar emoji de urgência',
        'Incluir link de agendamento',
        'Personalizar com nome do consultor',
        'Adicionar oferta com prazo',
      ],
    })
  }

  if (action === 'score-lead') {
    const factors = {
      sourceScore: { instagram: 7, facebook: 6, google: 8, whatsapp: 9, referral: 9, website: 5, event: 7, manual: 3, import: 2 },
      temperatureScore: { hot: 9, warm: 6, cold: 2 },
      activityBonus: Math.min((context?.activityCount || 0) * 0.5, 3),
      recencyBonus: context?.daysSinceLastContact ? Math.max(0, 3 - context.daysSinceLastContact * 0.1) : 0,
    }

    const base = (factors.sourceScore[context?.source as keyof typeof factors.sourceScore] || 5)
    const temp = (factors.temperatureScore[context?.temperature as keyof typeof factors.temperatureScore] || 5)
    const score = Math.min(10, (base + temp + factors.activityBonus + factors.recencyBonus) / 3)

    return NextResponse.json({
      score: Math.round(score * 10) / 10,
      factors: {
        source: `Origem ${context?.source}: ${base}/10`,
        temperature: `Temperatura ${context?.temperature}: ${temp}/10`,
        activity: `Engajamento: +${factors.activityBonus.toFixed(1)}`,
        recency: `Recência: +${factors.recencyBonus.toFixed(1)}`,
      },
      recommendation: score >= 7 ? 'Lead quente — priorizar contato imediato' :
                       score >= 4 ? 'Lead morno — manter na sequência de follow-up' :
                       'Lead frio — incluir em campanha de reativação',
    })
  }

  if (action === 'suggest-follow-up') {
    const suggestions = [
      { time: '2h', message: 'Enviar mensagem de agradecimento pelo interesse' },
      { time: '24h', message: 'Compartilhar material sobre o curso de interesse' },
      { time: '3d', message: 'Oferecer aula experimental gratuita' },
      { time: '7d', message: 'Enviar depoimento de aluno com perfil similar' },
      { time: '14d', message: 'Apresentar condição especial com prazo' },
    ]

    return NextResponse.json({ suggestions })
  }

  // ── Contextual AI actions (rule-based, using real lead data) ──────────────

  if (action === 'suggest-next-step') {
    const { prisma } = await import('@/lib/prisma')
    const lead = await prisma.lead.findUnique({
      where: { id: context?.leadId as string },
      include: {
        stage: true,
        deals: true,
        activities: { take: 10, orderBy: { createdAt: 'desc' } },
      },
    })
    if (!lead) return NextResponse.json({ suggestion: 'Lead nao encontrado' })

    const daysSinceContact = lead.lastContactAt
      ? Math.floor((Date.now() - new Date(lead.lastContactAt).getTime()) / 86400000)
      : 999
    const hasDeals = lead.deals.length > 0
    const dealValue = lead.deals.reduce((sum, d) => sum + (d.value || 0), 0)
    const recentNotes = lead.activities.filter(a => a.type === 'note').length
    const hasOpenDeal = lead.deals.some(d => d.status === 'open')

    let suggestion = ''
    let nextAction = ''

    if (lead.temperature === 'hot' && (lead.aiScore ?? 0) > 70) {
      suggestion = `${lead.firstName} tem score ${lead.aiScore}% e temperatura quente.`
      if (hasOpenDeal && dealValue > 0) {
        suggestion += ` Negocio aberto de R$${dealValue.toLocaleString('pt-BR')}. Recomendo enviar proposta comercial agora.`
      } else {
        suggestion += ` Recomendo mover para a proxima etapa e enviar proposta comercial.`
      }
      nextAction = 'move_stage'
    } else if (daysSinceContact > 3 && lead.temperature !== 'cold') {
      suggestion = `${lead.firstName} esta sem contato ha ${daysSinceContact} dias.`
      if (recentNotes > 0) {
        suggestion += ` Ha ${recentNotes} notas recentes. Recomendo retomar o contato com base nas anotacoes.`
      } else {
        suggestion += ` Recomendo criar um follow-up urgente.`
      }
      nextAction = 'create_followup'
    } else if (lead.temperature === 'cold' && daysSinceContact > 7) {
      suggestion = `${lead.firstName} esta frio e sem contato ha ${daysSinceContact} dias. Considere uma campanha de reativacao ou remover do pipeline.`
      nextAction = 'reactivate_or_remove'
    } else if (!hasDeals && lead.temperature !== 'cold') {
      suggestion = `${lead.firstName} ainda nao tem negocio vinculado. Recomendo criar um negocio para acompanhar o valor.`
      nextAction = 'create_deal'
    } else {
      suggestion = `${lead.firstName} esta no estagio ${lead.stage?.name || 'indefinido'}.`
      if (hasOpenDeal) {
        suggestion += ` Negocio em andamento (R$${dealValue.toLocaleString('pt-BR')}). Acompanhe normalmente.`
      } else {
        suggestion += ` Acompanhe normalmente.`
      }
      nextAction = 'monitor'
    }

    return NextResponse.json({
      suggestion,
      action: nextAction,
      leadData: { score: lead.aiScore, temperature: lead.temperature, daysSinceContact, stage: lead.stage?.name, dealValue, recentNotes },
    })
  }

  if (action === 'summarize-conversation') {
    const { prisma } = await import('@/lib/prisma')
    const lead = await prisma.lead.findUnique({
      where: { id: context?.leadId as string },
      include: {
        stage: true,
        activities: { take: 10, orderBy: { createdAt: 'desc' } },
        deals: true,
      },
    })
    if (!lead) return NextResponse.json({ summary: 'Sem dados disponiveis' })

    const noteCount = lead.activities.filter(a => a.type === 'note').length
    const stageChanges = lead.activities.filter(a => a.type === 'stage_change').length
    const callCount = lead.activities.filter(a => a.type === 'call').length
    const lastNote = lead.activities.find(a => a.type === 'note')
    const dealValue = lead.deals.reduce((sum, d) => sum + (d.value || 0), 0)
    const totalActivities = lead.activities.length

    let summary = `${lead.firstName} ${lead.lastName || ''} — ${lead.temperature === 'hot' ? 'Lead quente' : lead.temperature === 'warm' ? 'Lead morno' : 'Lead frio'}`
    summary += `, estagio ${lead.stage?.name || 'inicial'}`
    if (dealValue > 0) summary += `, valor total R$${dealValue.toLocaleString('pt-BR')}`
    summary += `. ${noteCount} notas, ${stageChanges} mudancas de estagio.`
    if (callCount > 0) summary += ` ${callCount} ligacoes.`
    if (lastNote?.description) summary += ` Ultima nota: "${lastNote.description.substring(0, 80)}${lastNote.description.length > 80 ? '...' : ''}"`

    return NextResponse.json({
      summary,
      details: { noteCount, callCount, stageChanges, totalActivities, stage: lead.stage?.name, temperature: lead.temperature, dealValue },
    })
  }

  if (action === 'estimate-probability') {
    const { prisma } = await import('@/lib/prisma')
    const lead = await prisma.lead.findUnique({
      where: { id: context?.leadId as string },
      include: { stage: true, deals: true, activities: { take: 20, orderBy: { createdAt: 'desc' } } },
    })
    if (!lead) return NextResponse.json({ probability: 0, factors: {} })

    let probability = 30 // base
    const factors: Record<string, string> = {}

    // Temperature factor
    if (lead.temperature === 'hot') { probability += 25; factors.temperature = 'Quente: +25%' }
    else if (lead.temperature === 'warm') { probability += 10; factors.temperature = 'Morno: +10%' }
    else { probability -= 10; factors.temperature = 'Frio: -10%' }

    // Score factor
    if (lead.aiScore && lead.aiScore > 70) { probability += 15; factors.score = `Score ${lead.aiScore}%: +15%` }
    else if (lead.aiScore && lead.aiScore > 40) { probability += 5; factors.score = `Score ${lead.aiScore}%: +5%` }
    else { factors.score = `Score ${lead.aiScore ?? 0}%: +0%` }

    // Activity factor
    const actCount = lead.activities.length
    if (actCount >= 10) { probability += 10; factors.engagement = `${actCount} atividades: +10%` }
    else if (actCount >= 5) { probability += 5; factors.engagement = `${actCount} atividades: +5%` }
    else { factors.engagement = `${actCount} atividades: +0%` }

    // Stage position factor
    const stageNames = ['Base', 'Prospeccao', 'Conexao', 'Proposta', 'Negociacao', 'Fechamento']
    const stageIdx = stageNames.findIndex(s => lead.stage?.name?.toLowerCase().includes(s.toLowerCase()))
    if (stageIdx >= 3) { probability += 15; factors.stage = `${lead.stage?.name}: +15%` }
    else if (stageIdx >= 1) { probability += 5; factors.stage = `${lead.stage?.name}: +5%` }
    else { factors.stage = `${lead.stage?.name || 'Inicio'}: +0%` }

    // Deal factor
    if (lead.deals.some(d => d.status === 'open')) { probability += 5; factors.deal = 'Negocio aberto: +5%' }

    probability = Math.max(0, Math.min(100, probability))

    return NextResponse.json({ probability, factors, recommendation: probability >= 70 ? 'Alta chance — priorizar' : probability >= 40 ? 'Chance moderada — nutrir' : 'Baixa chance — reavaliar' })
  }

  if (action === 'detect-risk') {
    const { prisma } = await import('@/lib/prisma')
    const lead = await prisma.lead.findUnique({
      where: { id: context?.leadId as string },
      include: { stage: true, deals: true, activities: { take: 10, orderBy: { createdAt: 'desc' } } },
    })
    if (!lead) return NextResponse.json({ risks: [], level: 'unknown' })

    const risks: Array<{ signal: string; severity: 'low' | 'medium' | 'high' }> = []
    const daysSinceContact = lead.lastContactAt
      ? Math.floor((Date.now() - new Date(lead.lastContactAt).getTime()) / 86400000)
      : 999

    if (lead.temperature === 'cold') risks.push({ signal: 'Temperatura fria — lead pode estar desinteressado', severity: 'high' })
    if (daysSinceContact > 7) risks.push({ signal: `Sem contato ha ${daysSinceContact} dias`, severity: daysSinceContact > 14 ? 'high' : 'medium' })
    if (lead.deals.some(d => d.status === 'lost')) risks.push({ signal: 'Negocio anterior perdido', severity: 'medium' })
    if ((lead.aiScore ?? 0) < 30) risks.push({ signal: `Score muito baixo (${lead.aiScore ?? 0}%)`, severity: 'medium' })
    if (lead.activities.length === 0) risks.push({ signal: 'Nenhuma atividade recente registrada', severity: 'low' })
    if (lead.lostReason) risks.push({ signal: `Motivo de perda anterior: ${lead.lostReason}`, severity: 'high' })

    const level = risks.some(r => r.severity === 'high') ? 'high' : risks.some(r => r.severity === 'medium') ? 'medium' : risks.length > 0 ? 'low' : 'none'

    return NextResponse.json({ risks, level, totalRisks: risks.length })
  }

  if (action === 'full-analysis') {
    const { prisma } = await import('@/lib/prisma')
    const { getAIInsights } = await import('@/lib/ai-service')

    const lead = await prisma.lead.findUnique({
      where: { id: context?.leadId as string },
      include: { stage: true, deals: true, activities: { take: 10, orderBy: { createdAt: 'desc' } } },
    })
    if (!lead) return NextResponse.json({ error: 'Lead nao encontrado' }, { status: 404 })

    const daysSinceContact = lead.lastContactAt
      ? Math.floor((Date.now() - new Date(lead.lastContactAt).getTime()) / 86400000)
      : 999

    const insights = await getAIInsights({
      leadName: `${lead.firstName} ${lead.lastName || ''}`.trim(),
      temperature: lead.temperature,
      score: lead.aiScore,
      stage: lead.stage?.name || 'Base',
      daysSinceContact,
      dealValue: lead.deals.reduce((s, d) => s + (d.value || 0), 0),
      noteCount: lead.activities.filter(a => a.type === 'note').length,
      lastNote: lead.activities.find(a => a.type === 'note')?.description || null,
      courseInterest: lead.courseInterest,
      recentActivities: lead.activities.slice(0, 5).map(a => `${a.type}: ${a.title}`),
    })

    return NextResponse.json(insights)
  }

  if (action === 'generate-response') {
    const { prisma } = await import('@/lib/prisma')
    const lead = await prisma.lead.findUnique({
      where: { id: context?.leadId as string },
      include: {
        activities: { take: 5, orderBy: { createdAt: 'desc' } },
        deals: true,
        stage: true,
      },
    })
    if (!lead) return NextResponse.json({ response: 'Ola! Como posso ajudar?' })

    const firstName = lead.firstName
    const course = lead.courseInterest || 'nossos cursos'
    const stage = lead.stage?.name || 'inicial'

    let response = ''
    if (stage === 'Base' || stage === 'Prospeccao') {
      response = `Ola ${firstName}! Tudo bem? Vi que voce demonstrou interesse em ${course}. Posso te contar mais sobre o programa?`
    } else if (stage === 'Conexao' || stage === 'Proposta') {
      response = `${firstName}, preparei uma proposta especial para voce! Quando podemos conversar sobre os detalhes?`
    } else if (stage === 'Negociacao') {
      response = `${firstName}, estamos quase la! Posso ajudar com alguma duvida sobre a proposta?`
    } else {
      response = `Ola ${firstName}! Como posso te ajudar hoje?`
    }

    return NextResponse.json({
      response,
      context: { stage, course: lead.courseInterest, temperature: lead.temperature, score: lead.aiScore },
    })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
