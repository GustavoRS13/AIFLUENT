import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/meta', () => ({
  metaConfig: { appSecret: '', verifyToken: 'vt' },
  verifyMetaSignature: () => true,
  getLead: vi.fn(async () => ({
    fieldData: { full_name: 'Maria Silva', email: 'm@x.com', phone_number: '5511999998888' },
    campaignName: 'Verao',
    adId: 'AD1',
    formId: 'F1',
  })),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  leadDataToContact: (fd: any) => ({
    firstName: (fd.full_name || '').split(' ')[0] || 'Lead',
    email: fd.email,
    phone: fd.phone_number,
    whatsapp: fd.phone_number,
  }),
}))

vi.mock('@/lib/prisma', () => {
  const prisma = {
    metaLeadForm: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
    metaConnection: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
    lead: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'lead1' }),
    },
    activity: { create: vi.fn().mockResolvedValue({}) },
    tag: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({ id: 't1' }) },
    leadTag: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({}) },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  }
  return { prisma }
})

import { prisma } from '@/lib/prisma'
import { POST as webhookPOST } from '../meta/webhook/route'

function req(payload: unknown) {
  return {
    text: async () => JSON.stringify(payload),
    headers: { get: () => null },
    nextUrl: new URL('http://localhost/api/meta/webhook'),
  } as unknown as Request
}

const leadgenPayload = {
  object: 'page',
  entry: [
    {
      changes: [
        { field: 'leadgen', value: { leadgen_id: 'LG-1', form_id: 'F1', page_id: 'P1' } },
      ],
    },
  ],
}

beforeEach(() => vi.clearAllMocks())

describe('Meta Lead Ads webhook — multi-tenant + ingest + idempotência', () => {
  it('mapeia form->empresa e ingere o lead pelo funil', async () => {
    ;(prisma.metaLeadForm.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'form-row', organizationId: 'org-7', isLinked: true, formName: 'Form Verao',
    })
    ;(prisma.metaConnection.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      pageToken: 'tok',
    })
    const res = await webhookPOST(req(leadgenPayload) as never)
    expect(res.status).toBe(200)
    const leadArg = (prisma.lead.create as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(leadArg.data.organizationId).toBe('org-7')
    expect(leadArg.data.source).toBe('meta_ads')
    expect(leadArg.data.fbLeadId).toBe('LG-1')
    expect(prisma.auditLog.create).toHaveBeenCalled()
  })

  it('ignora formulário não vinculado (sem ingestão)', async () => {
    ;(prisma.metaLeadForm.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'form-row', organizationId: 'org-7', isLinked: false,
    })
    const res = await webhookPOST(req(leadgenPayload) as never)
    expect(res.status).toBe(200)
    expect(prisma.lead.create).not.toHaveBeenCalled()
  })

  it('é idempotente (leadgen_id já processado)', async () => {
    ;(prisma.metaLeadForm.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'form-row', organizationId: 'org-7', isLinked: true,
    })
    ;(prisma.metaConnection.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ pageToken: 'tok' })
    ;(prisma.lead.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'dup' })
    const res = await webhookPOST(req(leadgenPayload) as never)
    expect(res.status).toBe(200)
    expect(prisma.lead.create).not.toHaveBeenCalled()
  })
})
