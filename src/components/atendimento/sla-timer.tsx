"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const WINDOW_MS = 24 * 60 * 60 * 1000; // janela de 24h do WhatsApp

interface SLATimerProps {
  // Última mensagem RECEBIDA do cliente — início da janela de 24h.
  lastInboundAt?: string | null;
  className?: string;
}

// Mostra o TEMPO RESTANTE da janela de 24h (ex.: 23:59, 22:52) até a Meta
// fechar a conversa. Após 24h sem resposta do cliente, só template é permitido.
export function SLATimer({ lastInboundAt, className }: SLATimerProps) {
  const [remaining, setRemaining] = useState<number | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect -- timer de contagem regressiva */
  useEffect(() => {
    if (!lastInboundAt) {
      setRemaining(null);
      return;
    }
    const calc = () => {
      const elapsed = Date.now() - new Date(lastInboundAt).getTime();
      setRemaining(Math.max(0, WINDOW_MS - elapsed));
    };
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [lastInboundAt]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Sem mensagem recebida ainda → não há janela aberta
  if (!lastInboundAt) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-semibold text-gray-500",
          className,
        )}
      >
        Sem janela ativa
      </span>
    );
  }

  const ms = remaining ?? 0;
  const expired = ms <= 0;
  const totalMin = Math.floor(ms / 60000);
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  const display = `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;

  // Verde > 4h, amarelo 1-4h, vermelho < 1h, cinza = fechada
  const tone = expired
    ? "bg-gray-100 text-gray-500 border-gray-200"
    : hours >= 4
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : hours >= 1
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-rose-50 text-rose-700 border-rose-200";
  const dot = expired
    ? "bg-gray-400"
    : hours >= 4
      ? "bg-emerald-500"
      : hours >= 1
        ? "bg-amber-500"
        : "bg-rose-500 animate-pulse";

  return (
    <span
      title={
        expired
          ? "Janela de 24h fechada — só é possível enviar template"
          : "Tempo restante da janela de 24h do WhatsApp"
      }
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold tabular-nums",
        tone,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
      {expired ? "Janela fechada" : `${display} restantes`}
    </span>
  );
}
