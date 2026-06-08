'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Bot, Send, Sparkles, TrendingUp, Users, Phone, MessageCircle,
  BarChart3, Target, Zap, Lightbulb, FileText, ArrowRight,
  Mic, Paperclip, RefreshCw, Copy, ThumbsUp, ThumbsDown,
  Brain, Flame, Clock, DollarSign, CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  actions?: { label: string; icon: React.ElementType }[]
}

const initialChat: ChatMessage[] = [
  {
    id: '1',
    role: 'assistant',
    content: 'Ola! Sou seu copiloto comercial com IA. Posso ajudar com analise de leads, sugestoes de campanhas, resumo de conversas, previsao de fechamento e muito mais. Como posso ajudar?',
    timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  },
]

const quickActions = [
  { icon: Users, label: 'Analisar leads quentes', color: 'text-rose-400 bg-rose-500/10' },
  { icon: TrendingUp, label: 'Previsao de fechamento', color: 'text-emerald-400 bg-emerald-500/10' },
  { icon: MessageCircle, label: 'Resumir conversas', color: 'text-blue-400 bg-blue-500/10' },
  { icon: Zap, label: 'Criar campanha', color: 'text-amber-400 bg-amber-500/10' },
  { icon: BarChart3, label: 'Gerar relatorio', color: 'text-purple-400 bg-purple-500/10' },
  { icon: Phone, label: 'Analisar chamadas', color: 'text-cyan-400 bg-cyan-500/10' },
  { icon: Target, label: 'Otimizar Meta Ads', color: 'text-indigo-400 bg-indigo-500/10' },
  { icon: FileText, label: 'Criar follow-up', color: 'text-pink-400 bg-pink-500/10' },
]

const insightCards = [
  {
    icon: Flame,
    title: '12 leads quentes sem contato',
    desc: 'Leads com score acima de 80 que nao receberam contato nas ultimas 24h',
    action: 'Atribuir automaticamente',
    color: 'from-rose-500/10 to-orange-500/10 border-rose-500/20',
  },
  {
    icon: TrendingUp,
    title: 'Conversao subiu 23%',
    desc: 'Taxa de conversao esta semana vs semana passada. Campanha Business English foi o principal driver.',
    action: 'Ver detalhes',
    color: 'from-emerald-500/10 to-cyan-500/10 border-emerald-500/20',
  },
  {
    icon: Clock,
    title: 'Tempo de resposta: 4.2 min',
    desc: 'Media de resposta esta 15% mais rapida. Meta: abaixo de 5 minutos.',
    action: 'Ver ranking',
    color: 'from-blue-500/10 to-indigo-500/10 border-blue-500/20',
  },
  {
    icon: DollarSign,
    title: 'Forecast: R$45.200',
    desc: 'Previsao de receita para este mes baseado no pipeline atual e historico.',
    action: 'Ver forecast',
    color: 'from-amber-500/10 to-yellow-500/10 border-amber-500/20',
  },
]

