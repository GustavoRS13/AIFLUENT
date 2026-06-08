import { describe, it, expect, vi, beforeEach } from 'vitest'
import crypto from 'crypto'
import {
  signState,
  verifyState,
  leadDataToContact,
  verifyMetaSignature,
  metaConfig,
} from '../meta'
import { ingestMetaLead } from '../meta-ingest'

beforeEach(() => {
  metaConfig.appSecret = 'unit-app-sek'
})

describe('Meta OAuth state (anti-CSRF)', () => {
  it('assina e valida o orgId; rejeita adulteração', () => {
    const st = signState('org-1')
    expect(verifyState(st)).toBe('org-1')
    expect(verifyState('org-1.deadbeef')).toBeNull()
    expect(verifyState('lixo')).toBeNull()
  })
})

describe('leadDataToContact', () => {
  it('mapeia full_name/email/phone do field_data', () => {
    const c = leadDataToContact({
      full_name: 'Maria Silva',
      email: 'maria@x.com',
      phone_number: '5511999998888',
    })
    expect(c.firstName).toBe('Maria')
    expect(c.lastName).toBe('Silva')
    expect(c.email).toBe('maria@x.com')
    expect(c.phone).toBe('5511999998888')
    expect(c.whatsapp).toBe('5511999998888')
  })
})

describe('verifyMetaSignature', () => {
  it('valida HMAC correto e rejeita inválido', () => {
    const raw = '{"x":1}'
    const sig =
      'sha256=' +
      crypto.createHmac('sha256', 'unit-app-sek').update(raw, 'utf8').digest('hex')
    expect(verifyMetaSignature(raw, sig)).toBe(true)
    expect(verifyMetaSignature(raw, 'sha256=00')).toBe(false)
    expect(verifyMetaSignature(raw, null)).toBe(false)
  })
})

function mkPrisma() {
  return {
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
  }
}

const leadData = {
  fieldData: { full_name: 'Joao Souza', email: 'joao@x.com', phone_number: '5511977776666' },
  campaignName: 'Campanha Verao',
  adId: 'AD-1',
  formId: 'F-1',
}

describe('ingestMetaLead — funil único + atribuição + idempotência', () => {
  it('cria lead com source=meta_ads, atribuição no histórico e tag', async () => {
    const prisma = mkPrisma()
    const r = await ingestMetaLead(prisma, 'org-1', 'LG-1', leadData, 'Form Verao')
    expect(r.deduped).toBe(false)
    const leadArg = prisma.lead.create.mock.calls[0][0]
    expect(leadArg.data.source).toBe('meta_ads')
    expect(leadArg.data.fbLeadId).toBe('LG-1')
    expect(leadArg.data.organizationId).toBe('org-1')
    // atribuição completa no Activity (lead_source)
    const actArg = prisma.activity.create.mock.calls[0][0]
    const meta = JSON.parse(actArg.data.metadata)
    expect(meta.campaignName).toBe('Campanha Verao')
    expect(meta.formName).toBe('Form Verao')
    expect(meta.leadgenId).toBe('LG-1')
    expect(prisma.leadTag.create).toHaveBeenCalled()
  })

  it('é idempotente por leadgen_id (não recria)', async () => {
    const prisma = mkPrisma()
    prisma.lead.findFirst.mockResolvedValue({ id: 'existing' })
    const r = await ingestMetaLead(prisma, 'org-1', 'LG-1', leadData)
    expect(r.deduped).toBe(true)
    expect(prisma.lead.create).not.toHaveBeenCalled()
  })
})
