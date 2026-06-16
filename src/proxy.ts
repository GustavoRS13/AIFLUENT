export { auth as proxy } from "@/lib/auth";

export const config = {
  matcher: [
    "/((?!api/auth|api/health|api/whatsapp|api/meta/webhook|api/automation/cron|api/cron|_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|logo.png|login|privacidade).*)",
  ],
};
