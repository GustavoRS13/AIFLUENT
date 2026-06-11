"use client";

import { Phone, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickActionsBarProps {
  phone?: string | null;
  email?: string | null;
  leadId?: string | null;
  onCallLogged?: () => void;
  className?: string;
}

// Apenas ações REAIS ficam visíveis (sem botão falso). Agendar/Lembrete/IA/Marcar
// serão reativados quando os recursos forem implementados de ponta a ponta.
const actions = [
  {
    key: "phone",
    icon: Phone,
    label: "Ligar",
    color:
      "hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200",
  },
  {
    key: "email",
    icon: Mail,
    label: "Email",
    color: "hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200",
  },
] as const;

export function QuickActionsBar({
  phone,
  email,
  leadId,
  onCallLogged,
  className,
}: QuickActionsBarProps) {
  function handleClick(key: string) {
    if (key === "phone" && phone) {
      // registra a ligação no lead e abre o discador
      fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: phone,
          leadId,
          direction: "outbound",
        }),
      })
        .then(() => onCallLogged?.())
        .catch(() => {});
      window.open(`tel:${phone}`, "_self");
    }
    if (key === "email" && email) window.open(`mailto:${email}`, "_self");
  }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {actions.map(({ key, icon: Icon, label, color }) => (
        <button
          key={key}
          onClick={() => handleClick(key)}
          title={label}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-400 transition-all",
            color,
          )}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}
