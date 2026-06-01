import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { z } from 'zod'

export type UserRole = 'admin' | 'gestor' | 'operador'

const roleHierarchy: Record<UserRole, number> = { admin: 3, gestor: 2, operador: 1 }

export function canAccess(userRole: UserRole, requiredRole: UserRole): boolean {
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
}

// Predefined users for the initial deployment
// In production, these should come from the database with bcrypt-hashed passwords
const USERS = [
  {
    id: 'user-admin',
    name: 'AIFLUENT Admin',
    email: 'admin@aifluent.com',
    role: 'admin' as UserRole,
  },
  {
    id: 'user-gestor',
    name: 'Gestor AIFLUENT',
    email: 'gestor@aifluent.com',
    role: 'gestor' as UserRole,
  },
  {
    id: 'user-operador',
    name: 'Operador AIFLUENT',
    email: 'operador@aifluent.com',
    role: 'operador' as UserRole,
  },
]

// Predefined passwords for initial deployment
// TODO: migrate to bcrypt-hashed passwords stored in the database
const VALID_PASSWORDS: Record<string, string> = {
  'admin@aifluent.com': 'Admin@2026',
  'gestor@aifluent.com': 'Gestor@2026',
  'operador@aifluent.com': 'Operador@2026',
}

const loginSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(6, 'Senha deve ter no minimo 6 caracteres'),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET || 'k9$mP2xR7vL4nQ8wJ5tY1zA3bF6cH0dG',
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

        // Find user by email (case-insensitive)
        const user = USERS.find(u => u.email.toLowerCase() === email.toLowerCase())
        if (!user) return null

        // Validate password against known credentials
        const expectedPassword = VALID_PASSWORDS[email.toLowerCase()]
        if (!expectedPassword || password !== expectedPassword) return null

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }
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
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const user = session.user as any
        user.role = token.role
        user.id = token.id
      }
      return session
    },
  },
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 },
})
