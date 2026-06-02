import { describe, it, expect } from 'vitest'
import { z } from 'zod'

const sendEmailSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  html: z.string().optional(),
  text: z.string().optional(),
  leadId: z.string().optional(),
})

describe('Email API Validation', () => {
  it('accepts valid email payload', () => {
    const result = sendEmailSchema.safeParse({
      to: 'test@example.com',
      subject: 'Teste',
      html: '<p>Ola</p>',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email address', () => {
    const result = sendEmailSchema.safeParse({
      to: 'invalid-email',
      subject: 'Teste',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty subject', () => {
    const result = sendEmailSchema.safeParse({
      to: 'test@example.com',
      subject: '',
    })
    expect(result.success).toBe(false)
  })

  it('accepts payload with leadId', () => {
    const result = sendEmailSchema.safeParse({
      to: 'test@example.com',
      subject: 'Follow-up',
      text: 'Ola, como vai?',
      leadId: 'lead-123',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.leadId).toBe('lead-123')
    }
  })

  it('accepts payload without html/text', () => {
    const result = sendEmailSchema.safeParse({
      to: 'test@example.com',
      subject: 'Notificacao',
    })
    expect(result.success).toBe(true)
  })
})
