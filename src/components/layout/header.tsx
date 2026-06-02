'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Bell, UserPlus, Sparkles, Command, ChevronDown, LogOut, Settings, User, Menu,
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import { CommandPalette } from './command-palette'
import { QuickCreateLead } from '@/components/leads/quick-create-lead'

const routeTitles: Record<string, string> = {
  '/dashboard': 'Dashboard', '/leads': 'Leads', '/pipeline': 'Pipeline', '/deals': 'Negocios',
  '/whatsapp': 'WhatsApp', '/atendimento': 'Atendimento', '/campaigns': 'Campanhas',
  '/tasks': 'Tarefas', '/team': 'Equipe',
  '/ai-assistant': 'Assistente IA',
  '/relatorios': 'Relatorios',
}

export function Header({ onMobileMenuToggle }: { onMobileMenuToggle?: () => void }) {
  const pathname = usePathname()
  const [commandOpen, setCommandOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [quickCreateOpen, setQuickCreateOpen] = useState(false)

  const pageTitle = routeTitles[pathname ?? ''] ?? Object.entries(routeTitles).find(([path]) => pathname?.startsWith(path))?.[1] ?? 'Dashboard'

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
          <button onClick={() => setCommandOpen(true)} className="flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-700">
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Buscar...</span>
            <kbd className="ml-2 hidden rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-gray-400 sm:inline-flex">
              <Command className="mr-0.5 h-2.5 w-2.5" />K
            </kbd>
          </button>
          <button onClick={() => setQuickCreateOpen(true)} className="flex h-9 items-center gap-2 rounded-lg bg-indigo-600 px-3 text-sm font-medium text-white shadow-sm shadow-indigo-500/20 transition-colors hover:bg-indigo-500">
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo Lead</span>
          </button>
          <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600">
            <Sparkles className="h-4 w-4" />
          </button>
          <div className="relative">
            <button onClick={() => setNotifOpen((o) => !o)} className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600">
              <Bell className="h-4 w-4" />
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">3</span>
            </button>
            <AnimatePresence>
              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                  <motion.div initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.95 }} transition={{ duration: 0.15 }} className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl bg-white border border-gray-200 shadow-lg p-4">
                    <p className="mb-3 text-sm font-semibold text-gray-900">Notificacoes</p>
                    <div className="space-y-2">
                      {[{ text: 'Novo lead: Maria Silva', time: 'Ha 5 min' }, { text: 'Campanha "Black Friday" enviada', time: 'Ha 1h' }, { text: 'Negocio R$45k fechado', time: 'Ha 2h' }].map((n, i) => (
                        <div key={i} className="flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-gray-50">
                          <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                          <div>
                            <p className="text-sm text-gray-700">{n.text}</p>
                            <p className="text-xs text-gray-400">{n.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
          <div className="relative">
            <button onClick={() => setUserMenuOpen((o) => !o)} className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-gray-50">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-500">
                <span className="text-xs font-bold text-white">AI</span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
            </button>
            <AnimatePresence>
              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <motion.div initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.95 }} transition={{ duration: 0.15 }} className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl bg-white border border-gray-200 shadow-lg p-2">
                    <div className="border-b border-gray-100 px-3 py-2 mb-1">
                      <p className="text-sm font-medium text-gray-900">AIFLUENT</p>
                      <p className="text-xs text-gray-500">admin@aifluent.com</p>
                    </div>
                    {[{ label: 'Meu perfil', icon: User, href: '#' }, { label: 'Configuracoes', icon: Settings, href: '/settings' }].map((item) => (
                      <a key={item.label} href={item.href} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900">
                        <item.icon className="h-4 w-4" /> {item.label}
                      </a>
                    ))}
                    <div className="mt-1 border-t border-gray-100 pt-1">
                      <button onClick={() => signOut({ callbackUrl: '/login' })} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-500 transition-colors hover:bg-rose-50">
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
      <QuickCreateLead open={quickCreateOpen} onOpenChange={setQuickCreateOpen} />
    </>
  )
}
