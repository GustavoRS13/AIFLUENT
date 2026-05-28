'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Bell,
  UserPlus,
  Sparkles,
  Command,
  ChevronDown,
  LogOut,
  Settings,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CommandPalette } from './command-palette'

const routeTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/leads': 'Leads',
  '/pipeline': 'Pipeline',
  '/deals': 'Negocios',
  '/inbox': 'Inbox',
  '/whatsapp': 'WhatsApp',
  '/phone': 'Telefonia',
  '/campaigns': 'Campanhas',
  '/templates': 'Templates',
  '/meta-ads': 'Meta Ads',
  '/automations': 'Automacoes',
  '/tasks': 'Tarefas',
  '/productivity': 'Produtividade',
  '/team': 'Equipe',
  '/reports': 'Relatorios',
  '/ai-assistant': 'Assistente IA',
  '/integrations': 'Integracoes',
  '/security': 'Seguranca',
  '/settings': 'Configuracoes',
}

export function Header() {
  const pathname = usePathname()
  const [commandOpen, setCommandOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const pageTitle =
    routeTitles[pathname ?? ''] ??
    Object.entries(routeTitles).find(([path]) =>
      pathname?.startsWith(path)
    )?.[1] ??
    'Dashboard'

  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800/50 px-6 glass-sm">
        {/* Left: Page title */}
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-slate-100">{pageTitle}</h1>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Search trigger */}
          <button
            onClick={() => setCommandOpen(true)}
            className="flex h-9 items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-800/50 px-3 text-sm text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-300"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Buscar...</span>
            <kbd className="ml-2 hidden rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 sm:inline-flex">
              <Command className="mr-0.5 h-2.5 w-2.5" />K
            </kbd>
          </button>

          {/* New Lead */}
          <Link
            href="/leads?new=1"
            className="flex h-9 items-center gap-2 rounded-lg bg-indigo-600 px-3 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-colors hover:bg-indigo-500"
          >
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo Lead</span>
          </Link>

          {/* AI Assistant */}
          <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700/50 text-slate-400 transition-colors hover:border-indigo-500/30 hover:bg-indigo-500/10 hover:text-indigo-400">
            <Sparkles className="h-4 w-4" />
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen((o) => !o)}
              className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700/50 text-slate-400 transition-colors hover:bg-slate-800/80 hover:text-slate-300"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                3
              </span>
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
                    className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl glass-card p-4"
                  >
                    <p className="mb-3 text-sm font-semibold text-slate-200">
                      Notificacoes
                    </p>
                    <div className="space-y-2">
                      {[
                        {
                          text: 'Novo lead: Maria Silva',
                          time: 'Ha 5 min',
                        },
                        {
                          text: 'Campanha "Black Friday" enviada',
                          time: 'Ha 1h',
                        },
                        {
                          text: 'Negocio R$45k fechado',
                          time: 'Ha 2h',
                        },
                      ].map((n, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-slate-800/50"
                        >
                          <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                          <div>
                            <p className="text-sm text-slate-300">{n.text}</p>
                            <p className="text-xs text-slate-500">{n.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* User avatar dropdown */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen((o) => !o)}
              className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-slate-800/50"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500">
                <span className="text-xs font-bold text-white">RR</span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
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
                    className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl glass-card p-2"
                  >
                    <div className="border-b border-slate-700/50 px-3 py-2 mb-1">
                      <p className="text-sm font-medium text-slate-200">
                        Raphael Ruiz
                      </p>
                      <p className="text-xs text-slate-500">
                        raphael@aifluent.com
                      </p>
                    </div>
                    {[
                      { label: 'Meu perfil', icon: User, href: '#' },
                      { label: 'Configuracoes', icon: Settings, href: '/settings' },
                    ].map((item) => (
                      <a
                        key={item.label}
                        href={item.href}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-slate-800/50 hover:text-slate-200"
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </a>
                    ))}
                    <div className="mt-1 border-t border-slate-700/50 pt-1">
                      <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-400 transition-colors hover:bg-rose-500/10">
                        <LogOut className="h-4 w-4" />
                        Sair
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
    </>
  )
}
