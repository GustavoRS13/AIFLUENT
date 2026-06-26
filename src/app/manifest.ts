import type { MetadataRoute } from "next";

// Manifest do PWA — torna o CRM instalável como app (iOS/Android/desktop).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AIFLUENT CRM",
    short_name: "AIFLUENT",
    description:
      "CRM inteligente: leads, pipeline, atendimento WhatsApp e automação comercial.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#4f46e5",
    lang: "pt-BR",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
