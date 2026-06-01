'use client'

import * as React from 'react'
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, MessageSquare, Mail, Smartphone, Send, FileText, Clock, Eye,
  BarChart3, Target, ArrowLeft, ArrowRight, Pause, Play, X, Copy,
  AlertTriangle, Shield, CheckCircle2, XCircle, Users, Tag, Filter,
  Zap, Trash2, Edit3, ChevronDown, ChevronUp, RefreshCw, Activity,
  Globe, Lock, Download, Search, MoreHorizontal, Image, Paperclip, Upload,
  MousePointerClick, TrendingUp, TrendingDown, Radio, Layers, Hash,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { SearchInput } from '@/components/ui/search-input'
import { StatCard } from '@/components/ui/stat-card'
import { Tabs, TabsList, AnimatedTabTrigger, TabsContent } from '@/components/ui/tabs'

// ── Types ────────────────────────────────────────────────────────────────────

type DisparoChannel = 'whatsapp' | 'email' | 'sms'
type DisparoStatus = 'rascunho' | 'agendada' | 'em_execucao' | 'pausada' | 'concluida' | 'cancelada'
type DisparoType = 'broadcast' | 'sequencia'
type TriggerType = 'respondeu' | 'nao_respondeu' | 'clicou' | 'comprou' | 'custom'
type ActionType = 'mover_etapa' | 'adicionar_tag' | 'remover_campanha' | 'criar_tarefa' | 'enviar_followup'

interface Campanha {
  id: string; name: string; channel: DisparoChannel; status: DisparoStatus; type: DisparoType
  createdAt: string; scheduledAt?: string; sent: number; total: number; audienceCount: number
  delivered: number; read: number; replied: number; failed: number
}

interface Template {
  id: string; name: string; channel: DisparoChannel; category: string
  content: string; variables: string[]; createdAt: string
}

interface Audiencia {
  id: string; name: string; type: string; rules: string[]; count: number; createdAt: string
}

interface AutomacaoRule {
  id: string; name: string; trigger: TriggerType; action: ActionType
  triggerLabel: string; actionLabel: string; active: boolean
}

interface LogEntry {
  id: string; timestamp: string; campaign: string; message: string
  status: 'enviado' | 'entregue' | 'falha' | 'lido' | 'respondido'; error?: string
}

