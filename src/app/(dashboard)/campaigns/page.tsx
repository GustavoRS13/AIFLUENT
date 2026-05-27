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
  Pause,
  Zap,
  GitBranch,
  LayoutGrid,
  List,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { SearchInput } from '@/components/ui/search-input'
import { StatCard } from '@/components/ui/stat-card'
import { Tabs, TabsList, AnimatedTabTrigger, TabsContent } from '@/components/ui/tabs'
import { CampaignCard, type CampaignCardData } from '@/components/campaigns/campaign-card'
import { CampaignBuilder } from '@/components/campaigns/campaign-builder'
import { CampaignMetrics, getMockMetrics } from '@/components/campaigns/campaign-metrics'
import type { CampaignChannel, CampaignStatus } from '@/types'

// ── Mock data ────────────────────────────────────────────────────────────────

const mockCampaigns: CampaignCardData[] = [
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

// ── Component ────────────────────────────────────────────────────────────────

export default function CampaignsPage() {
  const [activeTab, setActiveTab] = React.useState('all')
  const [search, setSearch] = React.useState('')
  const [showBuilder, setShowBuilder] = React.useState(false)
  const [viewMetrics, setViewMetrics] = React.useState<string | null>(null)
  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid')

  const filtered = React.useMemo(() => {
    let items = mockCampaigns

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
  }, [activeTab, search])

  // Stats
  const stats = React.useMemo(() => {
    const total = mockCampaigns.length
    const active = mockCampaigns.filter((c) => c.status === 'sending' || c.status === 'scheduled').length
    const draft = mockCampaigns.filter((c) => c.status === 'draft').length
    const completed = mockCampaigns.filter((c) => c.status === 'completed').length
    return { total, active, draft, completed }
  }, [])

  // If viewing metrics for a specific campaign
  if (viewMetrics) {
    const camp = mockCampaigns.find((c) => c.id === viewMetrics)
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setViewMetrics(null)}>
            Voltar
          </Button>
          <h2 className="text-lg font-semibold text-slate-100">{camp?.name}</h2>
        </div>
        <CampaignMetrics data={getMockMetrics()} onExport={() => {}} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Campanhas</h1>
          <p className="text-sm text-slate-500 mt-1">
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
        <div className="flex items-center gap-1 rounded-lg border border-slate-700/50 bg-slate-800/50 p-0.5">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'p-1.5 rounded-md transition-colors',
              viewMode === 'grid' ? 'bg-slate-700/60 text-slate-100' : 'text-slate-500 hover:text-slate-300'
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'p-1.5 rounded-md transition-colors',
              viewMode === 'list' ? 'bg-slate-700/60 text-slate-100' : 'text-slate-500 hover:text-slate-300'
            )}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-800/50 border border-slate-700/50">
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
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-800/50 border border-slate-700/50 text-slate-500 mb-4">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <h3 className="text-base font-semibold text-slate-200">Nenhuma campanha encontrada</h3>
                <p className="mt-1.5 max-w-sm text-sm text-slate-500">
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
                      onClick={(id) => setViewMetrics(id)}
                      onEdit={(id) => console.log('edit', id)}
                      onDuplicate={(id) => console.log('duplicate', id)}
                      onPause={(id) => console.log('pause', id)}
                      onResume={(id) => console.log('resume', id)}
                      onDelete={(id) => console.log('delete', id)}
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
            onSubmit={(data) => console.log('campaign submitted', data)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
