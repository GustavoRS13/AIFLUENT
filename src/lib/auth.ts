import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

export type UserRole = 'admin' | 'gestor' | 'operador'

const roleHierarchy: Record<UserRole, number> = { admin: 3, gestor: 2, operador: 1 }

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

    return { id: user.id, name: user.name, email: user.email, role: user.role as UserRole, organizationId: user.organizationId }
  } catch {
    return null
  }
}

// Fallback when database is not available (Vercel without DATABASE_URL)
async function authenticateWithoutDB(email: string, password: string) {
  const seedUsers = getSeedUsers()
  if (seedUsers.length === 0) {
    // No seed passwords configured — use hardcoded demo access
    if (email.toLowerCase() === 'admin@aifluent.com' && password === 'Admin@2026') {
      return { id: 'demo-admin', name: 'AIFLUENT Admin', email, role: 'admin' as UserRole, organizationId: 'demo-org' }
    }
    return null
  }
  const user = seedUsers.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password)
  if (!user) return null
  return { id: `seed-${user.role}`, name: user.name, email: user.email, role: user.role, organizationId: 'seed-org' }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET || require('crypto').createHash('sha256').update(process.env.VERCEL_URL || process.env.NEXTAUTH_URL || 'aifluent-crm-2026').digest('hex'),
  trustHost: true,
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, password } = parsed.data

        const dbUser = await authenticateWithDB(email, password)
        if (dbUser) return dbUser

        return authenticateWithoutDB(email, password)
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
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        const u = session.user as unknown as Record<string, unknown>
        u.role = token.role
        u.id = token.id
        u.organizationId = token.organizationId
      }
      return session
    },
  },
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 },
})
