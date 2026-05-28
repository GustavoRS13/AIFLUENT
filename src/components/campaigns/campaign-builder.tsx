'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare,
  Mail,
  Smartphone,
  ArrowLeft,
  ArrowRight,
  Check,
  Users,
  FileText,
  Clock,
  Send,
  Sparkles,
  Plus,
  X,
  Smile,
  Tag,
  Filter,
  Rocket,
  Calendar,
  Wand2,
  Layout,
  ChevronRight,
  Search,
  UserCheck,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { TemplateSelector } from '@/components/campaigns/template-selector'
import type { CampaignChannel } from '@/types'

// ── Types ────────────────────────────────────────────────────────────────────

type CampaignType = 'broadcast' | 'sequence' | 'automation'

interface CampaignFormData {
  name: string
  channel: CampaignChannel | null
  type: CampaignType
  audience: {
    mode: 'filters' | 'list' | 'tags' | 'manual'
    filters: {
      source: string | null
      temperature: string | null
      status: string | null
    }
    tags: string[]
    selectedCount: number
  }
  content: {
    message: string
    templateId: string | null
  }
  schedule: {
    mode: 'now' | 'later' | 'sequence'
    date: string
    time: string
    sequenceSteps: { delay: number; unit: 'minutes' | 'hours' | 'days'; message: string }[]
  }
}

interface CampaignBuilderProps {
  onClose: () => void
  onSubmit?: (data: CampaignFormData) => void
}

// ── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Configuracao', icon: FileText },
  { id: 2, label: 'Audiencia', icon: Users },
  { id: 3, label: 'Conteudo', icon: MessageSquare },
  { id: 4, label: 'Agendamento', icon: Clock },
  { id: 5, label: 'Revisao', icon: Check },
]

const CHANNELS: { value: CampaignChannel; label: string; icon: typeof MessageSquare; color: string; bg: string; description: string }[] = [
  {
    value: 'whatsapp',
    label: 'WhatsApp',
    icon: MessageSquare,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/50',
    description: 'Mensagens via WhatsApp Business API',
  },
  {
    value: 'email',
    label: 'Email',
    icon: Mail,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/30 hover:border-blue-500/50',
    description: 'Emails com templates personalizados',
  },
  {
    value: 'sms',
    label: 'SMS',
    icon: Smartphone,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10 border-violet-500/30 hover:border-violet-500/50',
    description: 'Mensagens SMS diretas',
  },
]

const CAMPAIGN_TYPES: { value: CampaignType; label: string; description: string; icon: typeof Send }[] = [
  { value: 'broadcast', label: 'Disparo em massa', description: 'Envio unico para toda a audiencia', icon: Send },
  { value: 'sequence', label: 'Sequencia', description: 'Serie de mensagens com intervalos', icon: Layout },
  { value: 'automation', label: 'Automacao', description: 'Disparos baseados em gatilhos', icon: Rocket },
]

const VARIABLES = [
  { label: 'Nome', value: '{{nome}}' },
  { label: 'Curso', value: '{{curso}}' },
  { label: 'Consultor', value: '{{consultor}}' },
  { label: 'Email', value: '{{email}}' },
  { label: 'Telefone', value: '{{telefone}}' },
]

const MOCK_TAGS = ['matricula-2026', 'vestibular', 'pos-graduacao', 'ead', 'presencial', 'bolsista', 'indicacao', 'evento-maio']

// ── Component ────────────────────────────────────────────────────────────────

