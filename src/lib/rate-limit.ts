interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Clean old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key)
  }
}, 5 * 60 * 1000)

interface RateLimitConfig {
  windowMs?: number  // Time window in ms (default: 60000 = 1 min)
  max?: number       // Max requests per window (default: 30)
}

export function rateLimit(config: RateLimitConfig = {}) {
  const windowMs = config.windowMs || 60_000
  const max = config.max || 30

  return function check(identifier: string): { success: boolean; remaining: number; resetAt: number } {
    const now = Date.now()
    const key = identifier
    const entry = store.get(key)

    if (!entry || entry.resetAt < now) {
      store.set(key, { count: 1, resetAt: now + windowMs })
      return { success: true, remaining: max - 1, resetAt: now + windowMs }
    }

    entry.count++
    if (entry.count > max) {
      console.warn(`[RATE_LIMIT] Blocked: ${identifier} (${entry.count}/${max} in window)`)
      return { success: false, remaining: 0, resetAt: entry.resetAt }
    }

    return { success: true, remaining: max - entry.count, resetAt: entry.resetAt }
  }
}

// Pre-configured limiters
export const apiLimiter = rateLimit({ windowMs: 60_000, max: 60 })
export const authLimiter = rateLimit({ windowMs: 60_000, max: 10 })
export const aiLimiter = rateLimit({ windowMs: 60_000, max: 20 })
export const seedLimiter = rateLimit({ windowMs: 300_000, max: 2 })
