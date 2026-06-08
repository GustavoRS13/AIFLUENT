const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

interface AIContext {
  leadName: string
  temperature: string
  score: number | null
  stage: string
  daysSinceContact: number
  dealValue: number
  noteCount: number
  lastNote: string | null
  courseInterest: string | null
  recentActivities: string[]
}

interface AIResponse {
  suggestion: string
  action: string
  probability: number
  risk: string
  riskLevel: 'low' | 'medium' | 'high'
  suggestedReply: string
  summary: string
  scoreExplanation: { factor: string; points: number; reason: string }[]
}

export async function getAIInsights(context: AIContext): Promise<AIResponse> {
  if (ANTHROPIC_API_KEY) {
    try {
      return await callClaude(context)
    } catch {
      return generateRuleBased(context)
    }
  }
  return generateRuleBased(context)
}

async function callClaude(ctx: AIContext): Promise<AIResponse> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY })

  const systemPrompt = `Voce e um copiloto comercial de CRM para escolas de idiomas. Analise o lead e responda em JSON.

Regras:
- Sempre responda em portugues do Brasil
- Seja direto e acionavel
- probability deve ser 0-100
- riskLevel deve ser "low", "medium" ou "high"
- scoreExplanation deve ter 3-5 fatores com pontos positivos ou negativos
- suggestedReply deve ser uma mensagem WhatsApp profissional e personalizada
- summary deve ter no maximo 2 frases`

  const userPrompt = `Lead: ${ctx.leadName}
Temperatura: ${ctx.temperature}
Score atual: ${ctx.score || 'nao calculado'}
Estagio: ${ctx.stage}
Dias sem contato: ${ctx.daysSinceContact}
Valor do negocio: R$${ctx.dealValue}
Notas: ${ctx.noteCount}
Ultima nota: ${ctx.lastNote || 'nenhuma'}
Curso de interesse: ${ctx.courseInterest || 'nao informado'}
Atividades recentes: ${ctx.recentActivities.join('; ') || 'nenhuma'}

Responda com JSON contendo: suggestion, action, probability, risk, riskLevel, suggestedReply, summary, scoreExplanation`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  // Extract JSON from response (may be wrapped in markdown code block)
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]) as AIResponse
  }
  throw new Error('Failed to parse Claude response')
}

