"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Registra o service worker (PWA) e oferece o botão "Instalar app".
export function PWARegister() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  // Já instalado (standalone) ou sem prompt disponível → não mostra nada.
  const standalone =
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      // iOS
      (window.navigator as unknown as { standalone?: boolean }).standalone);

  if (!deferred || dismissed || standalone) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-3 rounded-full border border-gray-200 bg-white px-4 py-2.5 shadow-lg">
      <Download className="h-4 w-4 text-indigo-600" />
      <span className="text-sm font-medium text-gray-800">
        Instalar o AIFLUENT como app
      </span>
      <button
        onClick={async () => {
          await deferred.prompt();
          await deferred.userChoice.catch(() => null);
          setDeferred(null);
        }}
        className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-500"
      >
        Instalar
      </button>
      <button
        onClick={() => setDismissed(true)}
        className="text-gray-400 hover:text-gray-600"
        aria-label="Fechar"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
