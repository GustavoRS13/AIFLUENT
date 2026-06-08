import { describe, it, expect, vi, beforeEach } from 'vitest'

// Ambiente limpo: nenhuma org/lead resolvida via env
delete process.env.WHATSAPP_ORG_ID
delete process.env.WHATSAPP_APP_SECRET

vi.mock('@/lib/auth', () => ({ auth: vi.fn(async () => null) }))
vi.mock('@/lib/api-auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-auth')>()
  return { ...actual, requireAuth: vi.fn(), checkRateLimit: vi.fn(() => null) }
})

vi.mock('@/lib/prisma', () => {
  const prisma = {
    organization: {
      count: vi.fn().mockResolvedValue(1),
      findFirst: vi.fn().mockResolvedValue({ id: 'org1' }),
    },
    integration: { findFirst: vi.fn().mockResolvedValue(null) },
    lead: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'lead1' }),
    },
    activity: { create: vi.fn().mockResolvedValue({}) },
    tag: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 't1' }),
    },
    leadTag: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({}),
    },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
    conversation: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'conv1' }),
      update: vi.fn().mockResolvedValue({}),
    },
    conversationMessage: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'm1' }),
      updateMany: vi.fn().mockResolvedValue({}),
    },
  }
  return { prisma }
})

import { requireAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { POST as whatsappPOST } from '../whatsapp/route'
import { POST as ingestPOST } from '../leads/ingest/route'

const ra = vi.mocked(requireAuth)

function whatsappReq(payload: unknown) {
  return {
    text: async () => JSON.stringify(payload),
    headers: { get: () => null },
    nextUrl: new URL('http://localhost/api/whatsapp'),
  } as unknown as Request
}
function jsonReq(body: unknown) {
  return {
    json: async () => body,
    headers: { get: () => null },
    nextUrl: new URL('http://localhost/api'),
    url: 'http://localhost/api',
  } as unknown as Request
}

beforeEach(() => vi.clearAllMocks())

describe('Jornada: WhatsApp -> Lead -> Conversa -> Mensagem -> Historico (empresa do zero)', () => {
  it('um lead novo entrando pelo WhatsApp cria toda a cadeia no banco', async () => {
    const res = await whatsappPOST(
      whatsappReq({
        object: 'whatsapp_business_account',
        entry: [
          {
            changes: [
              {
                value: {
                  metadata: { phone_number_id: 'PN1' },
                  contacts: [{ profile: { name: 'Maria Silva' } }],
                  messages: [
                    { id: 'wamid.A', from: '5511988887777', timestamp: '1', type: 'text', text: { body: 'Ola, quero saber dos cursos' } },
                  ],
                },
              },
            ],
          },
        ],
      }) as never,
    )
    expect(res.status).toBe(200)
    // Lead criado pelo funil, na empresa resolvida
    expect(prisma.lead.create).toHaveBeenCalled()
    expect((prisma.lead.create as ReturnType<typeof vi.fn>).mock.calls[0][0].data.organizationId).toBe('org1')
    // Tag obrigatoria (origem whatsapp)
    expect(prisma.leadTag.create).toHaveBeenCalled()
    // Conversa criada
    expect(prisma.conversation.create).toHaveBeenCalled()
    // Mensagem inbound salva
    const msgArg = (prisma.conversationMessage.create as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(msgArg.data.direction).toBe('inbound')
    expect(msgArg.data.externalId).toBe('wamid.A')
    // Historico atualizado (lastMessageAt + unreadCount)
    expect(prisma.conversation.update).toHaveBeenCalled()
  })

  it('mensagem duplicada (mesmo wamid) nao recria nada (idempotente)', async () => {
    ;(prisma.conversationMessage.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'm1' })
    const res = await whatsappPOST(
      whatsappReq({
        object: 'whatsapp_business_account',
        entry: [{ changes: [{ value: { metadata: { phone_number_id: 'PN1' }, messages: [{ id: 'wamid.A', from: '5511988887777', timestamp: '1', type: 'text', text: { body: 'oi' } }] } }] }],
      }) as never,
    )
    expect(res.status).toBe(200)
    expect(prisma.lead.create).not.toHaveBeenCalled()
    expect(prisma.conversationMessage.create).not.toHaveBeenCalled()
  })
})

describe('Jornada: API/Meta Ads -> /api/leads/ingest -> Lead com origem e UTM', () => {
  it('lead via webhook externo entra pelo funil com metaAdId e tag', async () => {
    ra.mockResolvedValue({ error: null, session: { user: { id: 'u1', role: 'gestor', organizationId: 'org1' } } } as never)
    const res = await ingestPOST(
      jsonReq({ firstName: 'Joao', whatsapp: '5511977776666', source: 'meta_ads', channel: 'meta_ads', metaAdId: 'AD123', utmCampaign: 'verao' }) as never,
    )
    expect([200, 201]).toContain(res.status)
    expect(prisma.lead.create).toHaveBeenCalled()
    const arg = (prisma.lead.create as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(arg.data.organizationId).toBe('org1')
    expect(arg.data.source).toBe('meta_ads')
    expect(arg.data.metaAdId).toBe('AD123')
    expect(prisma.leadTag.create).toHaveBeenCalled()
  })
})
