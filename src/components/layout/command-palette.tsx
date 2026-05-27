'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import * as Dialog from '@radix-ui/react-dialog'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  UserPlus,
  Megaphone,
  Handshake,
  LayoutDashboard,
  Users,
  Kanban,
  MessageCircle,
  BarChart3,
  Settings,
  ArrowRight,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface CommandItem {
  id: string
  label: string
  description?: string
  icon: React.ElementType
  shortcut?: string
  action: () => void
  section: 'quick' | 'navigate' | 'recent'
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  const navigate = useCallback(
    (path: string) => {
      onOpenChange(false)
      router.push(path)
    },
    [onOpenChange, router]
  )

  const items: CommandItem[] = [
    // Quick actions
    {
      id: 'new-lead',
      label: 'Novo Lead',
      description: 'Criar um novo lead',
      icon: UserPlus,
      shortcut: 'L',
      action: () => navigate('/leads?new=true'),
      section: 'quick',
    },
    {
      id: 'new-campaign',
      label: 'Nova Campanha',
      description: 'Criar uma campanha',
      icon: Megaphone,
      shortcut: 'C',
      action: () => navigate('/campaigns?new=true'),
      section: 'quick',
    },
    {
      id: 'new-deal',
      label: 'Novo Negocio',
      description: 'Registrar um negocio',
      icon: Handshake,
      shortcut: 'N',
      action: () => navigate('/deals?new=true'),
      section: 'quick',
    },
    // Recent
    {
      id: 'recent-leads',
      label: 'Leads',
      description: 'Visto recentemente',
      icon: Clock,
      action: () => navigate('/leads'),
      section: 'recent',
    },
    {
      id: 'recent-pipeline',
      label: 'Pipeline',
      description: 'Visto recentemente',
      icon: Clock,
      action: () => navigate('/pipeline'),
      section: 'recent',
    },
    // Navigation
    {
      id: 'nav-dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      action: () => navigate('/dashboard'),
      section: 'navigate',
    },
    {
      id: 'nav-leads',
      label: 'Leads',
      icon: Users,
      action: () => navigate('/leads'),
      section: 'navigate',
    },
    {
      id: 'nav-pipeline',
      label: 'Pipeline',
      icon: Kanban,
      action: () => navigate('/pipeline'),
      section: 'navigate',
    },
    {
      id: 'nav-whatsapp',
      label: 'WhatsApp',
      icon: MessageCircle,
      action: () => navigate('/whatsapp'),
      section: 'navigate',
    },
    {
      id: 'nav-reports',
      label: 'Relatorios',
      icon: BarChart3,
      action: () => navigate('/reports'),
      section: 'navigate',
    },
    {
      id: 'nav-settings',
      label: 'Configuracoes',
      icon: Settings,
      action: () => navigate('/settings'),
      section: 'navigate',
    },
  ]

  const filtered = query
    ? items.filter(
        (item) =>
          item.label.toLowerCase().includes(query.toLowerCase()) ||
          item.description?.toLowerCase().includes(query.toLowerCase())
      )
    : items

  const sections = [
    { key: 'quick' as const, title: 'Acoes Rapidas' },
    { key: 'recent' as const, title: 'Recentes' },
    { key: 'navigate' as const, title: 'Navegar' },
  ]

  // Keyboard shortcut to open
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onOpenChange])

  // Arrow key navigation
  useEffect(() => {
    if (!open) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        filtered[selectedIndex]?.action()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, filtered, selectedIndex])

  // Reset on open/close or query change
  useEffect(() => {
    setSelectedIndex(0)
  }, [query, open])

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  let flatIndex = -1

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 z-50 overlay-backdrop"
              />
            </Dialog.Overlay>

            <Dialog.Content asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -10 }}
                transition={{ duration: 0.15 }}
                className="fixed left-1/2 top-[20%] z-50 w-full max-w-lg -translate-x-1/2 rounded-xl glass-card overflow-hidden shadow-2xl"
              >
                {/* Search input */}
                <div className="flex items-center gap-3 border-b border-slate-700/50 px-4 py-3">
                  <Search className="h-5 w-5 shrink-0 text-slate-500" />
                  <Dialog.Title className="sr-only">
                    Paleta de comandos
                  </Dialog.Title>
                  <input
                    type="text"
                    placeholder="Buscar acoes, paginas, leads..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="flex-1 bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-500"
                    autoFocus
                  />
                  <kbd className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                    ESC
                  </kbd>
                </div>

                {/* Results */}
                <div className="max-h-80 overflow-y-auto p-2">
                  {filtered.length === 0 && (
                    <div className="px-4 py-8 text-center">
                      <p className="text-sm text-slate-500">
                        Nenhum resultado encontrado
                      </p>
                    </div>
                  )}

                  {sections.map((section) => {
                    const sectionItems = filtered.filter(
                      (i) => i.section === section.key
                    )
                    if (sectionItems.length === 0) return null

                    return (
                      <div key={section.key} className="mb-2">
                        <p className="mb-1 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                          {section.title}
                        </p>
                        {sectionItems.map((item) => {
                          flatIndex++
                          const thisIndex = flatIndex
                          const isSelected = thisIndex === selectedIndex

                          return (
                            <button
                              key={item.id}
                              onClick={item.action}
                              onMouseEnter={() => setSelectedIndex(thisIndex)}
                              className={cn(
                                'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
                                isSelected
                                  ? 'bg-indigo-500/10 text-indigo-400'
                                  : 'text-slate-400 hover:bg-slate-800/50'
                              )}
                            >
                              <item.icon className="h-4 w-4 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p
                                  className={cn(
                                    'font-medium',
                                    isSelected
                                      ? 'text-slate-200'
                                      : 'text-slate-300'
                                  )}
                                >
                                  {item.label}
                                </p>
                                {item.description && (
                                  <p className="text-xs text-slate-500 truncate">
                                    {item.description}
                                  </p>
                                )}
                              </div>
                              {item.shortcut && (
                                <kbd className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                                  {item.shortcut}
                                </kbd>
                              )}
                              {isSelected && (
                                <ArrowRight className="h-3.5 w-3.5 text-indigo-400" />
                              )}
                            </button>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>

                {/* Footer hints */}
                <div className="flex items-center gap-4 border-t border-slate-700/50 px-4 py-2.5">
                  <div className="flex items-center gap-1 text-[10px] text-slate-500">
                    <kbd className="rounded border border-slate-700 bg-slate-800 px-1 py-0.5 font-medium">
                      ↑↓
                    </kbd>
                    <span>navegar</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500">
                    <kbd className="rounded border border-slate-700 bg-slate-800 px-1 py-0.5 font-medium">
                      ↵
                    </kbd>
                    <span>selecionar</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500">
                    <kbd className="rounded border border-slate-700 bg-slate-800 px-1 py-0.5 font-medium">
                      esc
                    </kbd>
                    <span>fechar</span>
                  </div>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}