function generateRuleBased(ctx: AIContext): AIResponse {
  // Score explanation
  const scoreExplanation: { factor: string; points: number; reason: string }[] = []
  let totalScore = 0

  // Temperature
  if (ctx.temperature === 'hot') { scoreExplanation.push({ factor: 'Temperatura', points: 25, reason: 'Lead quente — demonstrou interesse ativo' }); totalScore += 25 }
  else if (ctx.temperature === 'warm') { scoreExplanation.push({ factor: 'Temperatura', points: 15, reason: 'Lead morno — interesse parcial' }); totalScore += 15 }
  else { scoreExplanation.push({ factor: 'Temperatura', points: 5, reason: 'Lead frio — sem sinais claros' }); totalScore += 5 }

  // Recency
  if (ctx.daysSinceContact <= 1) { scoreExplanation.push({ factor: 'Ultimo contato', points: 20, reason: 'Contato nas ultimas 24h' }); totalScore += 20 }
  else if (ctx.daysSinceContact <= 3) { scoreExplanation.push({ factor: 'Ultimo contato', points: 10, reason: `Contato ha ${ctx.daysSinceContact} dias` }); totalScore += 10 }
  else { scoreExplanation.push({ factor: 'Ultimo contato', points: -10, reason: `Sem contato ha ${ctx.daysSinceContact} dias` }); totalScore -= 10 }

  // Deal value
  if (ctx.dealValue > 0) { scoreExplanation.push({ factor: 'Negocio vinculado', points: 15, reason: `Valor: R$${ctx.dealValue.toLocaleString('pt-BR')}` }); totalScore += 15 }
  else { scoreExplanation.push({ factor: 'Sem negocio', points: -5, reason: 'Nenhum negocio vinculado' }); totalScore -= 5 }

  // Notes
  if (ctx.noteCount >= 3) { scoreExplanation.push({ factor: 'Engajamento', points: 15, reason: `${ctx.noteCount} notas registradas — acompanhamento ativo` }); totalScore += 15 }
  else if (ctx.noteCount > 0) { scoreExplanation.push({ factor: 'Engajamento', points: 5, reason: `${ctx.noteCount} nota(s) registrada(s)` }); totalScore += 5 }

  // Course interest
  if (ctx.courseInterest) { scoreExplanation.push({ factor: 'Interesse definido', points: 10, reason: `Interesse em: ${ctx.courseInterest}` }); totalScore += 10 }

  const probability = Math.max(0, Math.min(100, totalScore))

  // Risk assessment
  let risk = ''
  let riskLevel: 'low' | 'medium' | 'high' = 'low'
  if (ctx.daysSinceContact > 7 && ctx.temperature !== 'hot') {
    risk = `${ctx.leadName} esta sem contato ha ${ctx.daysSinceContact} dias e pode estar considerando concorrentes.`
    riskLevel = 'high'
  } else if (ctx.daysSinceContact > 3) {
    risk = `Atencao: ${ctx.daysSinceContact} dias sem interacao. Recomendo follow-up.`
    riskLevel = 'medium'
  } else {
    risk = 'Sem riscos identificados no momento.'
    riskLevel = 'low'
  }

  // Suggestion
  let suggestion = ''
  let action = 'monitor'
  if (ctx.temperature === 'hot' && probability > 60) {
    suggestion = `${ctx.leadName} tem ${probability}% de probabilidade de conversao. Recomendo mover para a proxima etapa e enviar proposta.`
    action = 'move_and_propose'
  } else if (ctx.daysSinceContact > 3 && ctx.temperature !== 'cold') {
    suggestion = `${ctx.leadName} esta sem contato ha ${ctx.daysSinceContact} dias. Crie um follow-up para reengajar.`
    action = 'create_followup'
  } else if (ctx.temperature === 'cold') {
    suggestion = `${ctx.leadName} esta frio. Considere uma abordagem de reativacao com oferta especial.`
    action = 'reactivate'
  } else if (ctx.dealValue === 0 && ctx.temperature !== 'cold') {
    suggestion = `${ctx.leadName} ainda nao tem negocio. Crie um para acompanhar o valor.`
    action = 'create_deal'
  } else {
    suggestion = `${ctx.leadName} esta no estagio ${ctx.stage}. Continue acompanhando normalmente.`
  }

  // Suggested reply
  const course = ctx.courseInterest || 'nossos cursos'
  let suggestedReply = ''
  if (action === 'move_and_propose') {
    suggestedReply = `Ola ${ctx.leadName}! Preparei uma proposta especial de ${course} para voce. Posso te enviar os detalhes?`
  } else if (action === 'create_followup') {
    suggestedReply = `Oi ${ctx.leadName}, tudo bem? Vi que conversamos recentemente sobre ${course}. Tem alguma duvida que posso esclarecer?`
  } else if (action === 'reactivate') {
    suggestedReply = `${ctx.leadName}, temos novidades em ${course}! Gostaria de saber mais sobre as condicoes especiais deste mes?`
  } else {
    suggestedReply = `Ola ${ctx.leadName}! Como posso te ajudar hoje com ${course}?`
  }

  // Summary
  const summary = `${ctx.leadName} — ${ctx.temperature === 'hot' ? 'Lead quente' : ctx.temperature === 'warm' ? 'Lead morno' : 'Lead frio'}, estagio ${ctx.stage}, ${probability}% de probabilidade. ${ctx.daysSinceContact > 3 ? `Sem contato ha ${ctx.daysSinceContact} dias.` : 'Contato recente.'}`

  return { suggestion, action, probability, risk, riskLevel, suggestedReply, summary, scoreExplanation }
}

export { type AIContext, type AIResponse }
