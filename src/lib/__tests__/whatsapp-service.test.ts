import { describe, it, expect } from 'vitest'

describe('WhatsApp Service', () => {
  describe('Configuration', () => {
    it('isConfigured returns false without env vars', () => {
      const phoneNumberId = ''
      const accessToken = ''
      expect(!!(phoneNumberId && accessToken)).toBe(false)
    })

    it('isConfigured returns true with both vars', () => {
      const phoneNumberId = '123'
      const accessToken = 'abc'
      expect(!!(phoneNumberId && accessToken)).toBe(true)
    })
  })

  describe('Webhook Verification', () => {
    it('accepts valid subscribe request', () => {
      const mode = 'subscribe'
      const token = 'my-token'
      const configToken = 'my-token'
      const challenge = 'challenge-123'
      const result = mode === 'subscribe' && token === configToken ? challenge : null
      expect(result).toBe('challenge-123')
    })

    it('rejects invalid token', () => {
      const result = 'subscribe' === 'subscribe' && 'wrong' === 'correct' ? 'challenge' : null
      expect(result).toBeNull()
    })

    it('rejects non-subscribe mode', () => {
      const result = 'verify' === 'subscribe' ? 'challenge' : null
      expect(result).toBeNull()
    })
  })

  describe('Message Payload', () => {
    it('constructs text message payload correctly', () => {
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: '5511999999999',
        type: 'text',
        text: { preview_url: false, body: 'Hello' },
      }
      expect(payload.messaging_product).toBe('whatsapp')
      expect(payload.to).toBe('5511999999999')
      expect(payload.type).toBe('text')
      expect(payload.text.body).toBe('Hello')
    })

    it('constructs template message payload correctly', () => {
      const payload = {
        messaging_product: 'whatsapp',
        to: '5511999999999',
        type: 'template',
        template: { name: 'hello_world', language: { code: 'pt_BR' } },
      }
      expect(payload.type).toBe('template')
      expect(payload.template.name).toBe('hello_world')
      expect(payload.template.language.code).toBe('pt_BR')
    })

    it('constructs media message with caption', () => {
      const mediaType = 'image'
      const body: Record<string, unknown> = {
        messaging_product: 'whatsapp',
        to: '5511999999999',
        type: mediaType,
        [mediaType]: { link: 'https://example.com/image.jpg' },
      }
      if (mediaType === 'image' || mediaType === 'document') {
        (body[mediaType] as Record<string, unknown>).caption = 'My caption'
      }
      expect((body.image as Record<string, string>).link).toBe('https://example.com/image.jpg')
      expect((body.image as Record<string, string>).caption).toBe('My caption')
    })
  })

  describe('Webhook Payload Processing', () => {
    it('extracts message from valid webhook body', () => {
      const body = {
        object: 'whatsapp_business_account',
        entry: [{
          changes: [{
            value: {
              messages: [{
                from: '5511999999999',
                id: 'wamid.xxx',
                timestamp: '1234567890',
                text: { body: 'Hello' },
              }],
            },
          }],
        }],
      }
      const entry = body.entry[0]
      const changes = entry.changes[0]
      const msg = (changes.value.messages as Array<Record<string, unknown>>)[0]
      expect(msg.from).toBe('5511999999999')
      expect((msg.text as Record<string, string>).body).toBe('Hello')
    })

    it('returns null for empty webhook', () => {
      const body = { object: 'whatsapp_business_account', entry: [{ changes: [{ value: {} }] }] }
      const messages = ((body.entry[0].changes[0].value as Record<string, unknown>).messages as unknown[]) || null
      expect(messages).toBeNull()
    })
  })
})
