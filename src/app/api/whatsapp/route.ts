import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, checkRateLimit } from '@/lib/api-auth'
import { whatsapp } from '@/lib/whatsapp'

export async function GET(request: NextRequest) {
  // Webhook verification (no auth required - Meta calls this)
  const { searchParams } = request.nextUrl
  const mode = searchParams.get('hub.mode') || ''
  const token = searchParams.get('hub.verify_token') || ''
  const challenge = searchParams.get('hub.challenge') || ''

  const result = whatsapp.verifyWebhook(mode, token, challenge)
  if (result) return new NextResponse(result, { status: 200 })
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalido' }, { status: 400 })
  }

  // Case 1: Incoming webhook from Meta (no auth needed)
  if (body.object === 'whatsapp_business_account') {
    const parsed = whatsapp.processWebhookPayload(body)
    if (parsed) {
      // TODO: persist incoming message to database / trigger automation
      console.log('[WhatsApp Webhook] Incoming message:', parsed)
    }
    // Meta requires 200 OK response for all webhook deliveries
    return NextResponse.json({ status: 'received' }, { status: 200 })
  }

  // Case 2: Send action from our UI (requires auth + rate limit)
  const rateLimited = checkRateLimit(request)
  if (rateLimited) return rateLimited

  const { error: authError } = await requireAuth()
  if (authError) return authError

  const { action, to, message, templateName, mediaUrl, mediaType } = body as {
    action?: string
    to?: string
    message?: string
    templateName?: string
    mediaUrl?: string
    mediaType?: 'image' | 'document' | 'audio' | 'video'
  }

  if (!whatsapp.isConfigured) {
    return NextResponse.json(
      {
        error:
          'WhatsApp Business API nao configurado. Defina WHATSAPP_PHONE_NUMBER_ID e WHATSAPP_ACCESS_TOKEN.',
        configured: false,
      },
      { status: 503 },
    )
  }

  if (!to) {
    return NextResponse.json({ error: 'Campo "to" obrigatorio' }, { status: 400 })
  }

  switch (action) {
    case 'send_text':
      if (!message) return NextResponse.json({ error: 'Campo "message" obrigatorio' }, { status: 400 })
      return NextResponse.json(await whatsapp.sendTextMessage(to, message))
    case 'send_template':
      if (!templateName) return NextResponse.json({ error: 'Campo "templateName" obrigatorio' }, { status: 400 })
      return NextResponse.json(
        await whatsapp.sendTemplateMessage(to, templateName, 'pt_BR'),
      )
    case 'send_media':
      if (!mediaUrl || !mediaType) return NextResponse.json({ error: 'Campos "mediaUrl" e "mediaType" obrigatorios' }, { status: 400 })
      return NextResponse.json(
        await whatsapp.sendMediaMessage(to, mediaType, mediaUrl, message),
      )
    default:
      return NextResponse.json({ error: 'Acao invalida. Use: send_text, send_template, send_media' }, { status: 400 })
  }
}
