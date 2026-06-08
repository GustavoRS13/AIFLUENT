import { ingestLead } from './lead-ingest'
import { leadDataToContact, type MetaLeadData } from './meta'

export interface MetaIngestResult {
  deduped: boolean
  leadId: string
}

/**
 * Ingestão de um lead do Meta Lead Ads pelo MESMO funil (ingestLead).
 * Idempotente por leadgen_id (fbLeadId). Sem caminho paralelo.
 */
export async function ingestMetaLead(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prisma: any,
  orgId: string,
  leadgenId: string,
  lead: MetaLeadData,
  formName?: string,
): Promise<MetaIngestResult> {
  // Idempotência: o mesmo leadgen_id não entra duas vezes na empresa.
  const existing = await prisma.lead.findFirst({
    where: { organizationId: orgId, fbLeadId: leadgenId },
    select: { id: true },
  })
  if (existing) return { deduped: true, leadId: existing.id }

  const contact = leadDataToContact(lead.fieldData)
  const attribution = {
    source: 'meta_ads',
    campaignId: lead.campaignId,
    campaignName: lead.campaignName,
    adSetId: lead.adsetId,
    adSetName: lead.adsetName,
    adId: lead.adId,
    adName: lead.adName,
    formId: lead.formId,
    formName,
    leadgenId,
    createdTime: lead.createdTime,
  }

  const result = await ingestLead(prisma, {
    organizationId: orgId,
    source: 'meta_ads',
    channel: 'meta_ads',
    sourceDetail: lead.campaignName || formName,
    fbLeadId: leadgenId,
    metaAdId: lead.adId,
    utmCampaign: lead.campaignName,
    ...contact,
    attribution,
  })
  return { deduped: result.deduped, leadId: result.lead.id }
}
