"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Kanban,
  Handshake,
  MessageCircle,
  Megaphone,
  Bot,
  CheckSquare,
  UsersRound,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  LogOut,
  X,
  Menu,
  Settings,
  Building2,
  Target,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useRBAC } from "@/hooks/use-rbac";
import { PERMISSIONS, type Permission } from "@/lib/rbac";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}
interface NavSection {
  title: string;
  items: NavItem[];
}

const navigation: NavSection[] = [
  {
    title: "PRINCIPAL",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Leads", href: "/leads", icon: Users },
      { label: "Pipeline", href: "/pipeline", icon: Kanban },
      { label: "Negocios", href: "/deals", icon: Handshake },
    ],
  },
  {
    title: "COMUNICACAO",
    items: [
      { label: "Atendimento", href: "/atendimento", icon: MessageCircle },
      { label: "Campanhas", href: "/campaigns", icon: Megaphone },
      { label: "Meta Ads", href: "/meta-ads", icon: Target },
    ],
  },
  {
    title: "GESTAO",
    items: [
      { label: "Tarefas", href: "/tasks", icon: CheckSquare },
      { label: "Equipe", href: "/team", icon: UsersRound },
      { label: "Relatorios", href: "/relatorios", icon: BarChart3 },
    ],
  },
  {
    title: "INTELIGENCIA",
    items: [{ label: "Assistente IA", href: "/ai-assistant", icon: Bot }],
  },
  {
    title: "ADMIN",
    items: [
      { label: "Departamentos", href: "/departamentos", icon: Building2 },
      { label: "Configuracoes", href: "/configuracoes", icon: Settings },
    ],
  },
];

function SidebarContent({
  collapsed,
  onLinkClick,
}: {
  collapsed: boolean;
  onLinkClick?: () => void;
}) {
  const pathname = usePathname();
  const { can } = useRBAC();
  const { data: session } = useSession();
  const sUser = session?.user as
    | { name?: string | null; role?: string }
    | undefined;
  const sName = sUser?.name || "Usuário";
  const sRole =
    (
      {
        admin: "Administrador",
        gestor: "Gestor",
        supervisor: "Supervisor",
        operador: "Operador",
      } as Record<string, string>
    )[sUser?.role || ""] || "Usuário";
  const sInit =
    sName
      .trim()
      .split(/\s+/)
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";

  const filteredNavigation = navigation
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        const permKey = `page:${item.href.slice(1)}` as Permission;
        // If the permission is not defined in RBAC, allow access by default
        if (!(permKey in PERMISSIONS)) return true;
        return can(permKey);
      }),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {filteredNavigation.map((section) => (
          <div key={section.title}>
            <AnimatePresence>
              {!collapsed && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400"
                >
                  {section.title}
                </motion.p>
              )}
            </AnimatePresence>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname?.startsWith(item.href + "/");
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onLinkClick}
                      className={cn(
                        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                        collapsed && "justify-center px-0",
                        isActive
                          ? "bg-indigo-50 text-indigo-600"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                      )}
                    >
                      <item.icon
                        className={cn(
                          "h-5 w-5 shrink-0 transition-colors",
                          isActive
                            ? "text-indigo-600"
                            : "text-gray-400 group-hover:text-gray-600",
                        )}
                      />
                      <AnimatePresence>
                        {!collapsed && (
                          <motion.span
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: "auto" }}
                            exit={{ opacity: 0, width: 0 }}
                            transition={{ duration: 0.15 }}
                            className="truncate flex-1"
                          >
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                      {!collapsed && item.badge && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-100 px-1.5 text-[10px] font-bold text-rose-600">
                          {item.badge}
                        </span>
                      )}
                      {isActive && (
                        <motion.div
                          layoutId="sidebar-active"
                          className="absolute left-0 h-8 w-[3px] rounded-r-full bg-indigo-600"
                          transition={{
                            type: "spring",
                            stiffness: 350,
                            damping: 30,
                          }}
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-gray-200 p-3">
        <div
          className={cn(
            "flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-gray-50",
            collapsed && "justify-center",
          )}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-500">
            <span className="text-xs font-bold text-white">{sInit}</span>
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                className="flex-1 min-w-0"
              >
                <p className="truncate text-sm font-medium text-gray-900">
                  {sName}
                </p>
                <p className="truncate text-xs text-gray-500">{sRole}</p>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {!collapsed && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Sair"
              >
                <LogOut className="h-4 w-4" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 280 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="relative hidden lg:flex h-dvh flex-col border-r border-gray-200 bg-white"
    >
      <div className="flex h-16 items-center gap-3 border-b border-gray-200 px-5">
        <Image
          src="/logo.png"
          alt="AIFLUENT"
          width={36}
          height={36}
          className="shrink-0 rounded-lg object-contain"
        />
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="gradient-text text-lg font-bold tracking-tight"
            >
              AIFLUENT
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <SidebarContent collapsed={collapsed} />

      <button
        onClick={() => setCollapsed((c) => !c)}
        className="absolute -right-3 top-20 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-600"
        aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
      >
        {collapsed ? (
          <ChevronRight className="h-3.5 w-3.5" />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5" />
        )}
      </button>
    </motion.aside>
  );
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="lg:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
      aria-label="Abrir menu"
    >
      <Menu className="h-5 w-5" />
    </button>
  );
}

export function MobileSidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/30 lg:hidden"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col bg-white shadow-xl lg:hidden"
          >
            <div className="flex h-16 items-center justify-between border-b border-gray-200 px-5">
              <div className="flex items-center gap-3">
                <Image
                  src="/logo.png"
                  alt="AIFLUENT"
                  width={36}
                  height={36}
                  className="shrink-0 rounded-lg object-contain"
                />
                <span className="gradient-text text-lg font-bold tracking-tight">
                  AIFLUENT
                </span>
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                aria-label="Fechar menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <SidebarContent collapsed={false} onLinkClick={onClose} />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
