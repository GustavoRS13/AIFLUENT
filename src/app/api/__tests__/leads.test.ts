import { describe, it, expect } from 'vitest'
import { z } from 'zod'

const createLeadSchema = z.object({
  firstName: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  temperature: z.enum(['cold', 'warm', 'hot']).default('warm'),
})

describe('Leads API Validation', () => {
  it('rejects empty firstName', () => {
    const result = createLeadSchema.safeParse({ firstName: '' })
    expect(result.success).toBe(false)
  })

  it('accepts valid lead', () => {
    const result = createLeadSchema.safeParse({ firstName: 'Joao', email: 'joao@test.com' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = createLeadSchema.safeParse({ firstName: 'Joao', email: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('defaults temperature to warm', () => {
    const result = createLeadSchema.safeParse({ firstName: 'Joao' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.temperature).toBe('warm')
  })
})
