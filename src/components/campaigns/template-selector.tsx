'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  MessageSquare,
  Mail,
  Smartphone,
  X,
  Eye,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { CampaignChannel } from '@/types'

// ── Types ────────────────────────────────────────────────────────────────────

export interface MessageTemplate {
  id: string
  name: string
  category: 'boas-vindas' | 'follow-up' | 'promocao' | 'reengajamento' | 'cobranca' | 'evento' | 'geral'
  channel: CampaignChannel
  content: string
  variables: string[]
}

interface TemplateSelectorProps {
  channel?: CampaignChannel
  onSelect: (template: MessageTemplate) => void
  onClose: () => void
}

// ── Mock data ────────────────────────────────────────────────────────────────

const mockTemplates: MessageTemplate[] = [
  {
    id: 't1',
    name: 'Boas-vindas novo lead',
    category: 'boas-vindas',
    channel: 'whatsapp',
    content: 'Ola {{nome}}! Seja bem-vindo(a)! Sou {{consultor}} e estou aqui para te ajudar a encontrar o melhor curso. Quando podemos conversar?',
    variables: ['nome', 'consultor'],
  },
  {
    id: 't2',
    name: 'Follow-up 3 dias',
    category: 'follow-up',
    channel: 'whatsapp',
    content: 'Oi {{nome}}, tudo bem? Vi que voce demonstrou interesse no curso de {{curso}}. Tem alguma duvida que eu possa esclarecer?',
    variables: ['nome', 'curso'],
  },
  {
    id: 't3',
    name: 'Promocao especial',
    category: 'promocao',
    channel: 'whatsapp',
    content: '{{nome}}, temos uma condicao especial para o curso de {{curso}}! Desconto de 20% para matricula ate sexta. Quer saber mais?',
    variables: ['nome', 'curso'],
  },
  {
    id: 't4',
    name: 'Reengajamento',
    category: 'reengajamento',
    channel: 'whatsapp',
    content: 'Oi {{nome}}! Faz um tempo que nao conversamos. Gostaria de saber se ainda tem interesse no curso de {{curso}}. Estamos com novidades!',
    variables: ['nome', 'curso'],
  },
  {
    id: 't5',
    name: 'Email de boas-vindas',
    category: 'boas-vindas',
    channel: 'email',
    content: 'Prezado(a) {{nome}},\n\nSeja bem-vindo(a)! Ficamos felizes com seu interesse. O consultor {{consultor}} entrara em contato em breve.\n\nAtenciosamente,\nEquipe Comercial',
    variables: ['nome', 'consultor'],
  },
  {
    id: 't6',
    name: 'Lembrete de evento',
    category: 'evento',
    channel: 'sms',
    content: '{{nome}}, lembrete: amanha temos o evento sobre {{curso}}. Confirme sua presenca respondendo SIM.',
    variables: ['nome', 'curso'],
  },
  {
    id: 't7',
    name: 'Confirmacao de matricula',
    category: 'geral',
    channel: 'email',
    content: 'Parabens {{nome}}! Sua matricula no curso de {{curso}} foi confirmada. Em breve voce recebera as informacoes de acesso.',
    variables: ['nome', 'curso'],
  },
  {
    id: 't8',
    name: 'Cobranca amigavel',
    category: 'cobranca',
    channel: 'whatsapp',
    content: 'Ola {{nome}}, tudo bem? Notamos que sua parcela esta em aberto. Precisa de ajuda para regularizar? Estamos a disposicao!',
    variables: ['nome'],
  },
]

const categoryLabels: Record<string, string> = {
  'boas-vindas': 'Boas-vindas',
  'follow-up': 'Follow-up',
  'promocao': 'Promocao',
  'reengajamento': 'Reengajamento',
  'cobranca': 'Cobranca',
  'evento': 'Evento',
  'geral': 'Geral',
}

const channelIcons: Record<CampaignChannel, typeof MessageSquare> = {
  whatsapp: MessageSquare,
  email: Mail,
  sms: Smartphone,
  instagram: MessageSquare,
  messenger: MessageSquare,
}

const channelColors: Record<CampaignChannel, string> = {
  whatsapp: 'text-emerald-400',
  email: 'text-blue-400',
  sms: 'text-violet-400',
  instagram: 'text-pink-400',
  messenger: 'text-blue-400',
}

// ── Component ────────────────────────────────────────────────────────────────

export function TemplateSelector({ channel, onSelect, onClose }: TemplateSelectorProps) {
  const [search, setSearch] = React.useState('')
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null)
  const [previewId, setPreviewId] = React.useState<string | null>(null)

  const filtered = React.useMemo(() => {
    return mockTemplates.filter((t) => {
      if (channel && t.channel !== channel) return false
      if (selectedCategory && t.category !== selectedCategory) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          t.name.toLowerCase().includes(q) ||
          t.content.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [channel, selectedCategory, search])

  const categories = React.useMemo(() => {
    const base = channel
      ? mockTemplates.filter((t) => t.channel === channel)
      : mockTemplates
    return [...new Set(base.map((t) => t.category))]
  }, [channel])

  const previewTemplate = previewId ? mockTemplates.find((t) => t.id === previewId) : null

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
        <h3 className="text-base font-semibold text-slate-100">Templates de Mensagem</h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-700/50 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-slate-700/50">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex h-9 w-full rounded-lg border border-slate-700/50 bg-slate-800/50 pl-10 pr-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
          />
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          <button
            className={cn(
              'px-2.5 py-1 rounded-full text-xs font-medium transition-colors border',
              !selectedCategory
                ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/25'
                : 'bg-slate-800/50 text-slate-400 border-slate-700/50 hover:text-slate-300'
            )}
            onClick={() => setSelectedCategory(null)}
          >
            Todas
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-medium transition-colors border',
                selectedCategory === cat
                  ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/25'
                  : 'bg-slate-800/50 text-slate-400 border-slate-700/50 hover:text-slate-300'
              )}
              onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
            >
              {categoryLabels[cat] || cat}
            </button>
          ))}
        </div>
      </div>

      {/* Template grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            Nenhum template encontrado
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filtered.map((template) => {
              const Icon = channelIcons[template.channel]
              return (
                <motion.div
                  key={template.id}
                  className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-4 hover:border-indigo-500/20 transition-all cursor-pointer"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.01 }}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className={cn('h-4 w-4 shrink-0', channelColors[template.channel])} />
                      <h4 className="text-sm font-medium text-slate-200 truncate">
                        {template.name}
                      </h4>
                    </div>
                    <Badge variant="default" size="sm">
                      {categoryLabels[template.category] || template.category}
                    </Badge>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                    {template.content}
                  </p>

                  {template.variables.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {template.variables.map((v) => (
                        <span
                          key={v}
                          className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                        >
                          {`{{${v}}}`}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        setPreviewId(previewId === template.id ? null : template.id)
                      }}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      Preview
                    </Button>
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelect(template)
                      }}
                    >
                      <Check className="h-3.5 w-3.5 mr-1" />
                      Usar Template
                    </Button>
                  </div>

                  {/* Inline preview */}
                  <AnimatePresence>
                    {previewId === template.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 pt-3 border-t border-slate-700/50">
                          <p className="text-xs text-slate-500 mb-1 font-medium">Preview:</p>
                          <div className="rounded-lg bg-slate-900/60 p-3 text-sm text-slate-300 whitespace-pre-wrap">
                            {template.content}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
