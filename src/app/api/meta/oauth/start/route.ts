import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, checkRateLimit, requireOrgId } from '@/lib/api-auth'
import { apiLimiter } from '@/lib/rate-limit'
import { isMetaConfigured, getAuthUrl, signState, metaConfig } from '@/lib/meta'

export async function GET(request: NextRequest) {
  const rl = checkRateLimit(request, apiLimiter)
  if (rl) return rl
  const { error, session } = await requireAuth('admin')
  if (error) return error
  const { orgId, error: orgError } = requireOrgId(session)
  if (orgError) return orgError

  if (!isMetaConfigured()) {
    return NextResponse.json(
      { error: 'Integracao Meta nao configurada (META_APP_ID/META_APP_SECRET)' },
      { status: 503 },
    )
  }

  const redirectUri =
    metaConfig.redirectUri || `${request.nextUrl.origin}/api/meta/oauth/callback`
  const url = getAuthUrl(signState(orgId), redirectUri)
  return NextResponse.json({ url })
}
