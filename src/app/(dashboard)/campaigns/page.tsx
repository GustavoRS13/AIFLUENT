'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  MessageSquare,
  Mail,
  Smartphone,
  BarChart3,
  Send,
  FileText,
  CheckCircle2,
  Zap,
  GitBranch,
  LayoutGrid,
  List,
  X,
  Eye,
  MessageCircle,
  Target,
  ArrowLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { SearchInput } from '@/components/ui/search-input'
import { StatCard } from '@/components/ui/stat-card'
import { Tabs, TabsList, AnimatedTabTrigger, TabsContent } from '@/components/ui/tabs'
import { CampaignCard, type CampaignCardData } from '@/components/campaigns/campaign-card'
import { CampaignBuilder } from '@/components/campaigns/campaign-builder'
import { CampaignMetrics, getDemoMetrics } from '@/components/campaigns/campaign-metrics'
import type { CampaignChannel, CampaignStatus } from '@/types'

// Initial demo data — replace with API when backend ready

const initialCampaigns: CampaignCardData[] = [
  {
    id: 'c1',
    name: 'Vestibular 2026 - Primeiro Contato',
    channel: 'whatsapp',
    status: 'sending',
    type: 'broadcast',
    metrics: { sent: 4820, delivered: 4650, opened: 3720, replied: 1240, converted: 372 },
    createdAt: '2026-05-25',
    createdBy: 'Carlos Mendes',
  },
  {
    id: 'c2',
    name: 'Promocao Pos-graduacao - Maio',
    channel: 'email',
    status: 'completed',
    type: 'broadcast',
    metrics: { sent: 2300, delivered: 2180, opened: 980, replied: 245, converted: 98 },
    createdAt: '2026-05-20',
    createdBy: 'Ana Costa',
  },
  {
    id: 'c3',
    name: 'Reengajamento leads frios',
    channel: 'whatsapp',
    status: 'draft',
    type: 'sequence',
    metrics: { sent: 0, delivered: 0, opened: 0, replied: 0, converted: 0 },
    createdAt: '2026-05-27',
    createdBy: 'Rafael Lima',
  },
  {
    id: 'c4',
    name: 'Confirmacao de evento presencial',
    channel: 'sms',
    status: 'completed',
    type: 'broadcast',
    metrics: { sent: 850, delivered: 820, opened: 715, replied: 340, converted: 280 },
    createdAt: '2026-05-18',
    createdBy: 'Julia Ferreira',
  },
  {
    id: 'c5',
    name: 'Nurturing - Leads quentes',
    channel: 'whatsapp',
    status: 'paused',
    type: 'automation',
    metrics: { sent: 1200, delivered: 1150, opened: 920, replied: 460, converted: 184 },
    createdAt: '2026-05-15',
    createdBy: 'Carlos Mendes',
  },
  {
    id: 'c6',
    name: 'Newsletter educacional',
    channel: 'email',
    status: 'scheduled',
    type: 'broadcast',
    metrics: { sent: 0, delivered: 0, opened: 0, replied: 0, converted: 0 },
    createdAt: '2026-05-26',
    createdBy: 'Ana Costa',
    scheduledFor: '2026-05-28T10:00:00',
  },
  {
    id: 'c7',
    name: 'Follow-up pos-matricula',
    channel: 'whatsapp',
    status: 'completed',
    type: 'sequence',
    metrics: { sent: 560, delivered: 540, opened: 480, replied: 320, converted: 290 },
    createdAt: '2026-05-10',
    createdBy: 'Rafael Lima',
  },
  {
    id: 'c8',
    name: 'Lembrete pagamento',
    channel: 'sms',
    status: 'sending',
    type: 'broadcast',
    metrics: { sent: 320, delivered: 200, opened: 180, replied: 45, converted: 30 },
    createdAt: '2026-05-27',
    createdBy: 'Julia Ferreira',
  },
]

