import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

export type UserRole = 'admin' | 'gestor' | 'supervisor' | 'operador'

const roleHierarchy: Record<UserRole, number> = { admin: 4, gestor: 3, supervisor: 2, operador: 1 }

export function canAccess(userRole: UserRole, requiredRole: UserRole): boolean {
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

// Seed users loaded from environment variables.
// Set SEED_ADMIN_PASSWORD, SEED_GESTOR_PASSWORD, SEED_OPERADOR_PASSWORD in .env
// These are used ONLY on first-time DB setup (when User table is empty)
// and are immediately hashed with bcrypt — plaintext is never stored.
function getSeedUsers() {
  return [
    { name: 'AIFLUENT Admin', email: 'admin@aifluent.com', password: process.env.SEED_ADMIN_PASSWORD || '', role: 'admin' as UserRole },
    { name: 'Gestor AIFLUENT', email: 'gestor@aifluent.com', password: process.env.SEED_GESTOR_PASSWORD || '', role: 'gestor' as UserRole },
    { name: 'Operador AIFLUENT', email: 'operador@aifluent.com', password: process.env.SEED_OPERADOR_PASSWORD || '', role: 'operador' as UserRole },
  ].filter(u => u.password.length >= 6)
}

async function authenticateWithDB(email: string, password: string) {
  try {
    const { prisma } = await import('@/lib/prisma')

    const count = await prisma.user.count()
    if (count === 0) {
      let org = await prisma.organization.findFirst()
      if (!org) org = await prisma.organization.create({ data: { name: 'AIFLUENT', slug: 'aifluent' } })
      for (const u of getSeedUsers()) {
        await prisma.user.create({
          data: { name: u.name, email: u.email, passwordHash: await bcrypt.hash(u.password, 10), role: u.role, organizationId: org.id },
        })
      }
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
    if (!user || !user.isActive) return null

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) return null

    try { await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }) } catch {}

    return { id: user.id, name: user.name, email: user.email, role: user.role as UserRole, organizationId: user.organizationId, teamId: user.teamId }
  } catch {
    return null
  }
}

/**
 * Authorize a login attempt. Authentication is DATABASE-ONLY — there is NO
 * hardcoded fallback and NO demo backdoor. If the database has no matching
 * active user (or the password is wrong), login is denied.
 * Exported so the contract can be unit-tested directly.
 */
export async function authorizeCredentials(credentials: unknown) {
  const parsed = loginSchema.safeParse(credentials)
  if (!parsed.success) return null

  const { email, password } = parsed.data
  return authenticateWithDB(email, password)
}

/**
 * Resolve the auth signing key from the environment. Throws — aborting
 * application boot — when AUTH_SECRET is missing or too weak. There is NO key
 * derived from a constant string (which would allow JWT forgery).
 */
export function resolveAuthSecret(): string {
  const value = process.env.AUTH_SECRET
  if (!value || value.length < 16) {
    throw new Error(
      'AUTH_SECRET ausente ou muito curto (mínimo 16 caracteres). ' +
        'Defina AUTH_SECRET no ambiente para iniciar a aplicação.',
    )
  }
  return value
}

const signingKey = resolveAuthSecret()

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: signingKey,
  trustHost: true,
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        // DATABASE-ONLY authentication. No hardcoded/demo fallback.
        return authorizeCredentials(credentials)
      },
    }),
  ],
  pages: { signIn: '/login' },
  callbacks: {
    authorized({ auth: session, request }) {
      const isLoggedIn = !!session?.user
      const isOnLogin = request.nextUrl.pathname.startsWith('/login')
      if (isOnLogin) return true
      return isLoggedIn
    },
    jwt({ token, user }) {
      if (user) {
        token.role = (user as unknown as { role: string }).role
        token.id = (user as unknown as { id: string }).id
        token.organizationId = (user as unknown as { organizationId: string }).organizationId
        token.teamId = (user as unknown as { teamId?: string }).teamId
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        const u = session.user as unknown as Record<string, unknown>
        u.role = token.role
        u.id = token.id
        u.organizationId = token.organizationId
        u.teamId = token.teamId
      }
      return session
    },
  },
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 },
})
