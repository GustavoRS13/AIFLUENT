import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider } from "@/components/session-provider";
import { PWARegister } from "@/components/pwa-register";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "AIFLUENT | CRM Inteligente",
  description:
    "Plataforma CRM inteligente com IA para gestao de leads, pipeline de vendas, campanhas de WhatsApp e automacao comercial.",
  // favicon vem de src/app/icon.png (logo AIFLUENT) — convenção do App Router
  applicationName: "AIFLUENT CRM",
  appleWebApp: {
    capable: true,
    title: "AIFLUENT",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <SessionProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </SessionProvider>
        <PWARegister />
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