// ── Detail Panel ─────────────────────────────────────────────────────────────

const channelLabels: Record<string, string> = {
  whatsapp: 'WhatsApp',
  email: 'Email',
  sms: 'SMS',
  instagram: 'Instagram',
  messenger: 'Messenger',
}

const statusLabels: Record<string, string> = {
  draft: 'Rascunho',
  scheduled: 'Agendada',
  sending: 'Enviando',
  completed: 'Concluida',
  paused: 'Pausada',
  cancelled: 'Cancelada',
}

function CampaignDetailPanel({ campaign, onClose }: { campaign: CampaignCardData; onClose: () => void }) {
  const { sent, delivered, opened, replied, converted } = campaign.metrics
  const openRate = delivered > 0 ? ((opened / delivered) * 100).toFixed(1) : '0'
  const responseRate = delivered > 0 ? ((replied / delivered) * 100).toFixed(1) : '0'
  const conversionRate = delivered > 0 ? ((converted / delivered) * 100).toFixed(1) : '0'

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
            <h2 className="text-lg font-semibold text-gray-900">{campaign.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-500">{channelLabels[campaign.channel] || campaign.channel}</span>
              <span className="text-gray-300">|</span>
              <span className="text-xs text-gray-500 capitalize">{campaign.type}</span>
              <span className="text-gray-300">|</span>
              <span className="text-xs text-gray-500">{statusLabels[campaign.status] || campaign.status}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Metrics grid */}
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Metricas</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                { label: 'Enviados', value: sent, icon: Send, color: 'text-gray-600' },
                { label: 'Entregues', value: delivered, icon: Eye, color: 'text-blue-500' },
                { label: 'Abertos', value: opened, icon: Eye, color: 'text-indigo-500' },
                { label: 'Respondidos', value: replied, icon: MessageCircle, color: 'text-emerald-500' },
                { label: 'Convertidos', value: converted, icon: Target, color: 'text-amber-500' },
              ].map((m) => {
                const Icon = m.icon
                return (
                  <div key={m.label} className="text-center">
                    <Icon className={cn('w-4 h-4 mx-auto mb-1', m.color)} />
                    <p className={cn('text-lg font-bold tabular-nums', m.color)}>{m.value.toLocaleString('pt-BR')}</p>
                    <p className="text-[10px] text-gray-400">{m.label}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Rates */}
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Taxas</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: 'Abertura', value: `${openRate}%`, color: 'text-indigo-500' },
                { label: 'Resposta', value: `${responseRate}%`, color: 'text-emerald-500' },
                { label: 'Conversao', value: `${conversionRate}%`, color: 'text-amber-500' },
              ].map((r) => (
                <div key={r.label} className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
                  <p className={cn('text-xl font-bold', r.color)}>{r.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{r.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Details */}
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Detalhes</p>
            <div className="space-y-2">
              {[
                { label: 'Criado por', value: campaign.createdBy },
                { label: 'Data de criacao', value: new Date(campaign.createdAt).toLocaleDateString('pt-BR') },
                { label: 'Canal', value: channelLabels[campaign.channel] || campaign.channel },
                { label: 'Tipo', value: campaign.type === 'broadcast' ? 'Disparo em massa' : campaign.type === 'sequence' ? 'Sequencia' : 'Automacao' },
                ...(campaign.scheduledFor ? [{ label: 'Agendado para', value: new Date(campaign.scheduledFor).toLocaleString('pt-BR') }] : []),
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">{item.label}</span>
                  <span className="text-xs text-gray-900 font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Fechar
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Component ────────────────────────────────────────────────────────────────

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = React.useState<CampaignCardData[]>(initialCampaigns)
  const [activeTab, setActiveTab] = React.useState('all')
  const [search, setSearch] = React.useState('')
  const [showBuilder, setShowBuilder] = React.useState(false)
  const [viewMetrics, setViewMetrics] = React.useState<string | null>(null)
  const [viewDetail, setViewDetail] = React.useState<string | null>(null)
  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid')

  const filtered = React.useMemo(() => {
    let items = campaigns

    // Tab filter
    if (activeTab === 'whatsapp') items = items.filter((c) => c.channel === 'whatsapp')
    else if (activeTab === 'email') items = items.filter((c) => c.channel === 'email')
    else if (activeTab === 'sms') items = items.filter((c) => c.channel === 'sms')
    else if (activeTab === 'sequences') items = items.filter((c) => c.type === 'sequence')
    else if (activeTab === 'automations') items = items.filter((c) => c.type === 'automation')

    // Search filter
    if (search) {
      const q = search.toLowerCase()
      items = items.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.createdBy.toLowerCase().includes(q)
      )
    }

    return items
  }, [activeTab, search, campaigns])

  // Stats
  const stats = React.useMemo(() => {
    const total = campaigns.length
    const active = campaigns.filter((c) => c.status === 'sending' || c.status === 'scheduled').length
    const draft = campaigns.filter((c) => c.status === 'draft').length
    const completed = campaigns.filter((c) => c.status === 'completed').length
    return { total, active, draft, completed }
  }, [campaigns])

  const handleCampaignSubmit = (data: Record<string, unknown>) => {
    const formData = data as {
      name: string
      channel: CampaignChannel | null
      type: 'broadcast' | 'sequence' | 'automation'
      audience: { selectedCount: number }
      content: { message: string }
      schedule: { mode: string; date?: string; time?: string }
    }
    const today = new Date().toISOString().split('T')[0]
    const newCampaign: CampaignCardData = {
      id: `c-${Date.now()}`,
      name: formData.name || 'Nova Campanha',
      channel: (formData.channel || 'whatsapp') as CampaignChannel,
      status: formData.schedule?.mode === 'later' ? 'scheduled' : formData.schedule?.mode === 'now' ? 'sending' : 'draft',
      type: formData.type || 'broadcast',
      metrics: { sent: 0, delivered: 0, opened: 0, replied: 0, converted: 0 },
      createdAt: today,
      createdBy: 'Voce',
      ...(formData.schedule?.mode === 'later' && formData.schedule.date
        ? { scheduledFor: `${formData.schedule.date}T${formData.schedule.time || '10:00'}:00` }
        : {}),
    }
    setCampaigns((prev) => [newCampaign, ...prev])
    setShowBuilder(false)
  }

  const handleDelete = (id: string) => {
    setCampaigns((prev) => prev.filter((c) => c.id !== id))
  }

  const handlePause = (id: string) => {
    setCampaigns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: 'paused' as CampaignStatus } : c))
    )
  }

  const handleResume = (id: string) => {
    setCampaigns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: 'sending' as CampaignStatus } : c))
    )
  }

  // If viewing metrics for a specific campaign
  if (viewMetrics) {
    const camp = campaigns.find((c) => c.id === viewMetrics)
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setViewMetrics(null)}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          <h2 className="text-lg font-semibold text-gray-900">{camp?.name}</h2>
        </div>
        <CampaignMetrics data={getDemoMetrics()} onExport={() => {}} />
      </div>
    )
  }

  // Detail campaign for modal view
  const detailCampaign = viewDetail ? campaigns.find((c) => c.id === viewDetail) : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campanhas</h1>
          <p className="text-sm text-gray-400 mt-1">
            Gerencie disparos em massa via WhatsApp, Email e SMS
          </p>
        </div>
        <Button onClick={() => setShowBuilder(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Nova Campanha
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<BarChart3 className="h-4 w-4" />}
          title="Total de Campanhas"
          value={stats.total}
          sparkline={[3, 5, 4, 7, 6, 8]}
        />
        <StatCard
          icon={<Send className="h-4 w-4" />}
          title="Ativas / Agendadas"
          value={stats.active}
          change={12.5}
        />
        <StatCard
          icon={<FileText className="h-4 w-4" />}
          title="Rascunhos"
          value={stats.draft}
        />
        <StatCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          title="Concluidas"
          value={stats.completed}
          change={8.3}
        />
      </div>

      {/* Search + View mode */}
      <div className="flex items-center gap-3">
        <div className="flex-1 max-w-sm">
          <SearchInput
            placeholder="Buscar campanhas..."
            onSearch={setSearch}
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-0.5">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'p-1.5 rounded-md transition-colors',
              viewMode === 'grid' ? 'bg-gray-200 text-gray-900' : 'text-gray-400 hover:text-gray-700'
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'p-1.5 rounded-md transition-colors',
              viewMode === 'list' ? 'bg-gray-200 text-gray-900' : 'text-gray-400 hover:text-gray-700'
            )}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-gray-50 border border-gray-200">
          {[
            { value: 'all', label: 'Todas', icon: BarChart3 },
            { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
            { value: 'email', label: 'Email', icon: Mail },
            { value: 'sms', label: 'SMS', icon: Smartphone },
            { value: 'sequences', label: 'Sequencias', icon: GitBranch },
            { value: 'automations', label: 'Automacoes', icon: Zap },
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <AnimatedTabTrigger
                key={tab.value}
                value={tab.value}
                isActive={activeTab === tab.value}
                layoutId="campaigns-tab"
              >
                <Icon className="h-3.5 w-3.5 mr-1.5" />
                {tab.label}
              </AnimatedTabTrigger>
            )
          })}
        </TabsList>

        {/* Content for all tabs renders the same filtered list */}
        {['all', 'whatsapp', 'email', 'sms', 'sequences', 'automations'].map((tabValue) => (
          <TabsContent key={tabValue} value={tabValue}>
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-50 border border-gray-200 text-gray-400 mb-4">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <h3 className="text-base font-semibold text-gray-800">Nenhuma campanha encontrada</h3>
                <p className="mt-1.5 max-w-sm text-sm text-gray-400">
                  {search
                    ? 'Tente buscar com outros termos'
                    : 'Crie sua primeira campanha para comecar a engajar seus leads'}
                </p>
                {!search && (
                  <Button className="mt-5" onClick={() => setShowBuilder(true)}>
                    <Plus className="h-4 w-4 mr-1.5" />
                    Criar Campanha
                  </Button>
                )}
              </div>
            ) : (
              <div
                className={cn(
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4'
                    : 'flex flex-col gap-3'
                )}
              >
                <AnimatePresence>
                  {filtered.map((campaign) => (
                    <CampaignCard
                      key={campaign.id}
                      campaign={campaign}
                      onClick={(id) => setViewDetail(id)}
                      onEdit={(id) => setViewDetail(id)}
                      onDuplicate={(id) => {
                        const original = campaigns.find((c) => c.id === id)
                        if (original) {
                          const dup: CampaignCardData = {
                            ...original,
                            id: `c-${Date.now()}`,
                            name: `${original.name} (Copia)`,
                            status: 'draft',
                            metrics: { sent: 0, delivered: 0, opened: 0, replied: 0, converted: 0 },
                            createdAt: new Date().toISOString().split('T')[0],
                            createdBy: 'Voce',
                          }
                          setCampaigns((prev) => [dup, ...prev])
                        }
                      }}
                      onPause={handlePause}
                      onResume={handleResume}
                      onDelete={handleDelete}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Campaign builder modal */}
      <AnimatePresence>
        {showBuilder && (
          <CampaignBuilder
            onClose={() => setShowBuilder(false)}
            onSubmit={(data) => handleCampaignSubmit(data as unknown as Record<string, unknown>)}
          />
        )}
      </AnimatePresence>

      {/* Campaign detail modal */}
      <AnimatePresence>
        {detailCampaign && (
          <CampaignDetailPanel
            campaign={detailCampaign}
            onClose={() => setViewDetail(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
