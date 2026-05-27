'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Settings, Building2, Users, Bell, Shield, Palette, Globe, Zap,
  Key, Database, Webhook, Save, Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const sections = [
  { id: 'geral', label: 'Geral', icon: Settings },
  { id: 'empresa', label: 'Empresa', icon: Building2 },
  { id: 'equipe', label: 'Equipe & Permissões', icon: Users },
  { id: 'notificacoes', label: 'Notificações', icon: Bell },
  { id: 'seguranca', label: 'Segurança', icon: Shield },
  { id: 'aparencia', label: 'Aparência', icon: Palette },
  { id: 'integracoes', label: 'Integrações', icon: Zap },
  { id: 'api', label: 'API & Webhooks', icon: Webhook },
]

const integrations = [
  { id: 'whatsapp', name: 'WhatsApp Business', desc: 'Conecte sua conta WhatsApp Business API', connected: true, icon: '💬' },
  { id: 'meta', name: 'Meta (Facebook/Instagram)', desc: 'Integre leads do Facebook e Instagram Ads', connected: false, icon: '📘' },
  { id: 'google', name: 'Google Ads', desc: 'Importe leads de campanhas Google', connected: false, icon: '🔍' },
  { id: 'stripe', name: 'Stripe', desc: 'Processamento de pagamentos', connected: true, icon: '💳' },
  { id: 'zapier', name: 'Zapier', desc: 'Automações com mais de 5000 apps', connected: false, icon: '⚡' },
  { id: 'make', name: 'Make (Integromat)', desc: 'Cenários avançados de automação', connected: false, icon: '🔄' },
]

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        'relative w-11 h-6 rounded-full transition-colors',
        checked ? 'bg-indigo-600' : 'bg-slate-700'
      )}
    >
      <motion.div
        animate={{ x: checked ? 22 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="absolute top-1 w-4 h-4 bg-white rounded-full"
      />
    </button>
  )
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('geral')
  const [saved, setSaved] = useState(false)
  const [notifications, setNotifications] = useState({ email: true, push: true, whatsapp: false, sound: true })

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Configurações</h1>
          <p className="text-slate-400 mt-1">Gerencie sua conta e preferências</p>
        </div>
        <button
          onClick={handleSave}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all',
            saved
              ? 'bg-emerald-600 text-white'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white'
          )}
        >
          {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Salvo!' : 'Salvar'}
        </button>
      </div>

      <div className="flex gap-8">
        <nav className="w-56 shrink-0 space-y-1">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-colors text-left',
                activeSection === section.id
                  ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              )}
            >
              <section.icon className="w-4 h-4" />
              {section.label}
            </button>
          ))}
        </nav>

        <div className="flex-1 max-w-2xl">
          {activeSection === 'geral' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="bg-slate-800/30 backdrop-blur border border-white/5 rounded-2xl p-6 space-y-6">
                <h3 className="text-lg font-semibold text-white">Informações da Plataforma</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Nome da Plataforma</label>
                    <input defaultValue="AIFLUENT" className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:border-indigo-500 focus:outline-none transition-colors" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Idioma</label>
                    <select defaultValue="pt-BR" className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:border-indigo-500 focus:outline-none transition-colors">
                      <option value="pt-BR">Português (Brasil)</option>
                      <option value="en">English</option>
                      <option value="es">Español</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Fuso Horário</label>
                    <select defaultValue="America/Sao_Paulo" className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:border-indigo-500 focus:outline-none transition-colors">
                      <option value="America/Sao_Paulo">São Paulo (GMT-3)</option>
                      <option value="America/New_York">New York (GMT-5)</option>
                    </select>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'notificacoes' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="bg-slate-800/30 backdrop-blur border border-white/5 rounded-2xl p-6 space-y-6">
                <h3 className="text-lg font-semibold text-white">Preferências de Notificação</h3>
                {[
                  { key: 'email' as const, label: 'Notificações por Email', desc: 'Receba atualizações importantes por email' },
                  { key: 'push' as const, label: 'Notificações Push', desc: 'Alertas em tempo real no navegador' },
                  { key: 'whatsapp' as const, label: 'Notificações WhatsApp', desc: 'Receba alertas via WhatsApp' },
                  { key: 'sound' as const, label: 'Som de Notificação', desc: 'Reproduzir som ao receber notificações' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-white">{item.label}</p>
                      <p className="text-xs text-slate-500">{item.desc}</p>
                    </div>
                    <Toggle
                      checked={notifications[item.key]}
                      onChange={(v) => setNotifications((prev) => ({ ...prev, [item.key]: v }))}
                    />
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeSection === 'integracoes' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Integrações Disponíveis</h3>
              {integrations.map((integration) => (
                <div
                  key={integration.id}
                  className="flex items-center justify-between p-5 bg-slate-800/30 backdrop-blur border border-white/5 rounded-2xl hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-700/50 flex items-center justify-center text-2xl">
                      {integration.icon}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{integration.name}</p>
                      <p className="text-xs text-slate-500">{integration.desc}</p>
                    </div>
                  </div>
                  <button
                    className={cn(
                      'px-4 py-2 text-sm rounded-xl font-medium transition-colors',
                      integration.connected
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    )}
                  >
                    {integration.connected ? 'Conectado' : 'Conectar'}
                  </button>
                </div>
              ))}
            </motion.div>
          )}

          {activeSection === 'api' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="bg-slate-800/30 backdrop-blur border border-white/5 rounded-2xl p-6 space-y-4">
                <h3 className="text-lg font-semibold text-white">Chaves de API</h3>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">API Key</label>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value="aif_sk_••••••••••••••••••••••••"
                      className="flex-1 px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-slate-500 font-mono text-sm"
                    />
                    <button className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-xl transition-colors">
                      Copiar
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Webhook URL</label>
                  <input
                    placeholder="https://seu-servidor.com/webhook"
                    className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {!['geral', 'notificacoes', 'integracoes', 'api'].includes(activeSection) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mb-4">
                <Settings className="w-8 h-8 text-slate-600" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Em Desenvolvimento</h3>
              <p className="text-sm text-slate-500 max-w-sm">
                Esta seção está sendo construída. Em breve estará disponível com todas as configurações.
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
