'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Shield, Lock, Key, Fingerprint, Eye, EyeOff, Users, Clock,
  AlertTriangle, CheckCircle2, XCircle, Settings, FileText,
  Download, RefreshCw, Globe, Smartphone, Monitor,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type TabType = 'overview' | '2fa' | 'permissions' | 'audit' | 'lgpd'

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        'relative w-11 h-6 rounded-full transition-colors',
        checked ? 'bg-indigo-600' : 'bg-gray-200'
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

const auditLogs = [
  { id: '1', action: 'Login', user: 'Raphael Ruiz', entity: 'Session', time: '10 min atras', ip: '189.34.12.45', status: 'success' },
  { id: '2', action: 'Lead Exportado', user: 'Maria Consultora', entity: 'Lead (234)', time: '30 min atras', ip: '189.34.12.46', status: 'success' },
  { id: '3', action: 'Permissao Alterada', user: 'Raphael Ruiz', entity: 'User: Carlos', time: '1h atras', ip: '189.34.12.45', status: 'success' },
  { id: '4', action: 'Login Falhou', user: 'desconhecido@email.com', entity: 'Session', time: '2h atras', ip: '45.67.89.12', status: 'failed' },
  { id: '5', action: 'Dados Deletados', user: 'Raphael Ruiz', entity: 'Lead (567)', time: '3h atras', ip: '189.34.12.45', status: 'success' },
  { id: '6', action: 'API Key Gerada', user: 'Raphael Ruiz', entity: 'Integration', time: '1d atras', ip: '189.34.12.45', status: 'success' },
  { id: '7', action: 'Backup Automatico', user: 'Sistema', entity: 'Database', time: '1d atras', ip: '-', status: 'success' },
  { id: '8', action: 'Login', user: 'Ana Especialista', entity: 'Session', time: '1d atras', ip: '189.34.12.47', status: 'success' },
]

const permissions = [
  { role: 'Administrador', users: 1, perms: ['Acesso total', 'Gerenciar usuarios', 'Configuracoes', 'Exportar dados', 'Deletar dados', 'API & Webhooks'] },
  { role: 'Gerente', users: 2, perms: ['Ver todos leads', 'Gerenciar equipe', 'Relatorios', 'Campanhas', 'Exportar dados'] },
  { role: 'Agente', users: 4, perms: ['Ver leads atribuidos', 'Enviar mensagens', 'Criar tarefas', 'Ver dashboard basico'] },
]