export default function AIAssistantPage() {
  const [messages, setMessages] = useState(initialChat)
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!input.trim()) return
    const userMsg: ChatMessage = {
      id: String(Date.now()),
      role: 'user',
      content: input,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    }
    const currentInput = input
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    try {
      const history = messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }))

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: currentInput, history }),
      })

      let content = ''
      if (res.ok) {
        const data = await res.json()
        content = data.response || data.error || 'Sem resposta.'
      } else if (res.status === 401) {
        content = 'Voce precisa estar logado para usar o assistente IA.'
      } else if (res.status === 429) {
        content = 'Limite de requisicoes atingido. Aguarde um momento e tente novamente.'
      } else {
        content = 'Erro ao processar sua mensagem. Tente novamente.'
      }

      const aiMsg: ChatMessage = {
        id: String(Date.now() + 1),
        role: 'assistant',
        content,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((prev) => [...prev, aiMsg])
    } catch {
      setMessages((prev) => [...prev, {
        id: String(Date.now() + 1),
        role: 'assistant',
        content: 'Erro de conexao. Verifique sua rede e tente novamente.',
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      }])
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <div className="flex h-[calc(100dvh-4rem)] -m-6">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Bot className="w-5 h-5 text-gray-900" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Assistente IA</h2>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-emerald-400">Copiloto comercial ativo</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500 hover:text-gray-900 transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
              Nova conversa
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-gray-900" />
                </div>
              )}
              <div className={cn(
                'max-w-[70%] rounded-2xl px-4 py-3',
                msg.role === 'user'
                  ? 'bg-sky-500 text-white'
                  : 'bg-gray-50 border border-gray-200'
              )}>
                <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">{msg.content}</p>

                {msg.actions && (
                  <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-200">
                    {msg.actions.map((action) => (
                      <button
                        key={action.label}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500/20 hover:bg-sky-400/30 text-sky-300 text-xs rounded-lg transition-colors"
                      >
                        <action.icon className="w-3 h-3" />
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] text-gray-400">{msg.timestamp}</span>
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-1 ml-auto">
                      <button className="p-1 rounded text-gray-400 hover:text-gray-500 transition-colors">
                        <Copy className="w-3 h-3" />
                      </button>
                      <button className="p-1 rounded text-gray-400 hover:text-emerald-400 transition-colors">
                        <ThumbsUp className="w-3 h-3" />
                      </button>
                      <button className="p-1 rounded text-gray-400 hover:text-rose-400 transition-colors">
                        <ThumbsDown className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}

          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-gray-900" />
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        <div className="px-6 py-3 border-t border-gray-200">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => setInput(action.label)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0',
                  action.color, 'hover:opacity-80'
                )}
              >
                <action.icon className="w-3 h-3" />
                {action.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-end gap-2">
            <button className="p-2.5 rounded-xl text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-colors">
              <Paperclip className="w-5 h-5" />
            </button>
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                placeholder="Pergunte qualquer coisa ao assistente IA..."
                rows={1}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500/30 focus:outline-none resize-none transition-colors"
              />
            </div>
            <button className="p-2.5 rounded-xl text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-colors">
              <Mic className="w-5 h-5" />
            </button>
            <button
              onClick={handleSend}
              className="p-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Right Panel - Insights */}
      <div className="hidden lg:block w-[340px] border-l border-gray-200 overflow-y-auto p-5 space-y-5">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-indigo-400" />
          <h3 className="text-sm font-bold text-gray-900">Insights em Tempo Real</h3>
        </div>

        {insightCards.map((card, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={cn('bg-gradient-to-br border rounded-xl p-4 space-y-2', card.color)}
          >
            <div className="flex items-center gap-2">
              <card.icon className="w-4 h-4 text-gray-900" />
              <h4 className="text-sm font-semibold text-gray-900">{card.title}</h4>
            </div>
            <p className="text-xs text-gray-700">{card.desc}</p>
            <button className="flex items-center gap-1 text-xs text-indigo-400 hover:text-sky-300 transition-colors">
              {card.action} <ArrowRight className="w-3 h-3" />
            </button>
          </motion.div>
        ))}

        {/* AI Capabilities */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Capacidades IA</h4>
          {[
            { icon: Sparkles, label: 'Sugerir respostas', active: true },
            { icon: Zap, label: 'Criar campanhas', active: true },
            { icon: FileText, label: 'Gerar follow-up', active: true },
            { icon: MessageCircle, label: 'Resumir conversas', active: true },
            { icon: Phone, label: 'Analisar chamadas', active: true },
            { icon: Users, label: 'Identificar leads quentes', active: true },
            { icon: TrendingUp, label: 'Prever fechamento', active: true },
            { icon: Lightbulb, label: 'Gerar insights', active: true },
            { icon: BarChart3, label: 'Criar relatorios', active: true },
            { icon: Target, label: 'Auxiliar vendedores', active: true },
          ].map((cap) => (
            <div key={cap.label} className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs text-gray-700">{cap.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
