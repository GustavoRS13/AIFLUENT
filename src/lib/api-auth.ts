import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { UserRole } from '@/lib/auth'
import { apiLimiter } from './rate-limit'

/**
 * Check rate limit for an incoming request.
 * Returns a 429 NextResponse if rate-limited, or null if allowed.
 */
export function checkRateLimit(
  request: Request,
  limiter: (id: string) => { success: boolean; remaining: number; resetAt: number } = apiLimiter,
) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'

  const result = limiter(ip)
  if (!result.success) {
    return NextResponse.json(
      { error: 'Limite de requisicoes excedido. Tente novamente em breve.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
          'X-RateLimit-Limit': '60',
          'X-RateLimit-Remaining': '0',
        },
      },
    )
  }
  return null
}

/**
 * Require authentication (and optionally a minimum role) for API routes.
 *
 * Usage:
 *   const { error, session } = await requireAuth()          // any logged-in user
 *   const { error, session } = await requireAuth('gestor')  // gestor or admin
 *   const { error, session } = await requireAuth('admin')   // admin only
 *   if (error) return error
 */
export async function requireAuth(requiredRole?: UserRole) {
  const session = await auth()

  if (!session?.user) {
    return {
      error: NextResponse.json({ error: 'Nao autorizado' }, { status: 401 }),
      session: null,
    }
  }

  if (requiredRole) {
    const userRole = (session.user as Record<string, unknown>).role as UserRole | undefined
    const hierarchy: Record<string, number> = { admin: 3, gestor: 2, operador: 1 }
    if ((hierarchy[userRole || ''] || 0) < (hierarchy[requiredRole] || 0)) {
      return {
        error: NextResponse.json({ error: 'Permissao negada' }, { status: 403 }),
        session: null,
      }
    }
  }

  return { error: null, session }
}