export default function SecurityPage() {
  const [tab, setTab] = useState<TabType>('overview')
  const [twoFaEnabled, setTwoFaEnabled] = useState(true)
  const [sessionTimeout, setSessionTimeout] = useState(true)
  const [ipRestriction, setIpRestriction] = useState(false)
  const [autoBackup, setAutoBackup] = useState(true)
  const [dataEncryption, setDataEncryption] = useState(true)

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Seguranca</h1>
          <p className="text-gray-500 mt-1">Protecao enterprise, LGPD e controle de acesso</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span className="text-sm text-emerald-400 font-medium">Score: 92/100</span>
        </div>
      </div>

      {/* Security Score Cards */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: '2FA Ativo', value: '5/7', icon: Fingerprint, color: 'text-emerald-400', status: 'good' },
          { label: 'Sessoes Ativas', value: '3', icon: Monitor, color: 'text-blue-400', status: 'good' },
          { label: 'Tentativas Falhas', value: '1', icon: AlertTriangle, color: 'text-amber-400', status: 'warning' },
          { label: 'Ultimo Backup', value: '12h', icon: RefreshCw, color: 'text-indigo-400', status: 'good' },
          { label: 'Conformidade LGPD', value: '94%', icon: FileText, color: 'text-purple-400', status: 'good' },
        ].map((card) => (
          <div key={card.label} className="bg-white border border-gray-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <card.icon className={cn('w-4 h-4', card.color)} />
              <span className="text-xs text-gray-400">{card.label}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        {[
          { key: 'overview' as const, label: 'Visao Geral', icon: Shield },
          { key: '2fa' as const, label: 'Autenticacao', icon: Fingerprint },
          { key: 'permissions' as const, label: 'Permissoes', icon: Users },
          { key: 'audit' as const, label: 'Audit Log', icon: Clock },
          { key: 'lgpd' as const, label: 'LGPD', icon: FileText },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors',
              tab === t.key
                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            )}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
            <h3 className="text-lg font-semibold text-gray-900">Configuracoes de Seguranca</h3>
            {[
              { key: 'twoFa', label: 'Autenticacao 2FA', desc: 'Exigir autenticacao de dois fatores para todos os usuarios', checked: twoFaEnabled, onChange: setTwoFaEnabled },
              { key: 'session', label: 'Timeout de Sessao', desc: 'Encerrar sessoes inativas apos 30 minutos', checked: sessionTimeout, onChange: setSessionTimeout },
              { key: 'ip', label: 'Restricao de IP', desc: 'Limitar acesso apenas a IPs autorizados', checked: ipRestriction, onChange: setIpRestriction },
              { key: 'backup', label: 'Backup Automatico', desc: 'Backup diario automatico dos dados', checked: autoBackup, onChange: setAutoBackup },
              { key: 'encryption', label: 'Criptografia de Dados', desc: 'Criptografia AES-256 para dados sensiveis', checked: dataEncryption, onChange: setDataEncryption },
            ].map((setting) => (
              <div key={setting.key} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{setting.label}</p>
                  <p className="text-xs text-gray-400">{setting.desc}</p>
                </div>
                <Toggle checked={setting.checked} onChange={setting.onChange} />
              </div>
            ))}
          </div>

          {/* Active Sessions */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Sessoes Ativas</h3>
            {[
              { device: 'MacBook Pro - Chrome', ip: '189.34.12.45', location: 'Sao Paulo, BR', current: true, icon: Monitor },
              { device: 'iPhone 15 Pro - Safari', ip: '189.34.12.45', location: 'Sao Paulo, BR', current: false, icon: Smartphone },
              { device: 'iPad - Chrome', ip: '189.34.12.45', location: 'Sao Paulo, BR', current: false, icon: Monitor },
            ].map((session, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-gray-50">
                <session.icon className="w-5 h-5 text-gray-500" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">{session.device}</p>
                    {session.current && <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">Atual</span>}
                  </div>
                  <p className="text-xs text-gray-400">{session.ip} · {session.location}</p>
                </div>
                {!session.current && (
                  <button className="text-xs text-rose-400 hover:text-rose-300 transition-colors">Encerrar</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2FA Tab */}
      {tab === '2fa' && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Autenticacao JWT + 2FA</h3>
            <p className="text-sm text-gray-500">Proteja contas com autenticacao de dois fatores via aplicativo autenticador.</p>

            <div className="space-y-3">
              {[
                { name: 'Raphael Ruiz', email: 'raphael@aifluent.com', role: 'Admin', enabled: true },
                { name: 'Maria Consultora', email: 'maria@aifluent.com', role: 'Gerente', enabled: true },
                { name: 'Carlos Vendedor', email: 'carlos@aifluent.com', role: 'Agente', enabled: true },
                { name: 'Pedro Closer', email: 'pedro@aifluent.com', role: 'Agente', enabled: true },
                { name: 'Ana Especialista', email: 'ana@aifluent.com', role: 'Agente', enabled: true },
                { name: 'Lucas Estagiario', email: 'lucas@aifluent.com', role: 'Agente', enabled: false },
                { name: 'Julia Assistente', email: 'julia@aifluent.com', role: 'Agente', enabled: false },
              ].map((user) => (
                <div key={user.email} className="flex items-center gap-4 p-3 rounded-xl bg-gray-50">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-gray-900">{user.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-400">{user.email} · {user.role}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {user.enabled ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
                        <CheckCircle2 className="w-3 h-3" /> 2FA Ativo
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-rose-400 bg-rose-500/10 px-2 py-1 rounded">
                        <XCircle className="w-3 h-3" /> Pendente
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Permissions Tab */}
      {tab === 'permissions' && (
        <div className="space-y-4">
          {permissions.map((perm) => (
            <div key={perm.role} className="bg-white border border-gray-200 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                    <Key className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{perm.role}</h3>
                    <p className="text-xs text-gray-400">{perm.users} usuario(s)</p>
                  </div>
                </div>
                <button className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">Editar</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {perm.perms.map((p) => (
                  <span key={p} className="text-xs text-gray-700 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Audit Log Tab */}
      {tab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Logs de Auditoria</h3>
            <button className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500 hover:text-gray-900 transition-colors">
              <Download className="w-3.5 h-3.5" />
              Exportar CSV
            </button>
          </div>
          <div className="space-y-2">
            {auditLogs.map((log, i) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-4 p-3 bg-white border border-gray-200 rounded-xl"
              >
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                  log.status === 'success' ? 'bg-emerald-500/10' : 'bg-rose-500/10'
                )}>
                  {log.status === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{log.action}</p>
                  <p className="text-xs text-gray-400">{log.user} · {log.entity}</p>
                </div>
                <span className="text-xs text-gray-400 font-mono">{log.ip}</span>
                <span className="text-xs text-gray-400">{log.time}</span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* LGPD Tab */}
      {tab === 'lgpd' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-500/20 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-semibold text-gray-900">Conformidade LGPD</h3>
            </div>
            <p className="text-sm text-gray-700">
              A plataforma esta em conformidade com a Lei Geral de Protecao de Dados (LGPD - Lei 13.709/2018).
            </p>

            {[
              { label: 'Consentimento de Dados', desc: 'Coleta de consentimento antes do processamento de dados pessoais', status: true },
              { label: 'Direito ao Esquecimento', desc: 'Possibilidade de exclusao completa de dados do lead', status: true },
              { label: 'Portabilidade de Dados', desc: 'Exportacao de dados pessoais em formato legivel', status: true },
              { label: 'Registro de Atividades', desc: 'Log de todas as operacoes com dados pessoais', status: true },
              { label: 'Anonimizacao', desc: 'Anonimizacao de dados para analise e relatorios', status: true },
              { label: 'Notificacao de Incidentes', desc: 'Sistema de notificacao em caso de vazamento de dados', status: false },
              { label: 'DPO Definido', desc: 'Encarregado de protecao de dados designado', status: false },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.label}</p>
                  <p className="text-xs text-gray-400">{item.desc}</p>
                </div>
                {item.status ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                )}
              </div>
            ))}
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Acoes LGPD</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Exportar Dados do Lead', desc: 'Gera relatorio com todos os dados pessoais', icon: Download },
                { label: 'Solicitar Exclusao', desc: 'Apaga todos os dados de um lead', icon: XCircle },
                { label: 'Gerar Relatorio LGPD', desc: 'Relatorio de conformidade completo', icon: FileText },
              ].map((action) => (
                <button
                  key={action.label}
                  className="flex flex-col items-center gap-2 p-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-center"
                >
                  <action.icon className="w-6 h-6 text-indigo-400" />
                  <span className="text-xs font-medium text-gray-900">{action.label}</span>
                  <span className="text-[10px] text-gray-400">{action.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
