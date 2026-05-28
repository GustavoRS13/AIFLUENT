'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Settings, Building2, Users, Bell, Shield, Palette, Globe, Zap,
  Key, Database, Webhook, Save, Check, Plus, Trash2, Upload,
  Lock, Smartphone, Monitor, Sun, Moon, Type,
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

const mockTeamMembers = [
  { id: '1', name: 'Raphael Ruiz', email: 'raphael@aifluent.com', role: 'admin', status: 'active' },
  { id: '2', name: 'Maria Consultora', email: 'maria@aifluent.com', role: 'manager', status: 'active' },
  { id: '3', name: 'Carlos Vendedor', email: 'carlos@aifluent.com', role: 'member', status: 'active' },
  { id: '4', name: 'Ana Especialista', email: 'ana@aifluent.com', role: 'member', status: 'active' },
  { id: '5', name: 'Pedro Closer', email: 'pedro@aifluent.com', role: 'member', status: 'inactive' },
]

const roleConfig: Record<string, { label: string; color: string; bg: string }> = {
  admin: { label: 'Administrador', color: 'text-rose-400', bg: 'bg-rose-400/10 border-rose-400/20' },
  manager: { label: 'Gerente', color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/20' },
  member: { label: 'Membro', color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20' },
}

const accentColors = [
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Violeta', value: '#8b5cf6' },
  { name: 'Azul', value: '#3b82f6' },
  { name: 'Ciano', value: '#06b6d4' },
  { name: 'Esmeralda', value: '#10b981' },
  { name: 'Rosa', value: '#ec4899' },
  { name: 'Laranja', value: '#f97316' },
]

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('geral')
  const [saved, setSaved] = useState(false)
  const [notifications, setNotifications] = useState({ email: true, push: true, whatsapp: false, sound: true })

  // Security state
  const [twoFactor, setTwoFactor] = useState(false)
  const [sessionTimeout, setSessionTimeout] = useState('30')

  // Appearance state
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [accentColor, setAccentColor] = useState('#6366f1')
  const [fontSize, setFontSize] = useState('medium')
  const [sidebarPosition, setSidebarPosition] = useState('left')
  const [compactMode, setCompactMode] = useState(false)

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

          {activeSection === 'empresa' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="bg-slate-800/30 backdrop-blur border border-white/5 rounded-2xl p-6 space-y-6">
                <h3 className="text-lg font-semibold text-white">Dados da Empresa</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Logo da Empresa</label>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                        <span className="text-xl font-bold text-white">AI</span>
                      </div>
                      <button className="flex items-center gap-2 px-4 py-2.5 bg-slate-700/50 hover:bg-slate-700 text-slate-300 text-sm rounded-xl border border-white/5 transition-colors">
                        <Upload className="w-4 h-4" />
                        Alterar Logo
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Nome da Empresa</label>
                    <input defaultValue="AIFLUENT Educação Ltda" className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:border-indigo-500 focus:outline-none transition-colors" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">CNPJ</label>
                    <input defaultValue="12.345.678/0001-90" className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:border-indigo-500 focus:outline-none transition-colors" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Endereço</label>
                    <input defaultValue="Rua da Inovação, 1000 - São Paulo, SP" className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:border-indigo-500 focus:outline-none transition-colors" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">Telefone</label>
                      <input defaultValue="(11) 3456-7890" className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:border-indigo-500 focus:outline-none transition-colors" />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">Email</label>
                      <input defaultValue="contato@aifluent.com" className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:border-indigo-500 focus:outline-none transition-colors" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'equipe' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Membros da Equipe</h3>
                <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-xl font-medium transition-colors">
                  <Plus className="w-4 h-4" />
                  Convidar Membro
                </button>
              </div>
              <div className="space-y-3">
                {mockTeamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 bg-slate-800/30 backdrop-blur border border-white/5 rounded-2xl hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                        <span className="text-xs font-bold text-white">
                          {member.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{member.name}</p>
                        <p className="text-xs text-slate-500">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border',
                        roleConfig[member.role].bg,
                        roleConfig[member.role].color
                      )}>
                        {roleConfig[member.role].label}
                      </span>
                      <select
                        defaultValue={member.role}
                        className="px-3 py-1.5 bg-slate-900/50 border border-white/10 rounded-lg text-sm text-white focus:border-indigo-500 focus:outline-none transition-colors"
                      >
                        <option value="admin">Administrador</option>
                        <option value="manager">Gerente</option>
                        <option value="member">Membro</option>
                      </select>
                      {member.status === 'inactive' && (
                        <span className="px-2 py-0.5 bg-slate-700/50 text-slate-500 text-[10px] font-medium rounded-full">
                          Inativo
                        </span>
                      )}
                      <button className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeSection === 'seguranca' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="bg-slate-800/30 backdrop-blur border border-white/5 rounded-2xl p-6 space-y-6">
                <h3 className="text-lg font-semibold text-white">Alterar Senha</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Senha Atual</label>
                    <input type="password" placeholder="••••••••" className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none transition-colors" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Nova Senha</label>
                    <input type="password" placeholder="••••••••" className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none transition-colors" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Confirmar Nova Senha</label>
                    <input type="password" placeholder="••••••••" className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none transition-colors" />
                  </div>
                  <button className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors">
                    Atualizar Senha
                  </button>
                </div>
              </div>

              <div className="bg-slate-800/30 backdrop-blur border border-white/5 rounded-2xl p-6 space-y-6">
                <h3 className="text-lg font-semibold text-white">Autenticação de Dois Fatores</h3>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-white">Ativar 2FA</p>
                    <p className="text-xs text-slate-500">Adicione uma camada extra de segurança com autenticação por aplicativo</p>
                  </div>
                  <Toggle checked={twoFactor} onChange={setTwoFactor} />
                </div>
                {twoFactor && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                    <p className="text-xs text-emerald-400">
                      2FA ativado. Use seu aplicativo autenticador para gerar códigos de verificação.
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-slate-800/30 backdrop-blur border border-white/5 rounded-2xl p-6 space-y-6">
                <h3 className="text-lg font-semibold text-white">Sessão e Acesso</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Timeout de Sessão (minutos)</label>
                    <select
                      value={sessionTimeout}
                      onChange={(e) => setSessionTimeout(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:border-indigo-500 focus:outline-none transition-colors"
                    >
                      <option value="15">15 minutos</option>
                      <option value="30">30 minutos</option>
                      <option value="60">1 hora</option>
                      <option value="120">2 horas</option>
                      <option value="480">8 horas</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Whitelist de IP (um por linha)</label>
                    <textarea
                      rows={3}
                      defaultValue=""
                      placeholder="192.168.1.0/24&#10;10.0.0.1"
                      className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none transition-colors resize-none font-mono text-sm"
                    />
                    <p className="text-xs text-slate-500 mt-1">Deixe vazio para permitir acesso de qualquer IP</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'aparencia' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="bg-slate-800/30 backdrop-blur border border-white/5 rounded-2xl p-6 space-y-6">
                <h3 className="text-lg font-semibold text-white">Tema</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setTheme('dark')}
                    className={cn(
                      'flex flex-col items-center gap-3 p-4 rounded-xl border transition-all',
                      theme === 'dark'
                        ? 'border-indigo-500/50 bg-indigo-500/10'
                        : 'border-white/5 bg-slate-900/50 hover:border-white/10'
                    )}
                  >
                    <Moon className="w-8 h-8 text-slate-300" />
                    <span className="text-sm font-medium text-white">Escuro</span>
                  </button>
                  <button
                    onClick={() => setTheme('light')}
                    className={cn(
                      'flex flex-col items-center gap-3 p-4 rounded-xl border transition-all',
                      theme === 'light'
                        ? 'border-indigo-500/50 bg-indigo-500/10'
                        : 'border-white/5 bg-slate-900/50 hover:border-white/10'
                    )}
                  >
                    <Sun className="w-8 h-8 text-amber-400" />
                    <span className="text-sm font-medium text-white">Claro</span>
                  </button>
                </div>
              </div>

              <div className="bg-slate-800/30 backdrop-blur border border-white/5 rounded-2xl p-6 space-y-6">
                <h3 className="text-lg font-semibold text-white">Cor de Destaque</h3>
                <div className="flex flex-wrap gap-3">
                  {accentColors.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setAccentColor(color.value)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all',
                        accentColor === color.value
                          ? 'border-white/30 bg-white/5'
                          : 'border-transparent hover:border-white/10'
                      )}
                    >
                      <div
                        className="w-8 h-8 rounded-full"
                        style={{ backgroundColor: color.value }}
                      />
                      <span className="text-[10px] text-slate-400">{color.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-800/30 backdrop-blur border border-white/5 rounded-2xl p-6 space-y-6">
                <h3 className="text-lg font-semibold text-white">Layout e Tipografia</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Tamanho da Fonte</label>
                    <select
                      value={fontSize}
                      onChange={(e) => setFontSize(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:border-indigo-500 focus:outline-none transition-colors"
                    >
                      <option value="small">Pequeno</option>
                      <option value="medium">Médio</option>
                      <option value="large">Grande</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Posição da Sidebar</label>
                    <select
                      value={sidebarPosition}
                      onChange={(e) => setSidebarPosition(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white focus:border-indigo-500 focus:outline-none transition-colors"
                    >
                      <option value="left">Esquerda</option>
                      <option value="right">Direita</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-white/5">
                    <div>
                      <p className="text-sm font-medium text-white">Modo Compacto</p>
                      <p className="text-xs text-slate-500">Reduz espaçamento para mostrar mais conteúdo</p>
                    </div>
                    <Toggle checked={compactMode} onChange={setCompactMode} />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
