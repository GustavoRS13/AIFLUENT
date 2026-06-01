'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare,
  Phone,
  Video,
  Search,
  Wifi,
  WifiOff,
  Users,
  FileText,
  X,
  User,
  Mail,
  MapPin,
  Tag,
  Star,
  ArrowLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ChatMessageBubble } from '@/components/chat/chat-message-bubble'
import { ChatInput } from '@/components/chat/chat-input'
import { useChat, type ChatMessage } from '@/hooks/use-chat'

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

type QuickReply = {
  id: string
  label: string
  text: string
}

// Initial demo data — replace with API when backend ready

const initialConversations: Conversation[] = [
  { id: 'c1', name: 'Maria Silva', phone: '(11) 99876-5432', avatar: 'MS', lastMessage: 'Ola, gostaria de saber mais sobre o MBA...', lastMessageTime: '10:32', unreadCount: 3, status: 'online', tags: ['quente', 'MBA'] },
  { id: 'c2', name: 'Carlos Eduardo', phone: '(21) 98765-4321', avatar: 'CE', lastMessage: 'Voces tem bolsa de estudo?', lastMessageTime: '09:45', unreadCount: 1, status: 'online', tags: ['bolsa'] },
  { id: 'c3', name: 'Ana Paula Ferreira', phone: '(31) 97654-3210', avatar: 'AF', lastMessage: 'Perfeito, vou pensar e te retorno!', lastMessageTime: '09:12', unreadCount: 0, status: 'offline', tags: ['pos-graduacao'] },
  { id: 'c4', name: 'Roberto Lima', phone: '(41) 96543-2109', avatar: 'RL', lastMessage: 'Qual o valor da mensalidade?', lastMessageTime: 'Ontem', unreadCount: 0, status: 'offline', tags: ['graduacao'] },
  { id: 'c5', name: 'Juliana Martins', phone: '(51) 95432-1098', avatar: 'JM', lastMessage: 'Obrigada pela informacao!', lastMessageTime: 'Ontem', unreadCount: 0, status: 'offline', tags: ['ingles'] },
  { id: 'c6', name: 'Pedro Henrique', phone: '(61) 94321-0987', avatar: 'PH', lastMessage: 'Quando comeca a proxima turma?', lastMessageTime: 'Ontem', unreadCount: 2, status: 'online', tags: ['quente', 'data science'] },
  { id: 'c7', name: 'Fernanda Costa', phone: '(71) 93210-9876', avatar: 'FC', lastMessage: 'Enviei os documentos por email', lastMessageTime: '25/05', unreadCount: 0, status: 'offline', tags: ['matricula'] },
  { id: 'c8', name: 'Diego Santos', phone: '(81) 92109-8765', avatar: 'DS', lastMessage: 'Bom dia! Vi o anuncio no Instagram', lastMessageTime: '24/05', unreadCount: 0, status: 'offline', tags: ['instagram'] },
]

// Initial demo data — replace with API when backend ready
const initialMessages: Record<string, ChatMessage[]> = {
  c1: [
    { id: 'm1', direction: 'outbound', content: 'Ola Maria! Bem-vinda ao AIFLUENT. Como posso te ajudar?', type: 'text', status: 'read', aiGenerated: false, createdAt: '10:00' },
    { id: 'm2', direction: 'inbound', content: 'Oi! Vi o anuncio de voces no Instagram sobre o MBA em Gestao.', type: 'text', status: 'read', aiGenerated: false, createdAt: '10:15' },
    { id: 'm3', direction: 'outbound', content: 'Que legal! O MBA em Gestao Empresarial e um dos nossos cursos mais procurados. Ele tem duracao de 18 meses, com aulas aos sabados.', type: 'text', status: 'read', aiGenerated: false, createdAt: '10:18' },
    { id: 'm4', direction: 'inbound', content: 'Qual o valor do investimento?', type: 'text', status: 'read', aiGenerated: false, createdAt: '10:25' },
    { id: 'm5', direction: 'outbound', content: 'O valor e de 24x de R$ 890,00 ou a vista com 15% de desconto. Temos tambem condicoes especiais para empresas parceiras!', type: 'text', status: 'read', aiGenerated: false, createdAt: '10:28' },
    { id: 'm6', direction: 'inbound', content: 'Ola, gostaria de saber mais sobre o MBA...', type: 'text', status: 'read', aiGenerated: false, createdAt: '10:32' },
    { id: 'm7', direction: 'inbound', content: 'Voces tem alguma turma iniciando em julho?', type: 'text', status: 'read', aiGenerated: false, createdAt: '10:32' },
    { id: 'm8', direction: 'inbound', content: 'Sim, temos! A proxima turma esta prevista para 15 de julho. Posso reservar sua vaga?', type: 'text', status: 'read', aiGenerated: false, createdAt: '10:33' },
  ],
  c2: [
    { id: 'm1', direction: 'outbound', content: 'Boa tarde, Carlos! Tudo bem?', type: 'text', status: 'read', aiGenerated: false, createdAt: '09:30' },
    { id: 'm2', direction: 'inbound', content: 'Tudo otimo! Estou interessado em fazer uma pos-graduacao.', type: 'text', status: 'read', aiGenerated: false, createdAt: '09:35' },
    { id: 'm3', direction: 'inbound', content: 'Voces tem bolsa de estudo?', type: 'text', status: 'read', aiGenerated: false, createdAt: '09:45' },
  ],
}

