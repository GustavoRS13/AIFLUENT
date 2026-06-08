import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, checkRateLimit, requireOrgId } from '@/lib/api-auth'
import { apiLimiter } from '@/lib/rate-limit'
import { isMetaConfigured } from '@/lib/meta'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const rl = checkRateLimit(request, apiLimiter)
  if (rl) return rl
  const { error, session } = await requireAuth()
  if (error) return error
  const { orgId, error: orgError } = requireOrgId(session)
  if (orgError) return orgError

  try {
    const { prisma } = await import('@/lib/prisma')
    const [conn, forms] = await Promise.all([
      prisma.metaConnection.findUnique({ where: { organizationId: orgId } }),
      prisma.metaLeadForm.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: 'desc' },
      }),
    ])
    return NextResponse.json({
      configured: isMetaConfigured(),
      connection: conn
        ? {
            status: conn.status,
            adAccountId: conn.adAccountId,
            businessId: conn.businessId,
            pageId: conn.pageId,
            pageName: conn.pageName,
            lastSyncAt: conn.lastSyncAt,
            lastError: conn.lastError,
            leadsReceived: conn.leadsReceived,
          }
        : null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      forms: forms.map((f: any) => ({
        id: f.id,
        formId: f.formId,
        formName: f.formName,
        isLinked: f.isLinked,
        leadsReceived: f.leadsReceived,
        lastLeadAt: f.lastLeadAt,
      })),
    })
  } catch (err) {
    logger.error('GET /api/meta/connection error', err)
    return NextResponse.json({ error: 'Falha ao buscar conexao' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const rl = checkRateLimit(request, apiLimiter)
  if (rl) return rl
  const { error, session } = await requireAuth('admin')
  if (error) return error
  const { orgId, error: orgError } = requireOrgId(session)
  if (orgError) return orgError

  try {
    const { prisma } = await import('@/lib/prisma')
    await prisma.metaConnection.updateMany({
      where: { organizationId: orgId },
      data: { status: 'disconnected', pageToken: null, userToken: null },
    })
    logger.info('Meta connection revoked', { organizationId: orgId })
    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error('DELETE /api/meta/connection error', err)
    return NextResponse.json({ error: 'Falha ao desconectar' }, { status: 500 })
  }
}
