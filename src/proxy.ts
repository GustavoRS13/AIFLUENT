export { auth as proxy } from '@/lib/auth'

export const config = {
  matcher: ['/((?!api/auth|api/health|api/whatsapp|api/automation/cron|_next/static|_next/image|favicon.ico|logo.png|login).*)'],
}
