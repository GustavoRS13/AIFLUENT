'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap,
  MessageSquare,
  Camera,
  Search as SearchIcon,
  CreditCard,
  Bot,
  Phone,
  Calendar,
  Hash,
  Building2,
  Webhook,
  Key,
  Copy,
  Eye,
  EyeOff,
  Check,
  X,
  Settings,
  RefreshCw,
  Link2,
  Unlink2,
  MessagesSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ───────────────────────────────────────────────────────────────────

type IntegrationStatus = 'connected' | 'disconnected'

type Integration = {
  id: string
  name: string
  description: string
  icon: typeof Zap
  iconColor: string
  iconBg: string
  status: IntegrationStatus
  lastSync: string | null
  category: 'messaging' | 'ads' | 'payment' | 'automation' | 'ai' | 'productivity'
}

// ── Mock Data ───────────────────────────────────────────────────────────────

const mockIntegrations: Integration[] = [
  {
    id: 'whatsapp',
    name: 'WhatsApp Business API',
    description: 'Envie e receba mensagens WhatsApp em escala com automação',
    icon: MessageSquare,
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/10',
    status: 'connected',
    lastSync: '2026-05-28T10:32:00',
    category: 'messaging',
  },
  {
    id: 'meta',
    name: 'Meta (Facebook / Instagram)',
    description: 'Importe leads de Facebook Ads e Instagram automaticamente',
    icon: MessagesSquare,
    iconColor: 'text-blue-400',
    iconBg: 'bg-blue-500/10',
    status: 'connected',
    lastSync: '2026-05-28T09:45:00',
    category: 'ads',
  },
  {
    id: 'google-ads',
    name: 'Google Ads',
    description: 'Sincronize leads de campanhas Google Ads e Search',
    icon: SearchIcon,
    iconColor: 'text-yellow-400',
    iconBg: 'bg-yellow-500/10',
    status: 'disconnected',
    lastSync: null,
    category: 'ads',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Processamento de pagamentos e gestão de assinaturas',
    icon: CreditCard,
    iconColor: 'text-violet-400',
    iconBg: 'bg-violet-500/10',
    status: 'connected',
    lastSync: '2026-05-28T08:15:00',
    category: 'payment',
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Conecte com mais de 5.000 apps e automatize fluxos',
    icon: Zap,
    iconColor: 'text-orange-400',
    iconBg: 'bg-orange-500/10',
    status: 'disconnected',
    lastSync: null,
    category: 'automation',
  },
  {
    id: 'make',
    name: 'Make (Integromat)',
    description: 'Cenários avançados de automação com fluxos visuais',
    icon: RefreshCw,
    iconColor: 'text-cyan-400',
    iconBg: 'bg-cyan-500/10',
    status: 'connected',
    lastSync: '2026-05-27T22:00:00',
    category: 'automation',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'Inteligência artificial para classificação e geração de conteúdo',
    icon: Bot,
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/10',
    status: 'connected',
    lastSync: '2026-05-28T10:30:00',
    category: 'ai',
  },
  {
    id: 'claude',
    name: 'Claude AI',
    description: 'IA avançada da Anthropic para análise e assistente inteligente',
    icon: Bot,
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/10',
    status: 'connected',
    lastSync: '2026-05-28T10:28:00',
    category: 'ai',
  },
  {
    id: 'twilio',
    name: 'Twilio (Telefonia)',
    description: 'Ligações VoIP, SMS e verificação de números de telefone',
    icon: Phone,
    iconColor: 'text-rose-400',
    iconBg: 'bg-rose-500/10',
    status: 'disconnected',
    lastSync: null,
    category: 'messaging',
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    description: 'Sincronize reuniões, eventos e agendamentos automaticamente',
    icon: Calendar,
    iconColor: 'text-blue-400',
    iconBg: 'bg-blue-500/10',
    status: 'connected',
    lastSync: '2026-05-28T07:00:00',
    category: 'productivity',
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Receba notificações e alertas no canal da equipe',
    icon: Hash,
    iconColor: 'text-purple-400',
    iconBg: 'bg-purple-500/10',
    status: 'disconnected',
    lastSync: null,
    category: 'productivity',
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'Sincronize contatos e negócios com o HubSpot CRM',
    icon: Building2,
    iconColor: 'text-orange-400',
    iconBg: 'bg-orange-500/10',
    status: 'disconnected',
    lastSync: null,
    category: 'productivity',
  },
]

