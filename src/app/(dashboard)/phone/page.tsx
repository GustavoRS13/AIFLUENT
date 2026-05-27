'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Phone, PhoneCall, PhoneOff, PhoneMissed, PhoneOutgoing, PhoneIncoming,
  Mic, MicOff, Volume2, VolumeX, Pause, Play, Users, Clock, Search,
  MoreHorizontal, Download, FileText, Bot, Sparkles, BarChart3,
  ArrowUpRight, ArrowDownLeft, Hash, Star,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type TabType = 'dialer' | 'history' | 'analytics'

interface CallRecord {
  id: string
  direction: 'inbound' | 'outbound'
  status: 'completed' | 'missed' | 'failed'
  leadName: string
  phone: string
  duration: number
  recordingUrl?: string
  transcription?: string
  aiSummary?: string
  aiSentiment: 'positive' | 'neutral' | 'negative'
  startedAt: string
  agent: string
}

const mockCalls: CallRecord[] = [
  { id: '1', direction: 'outbound', status: 'completed', leadName: 'Ana Silva', phone: '+55 11 99999-1234', duration: 342, recordingUrl: '#', transcription: 'Conversa sobre curso Business English...', aiSummary: 'Lead demonstrou interesse no curso noturno. Pediu para enviar proposta por email. Agendou retorno para quinta-feira.', aiSentiment: 'positive', startedAt: '11:30', agent: 'Maria Consultora' },
  { id: '2', direction: 'inbound', status: 'completed', leadName: 'Carlos Mendes', phone: '+55 21 98888-5678', duration: 186, recordingUrl: '#', aiSummary: 'Duvidas sobre formas de pagamento. Interessado no plano anual com desconto.', aiSentiment: 'positive', startedAt: '10:45', agent: 'Carlos Vendedor' },
  { id: '3', direction: 'outbound', status: 'missed', leadName: 'Fernanda Costa', phone: '+55 31 97777-9012', duration: 0, aiSentiment: 'neutral', startedAt: '10:15', agent: 'Ana Especialista' },
  { id: '4', direction: 'inbound', status: 'completed', leadName: 'Pedro Santos', phone: '+55 41 96666-3456', duration: 485, recordingUrl: '#', aiSummary: 'Reclamacao sobre demora no atendimento. Oferecemos desconto de 10% como compensacao. Cliente satisfeito ao final.', aiSentiment: 'neutral', startedAt: '09:30', agent: 'Maria Consultora' },
  { id: '5', direction: 'outbound', status: 'completed', leadName: 'Juliana Oliveira', phone: '+55 51 95555-7890', duration: 267, recordingUrl: '#', aiSummary: 'Follow-up da proposta enviada. Lead confirmou interesse e pediu contrato.', aiSentiment: 'positive', startedAt: '09:00', agent: 'Pedro Closer' },
  { id: '6', direction: 'outbound', status: 'failed', leadName: 'Ricardo Lima', phone: '+55 11 94444-1234', duration: 0, aiSentiment: 'neutral', startedAt: 'Ontem 17:30', agent: 'Carlos Vendedor' },
  { id: '7', direction: 'inbound', status: 'missed', leadName: 'Desconhecido', phone: '+55 21 93333-5678', duration: 0, aiSentiment: 'neutral', startedAt: 'Ontem 16:00', agent: '-' },
]

