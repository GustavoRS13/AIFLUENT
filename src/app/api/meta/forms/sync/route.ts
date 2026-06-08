import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, checkRateLimit, requireOrgId } from '@/lib/api-auth'
import { apiLimiter } from '@/lib/rate-limit'
import { getLeadForms } from '@/lib/meta'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const rl = checkRateLimit(request, apiLimiter)
  if (rl) return rl
  const { error, session } = await requireAuth('gestor')
  if (error) return error
  const { orgId, error: orgError } = requireOrgId(session)
  if (orgError) return orgError

  try {
    const { prisma } = await import('@/lib/prisma')
    const conn = await prisma.metaConnection.findUnique({
      where: { organizationId: orgId },
    })
    if (!conn || !conn.pageToken || !conn.pageId) {
      return NextResponse.json(
        { error: 'Conta Meta nao conectada' },
        { status: 400 },
      )
    }

    const forms = await getLeadForms(conn.pageId, conn.pageToken)
    for (const f of forms) {
      await prisma.metaLeadForm.upsert({
        where: { formId: f.id },
        create: {
          organizationId: orgId,
          formId: f.id,
          formName: f.name,
          pageId: conn.pageId,
        },
        update: { formName: f.name, pageId: conn.pageId, organizationId: orgId },
      })
    }
    await prisma.metaConnection.update({
      where: { organizationId: orgId },
      data: { lastSyncAt: new Date(), lastError: null },
    })

    logger.info('Meta forms synced', { organizationId: orgId, count: forms.length })
    return NextResponse.json({ synced: forms.length })
  } catch (err) {
    logger.error('POST /api/meta/forms/sync error', err)
    try {
      const { prisma } = await import('@/lib/prisma')
      await prisma.metaConnection.update({
        where: { organizationId: orgId },
        data: { lastError: err instanceof Error ? err.message : 'erro' },
      })
    } catch {}
    return NextResponse.json({ error: 'Falha na sincronizacao' }, { status: 500 })
  }
}
