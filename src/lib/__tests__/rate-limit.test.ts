import { describe, it, expect } from 'vitest'
import { rateLimit } from '../rate-limit'

describe('Rate Limiter', () => {
  it('allows requests within limit', () => {
    const limiter = rateLimit({ windowMs: 60000, max: 5 })
    const r1 = limiter('test-ip-1')
    expect(r1.success).toBe(true)
    expect(r1.remaining).toBe(4)
  })

  it('blocks requests over limit', () => {
    const limiter = rateLimit({ windowMs: 60000, max: 3 })
    limiter('test-ip-2')
    limiter('test-ip-2')
    limiter('test-ip-2')
    const r4 = limiter('test-ip-2')
    expect(r4.success).toBe(false)
    expect(r4.remaining).toBe(0)
  })

  it('different IPs have separate limits', () => {
    const limiter = rateLimit({ windowMs: 60000, max: 2 })
    limiter('ip-a')
    limiter('ip-a')
    const blocked = limiter('ip-a')
    const allowed = limiter('ip-b')
    expect(blocked.success).toBe(false)
    expect(allowed.success).toBe(true)
  })

  it('returns correct remaining count', () => {
    const limiter = rateLimit({ windowMs: 60000, max: 5 })
    expect(limiter('ip-c').remaining).toBe(4)
    expect(limiter('ip-c').remaining).toBe(3)
    expect(limiter('ip-c').remaining).toBe(2)
  })
})
