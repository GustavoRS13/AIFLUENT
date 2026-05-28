'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  Plus,
  Search,
  MessageSquare,
  Mail,
  Smartphone,
  Eye,
  Copy,
  Pencil,
  Trash2,
  MoreHorizontal,
  X,
  Check,
  Zap,
  BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ───────────────────────────────────────────────────────────────────

type TemplateChannel = 'whatsapp' | 'email' | 'sms'
type TemplateCategory = 'boas-vindas' | 'follow-up' | 'promocao' | 'cobranca' | 'evento' | 'reativacao'
type TemplateStatus = 'active' | 'draft'

type Template = {
  id: string
  name: string
  category: TemplateCategory
  channel: TemplateChannel
  content: string
  usageCount: number
  status: TemplateStatus
  variables: string[]
  createdAt: string
  updatedAt: string
}

// ── Config ──────────────────────────────────────────────────────────────────

const categoryConfig: Record<TemplateCategory, { label: string; color: string; bg: string }> = {
  'boas-vindas': { label: 'Boas-vindas', color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20' },
  'follow-up': { label: 'Follow-up', color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20' },
  'promocao': { label: 'Promoção', color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/20' },
  'cobranca': { label: 'Cobrança', color: 'text-rose-400', bg: 'bg-rose-400/10 border-rose-400/20' },
  'evento': { label: 'Evento', color: 'text-violet-400', bg: 'bg-violet-400/10 border-violet-400/20' },
  'reativacao': { label: 'Reativação', color: 'text-cyan-400', bg: 'bg-cyan-400/10 border-cyan-400/20' },
}

const channelConfig: Record<TemplateChannel, { label: string; icon: typeof MessageSquare; color: string }> = {
  whatsapp: { label: 'WhatsApp', icon: MessageSquare, color: 'text-emerald-400' },
  email: { label: 'Email', icon: Mail, color: 'text-blue-400' },
  sms: { label: 'SMS', icon: Smartphone, color: 'text-amber-400' },
}

// ── Mock Data ───────────────────────────────────────────────────────────────

const mockTemplates: Template[] = [
  {
    id: 't1',
    name: 'Boas-vindas - Novo Lead',
    category: 'boas-vindas',
    channel: 'whatsapp',
    content: 'Olá {{nome}}! 👋 Bem-vindo(a) ao AIFLUENT! Somos especializados em {{curso}}. Posso ajudar com mais informações? Nosso consultor {{consultor}} está à disposição.',
    usageCount: 1245,
    status: 'active',
    variables: ['nome', 'curso', 'consultor'],
    createdAt: '2026-04-10',
    updatedAt: '2026-05-20',
  },
  {
    id: 't2',
    name: 'Follow-up 3 dias',
    category: 'follow-up',
    channel: 'whatsapp',
    content: 'Oi {{nome}}, tudo bem? Passando para saber se ficou alguma dúvida sobre o {{curso}}. O investimento é de {{valor}} e temos condições especiais essa semana!',
    usageCount: 892,
    status: 'active',
    variables: ['nome', 'curso', 'valor'],
    createdAt: '2026-04-15',
    updatedAt: '2026-05-18',
  },
  {
    id: 't3',
    name: 'Promoção de Fim de Semestre',
    category: 'promocao',
    channel: 'email',
    content: 'Prezado(a) {{nome}},\n\nTemos uma oportunidade imperdível! O curso de {{curso}} está com 20% de desconto. De {{valor}} por apenas R$ XX.\n\nGaranta sua vaga com o consultor {{consultor}}.\n\nAtenciosamente,\nEquipe AIFLUENT',
    usageCount: 567,
    status: 'active',
    variables: ['nome', 'curso', 'valor', 'consultor'],
    createdAt: '2026-03-20',
    updatedAt: '2026-05-15',
  },
  {
    id: 't4',
    name: 'Lembrete de Pagamento',
    category: 'cobranca',
    channel: 'sms',
    content: 'AIFLUENT: Olá {{nome}}, lembrete amigável sobre o pagamento de {{valor}} com vencimento em breve. Dúvidas? Fale com {{consultor}}.',
    usageCount: 334,
    status: 'active',
    variables: ['nome', 'valor', 'consultor'],
    createdAt: '2026-04-01',
    updatedAt: '2026-05-10',
  },
  {
    id: 't5',
    name: 'Convite para Evento Presencial',
    category: 'evento',
    channel: 'whatsapp',
    content: 'Oi {{nome}}! 🎓 Você está convidado(a) para nosso evento exclusivo sobre {{curso}}. Data: [data]. Local: [local]. Confirme sua presença respondendo esta mensagem!',
    usageCount: 203,
    status: 'active',
    variables: ['nome', 'curso'],
    createdAt: '2026-05-01',
    updatedAt: '2026-05-22',
  },
  {
    id: 't6',
    name: 'Reativação de Leads Frios',
    category: 'reativacao',
    channel: 'whatsapp',
    content: 'Olá {{nome}}, sentimos sua falta! 😊 Temos novidades sobre o {{curso}} que podem te interessar. O investimento está a partir de {{valor}}. Quer saber mais?',
    usageCount: 456,
    status: 'active',
    variables: ['nome', 'curso', 'valor'],
    createdAt: '2026-04-20',
    updatedAt: '2026-05-25',
  },
  {
    id: 't7',
    name: 'Boas-vindas Email',
    category: 'boas-vindas',
    channel: 'email',
    content: 'Prezado(a) {{nome}},\n\nObrigado por seu interesse no {{curso}}! Estamos felizes em tê-lo(a) conosco.\n\nSeu consultor {{consultor}} entrará em contato em breve.\n\nAtenciosamente,\nEquipe AIFLUENT',
    usageCount: 789,
    status: 'active',
    variables: ['nome', 'curso', 'consultor'],
    createdAt: '2026-03-15',
    updatedAt: '2026-05-12',
  },
  {
    id: 't8',
    name: 'Follow-up Pós-evento',
    category: 'follow-up',
    channel: 'email',
    content: 'Oi {{nome}},\n\nFoi ótimo ter você no nosso evento! Como prometido, seguem os materiais e condições especiais.\n\nO {{curso}} tem valor promocional de {{valor}} para participantes.\n\nAbraço,\n{{consultor}}',
    usageCount: 145,
    status: 'draft',
    variables: ['nome', 'curso', 'valor', 'consultor'],
    createdAt: '2026-05-20',
    updatedAt: '2026-05-26',
  },
  {
    id: 't9',
    name: 'Confirmação SMS',
    category: 'evento',
    channel: 'sms',
    content: 'AIFLUENT: {{nome}}, confirmamos sua presença no evento de {{curso}}. Nos vemos lá! Dúvidas: (11) 99999-9999',
    usageCount: 98,
    status: 'active',
    variables: ['nome', 'curso'],
    createdAt: '2026-05-10',
    updatedAt: '2026-05-24',
  },
  {
    id: 't10',
    name: 'Promoção Black Friday',
    category: 'promocao',
    channel: 'whatsapp',
    content: '🔥 BLACK FRIDAY AIFLUENT! {{nome}}, aproveite até 40% OFF no {{curso}}! De {{valor}} por condições imperdíveis. Fale com {{consultor}} e garanta sua vaga!',
    usageCount: 0,
    status: 'draft',
    variables: ['nome', 'curso', 'valor', 'consultor'],
    createdAt: '2026-05-26',
    updatedAt: '2026-05-26',
  },
]

// ── Component ───────────────────────────────────────────────────────────────

export default function TemplatesPage() {
  const [channelFilter, setChannelFilter] = useState<'all' | TemplateChannel>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null)
  const [showNewTemplate, setShowNewTemplate] = useState(false)

  const filtered = useMemo(() => {
    let items = mockTemplates

    if (channelFilter !== 'all') {
      items = items.filter((t) => t.channel === channelFilter)
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      items = items.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.content.toLowerCase().includes(q) ||
          categoryConfig[t.category].label.toLowerCase().includes(q)
      )
    }

    return items
  }, [channelFilter, searchTerm])

  const stats = useMemo(() => ({
    total: mockTemplates.length,
    active: mockTemplates.filter((t) => t.status === 'active').length,
    drafts: mockTemplates.filter((t) => t.status === 'draft').length,
    totalUsage: mockTemplates.reduce((s, t) => s + t.usageCount, 0),
  }), [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Templates</h1>
          <p className="text-sm text-gray-400 mt-1">
            Gerencie templates de mensagens para WhatsApp, Email e SMS
          </p>
        </div>
        <button
          onClick={() => setShowNewTemplate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Template
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: FileText, title: 'Total de Templates', value: stats.total },
          { icon: Check, title: 'Ativos', value: stats.active },
          { icon: Pencil, title: 'Rascunhos', value: stats.drafts },
          { icon: BarChart3, title: 'Total de Usos', value: stats.totalUsage.toLocaleString('pt-BR') },
        ].map((stat, i) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white border border-gray-200 rounded-2xl p-5"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 rounded-lg">
                <stat.icon className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.title}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          {(
            [
              { key: 'all', label: 'Todos', icon: FileText },
              { key: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
              { key: 'email', label: 'Email', icon: Mail },
              { key: 'sms', label: 'SMS', icon: Smartphone },
            ] as const
          ).map((f) => {
            const Icon = f.icon
            return (
              <button
                key={f.key}
                onClick={() => setChannelFilter(f.key)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  channelFilter === f.key
                    ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {f.label}
              </button>
            )
          })}
        </div>

        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar templates..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Template grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnimatePresence>
          {filtered.map((template, i) => {
            const ChannelIcon = channelConfig[template.channel].icon
            return (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white border border-gray-200 rounded-2xl p-5 hover:bg-gray-50 hover:border-gray-200 transition-all group"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{template.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border',
                        categoryConfig[template.category].bg,
                        categoryConfig[template.category].color
                      )}>
                        {categoryConfig[template.category].label}
                      </span>
                      <span className={cn('flex items-center gap-1 text-[10px]', channelConfig[template.channel].color)}>
                        <ChannelIcon className="w-3 h-3" />
                        {channelConfig[template.channel].label}
                      </span>
                    </div>
                  </div>
                  <span className={cn(
                    'px-2 py-0.5 text-[10px] font-medium rounded-full',
                    template.status === 'active'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-gray-100 text-gray-500'
                  )}>
                    {template.status === 'active' ? 'Ativo' : 'Rascunho'}
                  </span>
                </div>

                {/* Content preview */}
                <div className="bg-gray-50 rounded-xl p-3 mb-3">
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-3 whitespace-pre-wrap">
                    {template.content}
                  </p>
                </div>

                {/* Variables */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {template.variables.map((v) => (
                    <span key={v} className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded text-[10px] font-mono">
                      {`{{${v}}}`}
                    </span>
                  ))}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <BarChart3 className="w-3 h-3" />
                    {template.usageCount.toLocaleString('pt-BR')} usos
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setPreviewTemplate(template)}
                      className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                      title="Visualizar"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors" title="Duplicar">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors" title="Editar">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button className="p-1.5 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors" title="Excluir">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="w-10 h-10 text-gray-400 mb-3" />
          <h3 className="text-base font-semibold text-gray-800">Nenhum template encontrado</h3>
          <p className="mt-1 text-sm text-gray-400">Tente buscar com outros termos ou crie um novo template</p>
        </div>
      )}

      {/* Preview Modal */}
      <AnimatePresence>
        {previewTemplate && (
          <TemplatePreviewModal
            template={previewTemplate}
            onClose={() => setPreviewTemplate(null)}
          />
        )}
      </AnimatePresence>

      {/* New Template Modal */}
      <AnimatePresence>
        {showNewTemplate && (
          <NewTemplateModal onClose={() => setShowNewTemplate(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Preview Modal ───────────────────────────────────────────────────────────

function TemplatePreviewModal({ template, onClose }: { template: Template; onClose: () => void }) {
  const ChannelIcon = channelConfig[template.channel].icon

  // Simulated preview with replaced variables
  const previewText = template.content
    .replace(/\{\{nome\}\}/g, 'João Silva')
    .replace(/\{\{curso\}\}/g, 'MBA em Gestão')
    .replace(/\{\{valor\}\}/g, 'R$ 890/mês')
    .replace(/\{\{consultor\}\}/g, 'Maria Consultora')

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-lg bg-white border border-gray-200 rounded-2xl shadow-2xl"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{template.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border',
                categoryConfig[template.category].bg,
                categoryConfig[template.category].color
              )}>
                {categoryConfig[template.category].label}
              </span>
              <span className={cn('flex items-center gap-1 text-xs', channelConfig[template.channel].color)}>
                <ChannelIcon className="w-3 h-3" />
                {channelConfig[template.channel].label}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Template Original</p>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{template.content}</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Prévia (com variáveis preenchidas)</p>
            <div className={cn(
              'rounded-xl p-4',
              template.channel === 'whatsapp'
                ? 'bg-emerald-900/20 border border-emerald-500/10'
                : template.channel === 'email'
                ? 'bg-blue-900/20 border border-blue-500/10'
                : 'bg-amber-900/20 border border-amber-500/10'
            )}>
              <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{previewText}</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Variáveis</p>
            <div className="flex flex-wrap gap-2">
              {template.variables.map((v) => (
                <span key={v} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg text-xs font-mono">
                  {`{{${v}}}`}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span>Usos: {template.usageCount.toLocaleString('pt-BR')}</span>
            <span>Criado: {new Date(template.createdAt).toLocaleDateString('pt-BR')}</span>
            <span>Atualizado: {new Date(template.updatedAt).toLocaleDateString('pt-BR')}</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Fechar
          </button>
          <button className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors">
            Editar Template
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── New Template Modal ──────────────────────────────────────────────────────

function NewTemplateModal({ onClose }: { onClose: () => void }) {
  const [content, setContent] = useState('')

  const insertVariable = (v: string) => {
    setContent((prev) => prev + `{{${v}}}`)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-lg bg-white border border-gray-200 rounded-2xl shadow-2xl"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Novo Template</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-500 mb-2">Nome do Template</label>
            <input
              placeholder="Ex: Follow-up de 7 dias"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-500 mb-2">Canal</label>
              <select className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:border-indigo-500 focus:outline-none transition-colors">
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-2">Categoria</label>
              <select className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:border-indigo-500 focus:outline-none transition-colors">
                {Object.entries(categoryConfig).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-2">Conteúdo</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              placeholder="Digite o conteúdo do template..."
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none transition-colors resize-none"
            />
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-2">Inserir variável:</p>
            <div className="flex flex-wrap gap-2">
              {['nome', 'curso', 'valor', 'consultor'].map((v) => (
                <button
                  key={v}
                  onClick={() => insertVariable(v)}
                  className="px-2.5 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg text-xs font-mono hover:bg-indigo-500/20 transition-colors"
                >
                  {`{{${v}}}`}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-gray-200 hover:bg-gray-200 text-gray-900 text-sm font-medium rounded-xl transition-colors"
          >
            Salvar Rascunho
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors"
          >
            Criar Template
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