interface ConsentEntry {
  id: string; contact: string; phone: string; type: 'opt_in' | 'opt_out' | 'bloqueado'
  date: string; reason?: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const channelIcon: Record<DisparoChannel, LucideIcon> = { whatsapp: MessageSquare, email: Mail, sms: Smartphone }
const channelLabel: Record<DisparoChannel, string> = { whatsapp: 'WhatsApp', email: 'E-mail', sms: 'SMS' }

const statusConfig: Record<DisparoStatus, { label: string; color: string; pulse?: boolean }> = {
  rascunho: { label: 'Rascunho', color: 'bg-gray-100 text-gray-600' },
  agendada: { label: 'Agendada', color: 'bg-blue-100 text-blue-700' },
  em_execucao: { label: 'Em execucao', color: 'bg-indigo-100 text-indigo-700', pulse: true },
  pausada: { label: 'Pausada', color: 'bg-amber-100 text-amber-700' },
  concluida: { label: 'Concluida', color: 'bg-emerald-100 text-emerald-700' },
  cancelada: { label: 'Cancelada', color: 'bg-rose-100 text-rose-700' },
}

function StatusBadge({ status }: { status: DisparoStatus }) {
  const cfg = statusConfig[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium', cfg.color)}>
      {cfg.pulse && <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500" /></span>}
      {cfg.label}
    </span>
  )
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 rounded-full bg-gray-100 overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-sky-400" />
      </div>
      <span className="text-xs font-medium text-gray-500 tabular-nums w-10 text-right">{pct}%</span>
    </div>
  )
}

function ChannelIcon({ channel, className }: { channel: DisparoChannel; className?: string }) {
  const Icon = channelIcon[channel]
  const colors: Record<DisparoChannel, string> = { whatsapp: 'text-emerald-500', email: 'text-sky-500', sms: 'text-violet-500' }
  return <Icon className={cn('h-4 w-4', colors[channel], className)} />
}

// ── Mock Data ────────────────────────────────────────────────────────────────

const initialCampaigns: Campanha[] = [
  { id: 'c1', name: 'Vestibular 2026 - Primeiro Contato', channel: 'whatsapp', status: 'em_execucao', type: 'broadcast', createdAt: '2026-05-25', scheduledAt: '2026-05-26', sent: 4820, total: 6000, audienceCount: 6000, delivered: 4650, read: 3720, replied: 1240, failed: 170 },
  { id: 'c2', name: 'Newsletter Maio - Novidades', channel: 'email', status: 'concluida', type: 'broadcast', createdAt: '2026-05-20', scheduledAt: '2026-05-21', sent: 12400, total: 12400, audienceCount: 12400, delivered: 11800, read: 5900, replied: 820, failed: 600 },
  { id: 'c3', name: 'Confirmacao de Matricula', channel: 'sms', status: 'agendada', type: 'broadcast', createdAt: '2026-05-28', scheduledAt: '2026-06-01', sent: 0, total: 3200, audienceCount: 3200, delivered: 0, read: 0, replied: 0, failed: 0 },
  { id: 'c4', name: 'Reengajamento - Inativos 30d', channel: 'whatsapp', status: 'pausada', type: 'sequencia', createdAt: '2026-05-15', sent: 890, total: 2500, audienceCount: 2500, delivered: 850, read: 510, replied: 127, failed: 40 },
  { id: 'c5', name: 'Black Friday Antecipada', channel: 'email', status: 'rascunho', type: 'broadcast', createdAt: '2026-05-29', sent: 0, total: 0, audienceCount: 8500, delivered: 0, read: 0, replied: 0, failed: 0 },
  { id: 'c6', name: 'Pesquisa de Satisfacao NPS', channel: 'sms', status: 'concluida', type: 'broadcast', createdAt: '2026-05-10', scheduledAt: '2026-05-11', sent: 4500, total: 4500, audienceCount: 4500, delivered: 4350, read: 2610, replied: 1740, failed: 150 },
  { id: 'c7', name: 'Boas-vindas Novos Alunos', channel: 'whatsapp', status: 'em_execucao', type: 'sequencia', createdAt: '2026-05-27', sent: 320, total: 1200, audienceCount: 1200, delivered: 310, read: 248, replied: 93, failed: 10 },
  { id: 'c8', name: 'Convite Evento Online', channel: 'email', status: 'cancelada', type: 'broadcast', createdAt: '2026-05-05', sent: 1500, total: 7800, audienceCount: 7800, delivered: 1420, read: 710, replied: 142, failed: 80 },
]

const initialTemplates: Template[] = [
  { id: 't1', name: 'Boas-vindas WhatsApp', channel: 'whatsapp', category: 'Onboarding', content: 'Ola {{nome}}! Seja bem-vindo(a) a {{empresa}}. Estamos felizes em te-lo conosco!', variables: ['nome', 'empresa'], createdAt: '2026-04-10' },
  { id: 't2', name: 'Follow-up Pos-Contato', channel: 'whatsapp', category: 'Vendas', content: 'Oi {{nome}}, tudo bem? Gostaria de saber se voce tem alguma duvida sobre {{produto}}.', variables: ['nome', 'produto'], createdAt: '2026-04-15' },
  { id: 't3', name: 'Newsletter Mensal', channel: 'email', category: 'Marketing', content: 'Ola {{nome}}, confira as novidades deste mes...', variables: ['nome'], createdAt: '2026-03-20' },
  { id: 't4', name: 'Confirmacao SMS', channel: 'sms', category: 'Transacional', content: '{{nome}}, sua matricula foi confirmada! Codigo: {{codigo}}', variables: ['nome', 'codigo'], createdAt: '2026-05-01' },
  { id: 't5', name: 'Lembrete de Pagamento', channel: 'email', category: 'Financeiro', content: 'Ola {{nome}}, seu boleto com vencimento em {{data}} esta disponivel.', variables: ['nome', 'data'], createdAt: '2026-05-10' },
]

const initialAudiencias: Audiencia[] = [
  { id: 'a1', name: 'Leads Quentes - Ultimo 7 dias', type: 'comportamento', rules: ['Temperatura = Quente', 'Ultimo contato < 7 dias'], count: 1840, createdAt: '2026-05-20' },
  { id: 'a2', name: 'Alunos Ativos 2026', type: 'lista', rules: ['Lista: Alunos Matriculados', 'Status = Ativo'], count: 6200, createdAt: '2026-03-15' },
  { id: 'a3', name: 'Interessados Vestibular', type: 'tag', rules: ['Tag: vestibular-2026', 'Tag: interesse-graduacao'], count: 3450, createdAt: '2026-04-01' },
  { id: 'a4', name: 'Inativos 30+ dias', type: 'comportamento', rules: ['Ultimo contato > 30 dias', 'Nao respondeu ultimas 2 campanhas'], count: 2100, createdAt: '2026-05-10' },
]

const initialAutomacoes: AutomacaoRule[] = [
  { id: 'au1', name: 'Respondeu → Mover para Qualificado', trigger: 'respondeu', action: 'mover_etapa', triggerLabel: 'Quando respondeu mensagem', actionLabel: 'Mover para etapa "Qualificado"', active: true },
  { id: 'au2', name: 'Nao respondeu 48h → Follow-up', trigger: 'nao_respondeu', action: 'enviar_followup', triggerLabel: 'Nao respondeu em 48h', actionLabel: 'Enviar follow-up automatico', active: true },
  { id: 'au3', name: 'Clicou link → Adicionar tag', trigger: 'clicou', action: 'adicionar_tag', triggerLabel: 'Clicou no link da campanha', actionLabel: 'Adicionar tag "engajado"', active: false },
  { id: 'au4', name: 'Comprou → Remover de campanhas', trigger: 'comprou', action: 'remover_campanha', triggerLabel: 'Realizou compra/matricula', actionLabel: 'Remover de todas as campanhas ativas', active: true },
  { id: 'au5', name: 'Respondeu negativo → Criar tarefa', trigger: 'respondeu', action: 'criar_tarefa', triggerLabel: 'Respondeu com sentimento negativo', actionLabel: 'Criar tarefa para vendedor', active: true },
]

const mockLogs: LogEntry[] = [
  { id: 'l1', timestamp: '2026-05-30 14:32:05', campaign: 'Vestibular 2026', message: '+5511999887766', status: 'enviado' },
  { id: 'l2', timestamp: '2026-05-30 14:32:03', campaign: 'Vestibular 2026', message: '+5511998776655', status: 'entregue' },
  { id: 'l3', timestamp: '2026-05-30 14:31:58', campaign: 'Vestibular 2026', message: '+5511997665544', status: 'falha', error: 'Numero invalido' },
  { id: 'l4', timestamp: '2026-05-30 14:31:55', campaign: 'Boas-vindas Novos Alunos', message: '+5521988776655', status: 'lido' },
  { id: 'l5', timestamp: '2026-05-30 14:31:50', campaign: 'Vestibular 2026', message: '+5531987654321', status: 'respondido' },
  { id: 'l6', timestamp: '2026-05-30 14:31:45', campaign: 'Boas-vindas Novos Alunos', message: '+5511976543210', status: 'enviado' },
  { id: 'l7', timestamp: '2026-05-30 14:31:40', campaign: 'Vestibular 2026', message: '+5541965432109', status: 'entregue' },
  { id: 'l8', timestamp: '2026-05-30 14:31:35', campaign: 'Vestibular 2026', message: '+5551954321098', status: 'falha', error: 'WhatsApp nao registrado' },
]

const mockConsent: ConsentEntry[] = [
  { id: 'co1', contact: 'Maria Silva', phone: '+5511999001122', type: 'opt_in', date: '2026-05-20' },
  { id: 'co2', contact: 'Joao Santos', phone: '+5511998002233', type: 'opt_out', date: '2026-05-22', reason: 'Solicitou remocao via WhatsApp' },
  { id: 'co3', contact: 'Ana Oliveira', phone: '+5511997003344', type: 'bloqueado', date: '2026-05-18', reason: 'Reportou spam' },
  { id: 'co4', contact: 'Pedro Costa', phone: '+5521988004455', type: 'opt_out', date: '2026-05-25', reason: 'Link de descadastro no email' },
  { id: 'co5', contact: 'Lucia Ferreira', phone: '+5531987005566', type: 'opt_in', date: '2026-05-26' },
  { id: 'co6', contact: 'Carlos Mendes', phone: '+5541976006677', type: 'bloqueado', date: '2026-05-15', reason: 'Numero invalido recorrente' },
]

// ── Wizard Step Types ────────────────────────────────────────────────────────

const WIZARD_STEPS = ['Canal & Nome', 'Audiencia', 'Conteudo', 'Configuracoes', 'Agendamento', 'Revisao'] as const

// ── Component ────────────────────────────────────────────────────────────────

export default function DisparosPage() {
  const [activeTab, setActiveTab] = useState('campanhas')
  const [campaigns, setCampaigns] = useState<Campanha[]>(initialCampaigns)
  const [templates] = useState<Template[]>(initialTemplates)
  const [audiencias, setAudiencias] = useState<Audiencia[]>(initialAudiencias)
  const [automacoes, setAutomacoes] = useState<AutomacaoRule[]>(initialAutomacoes)
  const [searchQuery, setSearchQuery] = useState('')

  // Wizard state
  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardStep, setWizardStep] = useState(0)
  const [wizardData, setWizardData] = useState({
    name: '', channel: 'whatsapp' as DisparoChannel, type: 'broadcast' as DisparoType,
    audienceIds: [] as string[], excludeIds: [] as string[],
    content: '', subject: '', variables: [] as string[], attachments: false,
    whatsappButtons: false, whatsappListMsg: false,
    speed: 50, randomDelay: false, randomDelayMin: 5, randomDelayMax: 15,
    windowStart: '08:00', windowEnd: '20:00', limitPerHour: 500, limitPerDay: 5000,
    timezone: 'America/Sao_Paulo', retryAuto: true,
    antiBlock: true, antiBlockRandomize: true, antiBlockVariations: true,
    antiBlockDelays: true, antiBlockDistribute: false, antiBlockPauseOnError: true,
    sendNow: true, scheduledDate: '', scheduledTime: '',
  })