export function CampaignBuilder({ onClose, onSubmit }: CampaignBuilderProps) {
  const [step, setStep] = React.useState(1)
  const [showTemplates, setShowTemplates] = React.useState(false)
  const [aiLoading, setAiLoading] = React.useState(false)

  const [form, setForm] = React.useState<CampaignFormData>({
    name: '',
    channel: null,
    type: 'broadcast',
    audience: {
      mode: 'filters',
      filters: { source: null, temperature: null, status: null },
      tags: [],
      selectedCount: 0,
    },
    content: {
      message: '',
      templateId: null,
    },
    schedule: {
      mode: 'now',
      date: '',
      time: '',
      sequenceSteps: [{ delay: 1, unit: 'days', message: '' }],
    },
  })

  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  // Simulate audience count based on selections
  React.useEffect(() => {
    const base = 1200
    let count = base
    if (form.audience.filters.source) count = Math.floor(count * 0.4)
    if (form.audience.filters.temperature) count = Math.floor(count * 0.6)
    if (form.audience.filters.status) count = Math.floor(count * 0.5)
    if (form.audience.tags.length > 0) count = Math.floor(count * 0.3 * form.audience.tags.length)
    count = Math.max(count, 12)
    setForm((prev) => ({ ...prev, audience: { ...prev.audience, selectedCount: count } }))
  }, [form.audience.filters, form.audience.tags])

  const canNext = React.useMemo(() => {
    switch (step) {
      case 1: return form.name.trim().length > 0 && form.channel !== null
      case 2: return form.audience.selectedCount > 0
      case 3: return form.content.message.trim().length > 0
      case 4: return form.schedule.mode === 'now' || (form.schedule.date && form.schedule.time)
      default: return true
    }
  }, [step, form])

  function insertVariable(variable: string) {
    if (!textareaRef.current) return
    const ta = textareaRef.current
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const msg = form.content.message
    const newMsg = msg.slice(0, start) + variable + msg.slice(end)
    setForm((prev) => ({ ...prev, content: { ...prev.content, message: newMsg } }))
    setTimeout(() => {
      ta.focus()
      ta.setSelectionRange(start + variable.length, start + variable.length)
    }, 0)
  }

  async function handleAiGenerate() {
    setAiLoading(true)
    // Simulate AI generation
    await new Promise((r) => setTimeout(r, 1500))
    const aiMessage = `Ola {{nome}}!

Temos uma novidade especial para voce! O curso de {{curso}} esta com condicoes exclusivas esta semana.

Como seu consultor dedicado, preparei uma proposta personalizada. Posso te apresentar os detalhes?

Atenciosamente,
{{consultor}}`
    setForm((prev) => ({ ...prev, content: { ...prev.content, message: aiMessage } }))
    setAiLoading(false)
  }

  function handleSubmit() {
    onSubmit?.(form)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/70"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        className="relative z-10 w-full max-w-3xl max-h-[90vh] rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-black/40 flex flex-col overflow-hidden"
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Nova Campanha</h2>
            <p className="text-sm text-gray-400 mt-0.5">Crie e configure seu disparo</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Stepper */}
        <div className="px-5 pt-4 pb-2 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-1">
            {STEPS.map((s, idx) => {
              const StepIcon = s.icon
              const isActive = s.id === step
              const isCompleted = s.id < step
              return (
                <React.Fragment key={s.id}>
                  <button
                    onClick={() => s.id < step && setStep(s.id)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                      isActive && 'bg-indigo-500/15 text-indigo-400',
                      isCompleted && 'text-emerald-400 cursor-pointer hover:bg-gray-50',
                      !isActive && !isCompleted && 'text-gray-400'
                    )}
                    disabled={s.id > step}
                  >
                    <div
                      className={cn(
                        'flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold border transition-all',
                        isActive && 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400',
                        isCompleted && 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400',
                        !isActive && !isCompleted && 'border-gray-200 text-gray-400'
                      )}
                    >
                      {isCompleted ? <Check className="h-3 w-3" /> : s.id}
                    </div>
                    <span className="hidden sm:inline">{s.label}</span>
                  </button>
                  {idx < STEPS.length - 1 && (
                    <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  )}
                </React.Fragment>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          <AnimatePresence mode="wait">
            {/* Step 1: Configuration */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <Input
                  label="Nome da campanha"
                  placeholder="Ex: Promocao vestibular 2026"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Canal de envio
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {CHANNELS.map((ch) => {
                      const Icon = ch.icon
                      const selected = form.channel === ch.value
                      return (
                        <button
                          key={ch.value}
                          onClick={() => setForm((prev) => ({ ...prev, channel: ch.value }))}
                          className={cn(
                            'flex flex-col items-center gap-2 p-4 rounded-xl border transition-all',
                            selected
                              ? cn(ch.bg, 'ring-1 ring-offset-0', ch.value === 'whatsapp' ? 'ring-emerald-500/40' : ch.value === 'email' ? 'ring-blue-500/40' : 'ring-violet-500/40')
                              : 'border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-200'
                          )}
                        >
                          <Icon className={cn('h-6 w-6', selected ? ch.color : 'text-gray-500')} />
                          <span className={cn('text-sm font-medium', selected ? 'text-gray-900' : 'text-gray-500')}>
                            {ch.label}
                          </span>
                          <span className="text-[10px] text-gray-400 text-center">
                            {ch.description}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Tipo de campanha
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {CAMPAIGN_TYPES.map((ct) => {
                      const Icon = ct.icon
                      const selected = form.type === ct.value
                      return (
                        <button
                          key={ct.value}
                          onClick={() => setForm((prev) => ({ ...prev, type: ct.value }))}
                          className={cn(
                            'flex flex-col items-center gap-2 p-4 rounded-xl border transition-all',
                            selected
                              ? 'bg-indigo-500/10 border-indigo-500/30 ring-1 ring-indigo-500/40'
                              : 'border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-200'
                          )}
                        >
                          <Icon className={cn('h-5 w-5', selected ? 'text-indigo-400' : 'text-gray-500')} />
                          <span className={cn('text-sm font-medium', selected ? 'text-gray-900' : 'text-gray-500')}>
                            {ct.label}
                          </span>
                          <span className="text-[10px] text-gray-400 text-center">
                            {ct.description}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Audience */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Audience selection mode */}
                <div className="flex gap-2 flex-wrap">
                  {[
                    { value: 'filters' as const, label: 'Filtros', icon: Filter },
                    { value: 'tags' as const, label: 'Tags', icon: Tag },
                    { value: 'manual' as const, label: 'Selecao manual', icon: UserCheck },
                  ].map((mode) => {
                    const ModeIcon = mode.icon
                    return (
                      <button
                        key={mode.value}
                        onClick={() => setForm((prev) => ({ ...prev, audience: { ...prev.audience, mode: mode.value } }))}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-all',
                          form.audience.mode === mode.value
                            ? 'bg-indigo-500/15 border-indigo-500/25 text-indigo-400'
                            : 'border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        )}
                      >
                        <ModeIcon className="h-4 w-4" />
                        {mode.label}
                      </button>
                    )
                  })}
                </div>

                {/* Filters */}
                {form.audience.mode === 'filters' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-700">Origem</label>
                      <select
                        value={form.audience.filters.source || ''}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            audience: {
                              ...prev.audience,
                              filters: { ...prev.audience.filters, source: e.target.value || null },
                            },
                          }))
                        }
                        className="flex h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      >
                        <option value="">Todas</option>
                        <option value="instagram">Instagram</option>
                        <option value="facebook">Facebook</option>
                        <option value="google">Google</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="website">Website</option>
                        <option value="referral">Indicacao</option>
                        <option value="event">Evento</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-700">Temperatura</label>
                      <select
                        value={form.audience.filters.temperature || ''}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            audience: {
                              ...prev.audience,
                              filters: { ...prev.audience.filters, temperature: e.target.value || null },
                            },
                          }))
                        }
                        className="flex h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      >
                        <option value="">Todas</option>
                        <option value="hot">Quente</option>
                        <option value="warm">Morno</option>
                        <option value="cold">Frio</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-700">Status</label>
                      <select
                        value={form.audience.filters.status || ''}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            audience: {
                              ...prev.audience,
                              filters: { ...prev.audience.filters, status: e.target.value || null },
                            },
                          }))
                        }
                        className="flex h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      >
                        <option value="">Todos</option>
                        <option value="new">Novo</option>
                        <option value="contacted">Contatado</option>
                        <option value="qualified">Qualificado</option>
                        <option value="negotiating">Negociando</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Tags */}
                {form.audience.mode === 'tags' && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Selecione as tags
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {MOCK_TAGS.map((tag) => {
                        const selected = form.audience.tags.includes(tag)
                        return (
                          <button
                            key={tag}
                            onClick={() => {
                              setForm((prev) => ({
                                ...prev,
                                audience: {
                                  ...prev.audience,
                                  tags: selected
                                    ? prev.audience.tags.filter((t) => t !== tag)
                                    : [...prev.audience.tags, tag],
                                },
                              }))
                            }}
                            className={cn(
                              'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                              selected
                                ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/25'
                                : 'bg-gray-50 text-gray-500 border-gray-200 hover:text-gray-700'
                            )}
                          >
                            {selected && <Check className="inline h-3 w-3 mr-1" />}
                            {tag}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Manual */}
                {form.audience.mode === 'manual' && (
                  <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
                    <Search className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Busque e selecione leads individualmente</p>
                    <div className="mt-3">
                      <Input placeholder="Buscar por nome, email ou telefone..." />
                    </div>
                  </div>
                )}

                {/* Selected count */}
                <motion.div
                  className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 flex items-center gap-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/15">
                    <Users className="h-5 w-5 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      <span className="text-indigo-400 font-bold text-lg tabular-nums">
                        {form.audience.selectedCount.toLocaleString('pt-BR')}
                      </span>{' '}
                      leads selecionados
                    </p>
                    <p className="text-xs text-gray-400">
                      Estimativa baseada nos filtros aplicados
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* Step 3: Content */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Template selector overlay */}
                {showTemplates && (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 overflow-hidden mb-4 max-h-96">
                    <TemplateSelector
                      channel={form.channel || undefined}
                      onSelect={(template) => {
                        setForm((prev) => ({
                          ...prev,
                          content: { message: template.content, templateId: template.id },
                        }))
                        setShowTemplates(false)
                      }}
                      onClose={() => setShowTemplates(false)}
                    />
                  </div>
                )}

                {/* Toolbar */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowTemplates(!showTemplates)}
                  >
                    <Layout className="h-3.5 w-3.5 mr-1.5" />
                    Templates
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    loading={aiLoading}
                    onClick={handleAiGenerate}
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    Gerar com IA
                  </Button>

                  <div className="h-5 w-px bg-gray-100" />

                  {/* Variable buttons */}
                  {VARIABLES.map((v) => (
                    <button
                      key={v.value}
                      onClick={() => insertVariable(v.value)}
                      className="px-2 py-1 rounded text-[11px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors"
                    >
                      {v.value}
                    </button>
                  ))}
                </div>

                {/* Message editor */}
                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    value={form.content.message}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, content: { ...prev.content, message: e.target.value } }))
                    }
                    placeholder="Digite sua mensagem aqui..."
                    rows={8}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 resize-none transition-all"
                  />
                  <div className="absolute bottom-3 right-3 flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 tabular-nums">
                      {form.content.message.length} caracteres
                    </span>
                  </div>
                </div>

                {/* Preview panel */}
                {form.content.message.trim() && (
                  <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <h4 className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Preview</h4>
                    <div
                      className={cn(
                        'rounded-lg p-3 text-sm max-w-sm',
                        form.channel === 'whatsapp'
                          ? 'bg-emerald-900/30 border border-emerald-800/30 text-gray-800'
                          : form.channel === 'email'
                          ? 'bg-blue-900/20 border border-blue-800/30 text-gray-800'
                          : 'bg-violet-900/20 border border-violet-800/30 text-gray-800'
                      )}
                    >
                      <p className="whitespace-pre-wrap">
                        {form.content.message
                          .replace('{{nome}}', 'Maria Silva')
                          .replace('{{curso}}', 'Administracao')
                          .replace('{{consultor}}', 'Carlos')
                          .replace('{{email}}', 'maria@email.com')
                          .replace('{{telefone}}', '(11) 99999-0000')}
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 4: Schedule */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { value: 'now' as const, label: 'Enviar agora', icon: Send, description: 'Disparo imediato' },
                    { value: 'later' as const, label: 'Agendar', icon: Calendar, description: 'Data e hora especificas' },
                    { value: 'sequence' as const, label: 'Sequencia', icon: Layout, description: 'Multiplas etapas' },
                  ].map((opt) => {
                    const Icon = opt.icon
                    const selected = form.schedule.mode === opt.value
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setForm((prev) => ({ ...prev, schedule: { ...prev.schedule, mode: opt.value } }))}
                        className={cn(
                          'flex flex-col items-center gap-2 p-4 rounded-xl border transition-all',
                          selected
                            ? 'bg-indigo-500/10 border-indigo-500/30 ring-1 ring-indigo-500/40'
                            : 'border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-200'
                        )}
                      >
                        <Icon className={cn('h-5 w-5', selected ? 'text-indigo-400' : 'text-gray-500')} />
                        <span className={cn('text-sm font-medium', selected ? 'text-gray-900' : 'text-gray-500')}>
                          {opt.label}
                        </span>
                        <span className="text-[10px] text-gray-400">{opt.description}</span>
                      </button>
                    )
                  })}
                </div>

                {form.schedule.mode === 'later' && (
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      type="date"
                      label="Data"
                      value={form.schedule.date}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, schedule: { ...prev.schedule, date: e.target.value } }))
                      }
                    />
                    <Input
                      type="time"
                      label="Hora"
                      value={form.schedule.time}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, schedule: { ...prev.schedule, time: e.target.value } }))
                      }
                    />
                  </div>
                )}

                {form.schedule.mode === 'sequence' && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-700">Etapas da sequencia</label>
                    {form.schedule.sequenceSteps.map((seqStep, idx) => (
                      <div key={idx} className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-3">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-400 text-xs font-bold shrink-0 mt-1">
                          {idx + 1}
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">Aguardar</span>
                            <input
                              type="number"
                              min="1"
                              value={seqStep.delay}
                              onChange={(e) => {
                                const steps = [...form.schedule.sequenceSteps]
                                steps[idx] = { ...steps[idx], delay: parseInt(e.target.value) || 1 }
                                setForm((prev) => ({ ...prev, schedule: { ...prev.schedule, sequenceSteps: steps } }))
                              }}
                              className="w-16 h-8 rounded border border-gray-200 bg-gray-50 px-2 text-sm text-gray-900 text-center focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                            />
                            <select
                              value={seqStep.unit}
                              onChange={(e) => {
                                const steps = [...form.schedule.sequenceSteps]
                                steps[idx] = { ...steps[idx], unit: e.target.value as 'minutes' | 'hours' | 'days' }
                                setForm((prev) => ({ ...prev, schedule: { ...prev.schedule, sequenceSteps: steps } }))
                              }}
                              className="h-8 rounded border border-gray-200 bg-gray-50 px-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                            >
                              <option value="minutes">minutos</option>
                              <option value="hours">horas</option>
                              <option value="days">dias</option>
                            </select>
                          </div>
                          <textarea
                            placeholder="Mensagem desta etapa..."
                            value={seqStep.message}
                            onChange={(e) => {
                              const steps = [...form.schedule.sequenceSteps]
                              steps[idx] = { ...steps[idx], message: e.target.value }
                              setForm((prev) => ({ ...prev, schedule: { ...prev.schedule, sequenceSteps: steps } }))
                            }}
                            rows={2}
                            className="w-full rounded border border-gray-200 bg-gray-50 p-2 text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                          />
                        </div>
                        {form.schedule.sequenceSteps.length > 1 && (
                          <button
                            onClick={() => {
                              const steps = form.schedule.sequenceSteps.filter((_, i) => i !== idx)
                              setForm((prev) => ({ ...prev, schedule: { ...prev.schedule, sequenceSteps: steps } }))
                            }}
                            className="p-1 rounded text-gray-400 hover:text-rose-400 transition-colors mt-1"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          schedule: {
                            ...prev.schedule,
                            sequenceSteps: [...prev.schedule.sequenceSteps, { delay: 1, unit: 'days', message: '' }],
                          },
                        }))
                      }
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Adicionar Etapa
                    </Button>
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 5: Review */}
            {step === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
                  {/* Campaign info */}
                  <div className="flex items-center gap-3">
                    {form.channel && (() => {
                      const ch = CHANNELS.find((c) => c.value === form.channel)
                      if (!ch) return null
                      const Icon = ch.icon
                      return (
                        <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg border', ch.bg)}>
                          <Icon className={cn('h-5 w-5', ch.color)} />
                        </div>
                      )
                    })()}
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">{form.name || 'Sem nome'}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="primary" size="sm">{form.channel?.toUpperCase()}</Badge>
                        <Badge variant="default" size="sm">{form.type}</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-gray-100" />

                  {/* Summary items */}
                  {[
                    { label: 'Audiencia', value: `${form.audience.selectedCount.toLocaleString('pt-BR')} leads`, icon: Users },
                    {
                      label: 'Agendamento',
                      value: form.schedule.mode === 'now'
                        ? 'Envio imediato'
                        : form.schedule.mode === 'later'
                        ? `${form.schedule.date} as ${form.schedule.time}`
                        : `Sequencia com ${form.schedule.sequenceSteps.length} etapas`,
                      icon: Clock,
                    },
                    { label: 'Mensagem', value: `${form.content.message.length} caracteres`, icon: MessageSquare },
                  ].map((item) => {
                    const Icon = item.icon
                    return (
                      <div key={item.label} className="flex items-center gap-3">
                        <Icon className="h-4 w-4 text-gray-400 shrink-0" />
                        <span className="text-sm text-gray-400 w-24 shrink-0">{item.label}</span>
                        <span className="text-sm text-gray-800">{item.value}</span>
                      </div>
                    )
                  })}

                  <div className="h-px bg-gray-100" />

                  {/* Message preview */}
                  <div>
                    <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider font-medium">Preview da mensagem</p>
                    <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700 whitespace-pre-wrap max-h-40 overflow-y-auto">
                      {form.content.message || 'Nenhuma mensagem configurada'}
                    </div>
                  </div>
                </div>

                {/* Estimated delivery */}
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-300">Estimativa de entrega</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Com base no volume de {form.audience.selectedCount.toLocaleString('pt-BR')} leads,
                      a entrega completa levara aproximadamente{' '}
                      <span className="text-amber-300 font-medium">
                        {Math.ceil(form.audience.selectedCount / 60)} minutos
                      </span>
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-gray-200 shrink-0">
          <Button
            variant="ghost"
            onClick={() => step > 1 ? setStep(step - 1) : onClose()}
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            {step > 1 ? 'Voltar' : 'Cancelar'}
          </Button>

          {step < 5 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canNext}>
              Proximo
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          ) : (
            <Button onClick={handleSubmit}>
              <Rocket className="h-4 w-4 mr-1.5" />
              {form.schedule.mode === 'now' ? 'Enviar Campanha' : 'Agendar Campanha'}
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  )
}
