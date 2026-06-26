export { auth as proxy } from "@/lib/auth";

export const config = {
  matcher: [
    "/((?!api/auth|api/health|api/whatsapp|api/meta/webhook|api/automation/cron|api/cron|_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|logo.png|manifest.webmanifest|sw.js|icon-192.png|icon-512.png|icon-maskable.png|login|privacidade).*)",
  ],
};
