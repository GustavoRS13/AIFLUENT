import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireOrgId } from '@/lib/api-auth'
import {
  exchangeCodeForToken,
  getLongLivedToken,
  getPages,
  verifyState,
  metaConfig,
  isMetaConfigured,
} from '@/lib/meta'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const back = (q: string) =>
    NextResponse.redirect(`${request.nextUrl.origin}/meta-ads?${q}`)

  const { error, session } = await requireAuth('admin')
  if (error) return back('error=auth')
  const { orgId, error: orgError } = requireOrgId(session)
  if (orgError) return back('error=org')

  if (!isMetaConfigured()) return back('error=not_configured')

  const code = request.nextUrl.searchParams.get('code') || ''
  const state = request.nextUrl.searchParams.get('state') || ''
  if (verifyState(state) !== orgId) return back('error=state')
  if (!code) return back('error=code')

  const redirectUri =
    metaConfig.redirectUri || `${request.nextUrl.origin}/api/meta/oauth/callback`

  try {
    const short = await exchangeCodeForToken(code, redirectUri)
    const long = await getLongLivedToken(short.accessToken)
    const pages = await getPages(long.accessToken)
    const page = pages[0]

    const { prisma } = await import('@/lib/prisma')
    const expiresAt = long.expiresIn
      ? new Date(Date.now() + long.expiresIn * 1000)
      : null
    await prisma.metaConnection.upsert({
      where: { organizationId: orgId },
      create: {
        organizationId: orgId,
        pageId: page?.id,
        pageName: page?.name,
        pageToken: page?.accessToken,
        userToken: long.accessToken,
        tokenExpiresAt: expiresAt,
        scopes: 'leads_retrieval,pages_show_list',
        status: 'connected',
        lastError: null,
      },
      update: {
        pageId: page?.id,
        pageName: page?.name,
        pageToken: page?.accessToken,
        userToken: long.accessToken,
        tokenExpiresAt: expiresAt,
        status: 'connected',
        lastError: null,
      },
    })
    logger.info('Meta connected', { organizationId: orgId, pageId: page?.id })
    return back('connected=1')
  } catch (err) {
    logger.error('Meta OAuth callback error', err)
    try {
      const { prisma } = await import('@/lib/prisma')
      await prisma.metaConnection.upsert({
        where: { organizationId: orgId },
        create: {
          organizationId: orgId,
          status: 'error',
          lastError: err instanceof Error ? err.message : 'erro',
        },
        update: {
          status: 'error',
          lastError: err instanceof Error ? err.message : 'erro',
        },
      })
    } catch {}
    return back('error=oauth')
  }
}