function formatDuration(seconds: number): string {
  if (seconds === 0) return '-'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

const sentimentColors = {
  positive: 'text-emerald-400 bg-emerald-500/10',
  neutral: 'text-slate-400 bg-slate-500/10',
  negative: 'text-rose-400 bg-rose-500/10',
}

const sentimentLabels = {
  positive: 'Positivo',
  neutral: 'Neutro',
  negative: 'Negativo',
}

export default function PhonePage() {
  const [tab, setTab] = useState<TabType>('dialer')
  const [dialNumber, setDialNumber] = useState('')
  const [calling, setCalling] = useState(false)
  const [muted, setMuted] = useState(false)
  const [selectedCall, setSelectedCall] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const filteredCalls = mockCalls.filter((c) =>
    c.leadName.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  )

  const stats = {
    total: mockCalls.length,
    completed: mockCalls.filter((c) => c.status === 'completed').length,
    missed: mockCalls.filter((c) => c.status === 'missed').length,
    avgDuration: Math.round(
      mockCalls.filter((c) => c.duration > 0).reduce((sum, c) => sum + c.duration, 0) /
      mockCalls.filter((c) => c.duration > 0).length
    ),
    positive: mockCalls.filter((c) => c.aiSentiment === 'positive').length,
  }

  function handleDial(digit: string) {
    setDialNumber((prev) => prev + digit)
  }

  const selectedCallData = mockCalls.find((c) => c.id === selectedCall)

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Telefonia</h1>
          <p className="text-slate-400 mt-1">Central de chamadas com IA integrada</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm text-emerald-400 font-medium">Linha Ativa</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'Total Chamadas', value: stats.total, icon: Phone, color: 'text-indigo-400' },
          { label: 'Atendidas', value: stats.completed, icon: PhoneCall, color: 'text-emerald-400' },
          { label: 'Perdidas', value: stats.missed, icon: PhoneMissed, color: 'text-rose-400' },
          { label: 'Duracao Media', value: formatDuration(stats.avgDuration), icon: Clock, color: 'text-amber-400' },
          { label: 'Sentimento Positivo', value: `${stats.positive}/${stats.total}`, icon: Sparkles, color: 'text-purple-400' },
        ].map((stat) => (
          <div key={stat.label} className="bg-slate-800/30 backdrop-blur border border-white/5 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={cn('w-4 h-4', stat.color)} />
              <span className="text-xs text-slate-500">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        {[
          { key: 'dialer' as const, label: 'Discador', icon: Phone },
          { key: 'history' as const, label: 'Historico', icon: Clock },
          { key: 'analytics' as const, label: 'Analytics', icon: BarChart3 },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors',
              tab === t.key
                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
            )}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Dialer Tab */}
      {tab === 'dialer' && (
        <div className="grid grid-cols-3 gap-6">
          {/* Dialer Pad */}
          <div className="bg-slate-800/30 backdrop-blur border border-white/5 rounded-2xl p-6">
            <div className="text-center mb-6">
              <input
                type="text"
                value={dialNumber}
                onChange={(e) => setDialNumber(e.target.value)}
                placeholder="+55 ..."
                className="text-center text-2xl font-semibold text-white bg-transparent border-none outline-none w-full tracking-wider placeholder-slate-600"
              />
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((digit) => (
                <button
                  key={digit}
                  onClick={() => handleDial(digit)}
                  className="flex items-center justify-center h-14 rounded-xl bg-slate-700/50 hover:bg-slate-700 text-white text-lg font-medium transition-colors"
                >
                  {digit}
                </button>
              ))}
            </div>

            <div className="flex justify-center gap-4">
              {!calling ? (
                <button
                  onClick={() => setCalling(true)}
                  className="flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-medium transition-colors shadow-lg shadow-emerald-500/20"
                >
                  <Phone className="w-5 h-5" />
                  Ligar
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setMuted(!muted)}
                    className={cn('p-3 rounded-xl transition-colors', muted ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-700/50 text-white hover:bg-slate-700')}
                  >
                    {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>
                  <button className="p-3 rounded-xl bg-slate-700/50 text-white hover:bg-slate-700 transition-colors">
                    <Pause className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setCalling(false)}
                    className="flex items-center gap-2 px-8 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-medium transition-colors shadow-lg shadow-rose-500/20"
                  >
                    <PhoneOff className="w-5 h-5" />
                    Encerrar
                  </button>
                </div>
              )}
            </div>

            {calling && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 text-center"
              >
                <div className="flex items-center justify-center gap-2 text-emerald-400 mb-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-sm font-medium">Em chamada</span>
                </div>
                <p className="text-2xl font-mono text-white">03:42</p>
                <div className="mt-3 flex items-center justify-center gap-2">
                  <Bot className="w-4 h-4 text-amber-400" />
                  <span className="text-xs text-amber-400">IA transcrevendo em tempo real...</span>
                </div>
              </motion.div>
            )}
          </div>

          {/* Quick Dial / Recent */}
          <div className="col-span-2 space-y-4">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Discagem Rapida</h3>
            <div className="grid grid-cols-2 gap-3">
              {mockCalls.filter((c) => c.status === 'completed').slice(0, 6).map((call) => (
                <button
                  key={call.id}
                  onClick={() => setDialNumber(call.phone)}
                  className="flex items-center gap-3 p-3 bg-slate-800/30 border border-white/5 rounded-xl hover:bg-slate-800/50 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-white">
                      {call.leadName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{call.leadName}</p>
                    <p className="text-xs text-slate-500">{call.phone}</p>
                  </div>
                  <Phone className="w-4 h-4 text-emerald-400 shrink-0 ml-auto" />
                </button>
              ))}
            </div>

            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mt-6">Ultima Chamada - Resumo IA</h3>
            <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-amber-400" />
                <span className="text-sm font-semibold text-white">Ana Silva - 11:30</span>
                <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">Positivo</span>
              </div>
              <p className="text-sm text-slate-300">
                Lead demonstrou interesse no curso noturno de Business English. Pediu para enviar proposta por email.
                Agendou retorno para quinta-feira. Alta probabilidade de conversao.
              </p>
              <div className="flex gap-2">
                <button className="flex items-center gap-1 px-3 py-1.5 bg-slate-800/50 rounded-lg text-xs text-slate-300 hover:text-white transition-colors">
                  <Play className="w-3 h-3" /> Ouvir Gravacao
                </button>
                <button className="flex items-center gap-1 px-3 py-1.5 bg-slate-800/50 rounded-lg text-xs text-slate-300 hover:text-white transition-colors">
                  <FileText className="w-3 h-3" /> Ver Transcricao
                </button>
                <button className="flex items-center gap-1 px-3 py-1.5 bg-slate-800/50 rounded-lg text-xs text-slate-300 hover:text-white transition-colors">
                  <Download className="w-3 h-3" /> Download
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Tab */}
      {tab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar chamadas..."
                className="w-full pl-9 pr-4 py-2.5 bg-slate-800/50 border border-white/5 rounded-xl text-sm text-white placeholder-slate-500 focus:border-indigo-500/30 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="space-y-2">
            {filteredCalls.map((call, i) => (
              <motion.div
                key={call.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-4 p-4 bg-slate-800/30 backdrop-blur border border-white/5 rounded-xl hover:bg-slate-800/50 transition-colors cursor-pointer"
                onClick={() => setSelectedCall(selectedCall === call.id ? null : call.id)}
              >
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                  call.status === 'completed' ? 'bg-emerald-500/10' : call.status === 'missed' ? 'bg-rose-500/10' : 'bg-slate-500/10'
                )}>
                  {call.direction === 'outbound'
                    ? <PhoneOutgoing className={cn('w-5 h-5', call.status === 'completed' ? 'text-emerald-400' : 'text-rose-400')} />
                    : call.status === 'missed'
                      ? <PhoneMissed className="w-5 h-5 text-rose-400" />
                      : <PhoneIncoming className="w-5 h-5 text-emerald-400" />
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{call.leadName}</p>
                  <p className="text-xs text-slate-500">{call.phone}</p>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-xs text-slate-400">{call.startedAt}</p>
                  <p className="text-xs text-slate-500">{formatDuration(call.duration)}</p>
                </div>

                <span className={cn('text-[10px] px-2 py-0.5 rounded font-medium', sentimentColors[call.aiSentiment])}>
                  {sentimentLabels[call.aiSentiment]}
                </span>

                <span className="text-xs text-slate-500">{call.agent}</span>

                <MoreHorizontal className="w-4 h-4 text-slate-600" />
              </motion.div>
            ))}
          </div>

          {/* Expanded Call Detail */}
          <AnimatePresence>
            {selectedCallData?.aiSummary && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border border-indigo-500/10 rounded-2xl p-5 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-amber-400" />
                  <h4 className="text-sm font-semibold text-white">Resumo IA - {selectedCallData.leadName}</h4>
                </div>
                <p className="text-sm text-slate-300">{selectedCallData.aiSummary}</p>
                <div className="flex gap-2">
                  {selectedCallData.recordingUrl && (
                    <button className="flex items-center gap-1 px-3 py-1.5 bg-slate-800/50 rounded-lg text-xs text-slate-300 hover:text-white transition-colors">
                      <Play className="w-3 h-3" /> Gravacao
                    </button>
                  )}
                  <button className="flex items-center gap-1 px-3 py-1.5 bg-slate-800/50 rounded-lg text-xs text-slate-300 hover:text-white transition-colors">
                    <FileText className="w-3 h-3" /> Transcricao
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Analytics Tab */}
      {tab === 'analytics' && (
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-slate-800/30 backdrop-blur border border-white/5 rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white">Performance por Agente</h3>
            {[
              { name: 'Maria Consultora', calls: 45, avgDuration: '4:32', conversion: 34 },
              { name: 'Carlos Vendedor', calls: 38, avgDuration: '3:15', conversion: 28 },
              { name: 'Pedro Closer', calls: 32, avgDuration: '6:12', conversion: 42 },
              { name: 'Ana Especialista', calls: 29, avgDuration: '5:01', conversion: 31 },
            ].map((agent, i) => (
              <div key={agent.name} className="flex items-center gap-4 p-3 rounded-xl bg-slate-800/30">
                <span className="text-xs text-slate-500 w-4">{i + 1}</span>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-white">{agent.name.split(' ').map((n) => n[0]).join('')}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{agent.name}</p>
                  <p className="text-xs text-slate-500">{agent.calls} chamadas · Media {agent.avgDuration}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-400">{agent.conversion}%</p>
                  <p className="text-[10px] text-slate-500">Conversao</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-slate-800/30 backdrop-blur border border-white/5 rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white">Analise de Sentimento IA</h3>
            <div className="space-y-4">
              {[
                { label: 'Positivo', pct: 65, color: 'bg-emerald-500' },
                { label: 'Neutro', pct: 25, color: 'bg-slate-500' },
                { label: 'Negativo', pct: 10, color: 'bg-rose-500' },
              ].map((item) => (
                <div key={item.label} className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-300">{item.label}</span>
                    <span className="text-sm font-bold text-white">{item.pct}%</span>
                  </div>
                  <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.pct}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className={cn('h-full rounded-full', item.color)}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-semibold text-white">Insight IA</h4>
              </div>
              <p className="text-xs text-slate-300">
                Chamadas realizadas entre 9h-11h tem 23% mais conversao. Sugestao: priorizar ligacoes para leads quentes nesse horario.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