// ── Component ───────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  const [configModal, setConfigModal] = useState<string | null>(null)
  const [showApiKeys, setShowApiKeys] = useState(false)
  const [showWebhooks, setShowWebhooks] = useState(false)
  const [integrations, setIntegrations] = useState(mockIntegrations)

  const connected = integrations.filter((i) => i.status === 'connected').length
  const disconnected = integrations.filter((i) => i.status === 'disconnected').length

  const toggleConnection = (id: string) => {
    setIntegrations((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              status: i.status === 'connected' ? 'disconnected' : 'connected',
              lastSync: i.status === 'disconnected' ? new Date().toISOString() : null,
            }
          : i
      )
    )
  }

  const formatLastSync = (date: string | null) => {
    if (!date) return 'Nunca sincronizado'
    const d = new Date(date)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 60) return `Há ${diffMin}min`
    const diffH = Math.floor(diffMin / 60)
    if (diffH < 24) return `Há ${diffH}h`
    return d.toLocaleDateString('pt-BR')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Integrações</h1>
          <p className="text-sm text-slate-500 mt-1">
            Conecte suas ferramentas favoritas ao AIFLUENT
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowApiKeys(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 rounded-xl border border-white/5 transition-colors text-sm"
          >
            <Key className="w-4 h-4" />
            Chaves API
          </button>
          <button
            onClick={() => setShowWebhooks(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 rounded-xl border border-white/5 transition-colors text-sm"
          >
            <Webhook className="w-4 h-4" />
            Webhooks
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total de Integrações', value: integrations.length, color: 'text-indigo-400' },
          { label: 'Conectadas', value: connected, color: 'text-emerald-400' },
          { label: 'Desconectadas', value: disconnected, color: 'text-slate-400' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-slate-800/30 backdrop-blur border border-white/5 rounded-2xl p-5"
          >
            <p className={cn('text-2xl font-bold', stat.color)}>{stat.value}</p>
            <p className="text-xs text-slate-400 mt-1">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Integration grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {integrations.map((integration, i) => {
          const Icon = integration.icon
          return (
            <motion.div
              key={integration.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-slate-800/30 backdrop-blur border border-white/5 rounded-2xl p-5 hover:bg-slate-800/50 hover:border-white/10 transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center', integration.iconBg)}>
                    <Icon className={cn('w-5 h-5', integration.iconColor)} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{integration.name}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        integration.status === 'connected' ? 'bg-emerald-400' : 'bg-slate-500'
                      )} />
                      <span className={cn(
                        'text-[10px] font-medium',
                        integration.status === 'connected' ? 'text-emerald-400' : 'text-slate-500'
                      )}>
                        {integration.status === 'connected' ? 'Conectado' : 'Desconectado'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-400 mb-4 leading-relaxed">{integration.description}</p>

              {integration.lastSync && (
                <p className="text-[10px] text-slate-500 mb-4">
                  Última sincronização: {formatLastSync(integration.lastSync)}
                </p>
              )}

              {/* Sync status bar */}
              {integration.status === 'connected' && (
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex-1 h-1 rounded-full bg-slate-700/50 overflow-hidden">
                    <motion.div
                      className="h-full bg-emerald-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 1.5, ease: 'easeOut' }}
                    />
                  </div>
                  <span className="text-[10px] text-emerald-400">Sincronizado</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleConnection(integration.id)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-xl transition-colors',
                    integration.status === 'connected'
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'
                      : 'bg-indigo-600 text-white hover:bg-indigo-500'
                  )}
                >
                  {integration.status === 'connected' ? (
                    <>
                      <Unlink2 className="w-3.5 h-3.5" />
                      Desconectar
                    </>
                  ) : (
                    <>
                      <Link2 className="w-3.5 h-3.5" />
                      Conectar
                    </>
                  )}
                </button>
                {integration.status === 'connected' && (
                  <button
                    onClick={() => setConfigModal(integration.id)}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl border border-white/5 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Config Modal */}
      <AnimatePresence>
        {configModal && (
          <ConfigModal
            integration={integrations.find((i) => i.id === configModal)!}
            onClose={() => setConfigModal(null)}
          />
        )}
      </AnimatePresence>

      {/* API Keys Modal */}
      <AnimatePresence>
        {showApiKeys && <ApiKeysModal onClose={() => setShowApiKeys(false)} />}
      </AnimatePresence>

      {/* Webhooks Modal */}
      <AnimatePresence>
        {showWebhooks && <WebhooksModal onClose={() => setShowWebhooks(false)} />}
      </AnimatePresence>
    </div>
  )
}

// ── Config Modal ────────────────────────────────────────────────────────────

function ConfigModal({ integration, onClose }: { integration: Integration; onClose: () => void }) {
  const Icon = integration.icon

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl"
      >
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', integration.iconBg)}>
              <Icon className={cn('w-5 h-5', integration.iconColor)} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{integration.name}</h2>
              <p className="text-xs text-emerald-400">Conectado</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">ID da Conta</label>
            <input
              readOnly
              value={`aif_${integration.id}_acc_xxxxxxxxxxxx`}
              className="w-full px-4 py-2.5 bg-slate-800/50 border border-white/10 rounded-xl text-slate-400 font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">Ambiente</label>
            <select className="w-full px-4 py-2.5 bg-slate-800/50 border border-white/10 rounded-xl text-white focus:border-indigo-500 focus:outline-none transition-colors">
              <option>Produção</option>
              <option>Sandbox</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">Sincronização Automática</label>
            <select className="w-full px-4 py-2.5 bg-slate-800/50 border border-white/10 rounded-xl text-white focus:border-indigo-500 focus:outline-none transition-colors">
              <option>A cada 5 minutos</option>
              <option>A cada 15 minutos</option>
              <option>A cada hora</option>
              <option>Manual</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-white/5">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors"
          >
            Salvar Configuração
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── API Keys Modal ──────────────────────────────────────────────────────────

function ApiKeysModal({ onClose }: { onClose: () => void }) {
  const [showKey, setShowKey] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl shadow-2xl"
      >
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-semibold text-white">Chaves de API</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">API Key (Produção)</label>
            <div className="flex gap-2">
              <input
                readOnly
                value={showKey ? 'aif_sk_prod_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6' : 'aif_sk_prod_••••••••••••••••••••••••••••'}
                className="flex-1 px-4 py-2.5 bg-slate-800/50 border border-white/10 rounded-xl text-slate-400 font-mono text-sm"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="px-3 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button
                onClick={handleCopy}
                className="px-3 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">API Key (Sandbox)</label>
            <div className="flex gap-2">
              <input
                readOnly
                value="aif_sk_test_••••••••••••••••••••••••••••"
                className="flex-1 px-4 py-2.5 bg-slate-800/50 border border-white/10 rounded-xl text-slate-400 font-mono text-sm"
              />
              <button className="px-3 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors">
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
            <p className="text-xs text-amber-400">
              Nunca compartilhe suas chaves de API publicamente. Elas dão acesso total à sua conta.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-white/5">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Fechar
          </button>
          <button className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-sm font-medium rounded-xl transition-colors">
            Regenerar Chaves
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Webhooks Modal ──────────────────────────────────────────────────────────

function WebhooksModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl shadow-2xl"
      >
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Webhook className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-semibold text-white">Webhook URLs</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {[
            { label: 'Novo Lead', url: 'https://api.aifluent.com/webhooks/leads/new', active: true },
            { label: 'Lead Atualizado', url: 'https://api.aifluent.com/webhooks/leads/updated', active: true },
            { label: 'Negócio Fechado', url: 'https://api.aifluent.com/webhooks/deals/won', active: false },
            { label: 'Mensagem Recebida', url: 'https://api.aifluent.com/webhooks/messages/received', active: true },
          ].map((webhook) => (
            <div key={webhook.label} className="bg-slate-800/30 border border-white/5 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-white">{webhook.label}</p>
                <span className={cn(
                  'px-2 py-0.5 text-[10px] font-medium rounded-full',
                  webhook.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700/50 text-slate-500'
                )}>
                  {webhook.active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={webhook.url}
                  className="flex-1 px-3 py-1.5 bg-slate-900/50 border border-white/5 rounded-lg text-slate-400 font-mono text-xs"
                />
                <button className="px-2 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600 rounded-xl text-sm transition-colors">
            <Webhook className="w-4 h-4" />
            Adicionar Webhook
          </button>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-white/5">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Fechar
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors"
          >
            Salvar Alterações
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
