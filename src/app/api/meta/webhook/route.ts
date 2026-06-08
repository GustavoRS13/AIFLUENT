import { NextRequest, NextResponse } from 'next/server'
import {
  verifyMetaSignature,
  getLead,
  metaConfig,
  type MetaLeadData,
} from '@/lib/meta'
import { ingestMetaLead } from '@/lib/meta-ingest'
import { logger } from '@/lib/logger'

// Verificação do webhook (Meta chama com hub.challenge)
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const mode = sp.get('hub.mode') || ''
  const verify = sp.get('hub.verify_token') || ''
  const challenge = sp.get('hub.challenge') || ''
  if (
    mode === 'subscribe' &&
    metaConfig.verifyToken &&
    verify === metaConfig.verifyToken
  ) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

export async function POST(request: NextRequest) {
  const raw = await request.text()

  // Assinatura (anti-forja + anti-replay via HMAC do corpo)
  if (metaConfig.appSecret) {
    const sig = request.headers.get('x-hub-signature-256')
    if (!verifyMetaSignature(raw, sig)) {
      logger.warn('[Meta Webhook] assinatura invalida')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }
  } else {
    logger.warn('[Meta Webhook] META_APP_SECRET ausente — assinatura nao verificada')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any
  try {
    body = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'JSON invalido' }, { status: 400 })
  }

  if (body.object !== 'page') {
    return NextResponse.json({ status: 'ignored' }, { status: 200 })
  }

  try {
    const { prisma } = await import('@/lib/prisma')
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== 'leadgen') continue
        const v = change.value || {}
        const leadgenId: string = v.leadgen_id
        const formId: string = v.form_id
        if (!leadgenId || !formId) continue

        // Mapeamento formulário → empresa (multi-tenant)
        const form = await prisma.metaLeadForm.findUnique({
          where: { formId },
        })
        if (!form || !form.isLinked) {
          logger.warn('[Meta Webhook] form nao vinculado/desconhecido', { formId })
          continue
        }
        const orgId = form.organizationId

        const conn = await prisma.metaConnection.findUnique({
          where: { organizationId: orgId },
        })
        if (!conn?.pageToken) {
          logger.warn('[Meta Webhook] conexao sem token', { organizationId: orgId })
          continue
        }

        try {
          const leadData: MetaLeadData = await getLead(leadgenId, conn.pageToken)
          const result = await ingestMetaLead(
            prisma,
            orgId,
            leadgenId,
            leadData,
            form.formName || undefined,
          )

          if (!result.deduped) {
            await prisma.metaLeadForm
              .update({
                where: { id: form.id },
                data: {
                  leadsReceived: { increment: 1 },
                  lastLeadAt: new Date(),
                  lastError: null,
                },
              })
              .catch(() => {})
            await prisma.metaConnection
              .update({
                where: { organizationId: orgId },
                data: { leadsReceived: { increment: 1 } },
              })
              .catch(() => {})
            await prisma.auditLog
              .create({
                data: {
                  action: 'meta_lead_ingested',
                  entity: 'Lead',
                  entityId: result.leadId,
                  details: JSON.stringify({ leadgenId, formId }),
                  organizationId: orgId,
                },
              })
              .catch(() => {})
          }
          logger.info('[Meta Webhook] lead processado', {
            organizationId: orgId,
            leadgenId,
            deduped: result.deduped,
          })
        } catch (e) {
          logger.error('[Meta Webhook] falha ao processar lead', {
            organizationId: orgId,
            leadgenId,
            error: e instanceof Error ? e.message : String(e),
          })
          await prisma.metaLeadForm
            .update({
              where: { id: form.id },
              data: { lastError: e instanceof Error ? e.message : 'erro' },
            })
            .catch(() => {})
        }
      }
    }
  } catch (e) {
    logger.error('[Meta Webhook] erro', {
      error: e instanceof Error ? e.message : String(e),
    })
  }

  // Meta exige 200 para toda entrega
  return NextResponse.json({ status: 'received' }, { status: 200 })
}
