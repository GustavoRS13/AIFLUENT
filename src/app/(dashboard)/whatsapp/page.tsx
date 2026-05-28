'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare,
  Send,
  Paperclip,
  Smile,
  Mic,
  Phone,
  Video,
  MoreVertical,
  Search,
  Check,
  CheckCheck,
  Clock,
  Wifi,
  WifiOff,
  Users,
  ArrowUpRight,
  Zap,
  Reply,
  Image,
  FileText,
  ChevronDown,
  X,
  User,
  Mail,
  MapPin,
  Tag,
  Star,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ───────────────────────────────────────────────────────────────────

type Conversation = {
  id: string
  name: string
  phone: string
  avatar: string
  lastMessage: string
  lastMessageTime: string
  unreadCount: number
  status: 'online' | 'offline'
  tags: string[]
}

type Message = {
  id: string
  text: string
  time: string
  sender: 'me' | 'them'
  status: 'sent' | 'delivered' | 'read'
  type: 'text' | 'image' | 'document' | 'audio'
}

type QuickReply = {
  id: string
  label: string
  text: string
}

// ── Mock Data ───────────────────────────────────────────────────────────────

const mockConversations: Conversation[] = [
  { id: 'c1', name: 'Maria Silva', phone: '(11) 99876-5432', avatar: 'MS', lastMessage: 'Olá, gostaria de saber mais sobre o MBA...', lastMessageTime: '10:32', unreadCount: 3, status: 'online', tags: ['quente', 'MBA'] },
  { id: 'c2', name: 'Carlos Eduardo', phone: '(21) 98765-4321', avatar: 'CE', lastMessage: 'Vocês têm bolsa de estudo?', lastMessageTime: '09:45', unreadCount: 1, status: 'online', tags: ['bolsa'] },
  { id: 'c3', name: 'Ana Paula Ferreira', phone: '(31) 97654-3210', avatar: 'AF', lastMessage: 'Perfeito, vou pensar e te retorno!', lastMessageTime: '09:12', unreadCount: 0, status: 'offline', tags: ['pós-graduação'] },
  { id: 'c4', name: 'Roberto Lima', phone: '(41) 96543-2109', avatar: 'RL', lastMessage: 'Qual o valor da mensalidade?', lastMessageTime: 'Ontem', unreadCount: 0, status: 'offline', tags: ['graduação'] },
  { id: 'c5', name: 'Juliana Martins', phone: '(51) 95432-1098', avatar: 'JM', lastMessage: 'Obrigada pela informação!', lastMessageTime: 'Ontem', unreadCount: 0, status: 'offline', tags: ['inglês'] },
  { id: 'c6', name: 'Pedro Henrique', phone: '(61) 94321-0987', avatar: 'PH', lastMessage: 'Quando começa a próxima turma?', lastMessageTime: 'Ontem', unreadCount: 2, status: 'online', tags: ['quente', 'data science'] },
  { id: 'c7', name: 'Fernanda Costa', phone: '(71) 93210-9876', avatar: 'FC', lastMessage: 'Enviei os documentos por email', lastMessageTime: '25/05', unreadCount: 0, status: 'offline', tags: ['matrícula'] },
  { id: 'c8', name: 'Diego Santos', phone: '(81) 92109-8765', avatar: 'DS', lastMessage: 'Bom dia! Vi o anúncio no Instagram', lastMessageTime: '24/05', unreadCount: 0, status: 'offline', tags: ['instagram'] },
]

const mockMessages: Record<string, Message[]> = {
  c1: [
    { id: 'm1', text: 'Olá Maria! Bem-vinda ao AIFLUENT. Como posso te ajudar?', time: '10:00', sender: 'me', status: 'read', type: 'text' },
    { id: 'm2', text: 'Oi! Vi o anúncio de vocês no Instagram sobre o MBA em Gestão.', time: '10:15', sender: 'them', status: 'read', type: 'text' },
    { id: 'm3', text: 'Que legal! O MBA em Gestão Empresarial é um dos nossos cursos mais procurados. Ele tem duração de 18 meses, com aulas aos sábados.', time: '10:18', sender: 'me', status: 'read', type: 'text' },
    { id: 'm4', text: 'Qual o valor do investimento?', time: '10:25', sender: 'them', status: 'read', type: 'text' },
    { id: 'm5', text: 'O valor é de 24x de R$ 890,00 ou à vista com 15% de desconto. Temos também condições especiais para empresas parceiras!', time: '10:28', sender: 'me', status: 'read', type: 'text' },
    { id: 'm6', text: 'Olá, gostaria de saber mais sobre o MBA...', time: '10:32', sender: 'them', status: 'read', type: 'text' },
    { id: 'm7', text: 'Vocês têm alguma turma iniciando em julho?', time: '10:32', sender: 'them', status: 'read', type: 'text' },
    { id: 'm8', text: 'Sim, temos! A próxima turma está prevista para 15 de julho. Posso reservar sua vaga?', time: '10:33', sender: 'them', status: 'read', type: 'text' },
  ],
  c2: [
    { id: 'm1', text: 'Boa tarde, Carlos! Tudo bem?', time: '09:30', sender: 'me', status: 'read', type: 'text' },
    { id: 'm2', text: 'Tudo ótimo! Estou interessado em fazer uma pós-graduação.', time: '09:35', sender: 'them', status: 'read', type: 'text' },
    { id: 'm3', text: 'Vocês têm bolsa de estudo?', time: '09:45', sender: 'them', status: 'read', type: 'text' },
  ],
}