const quickReplies: QuickReply[] = [
  { id: 'qr1', label: 'Boas-vindas', text: 'Ola! Bem-vindo(a) ao AIFLUENT. Em que posso ajudar?' },
  { id: 'qr2', label: 'Horarios', text: 'Nosso horario de atendimento e de segunda a sexta, das 8h as 18h, e sabados das 8h as 12h.' },
  { id: 'qr3', label: 'Catalogo', text: 'Vou enviar nosso catalogo de cursos atualizado. Um momento!' },
  { id: 'qr4', label: 'Follow-up', text: 'Ola! Estou entrando em contato para saber se ficou alguma duvida sobre nossa conversa anterior.' },
  { id: 'qr5', label: 'Agendamento', text: 'Gostaria de agendar uma visita presencial ou uma chamada de video para tirar suas duvidas?' },
]

// ── Component ───────────────────────────────────────────────────────────────

export default function WhatsAppPage() {
  const [selectedConv, setSelectedConv] = useState<string>('c1')
  const [searchTerm, setSearchTerm] = useState('')
  const [showQuickReplies, setShowQuickReplies] = useState(false)
  const [showContactInfo, setShowContactInfo] = useState(false)
  const [showBulkSend, setShowBulkSend] = useState(false)
  const [apiStatus] = useState<'connected' | 'disconnected'>('connected')
  const [allMessages, setAllMessages] = useState<Record<string, ChatMessage[]>>(initialMessages)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const currentConv = initialConversations.find((c) => c.id === selectedConv)
  const currentMessages = allMessages[selectedConv] ?? []

  const {
    input,
    setInput,
    recording,
    showEmoji,
    setShowEmoji,
    handleAudioToggle,
  } = useChat([])

  const filteredConversations = searchTerm
    ? initialConversations.filter(
        (c) =>
          c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.phone.includes(searchTerm)
      )
    : initialConversations

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentMessages])

  const now = () => {
    const d = new Date()
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  const addMessage = useCallback((msg: ChatMessage) => {
    setAllMessages((prev) => ({
      ...prev,
      [selectedConv]: [...(prev[selectedConv] ?? []), msg],
    }))
  }, [selectedConv])

  const handleSend = useCallback(() => {
    if (!input.trim()) return
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      direction: 'outbound',
      content: input.trim(),
      type: 'text',
      status: 'sent',
      aiGenerated: false,
      createdAt: now(),
    }
    addMessage(newMsg)
    setInput('')
    setShowEmoji(false)
  }, [input, addMessage, setInput, setShowEmoji])

  const handleQuickReply = (text: string) => {
    setInput(text)
    setShowQuickReplies(false)
  }

  const handleFileUpload = useCallback((file: File, type: 'document' | 'image') => {
    addMessage({
      id: `msg-${Date.now()}`,
      direction: 'outbound',
      content: type === 'image' ? '[Imagem enviada]' : `[Arquivo: ${file.name}]`,
      type: type === 'image' ? 'image' : 'document',
      status: 'sent',
      aiGenerated: false,
      createdAt: now(),
    })
  }, [addMessage])

  const handleAudioToggleLocal = useCallback(() => {
    if (recording) {
      addMessage({
        id: `msg-${Date.now()}`,
        direction: 'outbound',
        content: '[Audio enviado]',
        type: 'audio',
        status: 'sent',
        aiGenerated: false,
        createdAt: now(),
      })
    }
    handleAudioToggle()
  }, [recording, addMessage, handleAudioToggle])

  // Stats
  const totalUnread = initialConversations.reduce((s, c) => s + c.unreadCount, 0)

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      {/* Top bar with stats */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10">
            <MessageSquare className="h-5 w-5 text-sky-400" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-semibold text-gray-900">WhatsApp</h1>
            <div className="flex items-center gap-2">
              <div className={cn(
                'flex items-center gap-1 text-xs',
                apiStatus === 'connected' ? 'text-sky-400' : 'text-rose-400'
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
            { label: 'Tempo medio', value: '3min' },
            { label: 'Nao lidas', value: String(totalUnread) },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-lg font-bold text-gray-900">{stat.value}</p>
              <p className="text-[10px] text-gray-400">{stat.label}</p>
            </div>
          ))}

          <button
            onClick={() => setShowBulkSend(true)}
            className="flex items-center gap-2 px-3 py-2 bg-sky-500 hover:bg-sky-400 text-white text-sm rounded-lg transition-colors"
          >
            <Users className="w-4 h-4" />
            Envio em Massa
          </button>
        </div>
      </div>

      {/* Main content: 3-column layout */}
      <div className="flex-1 flex rounded-2xl overflow-hidden border border-gray-200 bg-gray-50 min-h-0">
        {/* Left: Conversation list */}
        <div className={cn('w-full sm:w-80 border-r border-gray-200 flex flex-col shrink-0', selectedConv ? 'hidden sm:flex' : 'flex')}>
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
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center">
                    <span className="text-xs font-bold text-gray-900">{conv.avatar}</span>
                  </div>
                  {conv.status === 'online' && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-sky-400 border-2 border-white" />
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
                  <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-sky-400 text-[10px] font-bold text-white">
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
                <button
                  onClick={() => setSelectedConv('')}
                  className="sm:hidden flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                  aria-label="Voltar"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center">
                    <span className="text-xs font-bold text-gray-900">{currentConv.avatar}</span>
                  </div>
                  {currentConv.status === 'online' && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-sky-400 border-2 border-white" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{currentConv.name}</p>
                  <p className="text-xs text-gray-400">
                    {currentConv.status === 'online' ? 'Online' : 'Visto por ultimo recentemente'}
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
            {currentMessages.map((msg) => (
              <ChatMessageBubble
                key={msg.id}
                direction={msg.direction}
                content={msg.content}
                timestamp={msg.createdAt}
                status={msg.status}
                aiGenerated={msg.aiGenerated}
                senderName={msg.sender}
              />
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
                    <p className="text-xs font-medium text-gray-500">Respostas Rapidas</p>
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

          {/* Shared Chat Input */}
          <ChatInput
            value={input}
            onChange={setInput}
            onSend={handleSend}
            onFileUpload={handleFileUpload}
            onAudioToggle={handleAudioToggleLocal}
            isRecording={recording}
            showEmoji={showEmoji}
            onToggleEmoji={() => setShowEmoji(!showEmoji)}
          />
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
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center mx-auto mb-3">
                    <span className="text-lg font-bold text-gray-900">{currentConv.avatar}</span>
                  </div>
                  <h3 className="text-base font-semibold text-gray-900">{currentConv.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{currentConv.phone}</p>
                  <div className={cn(
                    'inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium',
                    currentConv.status === 'online' ? 'bg-sky-500/10 text-sky-400' : 'bg-gray-100 text-gray-400'
                  )}>
                    <div className={cn('w-1.5 h-1.5 rounded-full', currentConv.status === 'online' ? 'bg-emerald-400' : 'bg-gray-400')} />
                    {currentConv.status === 'online' ? 'Online' : 'Offline'}
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-3">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Informacoes</h4>
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
                      <span className="text-gray-700">Sao Paulo, SP</span>
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
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Acoes Rapidas</h4>
                  <div className="space-y-2">
                    <button className="w-full flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-100 text-sm text-gray-700 rounded-lg transition-colors">
                      <Star className="w-3.5 h-3.5 text-amber-400" />
                      Marcar como prioritario
                    </button>
                    <button className="w-full flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-100 text-sm text-gray-700 rounded-lg transition-colors">
                      <User className="w-3.5 h-3.5 text-indigo-400" />
                      Ver perfil do lead
                    </button>
                    <button className="w-full flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-100 text-sm text-gray-700 rounded-lg transition-colors">
                      <FileText className="w-3.5 h-3.5 text-violet-400" />
                      Criar negocio
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
                  <select className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:border-sky-500 focus:outline-none transition-colors">
                    <option>Boas-vindas</option>
                    <option>Follow-up</option>
                    <option>Promocao</option>
                    <option>Reativacao</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-2">Segmento de Leads</label>
                  <select className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:border-sky-500 focus:outline-none transition-colors">
                    <option>Todos os leads</option>
                    <option>Leads quentes</option>
                    <option>Leads frios</option>
                    <option>Sem interacao 7+ dias</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-2">Previa da Mensagem</label>
                  <textarea
                    rows={3}
                    defaultValue="Ola {{nome}}! Temos uma novidade especial para voce..."
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-sky-500 focus:outline-none transition-colors resize-none"
                  />
                </div>
                <p className="text-xs text-gray-400">Estimativa: 234 destinatarios</p>
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
                  className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium rounded-xl transition-colors"
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
