import { NextRequest, NextResponse } from 'next/server'

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
  const body = await request.json()
  const { action, channel, context } = body

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

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
