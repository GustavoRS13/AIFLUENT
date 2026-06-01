import { describe, it, expect } from 'vitest'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

describe('Auth Validation', () => {
  it('rejects empty email', () => {
    expect(loginSchema.safeParse({ email: '', password: 'test123' }).success).toBe(false)
  })

  it('rejects short password', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: '123' }).success).toBe(false)
  })

  it('accepts valid credentials format', () => {
    expect(loginSchema.safeParse({ email: 'admin@aifluent.com', password: 'Admin@2026' }).success).toBe(true)
  })
})