  // Template editor
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)

  // Import leads
  const [importedLeads, setImportedLeads] = useState<{ fileName: string; count: number; status: 'idle' | 'pasting' | 'success' }>({ fileName: '', count: 0, status: 'idle' })

  // ── Derived ────────────────────────────────────────────────────────────────

  const filteredCampaigns = useMemo(() => {
    if (!searchQuery) return campaigns
    const q = searchQuery.toLowerCase()
    return campaigns.filter(c => c.name.toLowerCase().includes(q) || channelLabel[c.channel].toLowerCase().includes(q))
  }, [campaigns, searchQuery])

  const totalStats = useMemo(() => {
    const done = campaigns.filter(c => c.status === 'concluida' || c.status === 'em_execucao')
    return {
      enviadas: done.reduce((s, c) => s + c.sent, 0),
      entregues: done.reduce((s, c) => s + c.delivered, 0),
      lidas: done.reduce((s, c) => s + c.read, 0),
      respondidas: done.reduce((s, c) => s + c.replied, 0),
      falhas: done.reduce((s, c) => s + c.failed, 0),
    }
  }, [campaigns])

  // ── Wizard Handlers ────────────────────────────────────────────────────────

  function openWizard() {
    setWizardData({
      name: '', channel: 'whatsapp', type: 'broadcast',
      audienceIds: [], excludeIds: [],
      content: '', subject: '', variables: [], attachments: false,
      whatsappButtons: false, whatsappListMsg: false,
      speed: 50, randomDelay: false, randomDelayMin: 5, randomDelayMax: 15,
      windowStart: '08:00', windowEnd: '20:00', limitPerHour: 500, limitPerDay: 5000,
      timezone: 'America/Sao_Paulo', retryAuto: true,
      antiBlock: true, antiBlockRandomize: true, antiBlockVariations: true,
      antiBlockDelays: true, antiBlockDistribute: false, antiBlockPauseOnError: true,
      sendNow: true, scheduledDate: '', scheduledTime: '',
    })
    setWizardStep(0)
    setWizardOpen(true)
  }

  function finishWizard() {
    const selectedAudiences = audiencias.filter(a => wizardData.audienceIds.includes(a.id))
    const totalContacts = selectedAudiences.reduce((s, a) => s + a.count, 0)
    const newCampanha: Campanha = {
      id: `c${Date.now()}`,
      name: wizardData.name || 'Nova Campanha',
      channel: wizardData.channel,
      status: wizardData.sendNow ? 'em_execucao' : 'agendada',
      type: wizardData.type,
      createdAt: new Date().toISOString().split('T')[0],
      scheduledAt: !wizardData.sendNow ? `${wizardData.scheduledDate} ${wizardData.scheduledTime}` : undefined,
      sent: 0,
      total: totalContacts,
      audienceCount: totalContacts,
      delivered: 0, read: 0, replied: 0, failed: 0,
    }
    setCampaigns(prev => [newCampanha, ...prev])
    setWizardOpen(false)
  }

  function toggleCampaignStatus(id: string) {
    setCampaigns(prev => prev.map(c => {
      if (c.id !== id) return c
      if (c.status === 'em_execucao') return { ...c, status: 'pausada' as DisparoStatus }
      if (c.status === 'pausada') return { ...c, status: 'em_execucao' as DisparoStatus }
      return c
    }))
  }

  function cancelCampaign(id: string) {
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: 'cancelada' as DisparoStatus } : c))
  }

  function duplicateCampaign(id: string) {
    const orig = campaigns.find(c => c.id === id)
    if (!orig) return
    const dup: Campanha = {
      ...orig,
      id: `c${Date.now()}`,
      name: `${orig.name} (Copia)`,
      status: 'rascunho',
      createdAt: new Date().toISOString().split('T')[0],
      sent: 0, delivered: 0, read: 0, replied: 0, failed: 0,
    }
    setCampaigns(prev => [dup, ...prev])
  }

  function toggleAutomacao(id: string) {
    setAutomacoes(prev => prev.map(a => a.id === id ? { ...a, active: !a.active } : a))
  }

  // ── Variable Buttons ───────────────────────────────────────────────────────

  const availableVariables = ['nome', 'sobrenome', 'empresa', 'cargo', 'cidade', 'email', 'telefone']

  function insertVariable(v: string) {
    setWizardData(prev => ({ ...prev, content: prev.content + `{{${v}}}` }))
  }

  // ── Eligible Contacts Count ────────────────────────────────────────────────

  const eligibleCount = useMemo(() => {
    const selected = audiencias.filter(a => wizardData.audienceIds.includes(a.id))
    const excluded = audiencias.filter(a => wizardData.excludeIds.includes(a.id))
    const total = selected.reduce((s, a) => s + a.count, 0)
    const exc = excluded.reduce((s, a) => s + a.count, 0)
    return Math.max(0, total - exc)
  }, [audiencias, wizardData.audienceIds, wizardData.excludeIds])

  // ── Tab List ───────────────────────────────────────────────────────────────

  const tabs = [
    { id: 'campanhas', label: 'Campanhas', icon: Send },
    { id: 'templates', label: 'Templates', icon: FileText },
    { id: 'audiencias', label: 'Audiencias', icon: Users },
    { id: 'relatorios', label: 'Relatorios', icon: BarChart3 },
    { id: 'automacoes', label: 'Automacoes', icon: Zap },
    { id: 'lgpd', label: 'LGPD & Opt-out', icon: Shield },
    { id: 'logs', label: 'Logs', icon: Activity },
  ]

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Disparos em Massa</h2>
          <p className="mt-1 text-sm text-gray-500">Gerencie campanhas de WhatsApp, E-mail e SMS</p>
        </div>
        <Button onClick={openWizard}>
          <Plus className="h-4 w-4" /> Nova Campanha
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start bg-transparent border-b border-gray-200 rounded-none p-0 h-auto gap-0">
          {tabs.map(t => (
            <AnimatedTabTrigger key={t.id} value={t.id} isActive={activeTab === t.id} layoutId="disparos-tab" className="px-4 py-3 gap-2">
              <t.icon className="h-4 w-4" /> {t.label}
            </AnimatedTabTrigger>
          ))}
        </TabsList>

        {/* ── Tab: Campanhas ──────────────────────────────────────────────── */}
        <TabsContent value="campanhas" className="mt-6 space-y-4">
          <div className="flex items-center gap-3">
            <SearchInput placeholder="Buscar campanhas..." onSearch={setSearchQuery} className="max-w-sm" />
            <div className="flex items-center gap-1 ml-auto">
              {(['em_execucao', 'agendada', 'rascunho', 'concluida'] as DisparoStatus[]).map(s => (
                <button key={s} className="rounded-lg px-2.5 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors">
                  {statusConfig[s].label} ({campaigns.filter(c => c.status === s).length})
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredCampaigns.map((c, i) => (
                <motion.div key={c.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ delay: i * 0.04 }}
                  className="rounded-xl border border-gray-200 bg-white p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', c.channel === 'whatsapp' ? 'bg-emerald-50' : c.channel === 'email' ? 'bg-sky-50' : 'bg-violet-50')}>
                        <ChannelIcon channel={c.channel} className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-sm font-semibold text-gray-900 truncate">{c.name}</h3>
                          <StatusBadge status={c.status} />
                          <span className="text-xs text-gray-400 capitalize">{c.type}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Criada: {c.createdAt}</span>
                          {c.scheduledAt && <span>Agendada: {c.scheduledAt}</span>}
                          <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {c.audienceCount.toLocaleString('pt-BR')} contatos</span>
                        </div>
                        {c.total > 0 && (
                          <div className="mt-3 max-w-md">
                            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                              <span>{c.sent.toLocaleString('pt-BR')} / {c.total.toLocaleString('pt-BR')} enviadas</span>
                              <span>{c.delivered.toLocaleString('pt-BR')} entregues</span>
                            </div>
                            <ProgressBar value={c.sent} max={c.total} />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => duplicateCampaign(c.id)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors" title="Duplicar">
                        <Copy className="h-4 w-4" />
                      </button>
                      {(c.status === 'em_execucao' || c.status === 'pausada') && (
                        <button onClick={() => toggleCampaignStatus(c.id)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors" title={c.status === 'em_execucao' ? 'Pausar' : 'Retomar'}>
                          {c.status === 'em_execucao' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </button>
                      )}
                      {c.status !== 'concluida' && c.status !== 'cancelada' && (
                        <button onClick={() => cancelCampaign(c.id)} className="rounded-lg p-2 text-gray-400 hover:bg-rose-50 hover:text-rose-500 transition-colors" title="Cancelar">
                          <XCircle className="h-4 w-4" />
                        </button>
                      )}
                      {(c.status === 'concluida' || c.status === 'em_execucao') && (
                        <button onClick={() => setActiveTab('relatorios')} className="rounded-lg p-2 text-gray-400 hover:bg-indigo-50 hover:text-indigo-500 transition-colors" title="Ver relatorio">
                          <BarChart3 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {filteredCampaigns.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Send className="h-12 w-12 mb-3 opacity-40" />
                <p className="text-sm">Nenhuma campanha encontrada</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Tab: Templates ──────────────────────────────────────────────── */}
        <TabsContent value="templates" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <SearchInput placeholder="Buscar templates..." className="max-w-sm" />
            <Button variant="outline" onClick={() => setEditingTemplate({ id: '', name: '', channel: 'whatsapp', category: '', content: '', variables: [], createdAt: '' })}>
              <Plus className="h-4 w-4" /> Novo Template
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((t, i) => (
              <motion.div key={t.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-gray-200 bg-white p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ChannelIcon channel={t.channel} />
                    <span className="text-xs font-medium text-gray-500">{channelLabel[t.channel]}</span>
                  </div>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{t.category}</span>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">{t.name}</h3>
                <p className="text-xs text-gray-500 line-clamp-3 mb-3">{t.content}</p>
                <div className="flex items-center gap-1 flex-wrap mb-3">
                  {t.variables.map(v => (
                    <span key={v} className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-mono text-indigo-600">{`{{${v}}}`}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-400">{t.createdAt}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setEditingTemplate(t)} className="rounded p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors">
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button className="rounded p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-500 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Template Preview/Edit Modal */}
          <AnimatePresence>
            {editingTemplate && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditingTemplate(null)}>
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">{editingTemplate.id ? 'Editar Template' : 'Novo Template'}</h3>
                    <button onClick={() => setEditingTemplate(null)} className="rounded-lg p-1 text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                      <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none" defaultValue={editingTemplate.name} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Canal</label>
                        <select className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none" defaultValue={editingTemplate.channel}>
                          <option value="whatsapp">WhatsApp</option>
                          <option value="email">E-mail</option>
                          <option value="sms">SMS</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                        <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none" defaultValue={editingTemplate.category} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Conteudo</label>
                      <textarea rows={5} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none resize-none" defaultValue={editingTemplate.content} />
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-xs text-gray-500 mr-1">Variaveis:</span>
                      {availableVariables.map(v => (
                        <button key={v} className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-mono text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">{`{{${v}}}`}</button>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-6">
                    <Button variant="outline" onClick={() => setEditingTemplate(null)}>Cancelar</Button>
                    <Button onClick={() => setEditingTemplate(null)}>Salvar Template</Button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </TabsContent>

        {/* ── Tab: Audiencias ─────────────────────────────────────────────── */}
        <TabsContent value="audiencias" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <SearchInput placeholder="Buscar audiencias..." className="max-w-sm" />
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 px-3 py-2 bg-sky-50 border border-sky-200 text-sky-700 text-sm font-medium rounded-lg cursor-pointer hover:bg-sky-100 transition-colors">
                <Upload className="h-4 w-4" /> Importar CSV/XLSX
                <input type="file" accept=".csv,.xlsx,.xls,.txt" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    const count = Math.floor(Math.random() * 3000) + 1000
                    setAudiencias(prev => [...prev, { id: `imp-${Date.now()}`, name: `Importado: ${file.name}`, type: 'lista', count, rules: [`Arquivo: ${file.name}`, `${count} contatos importados`], createdAt: new Date().toISOString() }])
                  }
                }} />
              </label>
              <Button variant="outline"><Plus className="h-4 w-4" /> Novo Segmento</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {audiencias.map((a, i) => (
              <motion.div key={a.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-gray-200 bg-white p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">{a.name}</h3>
                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium',
                    a.type === 'comportamento' ? 'bg-purple-50 text-purple-600' :
                    a.type === 'tag' ? 'bg-amber-50 text-amber-600' :
                    a.type === 'lista' ? 'bg-sky-50 text-sky-600' : 'bg-gray-100 text-gray-600'
                  )}>{a.type}</span>
                </div>
                <div className="space-y-1 mb-4">
                  {a.rules.map((r, ri) => (
                    <div key={ri} className="flex items-center gap-2 text-xs text-gray-500">
                      <Filter className="h-3 w-3 text-gray-400 shrink-0" />
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600">
                    <Users className="h-4 w-4" />
                    {a.count.toLocaleString('pt-BR')} contatos
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="rounded p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"><Edit3 className="h-3.5 w-3.5" /></button>
                    <button className="rounded p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* ── Tab: Relatorios ─────────────────────────────────────────────── */}
        <TabsContent value="relatorios" className="mt-6 space-y-6">
          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <StatCard icon={<Send className="h-4 w-4" />} title="Enviadas" value={totalStats.enviadas} change={12.5} sparkline={[20, 35, 45, 42, 60, 72, 85]} />
            <StatCard icon={<CheckCircle2 className="h-4 w-4" />} title="Entregues" value={totalStats.entregues} change={10.2} sparkline={[18, 30, 40, 38, 55, 68, 80]} />
            <StatCard icon={<Eye className="h-4 w-4" />} title="Lidas" value={totalStats.lidas} change={8.7} sparkline={[15, 25, 35, 32, 45, 52, 60]} />
            <StatCard icon={<MessageSquare className="h-4 w-4" />} title="Respondidas" value={totalStats.respondidas} change={15.3} sparkline={[5, 12, 18, 15, 22, 30, 35]} />
            <StatCard icon={<XCircle className="h-4 w-4" />} title="Falhas" value={totalStats.falhas} change={-3.2} sparkline={[10, 8, 12, 6, 5, 7, 4]} />
          </div>

          {/* Rates Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Taxa de Entrega', value: totalStats.entregues > 0 ? ((totalStats.entregues / totalStats.enviadas) * 100).toFixed(1) : '0', color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Taxa de Leitura', value: totalStats.entregues > 0 ? ((totalStats.lidas / totalStats.entregues) * 100).toFixed(1) : '0', color: 'text-sky-600', bg: 'bg-sky-50' },
              { label: 'Taxa de Resposta', value: totalStats.lidas > 0 ? ((totalStats.respondidas / totalStats.lidas) * 100).toFixed(1) : '0', color: 'text-indigo-600', bg: 'bg-indigo-50' },
              { label: 'Taxa de Falha', value: totalStats.enviadas > 0 ? ((totalStats.falhas / totalStats.enviadas) * 100).toFixed(1) : '0', color: 'text-rose-600', bg: 'bg-rose-50' },
            ].map((r, i) => (
              <motion.div key={r.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-gray-200 bg-white p-5"
              >
                <p className="text-sm text-gray-500 mb-1">{r.label}</p>
                <p className={cn('text-3xl font-bold tabular-nums', r.color)}>{r.value}%</p>
              </motion.div>
            ))}
          </div>

          {/* Mock Chart */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Envios por Dia (Ultimos 7 dias)</h3>
            <div className="flex items-end gap-3 h-40">
              {[820, 1240, 980, 1560, 2100, 1800, 1450].map((v, i) => {
                const maxVal = 2100
                const pct = (v / maxVal) * 100
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-gray-400 tabular-nums">{v}</span>
                    <motion.div initial={{ height: 0 }} animate={{ height: `${pct}%` }} transition={{ delay: i * 0.08, duration: 0.5 }}
                      className="w-full rounded-t-md bg-gradient-to-t from-indigo-500 to-sky-400"
                    />
                    <span className="text-[10px] text-gray-400">{['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'][i]}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Performance by Channel */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Performance por Canal</h3>
            <div className="space-y-4">
              {([
                { channel: 'whatsapp' as DisparoChannel, sent: 5140, delivered: 4960, read: 3968, replied: 1333 },
                { channel: 'email' as DisparoChannel, sent: 13900, delivered: 13220, read: 6610, replied: 962 },
                { channel: 'sms' as DisparoChannel, sent: 4500, delivered: 4350, read: 2610, replied: 1740 },
              ]).map(ch => (
                <div key={ch.channel} className="flex items-center gap-4">
                  <div className="flex items-center gap-2 w-28 shrink-0">
                    <ChannelIcon channel={ch.channel} />
                    <span className="text-sm font-medium text-gray-700">{channelLabel[ch.channel]}</span>
                  </div>
                  <div className="flex-1 grid grid-cols-4 gap-4 text-center">
                    <div><p className="text-xs text-gray-400">Enviadas</p><p className="text-sm font-semibold text-gray-900">{ch.sent.toLocaleString('pt-BR')}</p></div>
                    <div><p className="text-xs text-gray-400">Entregues</p><p className="text-sm font-semibold text-gray-900">{ch.delivered.toLocaleString('pt-BR')}</p></div>
                    <div><p className="text-xs text-gray-400">Lidas</p><p className="text-sm font-semibold text-gray-900">{ch.read.toLocaleString('pt-BR')}</p></div>
                    <div><p className="text-xs text-gray-400">Respondidas</p><p className="text-sm font-semibold text-gray-900">{ch.replied.toLocaleString('pt-BR')}</p></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Campaign Performance Table */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Performance por Campanha</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campanha</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Canal</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Enviadas</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Entregues</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Lidas</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Respondidas</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Taxa Resp.</th>
                </tr></thead>
                <tbody>
                  {campaigns.filter(c => c.sent > 0).map(c => (
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-3 font-medium text-gray-900">{c.name}</td>
                      <td className="px-4 py-3 text-center"><ChannelIcon channel={c.channel} className="mx-auto" /></td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-700">{c.sent.toLocaleString('pt-BR')}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-700">{c.delivered.toLocaleString('pt-BR')}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-700">{c.read.toLocaleString('pt-BR')}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-700">{c.replied.toLocaleString('pt-BR')}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium text-indigo-600">{c.read > 0 ? ((c.replied / c.read) * 100).toFixed(1) : '0'}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ── Tab: Automacoes ─────────────────────────────────────────────── */}
        <TabsContent value="automacoes" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Regras de Automacao Pos-Disparo</h3>
              <p className="text-xs text-gray-500 mt-0.5">Configure acoes automaticas baseadas no comportamento do destinatario</p>
            </div>
            <Button variant="outline"><Plus className="h-4 w-4" /> Nova Regra</Button>
          </div>

          <div className="space-y-3">
            {automacoes.map((a, i) => (
              <motion.div key={a.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className={cn('rounded-xl border bg-white p-5 transition-all', a.active ? 'border-gray-200' : 'border-gray-100 opacity-60')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', a.active ? 'bg-indigo-50' : 'bg-gray-50')}>
                      <Zap className={cn('h-5 w-5', a.active ? 'text-indigo-500' : 'text-gray-400')} />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900">{a.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="rounded bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">{a.triggerLabel}</span>
                        <ArrowRight className="h-3 w-3 text-gray-300" />
                        <span className="rounded bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700">{a.actionLabel}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => toggleAutomacao(a.id)}
                      className={cn('relative inline-flex h-6 w-11 items-center rounded-full transition-colors', a.active ? 'bg-indigo-500' : 'bg-gray-200')}
                    >
                      <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform', a.active ? 'translate-x-6' : 'translate-x-1')} />
                    </button>
                    <button className="rounded p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"><Edit3 className="h-4 w-4" /></button>
                    <button className="rounded p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* ── Tab: LGPD ───────────────────────────────────────────────────── */}
        <TabsContent value="lgpd" className="mt-6 space-y-6">
          {/* Consent Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: 'Opt-in Ativos', value: mockConsent.filter(c => c.type === 'opt_in').length * 1540, icon: <CheckCircle2 className="h-4 w-4" />, color: 'text-emerald-600' },
              { label: 'Opt-out', value: mockConsent.filter(c => c.type === 'opt_out').length * 380, icon: <XCircle className="h-4 w-4" />, color: 'text-amber-600' },
              { label: 'Bloqueados', value: mockConsent.filter(c => c.type === 'bloqueado').length * 95, icon: <Lock className="h-4 w-4" />, color: 'text-rose-600' },
              { label: 'Taxa de Opt-out', value: 2.3, icon: <TrendingDown className="h-4 w-4" />, color: 'text-gray-600', suffix: '%' },
            ].map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-gray-200 bg-white p-5"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-400">{s.icon}</div>
                  <span className="text-sm text-gray-500">{s.label}</span>
                </div>
                <p className={cn('text-2xl font-bold tabular-nums', s.color)}>
                  {typeof s.value === 'number' && !s.suffix ? s.value.toLocaleString('pt-BR') : `${s.value}${s.suffix || ''}`}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Settings */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Configuracoes LGPD</h3>
            <div className="space-y-3">
              {[
                { label: 'Descadastro automatico', desc: 'Remover automaticamente contatos que solicitam opt-out', active: true },
                { label: 'Verificacao de consentimento pre-envio', desc: 'Validar consentimento antes de cada disparo', active: true },
                { label: 'Registrar base legal', desc: 'Exigir base legal para cada campanha', active: false },
              ].map((cfg, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-gray-100 p-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{cfg.label}</p>
                    <p className="text-xs text-gray-500">{cfg.desc}</p>
                  </div>
                  <div className={cn('relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer', cfg.active ? 'bg-indigo-500' : 'bg-gray-200')}>
                    <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform', cfg.active ? 'translate-x-6' : 'translate-x-1')} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Consent History Table */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Historico de Consentimento</h3>
              <Button variant="outline" size="sm"><Download className="h-3.5 w-3.5" /> Exportar Lista</Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contato</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telefone</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Motivo</th>
                </tr></thead>
                <tbody>
                  {mockConsent.map(c => (
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-3 font-medium text-gray-900">{c.contact}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{c.phone}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                          c.type === 'opt_in' ? 'bg-emerald-50 text-emerald-600' :
                          c.type === 'opt_out' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
                        )}>{c.type === 'opt_in' ? 'Opt-in' : c.type === 'opt_out' ? 'Opt-out' : 'Bloqueado'}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{c.date}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{c.reason || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ── Tab: Logs ───────────────────────────────────────────────────── */}
        <TabsContent value="logs" className="mt-6 space-y-6">
          {/* System Health */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Na fila', value: '1.247', icon: <Layers className="h-4 w-4" />, color: 'text-indigo-600' },
              { label: 'Processando', value: '42/min', icon: <Activity className="h-4 w-4" />, color: 'text-sky-600' },
              { label: 'Taxa de erro', value: '1.8%', icon: <AlertTriangle className="h-4 w-4" />, color: 'text-amber-600' },
              { label: 'Uptime', value: '99.97%', icon: <Radio className="h-4 w-4" />, color: 'text-emerald-600' },
            ].map((h, i) => (
              <motion.div key={h.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-gray-200 bg-white p-5"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-400">{h.icon}</div>
                  <span className="text-sm text-gray-500">{h.label}</span>
                </div>
                <p className={cn('text-2xl font-bold tabular-nums', h.color)}>{h.value}</p>
              </motion.div>
            ))}
          </div>

          {/* Retry Queue */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Fila de Retry</h3>
                <p className="text-xs text-gray-500">23 mensagens aguardando reenvio</p>
              </div>
              <Button variant="outline" size="sm"><RefreshCw className="h-3.5 w-3.5" /> Reprocessar Tudo</Button>
            </div>
            <div className="flex items-center gap-3">
              {[
                { label: 'Tentativa 1', count: 15, color: 'bg-amber-100 text-amber-700' },
                { label: 'Tentativa 2', count: 5, color: 'bg-orange-100 text-orange-700' },
                { label: 'Tentativa 3+', count: 3, color: 'bg-rose-100 text-rose-700' },
              ].map(r => (
                <span key={r.label} className={cn('rounded-full px-3 py-1 text-xs font-medium', r.color)}>{r.label}: {r.count}</span>
              ))}
            </div>
          </div>

          {/* Logs Table */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Logs Recentes</h3>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-xs text-emerald-600"><span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Ao vivo</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campanha</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Destinatario</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Erro</th>
                </tr></thead>
                <tbody>
                  {mockLogs.map((log, i) => (
                    <motion.tr key={log.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                      className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-6 py-3 font-mono text-xs text-gray-500">{log.timestamp}</td>
                      <td className="px-4 py-3 text-gray-700">{log.campaign}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{log.message}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                          log.status === 'enviado' ? 'bg-blue-50 text-blue-600' :
                          log.status === 'entregue' ? 'bg-emerald-50 text-emerald-600' :
                          log.status === 'lido' ? 'bg-sky-50 text-sky-600' :
                          log.status === 'respondido' ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'
                        )}>{log.status}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-rose-500">{log.error || '-'}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Campaign Creation Wizard (Modal) ──────────────────────────────── */}
      <AnimatePresence>
        {wizardOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl"
            >
              {/* Wizard Header */}
              <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Nova Campanha de Disparo</h2>
                  <button onClick={() => setWizardOpen(false)} className="rounded-lg p-1 text-gray-400 hover:text-gray-600 transition-colors"><X className="h-5 w-5" /></button>
                </div>
                {/* Step Indicator */}
                <div className="flex items-center gap-1">
                  {WIZARD_STEPS.map((step, i) => (
                    <React.Fragment key={step}>
                      <button onClick={() => i <= wizardStep && setWizardStep(i)}
                        className={cn('flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                          i === wizardStep ? 'bg-indigo-100 text-indigo-700' :
                          i < wizardStep ? 'bg-emerald-50 text-emerald-600 cursor-pointer' : 'text-gray-400'
                        )}
                      >
                        <span className={cn('flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold',
                          i === wizardStep ? 'bg-indigo-500 text-white' :
                          i < wizardStep ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'
                        )}>{i < wizardStep ? <CheckCircle2 className="h-3 w-3" /> : i + 1}</span>
                        <span className="hidden sm:inline">{step}</span>
                      </button>
                      {i < WIZARD_STEPS.length - 1 && <div className={cn('h-px flex-1', i < wizardStep ? 'bg-emerald-300' : 'bg-gray-200')} />}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Wizard Body */}
              <div className="px-6 py-6">
                <AnimatePresence mode="wait">
                  {/* Step 1: Canal & Nome */}
                  {wizardStep === 0 && (
                    <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Campanha</label>
                        <input value={wizardData.name} onChange={e => setWizardData(d => ({ ...d, name: e.target.value }))}
                          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none" placeholder="Ex: Vestibular 2026 - Lembrete" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Canal de Envio</label>
                        <div className="grid grid-cols-3 gap-3">
                          {(['whatsapp', 'email', 'sms'] as DisparoChannel[]).map(ch => (
                            <button key={ch} onClick={() => setWizardData(d => ({ ...d, channel: ch }))}
                              className={cn('flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all',
                                wizardData.channel === ch ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
                              )}
                            >
                              <ChannelIcon channel={ch} className="h-8 w-8" />
                              <span className="text-sm font-medium text-gray-700">{channelLabel[ch]}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
                        <div className="grid grid-cols-2 gap-3">
                          {([
                            { value: 'broadcast' as DisparoType, label: 'Broadcast', desc: 'Envio unico para todos' },
                            { value: 'sequencia' as DisparoType, label: 'Sequencia', desc: 'Mensagens em serie' },
                          ]).map(t => (
                            <button key={t.value} onClick={() => setWizardData(d => ({ ...d, type: t.value }))}
                              className={cn('flex flex-col items-start rounded-xl border-2 p-4 transition-all text-left',
                                wizardData.type === t.value ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
                              )}
                            >
                              <span className="text-sm font-semibold text-gray-900">{t.label}</span>
                              <span className="text-xs text-gray-500">{t.desc}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 2: Audiencia */}
                  {wizardStep === 1 && (
                    <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                      {/* Import Section */}
                      <div className="rounded-xl border-2 border-dashed border-sky-300 bg-sky-50 p-5">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center">
                            <Upload className="w-5 h-5 text-sky-600" />
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900">Importar Leads</h4>
                            <p className="text-xs text-gray-500">CSV, XLSX ou TXT com numeros/emails</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors">
                            <Upload className="w-4 h-4" />
                            Importar CSV/XLSX
                            <input type="file" accept=".csv,.xlsx,.xls,.txt" className="hidden" onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                const count = Math.floor(Math.random() * 2000) + 500
                                setWizardData(d => ({ ...d, audienceIds: [...d.audienceIds, 'imported'] }))
                                setImportedLeads({ fileName: file.name, count, status: 'success' })
                              }
                            }} />
                          </label>
                          <button onClick={() => {
                            setImportedLeads({ fileName: 'lista_colada.txt', count: 0, status: 'pasting' })
                          }} className="px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                            Colar Lista
                          </button>
                        </div>
                        {importedLeads.status === 'pasting' && (
                          <div className="mt-3 space-y-2">
                            <textarea
                              placeholder="Cole numeros ou emails aqui (um por linha)..."
                              rows={4}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 resize-none"
                              onChange={(e) => {
                                const lines = e.target.value.split('\n').filter(l => l.trim())
                                setImportedLeads(prev => ({ ...prev, count: lines.length }))
                              }}
                            />
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500">{importedLeads.count} contatos detectados</span>
                              <button onClick={() => setImportedLeads(prev => ({ ...prev, status: 'success' }))} className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-white text-xs rounded-lg transition-colors">
                                Confirmar
                              </button>
                            </div>
                          </div>
                        )}
                        {importedLeads.status === 'success' && importedLeads.count > 0 && (
                          <div className="mt-3 flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="text-sm text-emerald-700 font-medium">{importedLeads.count.toLocaleString('pt-BR')} contatos importados de {importedLeads.fileName}</span>
                            <button onClick={() => setImportedLeads({ fileName: '', count: 0, status: 'idle' })} className="ml-auto text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                          </div>
                        )}
                      </div>

                      {/* Existing audiences */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Incluir Audiencias</label>
                        <div className="space-y-2">
                          {audiencias.map(a => (
                            <label key={a.id} className={cn('flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all',
                              wizardData.audienceIds.includes(a.id) ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
                            )}>
                              <input type="checkbox" checked={wizardData.audienceIds.includes(a.id)}
                                onChange={e => {
                                  const ids = e.target.checked ? [...wizardData.audienceIds, a.id] : wizardData.audienceIds.filter(id => id !== a.id)
                                  setWizardData(d => ({ ...d, audienceIds: ids }))
                                }}
                                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <div className="flex-1">
                                <span className="text-sm font-medium text-gray-900">{a.name}</span>
                                <span className="ml-2 text-xs text-gray-500">({a.count.toLocaleString('pt-BR')} contatos)</span>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Excluir Audiencias</label>
                        <div className="space-y-2">
                          {audiencias.map(a => (
                            <label key={`exc-${a.id}`} className={cn('flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all',
                              wizardData.excludeIds.includes(a.id) ? 'border-rose-500 bg-rose-50' : 'border-gray-200 hover:border-gray-300'
                            )}>
                              <input type="checkbox" checked={wizardData.excludeIds.includes(a.id)}
                                onChange={e => {
                                  const ids = e.target.checked ? [...wizardData.excludeIds, a.id] : wizardData.excludeIds.filter(id => id !== a.id)
                                  setWizardData(d => ({ ...d, excludeIds: ids }))
                                }}
                                className="h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                              />
                              <div className="flex-1">
                                <span className="text-sm font-medium text-gray-900">{a.name}</span>
                                <span className="ml-2 text-xs text-gray-500">({a.count.toLocaleString('pt-BR')})</span>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-4">
                        <div className="flex items-center gap-2">
                          <Users className="h-5 w-5 text-indigo-500" />
                          <span className="text-sm font-semibold text-indigo-700">
                            {(eligibleCount + (importedLeads.status === 'success' ? importedLeads.count : 0)).toLocaleString('pt-BR')} contatos elegiveis
                          </span>
                          {importedLeads.status === 'success' && importedLeads.count > 0 && (
                            <span className="text-xs text-indigo-500">(inclui {importedLeads.count.toLocaleString('pt-BR')} importados)</span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 3: Conteudo */}
                  {wizardStep === 2 && (
                    <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                      {wizardData.channel === 'email' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Assunto do E-mail</label>
                          <input value={wizardData.subject} onChange={e => setWizardData(d => ({ ...d, subject: e.target.value }))}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50"
                            placeholder="Assunto da mensagem..." />
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem</label>
                        <textarea value={wizardData.content} onChange={e => setWizardData(d => ({ ...d, content: e.target.value }))}
                          rows={8} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none resize-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50"
                          placeholder={wizardData.channel === 'email' ? 'Corpo do e-mail...' : 'Digite sua mensagem...'} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">Inserir Variavel</label>
                        <div className="flex items-center gap-1 flex-wrap">
                          {availableVariables.map(v => (
                            <button key={v} onClick={() => insertVariable(v)}
                              className="rounded bg-gray-100 px-2 py-1 text-xs font-mono text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                            >{`{{${v}}}`}</button>
                          ))}
                        </div>
                      </div>
                      {wizardData.channel === 'whatsapp' && (
                        <div className="space-y-3">
                          <p className="text-xs font-medium text-gray-500">Opcoes WhatsApp</p>
                          <div className="flex items-center gap-4">
                            <button onClick={() => setWizardData(d => ({ ...d, attachments: !d.attachments }))}
                              className={cn('flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-all',
                                wizardData.attachments ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                              )}
                            >
                              <Image className="h-4 w-4" /> Imagem/Video/Doc
                            </button>
                            <button onClick={() => setWizardData(d => ({ ...d, whatsappButtons: !d.whatsappButtons }))}
                              className={cn('flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-all',
                                wizardData.whatsappButtons ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                              )}
                            >
                              <MousePointerClick className="h-4 w-4" /> Botoes Interativos
                            </button>
                            <button onClick={() => setWizardData(d => ({ ...d, whatsappListMsg: !d.whatsappListMsg }))}
                              className={cn('flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-all',
                                wizardData.whatsappListMsg ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                              )}
                            >
                              <Layers className="h-4 w-4" /> Lista de Opcoes
                            </button>
                          </div>
                        </div>
                      )}
                      {wizardData.channel === 'email' && (
                        <div className="flex items-center gap-3">
                          <button className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-500 hover:border-gray-300 transition-all">
                            <Paperclip className="h-4 w-4" /> Anexar Arquivo
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Step 4: Configuracoes */}
                  {wizardStep === 3 && (
                    <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Velocidade de Disparo: {wizardData.speed} msgs/min</label>
                        <input type="range" min={1} max={100} value={wizardData.speed} onChange={e => setWizardData(d => ({ ...d, speed: Number(e.target.value) }))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                        <div className="flex justify-between text-xs text-gray-400 mt-1"><span>1 msg/min</span><span>100 msgs/min</span></div>
                      </div>

                      <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Intervalo aleatorio entre mensagens</p>
                          <p className="text-xs text-gray-500">Adiciona atraso variavel para parecer mais natural</p>
                        </div>
                        <button onClick={() => setWizardData(d => ({ ...d, randomDelay: !d.randomDelay }))}
                          className={cn('relative inline-flex h-6 w-11 items-center rounded-full transition-colors', wizardData.randomDelay ? 'bg-indigo-500' : 'bg-gray-200')}>
                          <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform', wizardData.randomDelay ? 'translate-x-6' : 'translate-x-1')} />
                        </button>
                      </div>
                      {wizardData.randomDelay && (
                        <div className="grid grid-cols-2 gap-3 pl-4">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Min (seg)</label>
                            <input type="number" value={wizardData.randomDelayMin} onChange={e => setWizardData(d => ({ ...d, randomDelayMin: Number(e.target.value) }))}
                              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none" />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Max (seg)</label>
                            <input type="number" value={wizardData.randomDelayMax} onChange={e => setWizardData(d => ({ ...d, randomDelayMax: Number(e.target.value) }))}
                              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none" />
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Janela Inicio</label>
                          <input type="time" value={wizardData.windowStart} onChange={e => setWizardData(d => ({ ...d, windowStart: e.target.value }))}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Janela Fim</label>
                          <input type="time" value={wizardData.windowEnd} onChange={e => setWizardData(d => ({ ...d, windowEnd: e.target.value }))}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Limite por Hora</label>
                          <input type="number" value={wizardData.limitPerHour} onChange={e => setWizardData(d => ({ ...d, limitPerHour: Number(e.target.value) }))}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Limite por Dia</label>
                          <input type="number" value={wizardData.limitPerDay} onChange={e => setWizardData(d => ({ ...d, limitPerDay: Number(e.target.value) }))}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fuso Horario</label>
                        <select value={wizardData.timezone} onChange={e => setWizardData(d => ({ ...d, timezone: e.target.value }))}
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none">
                          <option value="America/Sao_Paulo">Brasilia (GMT-3)</option>
                          <option value="America/Manaus">Manaus (GMT-4)</option>
                          <option value="America/Bahia">Bahia (GMT-3)</option>
                          <option value="America/Noronha">Fernando de Noronha (GMT-2)</option>
                        </select>
                      </div>

                      <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Retry Automatico</p>
                          <p className="text-xs text-gray-500">Reenviar automaticamente mensagens com falha</p>
                        </div>
                        <button onClick={() => setWizardData(d => ({ ...d, retryAuto: !d.retryAuto }))}
                          className={cn('relative inline-flex h-6 w-11 items-center rounded-full transition-colors', wizardData.retryAuto ? 'bg-indigo-500' : 'bg-gray-200')}>
                          <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform', wizardData.retryAuto ? 'translate-x-6' : 'translate-x-1')} />
                        </button>
                      </div>

                      {/* Anti-Block Section */}
                      <div className="rounded-xl border border-gray-200 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-indigo-500" />
                            <p className="text-sm font-medium text-gray-900">Anti-Bloqueio WhatsApp</p>
                          </div>
                          <button onClick={() => setWizardData(d => ({ ...d, antiBlock: !d.antiBlock }))}
                            className={cn('relative inline-flex h-6 w-11 items-center rounded-full transition-colors', wizardData.antiBlock ? 'bg-indigo-500' : 'bg-gray-200')}>
                            <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform', wizardData.antiBlock ? 'translate-x-6' : 'translate-x-1')} />
                          </button>
                        </div>
                        {wizardData.antiBlock && (
                          <div className="space-y-2 pt-2 border-t border-gray-100">
                            {([
                              { key: 'antiBlockRandomize' as const, label: 'Randomizacao de ordem de envio' },
                              { key: 'antiBlockVariations' as const, label: 'Variacoes automaticas de texto' },
                              { key: 'antiBlockDelays' as const, label: 'Delays aleatorios entre msgs' },
                              { key: 'antiBlockDistribute' as const, label: 'Distribuir entre remetentes' },
                              { key: 'antiBlockPauseOnError' as const, label: 'Pausar ao detectar taxa de erro alta' },
                            ]).map(opt => (
                              <label key={opt.key} className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" checked={wizardData[opt.key]}
                                  onChange={e => setWizardData(d => ({ ...d, [opt.key]: e.target.checked }))}
                                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                                <span className="text-sm text-gray-700">{opt.label}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* Step 5: Agendamento */}
                  {wizardStep === 4 && (
                    <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                      <div className="grid grid-cols-2 gap-3">
                        {([
                          { value: true, label: 'Enviar Agora', desc: 'Iniciar imediatamente apos a criacao', icon: Send },
                          { value: false, label: 'Agendar', desc: 'Escolher data e horario para envio', icon: Clock },
                        ] as const).map(opt => (
                          <button key={String(opt.value)} onClick={() => setWizardData(d => ({ ...d, sendNow: opt.value }))}
                            className={cn('flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-all',
                              wizardData.sendNow === opt.value ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
                            )}
                          >
                            <opt.icon className={cn('h-8 w-8', wizardData.sendNow === opt.value ? 'text-indigo-500' : 'text-gray-400')} />
                            <div className="text-center">
                              <span className="text-sm font-semibold text-gray-900">{opt.label}</span>
                              <p className="text-xs text-gray-500 mt-1">{opt.desc}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                      {!wizardData.sendNow && (
                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                            <input type="date" value={wizardData.scheduledDate} onChange={e => setWizardData(d => ({ ...d, scheduledDate: e.target.value }))}
                              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Horario</label>
                            <input type="time" value={wizardData.scheduledTime} onChange={e => setWizardData(d => ({ ...d, scheduledTime: e.target.value }))}
                              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none" />
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Step 6: Revisao */}
                  {wizardStep === 5 && (
                    <motion.div key="step5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 space-y-3">
                        <h3 className="text-sm font-semibold text-gray-900">Resumo da Campanha</h3>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                          <div className="flex justify-between"><span className="text-gray-500">Nome:</span><span className="font-medium text-gray-900">{wizardData.name || '(sem nome)'}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Canal:</span><span className="font-medium text-gray-900 flex items-center gap-1"><ChannelIcon channel={wizardData.channel} />{channelLabel[wizardData.channel]}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Tipo:</span><span className="font-medium text-gray-900 capitalize">{wizardData.type}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Contatos:</span><span className="font-medium text-indigo-600">{eligibleCount.toLocaleString('pt-BR')}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Velocidade:</span><span className="font-medium text-gray-900">{wizardData.speed} msgs/min</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Janela:</span><span className="font-medium text-gray-900">{wizardData.windowStart} - {wizardData.windowEnd}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Envio:</span><span className="font-medium text-gray-900">{wizardData.sendNow ? 'Imediato' : `${wizardData.scheduledDate} ${wizardData.scheduledTime}`}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Retry:</span><span className="font-medium text-gray-900">{wizardData.retryAuto ? 'Sim' : 'Nao'}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Anti-bloqueio:</span><span className="font-medium text-gray-900">{wizardData.antiBlock ? 'Ativo' : 'Inativo'}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Fuso:</span><span className="font-medium text-gray-900">{wizardData.timezone}</span></div>
                        </div>
                      </div>
                      {wizardData.content && (
                        <div className="rounded-xl border border-gray-200 p-5">
                          <p className="text-xs font-medium text-gray-500 mb-2">Preview da Mensagem</p>
                          {wizardData.subject && <p className="text-sm font-semibold text-gray-900 mb-1">Assunto: {wizardData.subject}</p>}
                          <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">{wizardData.content}</p>
                        </div>
                      )}
                      <div className="rounded-lg bg-amber-50 border border-amber-100 p-4 flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-amber-800">Confirmar envio</p>
                          <p className="text-xs text-amber-600 mt-0.5">Apos iniciar, a campanha sera enviada para {eligibleCount.toLocaleString('pt-BR')} contatos. Esta acao nao pode ser desfeita.</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Wizard Footer */}
              <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 rounded-b-2xl flex items-center justify-between">
                <Button variant="outline" onClick={() => wizardStep === 0 ? setWizardOpen(false) : setWizardStep(s => s - 1)}>
                  <ArrowLeft className="h-4 w-4" /> {wizardStep === 0 ? 'Cancelar' : 'Voltar'}
                </Button>
                {wizardStep < WIZARD_STEPS.length - 1 ? (
                  <Button onClick={() => setWizardStep(s => s + 1)}>
                    Proximo <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={finishWizard}>
                    <Send className="h-4 w-4" /> Iniciar Disparo
                  </Button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
