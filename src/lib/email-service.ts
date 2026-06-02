const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@aifluent.com'

interface EmailOptions {
  to: string
  subject: string
  html?: string
  text?: string
}

export async function sendEmail(options: EmailOptions): Promise<{ id: string } | { error: string }> {
  if (!RESEND_API_KEY) {
    return { error: 'Email nao configurado. Defina RESEND_API_KEY.' }
  }

  try {
    const { Resend } = await import('resend')
    const resend = new Resend(RESEND_API_KEY)

    const payload: Record<string, unknown> = {
      from: FROM_EMAIL,
      to: options.to,
      subject: options.subject,
    }
    if (options.html) payload.html = options.html
    if (options.text) payload.text = options.text

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await resend.emails.send(payload as any)

    if (result.error) return { error: result.error.message }
    return { id: result.data?.id || 'sent' }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao enviar email' }
  }
}
