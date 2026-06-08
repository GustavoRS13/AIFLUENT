import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, checkRateLimit, requireOrgId } from '@/lib/api-auth'
import { aiLimiter } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const chatSchema = z.object({
  message: z.string().min(1),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional(),
})

const SYSTEM_PROMPT = `Voce e o assistente comercial IA do AIFLUENT CRM, uma plataforma de gestao de vendas para escolas de idiomas.

Seu nome e "Copiloto AIFLUENT". Voce ajuda vendedores e gestores com:
- Analise de leads e pipeline
- Sugestoes de follow-up e proximas acoes
- Duvidas sobre o CRM e funcionalidades
- Estrategias de venda e conversao
- Analise de metricas e relatorios

Regras:
- Responda sempre em portugues do Brasil
- Seja direto, profissional e amigavel
- Use dados do sistema quando disponiveis
- Sugira acoes concretas
- Mantenha respostas concisas (max 3 paragrafos)
- Se nao souber algo sobre o sistema, diga honestamente`

export async function POST(request: NextRequest) {
  const rl = checkRateLimit(request, aiLimiter)
  if (rl) return rl
  const { error, session } = await requireAuth()
  if (error) return error
  const { orgId, error: orgError } = requireOrgId(session)
  if (orgError) return orgError

  try {
    const body = await request.json()
    const parsed = chatSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Mensagem invalida' }, { status: 400 })
    }

    const { message, history } = parsed.data

    logger.info('AI Chat request', { message: message.substring(0, 100) })

    // Build conversation messages
    const conversationMessages = [
      ...(history || []).slice(-10).map(h => ({
        role: h.role as 'user' | 'assistant',
        content: h.content,
      })),
      { role: 'user' as const, content: message },
    ]

    // Try Claude API first
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (apiKey) {
      try {
        const Anthropic = (await import('@anthropic-ai/sdk')).default
        const client = new Anthropic({ apiKey })

        // Fetch system context from DB
        let systemContext = SYSTEM_PROMPT
        try {
          const { prisma } = await import('@/lib/prisma')
          const [leadCount, dealCount, taskCount] = await Promise.all([
            prisma.lead.count({ where: { organizationId: orgId } }),
            prisma.deal.count({ where: { lead: { organizationId: orgId } } }),
            prisma.task.count({ where: { status: 'pending', organizationId: orgId } }),
          ])
          systemContext += `\n\nDados atuais do sistema:\n- Total de leads: ${leadCount}\n- Total de negocios: ${dealCount}\n- Tarefas pendentes: ${taskCount}`
        } catch {}

        const response = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          system: systemContext,
          messages: conversationMessages,
        })

        const text = response.content[0].type === 'text' ? response.content[0].text : ''
        logger.info('AI Chat response (Claude)', { length: text.length })
        return NextResponse.json({ response: text, model: 'claude' })
      } catch (err) {
        logger.error('Claude API error', err)
      }
    }

    // Fallback: smart rule-based responses
    const lowerMsg = message.toLowerCase()
    let response = ''

    if (lowerMsg.includes('ola') || lowerMsg.includes('oi') || lowerMsg.includes('tudo bem') || lowerMsg.includes('bom dia') || lowerMsg.includes('boa tarde') || lowerMsg.includes('boa noite')) {
      response = 'Ola! Sou o Copiloto IA do AIFLUENT. Estou aqui para ajudar com sua operacao comercial. Posso analisar leads, sugerir proximas acoes, gerar relatorios e muito mais. Como posso ajudar?'
    } else if (lowerMsg.includes('funcionando') || lowerMsg.includes('funciona') || lowerMsg.includes('teste')) {
      response = 'Sim, estou funcionando! Estou conectado ao sistema AIFLUENT e pronto para ajudar. Posso analisar leads, pipeline, relatorios e oportunidades. O que voce precisa?'
    } else if (lowerMsg.includes('ajudar') || lowerMsg.includes('ajuda') || lowerMsg.includes('o que voce faz')) {
      response = 'Posso ajudar com:\n\n• **Analisar leads** — Identificar leads quentes e oportunidades\n• **Pipeline** — Sugerir movimentacoes de estagio\n• **Follow-up** — Recomendar acoes para leads sem contato\n• **Relatorios** — Gerar insights sobre conversao e equipe\n• **Forecast** — Prever receita com base no pipeline\n• **Respostas** — Sugerir mensagens para WhatsApp\n\nO que voce gostaria de fazer?'
    } else if (lowerMsg.includes('lead') && (lowerMsg.includes('quente') || lowerMsg.includes('hot'))) {
      try {
        const { prisma } = await import('@/lib/prisma')
        const hotLeads = await prisma.lead.count({ where: { temperature: 'hot', organizationId: orgId } })
        const totalLeads = await prisma.lead.count({ where: { organizationId: orgId } })
        response = `Voce tem **${hotLeads} leads quentes** de um total de ${totalLeads} leads. ${hotLeads > 0 ? 'Recomendo priorizar o atendimento desses leads — eles tem maior probabilidade de conversao.' : 'Nenhum lead quente no momento. Considere reaquecer leads mornos com follow-up.'}`
      } catch {
        response = 'Nao consegui acessar o banco de dados para verificar os leads. Verifique se o DATABASE_URL esta configurado.'
      }
    } else if (lowerMsg.includes('lead') && (lowerMsg.includes('quantos') || lowerMsg.includes('total'))) {
      try {
        const { prisma } = await import('@/lib/prisma')
        const total = await prisma.lead.count({ where: { organizationId: orgId } })
        const hot = await prisma.lead.count({ where: { temperature: 'hot', organizationId: orgId } })
        const warm = await prisma.lead.count({ where: { temperature: 'warm', organizationId: orgId } })
        const cold = await prisma.lead.count({ where: { temperature: 'cold', organizationId: orgId } })
        response = `Voce tem **${total} leads** no sistema:\n\n🔴 Quentes: ${hot}\n🟡 Mornos: ${warm}\n🔵 Frios: ${cold}`
      } catch {
        response = 'Nao consegui acessar os dados. Verifique a conexao com o banco.'
      }
    } else if (lowerMsg.includes('forecast') || lowerMsg.includes('previsao') || lowerMsg.includes('receita')) {
      try {
        const { prisma } = await import('@/lib/prisma')
        const deals = await prisma.deal.findMany({ where: { status: 'open', lead: { organizationId: orgId } } })
        const total = deals.reduce((s, d) => s + (d.value || 0) * (d.probability / 100), 0)
        response = `**Forecast atual:** R$${Math.round(total).toLocaleString('pt-BR')} (receita ponderada por probabilidade)\n\nBaseado em ${deals.length} negocios abertos. Acesse a pagina de Relatorios para ver o detalhamento por estagio.`
      } catch {
        response = 'Nao consegui calcular o forecast. Verifique a conexao com o banco.'
      }
    } else if (lowerMsg.includes('tarefa') || lowerMsg.includes('task') || lowerMsg.includes('pendente')) {
      try {
        const { prisma } = await import('@/lib/prisma')
        const pending = await prisma.task.count({ where: { status: 'pending', organizationId: orgId } })
        response = `Voce tem **${pending} tarefas pendentes**. ${pending > 5 ? 'Recomendo priorizar as de alta urgencia primeiro.' : pending > 0 ? 'Mantenha o ritmo!' : 'Nenhuma tarefa pendente. Otimo trabalho!'}`
      } catch {
        response = 'Nao consegui acessar as tarefas.'
      }
    } else {
      response = `Entendi sua pergunta: "${message}"\n\nPara responder com mais precisao, preciso da Claude API configurada (ANTHROPIC_API_KEY). Sem ela, posso ajudar com:\n\n• "quantos leads temos?"\n• "leads quentes"\n• "forecast"\n• "tarefas pendentes"\n\nConfigure a ANTHROPIC_API_KEY para ter respostas contextuais completas.`
    }

    logger.info('AI Chat response (fallback)', { length: response.length })
    return NextResponse.json({ response, model: 'fallback' })
  } catch (err) {
    logger.error('AI Chat error', err)
    return NextResponse.json({ error: 'Falha ao processar mensagem' }, { status: 500 })
  }
}
