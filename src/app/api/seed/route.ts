import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'


const firstNames = [
  'Ana', 'Bruno', 'Carla', 'Diego', 'Elena', 'Fernando', 'Gabriela', 'Hugo',
  'Isabella', 'João', 'Karina', 'Lucas', 'Marina', 'Nathan', 'Olivia',
  'Pedro', 'Rafaela', 'Samuel', 'Tatiana', 'Vitor', 'Yasmin', 'Wagner',
  'Beatriz', 'Carlos', 'Daniela', 'Eduardo', 'Fernanda', 'Gustavo', 'Helena',
  'Igor', 'Julia', 'Leonardo', 'Mariana', 'Nicolas', 'Patricia', 'Ricardo',
]

const lastNames = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Almeida',
  'Pereira', 'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho',
  'Araújo', 'Melo', 'Barbosa', 'Rocha', 'Dias', 'Nascimento', 'Andrade',
  'Moreira', 'Nunes', 'Marques', 'Vieira', 'Cardoso', 'Mendes', 'Freitas',
]

const sources = ['instagram', 'facebook', 'google', 'whatsapp', 'website', 'referral', 'event', 'manual']
const temperatures = ['cold', 'warm', 'hot']
const courses = ['Inglês Básico', 'Inglês Intermediário', 'Inglês Avançado', 'Inglês Business', 'Espanhol Básico', 'Espanhol Intermediário', 'Espanhol Conversação']
const cities = ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Curitiba', 'Porto Alegre', 'Salvador', 'Brasília', 'Fortaleza', 'Recife', 'Campinas']
const states = ['SP', 'RJ', 'MG', 'PR', 'RS', 'BA', 'DF', 'CE', 'PE', 'SP']

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomPhone(): string {
  const ddd = Math.floor(Math.random() * 90) + 11
  const num = Math.floor(Math.random() * 900000000) + 100000000
  return `+55${ddd}9${num}`
}