const quickReplies: QuickReply[] = [
  { id: 'qr1', label: 'Boas-vindas', text: 'Olá! Bem-vindo(a) ao AIFLUENT. Em que posso ajudar?' },
  { id: 'qr2', label: 'Horários', text: 'Nosso horário de atendimento é de segunda a sexta, das 8h às 18h, e sábados das 8h às 12h.' },
  { id: 'qr3', label: 'Catálogo', text: 'Vou enviar nosso catálogo de cursos atualizado. Um momento!' },
  { id: 'qr4', label: 'Follow-up', text: 'Olá! Estou entrando em contato para saber se ficou alguma dúvida sobre nossa conversa anterior.' },
  { id: 'qr5', label: 'Agendamento', text: 'Gostaria de agendar uma visita presencial ou uma chamada de vídeo para tirar suas dúvidas?' },
]

// ── Component ───────────────────────────────────────────────────────────────

export default function WhatsAppPage() {
  const [selectedConv, setSelectedConv] = useState<string>('c1')
  const [message, setMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showQuickReplies, setShowQuickReplies] = useState(false)
  const [showContactInfo, setShowContactInfo] = useState(false)
  const [showBulkSend, setShowBulkSend] = useState(false)
  const [apiStatus] = useState<'connected' | 'disconnected'>('connected')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const currentConv = mockConversations.find((c) => c.id === selectedConv)
  const messages = mockMessages[selectedConv] ?? []

  const filteredConversations = searchTerm
    ? mockConversations.filter(
        (c) =>
          c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.phone.includes(searchTerm)
      )
    : mockConversations

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (!message.trim()) return
    setMessage('')
  }

  const handleQuickReply = (text: string) => {
    setMessage(text)
    setShowQuickReplies(false)
  }

  // Stats
  const totalUnread = mockConversations.reduce((s, c) => s + c.unreadCount, 0)

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      {/* Top bar with stats */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
            <MessageSquare className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">WhatsApp</h1>
            <div className="flex items-center gap-2">
              <div className={cn(
                'flex items-center gap-1 text-xs',
                apiStatus === 'connected' ? 'text-emerald-400' : 'text-rose-400'
              )}>
                {apiStatus === 'connected' ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                {apiStatus === 'connected' ? 'API Conectada' : 'API Desconectada'}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {[
            { label: 'Mensagens hoje', value: '128' },
            { label: 'Taxa de resposta', value: '94%' },
            { label: 'Tempo médio', value: '3min' },
            { label: 'Não lidas', value: String(totalUnread) },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-lg font-bold text-gray-900">{stat.value}</p>
              <p className="text-[10px] text-gray-400">{stat.label}</p>
            </div>
          ))}

          <button
            onClick={() => setShowBulkSend(true)}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg transition-colors"
          >
            <Users className="w-4 h-4" />
            Envio em Massa
          </button>
        </div>
      </div>

      {/* Main content: 3-column layout */}
      <div className="flex-1 flex rounded-2xl overflow-hidden border border-gray-200 bg-gray-50 min-h-0">
        {/* Left: Conversation list */}
        <div className="w-80 border-r border-gray-200 flex flex-col shrink-0">
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar conversas..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedConv(conv.id)}
                className={cn(
                  'w-full flex items-start gap-3 p-3 text-left transition-colors hover:bg-gray-50',
                  selectedConv === conv.id && 'bg-gray-100'
                )}
              >
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                    <span className="text-xs font-bold text-gray-900">{conv.avatar}</span>
                  </div>
                  {conv.status === 'online' && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 truncate">{conv.name}</p>
                    <span className="text-[10px] text-gray-400 shrink-0">{conv.lastMessageTime}</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{conv.lastMessage}</p>
                </div>

                {conv.unreadCount > 0 && (
                  <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
                    {conv.unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Center: Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat header */}
          {currentConv && (
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                    <span className="text-xs font-bold text-gray-900">{currentConv.avatar}</span>
                  </div>
                  {currentConv.status === 'online' && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{currentConv.name}</p>
                  <p className="text-xs text-gray-400">
                    {currentConv.status === 'online' ? 'Online' : 'Visto por último recentemente'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
                  <Phone className="w-4 h-4" />
                </button>
                <button className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
                  <Video className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowContactInfo(!showContactInfo)}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    showContactInfo ? 'text-indigo-400 bg-indigo-500/10' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  )}
                >
                  <User className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'flex',
                  msg.sender === 'me' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-[70%] rounded-2xl px-4 py-2.5 text-sm',
                    msg.sender === 'me'
                      ? 'bg-emerald-600/80 text-white rounded-br-sm'
                      : 'bg-gray-50 text-gray-800 rounded-bl-sm'
                  )}
                >
                  <p className="leading-relaxed">{msg.text}</p>
                  <div className={cn(
                    'flex items-center gap-1 mt-1',
                    msg.sender === 'me' ? 'justify-end' : 'justify-start'
                  )}>
                    <span className="text-[10px] opacity-60">{msg.time}</span>
                    {msg.sender === 'me' && (
                      msg.status === 'read' ? <CheckCheck className="w-3 h-3 text-blue-300" /> :
                      msg.status === 'delivered' ? <CheckCheck className="w-3 h-3 opacity-60" /> :
                      <Check className="w-3 h-3 opacity-60" />
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Replies */}
          <AnimatePresence>
            {showQuickReplies && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="px-4 pb-2"
              >
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-gray-500">Respostas Rápidas</p>
                    <button onClick={() => setShowQuickReplies(false)} className="text-gray-400 hover:text-gray-900 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {quickReplies.map((qr) => (
                      <button
                        key={qr.id}
                        onClick={() => handleQuickReply(qr.text)}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-xs text-gray-700 rounded-lg border border-gray-200 transition-colors"
                      >
                        {qr.label}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Message input */}
          <div className="p-3 border-t border-gray-200">
            <div className="flex items-end gap-2">
              <div className="flex items-center gap-1">
                <button className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
                  <Paperclip className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowQuickReplies(!showQuickReplies)}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    showQuickReplies ? 'text-emerald-400 bg-emerald-500/10' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  )}
                >
                  <Zap className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 relative">
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder="Digite uma mensagem..."
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none transition-colors"
                />
              </div>

              <div className="flex items-center gap-1">
                <button className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors">
                  <Smile className="w-4 h-4" />
                </button>
                {message.trim() ? (
                  <button
                    onClick={handleSend}
                    className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                ) : (
                  <button className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors">
                    <Mic className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Contact info panel */}
        <AnimatePresence>
          {showContactInfo && currentConv && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-l border-gray-200 overflow-hidden shrink-0"
            >
              <div className="w-[300px] p-4 space-y-4">
                <div className="text-center pt-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mx-auto mb-3">
                    <span className="text-lg font-bold text-gray-900">{currentConv.avatar}</span>
                  </div>
                  <h3 className="text-base font-semibold text-gray-900">{currentConv.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{currentConv.phone}</p>
                  <div className={cn(
                    'inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium',
                    currentConv.status === 'online' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-100 text-gray-400'
                  )}>
                    <div className={cn('w-1.5 h-1.5 rounded-full', currentConv.status === 'online' ? 'bg-emerald-400' : 'bg-gray-400')} />
                    {currentConv.status === 'online' ? 'Online' : 'Offline'}
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-3">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Informações</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-gray-700">{currentConv.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-gray-700">{currentConv.name.toLowerCase().replace(' ', '.')}@email.com</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-gray-700">São Paulo, SP</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-3">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tags</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {currentConv.tags.map((tag) => (
                      <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full text-xs">
                        <Tag className="w-2.5 h-2.5" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-3">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Ações Rápidas</h4>
                  <div className="space-y-2">
                    <button className="w-full flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-100 text-sm text-gray-700 rounded-lg transition-colors">
                      <Star className="w-3.5 h-3.5 text-amber-400" />
                      Marcar como prioritário
                    </button>
                    <button className="w-full flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-100 text-sm text-gray-700 rounded-lg transition-colors">
                      <User className="w-3.5 h-3.5 text-indigo-400" />
                      Ver perfil do lead
                    </button>
                    <button className="w-full flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-100 text-sm text-gray-700 rounded-lg transition-colors">
                      <FileText className="w-3.5 h-3.5 text-violet-400" />
                      Criar negócio
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bulk send modal */}
      <AnimatePresence>
        {showBulkSend && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
            onClick={(e) => e.target === e.currentTarget && setShowBulkSend(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-2xl"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Envio em Massa</h2>
                <button onClick={() => setShowBulkSend(false)} className="text-gray-500 hover:text-gray-900 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-2">Selecionar Template</label>
                  <select className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:border-emerald-500 focus:outline-none transition-colors">
                    <option>Boas-vindas</option>
                    <option>Follow-up</option>
                    <option>Promoção</option>
                    <option>Reativação</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-2">Segmento de Leads</label>
                  <select className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:border-emerald-500 focus:outline-none transition-colors">
                    <option>Todos os leads</option>
                    <option>Leads quentes</option>
                    <option>Leads frios</option>
                    <option>Sem interação 7+ dias</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-2">Prévia da Mensagem</label>
                  <textarea
                    rows={3}
                    defaultValue="Olá {{nome}}! Temos uma novidade especial para você..."
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:outline-none transition-colors resize-none"
                  />
                </div>
                <p className="text-xs text-gray-400">Estimativa: 234 destinatários</p>
              </div>
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                <button
                  onClick={() => setShowBulkSend(false)}
                  className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => setShowBulkSend(false)}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-xl transition-colors"
                >
                  Enviar para 234 leads
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
