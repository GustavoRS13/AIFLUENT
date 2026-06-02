import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    // Return a proxy that throws on actual use, not on import
    // This allows the build to succeed without DATABASE_URL
    return new Proxy({} as PrismaClient, {
      get(_, prop) {
        if (prop === 'then' || prop === Symbol.toPrimitive || prop === Symbol.toStringTag) return undefined
        throw new Error(`DATABASE_URL not configured. Cannot access prisma.${String(prop)}`)
      },
    })
  }
  const adapter = new PrismaPg(connectionString)
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