function randomDate(daysBack: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - Math.floor(Math.random() * daysBack))
  return d
}

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Seed nao permitido em producao' }, { status: 403 })
  }

  try {
  const existingOrg = await prisma.organization.findUnique({ where: { slug: 'aifluent-demo' } })
  if (existingOrg) {
    return NextResponse.json({ message: 'Seed data already exists' }, { status: 200 })
  }

  const org = await prisma.organization.create({
    data: {
      name: 'AIFLUENT Demo',
      slug: 'aifluent-demo',
      plan: 'enterprise',
    },
  })

  const admin = await prisma.user.create({
    data: {
      name: 'Raphael Ruiz',
      email: 'raphael@aifluent.com',
      passwordHash: '$2b$10$placeholder',
      role: 'admin',
      phone: '+5511999999999',
      organizationId: org.id,
    },
  })

  const consultants = await Promise.all(
    ['Maria Consultora', 'Carlos Vendedor', 'Ana Especialista', 'Pedro Closer'].map((name) =>
      prisma.user.create({
        data: {
          name,
          email: `${name.toLowerCase().replace(' ', '.')}@aifluent.com`,
          passwordHash: '$2b$10$placeholder',
          role: 'agent',
          phone: randomPhone(),
          organizationId: org.id,
        },
      })
    )
  )

  const allUsers = [admin, ...consultants]

  const pipeline = await prisma.pipeline.create({
    data: {
      name: 'Funil Principal',
      isDefault: true,
      organizationId: org.id,
    },
  })

  const stageData = [
    { name: 'Base', color: '#64748b', order: 0 },
    { name: 'Primeiro Contato', color: '#3b82f6', order: 1 },
    { name: 'Segundo Contato', color: '#6366f1', order: 2 },
    { name: 'Prospecção', color: '#8b5cf6', order: 3 },
    { name: 'Conexão', color: '#a855f7', order: 4 },
    { name: 'Negociação', color: '#f59e0b', order: 5 },
    { name: 'Follow-up', color: '#f97316', order: 6 },
    { name: 'Perdido', color: '#ef4444', order: 7, isLost: true },
    { name: 'Fechado', color: '#22c55e', order: 8, isWon: true },
  ]

  const stages = await Promise.all(
    stageData.map((s) =>
      prisma.pipelineStage.create({
        data: { ...s, pipelineId: pipeline.id },
      })
    )
  )

  const tagData = [
    { name: 'Premium', color: '#f59e0b' },
    { name: 'VIP', color: '#8b5cf6' },
    { name: 'Urgente', color: '#ef4444' },
    { name: 'Retorno', color: '#3b82f6' },
    { name: 'Indicação', color: '#22c55e' },
    { name: 'Evento', color: '#ec4899' },
    { name: 'Frio', color: '#64748b' },
    { name: 'Corporativo', color: '#06b6d4' },
  ]

  const tags = await Promise.all(
    tagData.map((t) => prisma.tag.create({ data: { ...t, organizationId: org.id } }))
  )

  const leads: { id: string }[] = []
  for (let i = 0; i < 200; i++) {
    const firstName = pick(firstNames)
    const lastName = pick(lastNames)
    const cityIdx = Math.floor(Math.random() * cities.length)
    const temp = pick(temperatures)
    const stage = pick(stages.slice(0, 7))
    const consultant = pick(allUsers)

    const lead = await prisma.lead.create({
      data: {
        firstName,
        lastName,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@email.com`,
        phone: randomPhone(),
        whatsapp: randomPhone(),
        source: pick(sources),
        temperature: temp,
        score: Math.floor(Math.random() * 100),
        aiScore: Math.random() * 10,
        status: 'new',
        courseInterest: pick(courses),
        city: cities[cityIdx],
        state: states[cityIdx],
        lastContactAt: randomDate(30),
        stageId: stage.id,
        stageOrder: i,
        consultantId: consultant.id,
        createdById: admin.id,
        organizationId: org.id,
        createdAt: randomDate(90),
      },
    })
    leads.push(lead)

    if (Math.random() > 0.5) {
      const numTags = Math.floor(Math.random() * 3) + 1
      const shuffled = [...tags].sort(() => Math.random() - 0.5).slice(0, numTags)
      for (const tag of shuffled) {
        await prisma.leadTag.create({ data: { leadId: lead.id, tagId: tag.id } }).catch(() => {})
      }
    }

    const numActivities = Math.floor(Math.random() * 5) + 1
    for (let a = 0; a < numActivities; a++) {
      await prisma.activity.create({
        data: {
          type: pick(['call', 'email', 'whatsapp', 'note', 'meeting', 'task']),
          title: pick([
            'Ligação realizada', 'Email enviado', 'Mensagem WhatsApp', 'Reunião agendada',
            'Nota adicionada', 'Follow-up realizado', 'Proposta enviada', 'Contato inicial',
          ]),
          leadId: lead.id,
          userId: consultant.id,
          createdAt: randomDate(60),
        },
      })
    }
  }

  const campaignNames = [
    'Black Friday Inglês 2026', 'Semana do Espanhol', 'Reativação Base Fria',
    'Welcome Series', 'Promoção Matrícula', 'Campanha Instagram Março',
  ]

  for (const name of campaignNames) {
    const campaign = await prisma.campaign.create({
      data: {
        name,
        type: pick(['broadcast', 'sequence', 'automation']),
        status: pick(['draft', 'completed', 'sending', 'scheduled']),
        channel: pick(['whatsapp', 'email', 'sms']),
        subject: `${name} - Oferta Especial`,
        content: `Olá {{nome}}! Temos uma oferta especial para você. ${name}. Aproveite!`,
        totalRecipients: Math.floor(Math.random() * 5000) + 100,
        totalSent: Math.floor(Math.random() * 4000) + 100,
        totalDelivered: Math.floor(Math.random() * 3500) + 100,
        totalOpened: Math.floor(Math.random() * 2000) + 50,
        totalClicked: Math.floor(Math.random() * 500) + 10,
        totalReplied: Math.floor(Math.random() * 200) + 5,
        totalConverted: Math.floor(Math.random() * 100),
        totalFailed: Math.floor(Math.random() * 50),
        organizationId: org.id,
        createdById: admin.id,
        createdAt: randomDate(60),
      },
    })

    const sampleLeads = leads.sort(() => Math.random() - 0.5).slice(0, Math.min(20, leads.length))
    for (const lead of sampleLeads) {
      await prisma.campaignLead.create({
        data: {
          campaignId: campaign.id,
          leadId: lead.id,
          status: pick(['sent', 'delivered', 'opened', 'replied', 'failed']),
          sentAt: randomDate(30),
        },
      }).catch(() => {})
    }
  }

  const templateData = [
    { name: 'Boas-vindas', category: 'welcome', channel: 'whatsapp', content: 'Olá {{nome}}! Seja bem-vindo(a) à AIFLUENT! 🎓 Estamos felizes em ter você conosco.' },
    { name: 'Follow-up 1', category: 'follow-up', channel: 'whatsapp', content: 'Oi {{nome}}, tudo bem? Vi que você demonstrou interesse em nossos cursos de {{curso}}. Posso te ajudar?' },
    { name: 'Promoção', category: 'promotion', channel: 'whatsapp', content: '🔥 {{nome}}, aproveite! Matrícula com 30% de desconto para {{curso}}. Válido até {{data_limite}}!' },
    { name: 'Reativação', category: 'reactivation', channel: 'email', content: 'Olá {{nome}}, sentimos sua falta! Que tal retomar seus estudos de {{curso}}?' },
    { name: 'Lembrete Aula', category: 'reminder', channel: 'sms', content: '📚 {{nome}}, sua aula experimental é amanhã às {{horario}}. Te esperamos!' },
  ]

  for (const t of templateData) {
    await prisma.template.create({ data: { ...t, organizationId: org.id } })
  }

  for (let i = 0; i < 15; i++) {
    await prisma.task.create({
      data: {
        title: pick([
          'Ligar para lead quente', 'Enviar proposta comercial', 'Agendar reunião',
          'Follow-up campanha', 'Preparar apresentação', 'Revisar métricas',
          'Atualizar base de leads', 'Criar nova campanha', 'Responder WhatsApp pendente',
        ]),
        type: pick(['call', 'email', 'meeting', 'task']),
        priority: pick(['low', 'medium', 'high', 'urgent']),
        status: pick(['pending', 'in_progress', 'completed']),
        dueDate: new Date(Date.now() + Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)),
        organizationId: org.id,
        assigneeId: pick(allUsers).id,
        creatorId: admin.id,
      },
    })
  }

  return NextResponse.json({
    message: 'Seed completed',
    stats: { leads: 200, campaigns: campaignNames.length, templates: templateData.length, tasks: 15 },
  })
  } catch (error) {
    console.error('POST /api/seed error:', error)
    return NextResponse.json({ error: 'Erro ao executar seed' }, { status: 500 })
  }
}
