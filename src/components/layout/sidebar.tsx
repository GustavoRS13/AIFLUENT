'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Users,
  Kanban,
  Handshake,
  Inbox,
  MessageCircle,
  Megaphone,
  FileText,
  Phone,
  Bot,
  Workflow,
  Target,
  CheckSquare,
  Trophy,
  UsersRound,
  BarChart3,
  Plug,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  badge?: string
}

interface NavSection {
  title: string
  items: NavItem[]
}

const navigation: NavSection[] = [
  {
    title: 'PRINCIPAL',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Leads', href: '/leads', icon: Users },
      { label: 'Pipeline', href: '/pipeline', icon: Kanban },
      { label: 'Negocios', href: '/deals', icon: Handshake },
    ],
  },
  {
    title: 'COMUNICACAO',
    items: [
      { label: 'Inbox', href: '/inbox', icon: Inbox, badge: '12' },
      { label: 'WhatsApp', href: '/whatsapp', icon: MessageCircle },
      { label: 'Telefonia', href: '/phone', icon: Phone },
      { label: 'Campanhas', href: '/campaigns', icon: Megaphone },
      { label: 'Templates', href: '/templates', icon: FileText },
    ],
  },
  {
    title: 'MARKETING',
    items: [
      { label: 'Meta Ads', href: '/meta-ads', icon: Target },
      { label: 'Automacoes', href: '/automations', icon: Workflow },
    ],
  },
  {
    title: 'GESTAO',
    items: [
      { label: 'Tarefas', href: '/tasks', icon: CheckSquare },
      { label: 'Produtividade', href: '/productivity', icon: Trophy },
      { label: 'Equipe', href: '/team', icon: UsersRound },
      { label: 'Relatorios', href: '/reports', icon: BarChart3 },
    ],
  },
  {
    title: 'INTELIGENCIA',
    items: [
      { label: 'Assistente IA', href: '/ai-assistant', icon: Bot },
    ],
  },
  {
    title: 'CONFIGURACOES',
    items: [
      { label: 'Integracoes', href: '/integrations', icon: Plug },
      { label: 'Seguranca', href: '/security', icon: Shield },
      { label: 'Configuracoes', href: '/settings', icon: Settings },
    ],
  },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 280 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="relative flex h-dvh flex-col border-r border-slate-800/50 glass"
    >
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-800/50 px-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-400 shadow-lg shadow-indigo-500/20">
          <span className="text-sm font-extrabold text-white tracking-tight">AI</span>
        </div>
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

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {navigation.map((section) => (
          <div key={section.title}>
            <AnimatePresence>
              {!collapsed && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500"
                >
                  {section.title}
                </motion.p>
              )}
            </AnimatePresence>

            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
                        collapsed && 'justify-center px-0',
                        isActive
                          ? 'bg-indigo-500/10 text-indigo-400'
                          : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                      )}
                    >
                      <item.icon
                        className={cn(
                          'h-5 w-5 shrink-0 transition-colors',
                          isActive
                            ? 'text-indigo-400'
                            : 'text-slate-500 group-hover:text-slate-300'
                        )}
                      />
                      <AnimatePresence>
                        {!collapsed && (
                          <motion.span
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: 'auto' }}
                            exit={{ opacity: 0, width: 0 }}
                            transition={{ duration: 0.15 }}
                            className="truncate flex-1"
                          >
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>

                      {!collapsed && item.badge && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500/20 px-1.5 text-[10px] font-bold text-rose-400">
                          {item.badge}
                        </span>
                      )}

                      {isActive && (
                        <motion.div
                          layoutId="sidebar-active"
                          className="absolute left-0 h-8 w-[3px] rounded-r-full bg-indigo-500"
                          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                        />
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User profile */}
      <div className="border-t border-slate-800/50 p-3">
        <div
          className={cn(
            'flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-slate-800/50',
            collapsed && 'justify-center'
          )}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500">
            <span className="text-xs font-bold text-white">RR</span>
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                className="flex-1 min-w-0"
              >
                <p className="truncate text-sm font-medium text-slate-200">
                  Raphael Ruiz
                </p>
                <p className="truncate text-xs text-slate-500">Administrador</p>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {!collapsed && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-slate-500 hover:text-slate-300 transition-colors"
                aria-label="Sair"
              >
                <LogOut className="h-4 w-4" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="absolute -right-3 top-20 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-slate-700/50 bg-slate-900 text-slate-400 shadow-lg transition-colors hover:bg-slate-800 hover:text-slate-200"
        aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
      >
        {collapsed ? (
          <ChevronRight className="h-3.5 w-3.5" />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5" />
        )}
      </button>
    </motion.aside>
  )
}
