"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Bell,
  UserPlus,
  Command,
  ChevronDown,
  LogOut,
  Settings,
  Menu,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { CommandPalette } from "./command-palette";
import { QuickCreateLead } from "@/components/leads/quick-create-lead";
import { useRBAC } from "@/hooks/use-rbac";
import { cn } from "@/lib/utils";

const routeTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/leads": "Leads",
  "/pipeline": "Pipeline",
  "/deals": "Negocios",
  "/whatsapp": "WhatsApp",
  "/atendimento": "Atendimento",
  "/campaigns": "Campanhas",
  "/disparos": "Campanhas",
  "/meta-ads": "Meta Ads",
  "/tasks": "Tarefas",
  "/team": "Equipe",
  "/ai-assistant": "Assistente IA",
  "/relatorios": "Relatorios",
  "/departamentos": "Departamentos",
  "/configuracoes": "Configuracoes",
};

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrador",
  gestor: "Gestor",
  supervisor: "Supervisor",
  operador: "Operador",
};

function initials(name?: string | null): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "U";
}

function relTime(iso: string): string {
  // eslint-disable-next-line react-hooks/purity -- timestamp relativo de exibição
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
}

export function Header({
  onMobileMenuToggle,
}: {
  onMobileMenuToggle?: () => void;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { isAdmin } = useRBAC();
  const [commandOpen, setCommandOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [notifications, setNotifications] = useState<
    {
      id: string;
      type: string;
      title: string;
      body?: string | null;
      link?: string | null;
      read: boolean;
      createdAt: string;
    }[]
  >([]);
  const [unread, setUnread] = useState(0);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const d = await res.json();
      setNotifications(d.notifications || []);
      setUnread(d.unread || 0);
    } catch {
      /* silencioso */
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect -- carregamento assíncrono */
  useEffect(() => {
    loadNotifications();
    const t = setInterval(loadNotifications, 20000);
    return () => clearInterval(t);
  }, [loadNotifications]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function openNotifications() {
    const willOpen = !notifOpen;
    setNotifOpen(willOpen);
    if (willOpen && unread > 0) {
      setUnread(0);
      try {
        await fetch("/api/notifications", { method: "POST", body: "{}" });
      } catch {
        /* silencioso */
      }
    }
  }

  const user = session?.user as
    | { name?: string | null; email?: string | null; role?: string }
    | undefined;
  const userName = user?.name || "Usuário";
  const userEmail = user?.email || "";
  const roleLabel = ROLE_LABEL[user?.role || ""] || "Usuário";

  const pageTitle =
    routeTitles[pathname ?? ""] ??
    Object.entries(routeTitles).find(([path]) =>
      pathname?.startsWith(path),
    )?.[1] ??
    "AIFLUENT";

  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">
        <div className="flex items-center gap-3">
          {onMobileMenuToggle && (
            <button
              onClick={onMobileMenuToggle}
              className="lg:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
          <h1 className="text-lg font-semibold text-gray-900">{pageTitle}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCommandOpen(true)}
            className="flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-700"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Buscar...</span>
            <kbd className="ml-2 hidden rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-gray-400 sm:inline-flex">
              <Command className="mr-0.5 h-2.5 w-2.5" />K
            </kbd>
          </button>
          <button
            onClick={() => setQuickCreateOpen(true)}
            className="flex h-9 items-center gap-2 rounded-lg bg-indigo-600 px-3 text-sm font-medium text-white shadow-sm shadow-indigo-500/20 transition-colors hover:bg-indigo-500"
          >
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo Lead</span>
          </button>
          <div className="relative">
            <button
              onClick={openNotifications}
              className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
            >
              <Bell className="h-4 w-4" />
              {unread > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>
            <AnimatePresence>
              {notifOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setNotifOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl bg-white border border-gray-200 shadow-lg p-2"
                  >
                    <p className="px-2 py-2 text-sm font-semibold text-gray-900">
                      Notificações
                    </p>
                    {notifications.length === 0 ? (
                      <p className="py-6 text-center text-sm text-gray-400">
                        Você não tem notificações.
                      </p>
                    ) : (
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.map((n) => (
                          <a
                            key={n.id}
                            href={n.link || "#"}
                            onClick={() => setNotifOpen(false)}
                            className={cn(
                              "flex items-start gap-2 rounded-lg p-2 transition-colors hover:bg-gray-50",
                              !n.read && "bg-indigo-50/40",
                            )}
                          >
                            <span
                              className={cn(
                                "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                                n.read ? "bg-gray-300" : "bg-indigo-500",
                              )}
                            />
                            <span className="min-w-0">
                              <span className="block truncate text-sm text-gray-800">
                                {n.title}
                              </span>
                              {n.body && (
                                <span className="block truncate text-xs text-gray-500">
                                  {n.body}
                                </span>
                              )}
                              <span className="text-[10px] text-gray-400">
                                {relTime(n.createdAt)}
                              </span>
                            </span>
                          </a>
                        ))}
                      </div>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen((o) => !o)}
              className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-gray-50"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-500">
                <span className="text-xs font-bold text-white">
                  {initials(userName)}
                </span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
            </button>
            <AnimatePresence>
              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full z-50 mt-2 w-60 rounded-xl bg-white border border-gray-200 shadow-lg p-2"
                  >
                    <div className="border-b border-gray-100 px-3 py-2 mb-1">
                      <p className="text-sm font-medium text-gray-900">
                        {userName}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {userEmail}
                      </p>
                      <span className="mt-1 inline-block rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600">
                        {roleLabel}
                      </span>
                    </div>
                    {isAdmin && (
                      <a
                        href="/configuracoes"
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
                      >
                        <Settings className="h-4 w-4" /> Configurações
                      </a>
                    )}
                    <div className="mt-1 border-t border-gray-100 pt-1">
                      <button
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-500 transition-colors hover:bg-rose-50"
                      >
                        <LogOut className="h-4 w-4" /> Sair
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
      <QuickCreateLead
        open={quickCreateOpen}
        onOpenChange={setQuickCreateOpen}
      />
    </>
  );
}
