"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { MessageCircle, Loader2, CheckCircle2 } from "lucide-react";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    FB?: any;
    fbAsyncInit?: () => void;
  }
}

export default function ConectarWhatsAppPage() {
  const [appId, setAppId] = useState("");
  const [configId, setConfigId] = useState("");
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const sessionRef = useRef<{ waba_id?: string; phone_number_id?: string }>({});

  // 1) busca appId/configId e carrega o SDK do Facebook
  useEffect(() => {
    let cancelled = false;
    fetch("/api/whatsapp/embedded-signup/config")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setAppId(d.appId);
        setConfigId(d.configId);
      });

    const onMsg = (e: MessageEvent) => {
      if (!e.origin.endsWith("facebook.com") || typeof e.data !== "string")
        return;
      try {
        const data = JSON.parse(e.data);
        if (data.type === "WA_EMBEDDED_SIGNUP" && data.data) {
          sessionRef.current = {
            waba_id: data.data.waba_id,
            phone_number_id: data.data.phone_number_id,
          };
        }
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("message", onMsg);
    return () => {
      cancelled = true;
      window.removeEventListener("message", onMsg);
    };
  }, []);

  // 2) inicializa o SDK quando o appId estiver disponível
  useEffect(() => {
    if (!appId) return;
    window.fbAsyncInit = function () {
      window.FB?.init({
        appId,
        cookie: true,
        xfbml: false,
        version: "v21.0",
      });
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setReady(true);
    };
    if (!document.getElementById("fb-sdk")) {
      const s = document.createElement("script");
      s.id = "fb-sdk";
      s.src = "https://connect.facebook.net/en_US/sdk.js";
      s.async = true;
      s.defer = true;
      s.crossOrigin = "anonymous";
      document.body.appendChild(s);
    } else if (window.FB) {
      window.FB.init({ appId, cookie: true, xfbml: false, version: "v21.0" });
      setReady(true); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [appId]);

  const finish = useCallback(async (code: string) => {
    setBusy(true);
    setStatus("Conectando o número ao AIFLUENT…");
    try {
      const res = await fetch("/api/whatsapp/embedded-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, ...sessionRef.current }),
      });
      const d = await res.json();
      if (res.ok && d.ok) {
        setStatus("✅ Conectado! O WhatsApp já está vinculado ao AIFLUENT.");
      } else {
        setStatus(
          "⚠️ " +
            JSON.stringify(d.detail || d.sub || d.error || d).slice(0, 500),
        );
      }
    } catch (e) {
      setStatus("Falha: " + String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  const connect = useCallback(() => {
    if (!window.FB || !configId) return;
    setStatus("");
    window.FB.login(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (response: any) => {
        const code = response?.authResponse?.code;
        if (code) finish(code);
        else setStatus("Login cancelado ou sem código.");
      },
      {
        config_id: configId,
        response_type: "code",
        override_default_response_type: true,
        extras: { setup: {}, featureType: "", sessionInfoVersion: "3" },
      },
    );
  }, [configId, finish]);

  return (
    <div className="mx-auto max-w-xl space-y-5 py-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <MessageCircle className="h-6 w-6 text-emerald-600" /> Conectar
          WhatsApp
        </h1>
        <p className="mt-1 text-gray-500">
          Reconecta o número da Mindset ao AIFLUENT (Embedded Signup da Meta). O
          número <b>permanece na conta da Mindset</b> — isso só faz as respostas
          chegarem no seu CRM.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <ol className="mb-4 list-decimal space-y-1 pl-5 text-sm text-gray-600">
          <li>Clique em “Conectar WhatsApp”.</li>
          <li>No popup do Facebook, faça login com a conta da Mindset.</li>
          <li>
            Selecione o <b>Mindset Institute</b> e o número{" "}
            <b>+55 11 94742-3709</b>.
          </li>
          <li>Confirme. Pronto — as respostas voltam a chegar.</li>
        </ol>

        <button
          onClick={connect}
          disabled={!ready || busy}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MessageCircle className="h-4 w-4" />
          )}
          {ready ? "Conectar WhatsApp" : "Carregando…"}
        </button>

        {status && (
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
            {status.startsWith("✅") && (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            )}
            <span className="whitespace-pre-wrap break-words">{status}</span>
          </div>
        )}
      </div>
    </div>
  );
}
