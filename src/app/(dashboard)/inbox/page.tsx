'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Send, Paperclip, Smile, MoreHorizontal, Phone, Video, Bot,
  Sparkles, Filter, Archive, CheckCheck, Check,
  MessageCircle, Camera, MessagesSquare, Mail, Star, ArrowRight,
  Mic, Image, X, UserPlus, Inbox,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Channel = 'all' | 'whatsapp' | 'instagram' | 'messenger'

interface Conversation {
  id: string
  channel: 'whatsapp' | 'instagram' | 'messenger'
  lead: { name: string; avatar?: string; phone?: string }
  lastMessage: string
  lastMessageAt: string
  unreadCount: number
  status: 'open' | 'pending' | 'resolved'
  assignee?: string
  priority: 'normal' | 'high' | 'urgent'
  aiSuggestion?: string
}

interface Message {
  id: string
  direction: 'inbound' | 'outbound'
  content: string
  type: 'text' | 'image' | 'audio' | 'document'
  status: 'sent' | 'delivered' | 'read'
  aiGenerated: boolean
  createdAt: string
  sender?: string
}

const EMOJI_LIST = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '😊', '😇',
  '🥰', '😍', '🤩', '😘', '😋', '😜', '🤗', '🤔', '👍', '👋',
]

const mockConversations: Conversation[] = [
  { id: '1', channel: 'whatsapp', lead: { name: 'Ana Carolina Silva', phone: '+55 11 99999-1234' }, lastMessage: 'Oi, gostaria de saber mais sobre o curso de ingles!', lastMessageAt: '2 min', unreadCount: 3, status: 'open', priority: 'urgent', assignee: 'Maria', aiSuggestion: 'Responder com informacoes do curso Business English' },
  { id: '2', channel: 'instagram', lead: { name: 'Pedro Henrique', phone: '+55 21 98888-5678' }, lastMessage: 'Vi o anuncio de voces, qual o valor da mensalidade?', lastMessageAt: '15 min', unreadCount: 1, status: 'open', priority: 'high' },
  { id: '3', channel: 'messenger', lead: { name: 'Juliana Santos', phone: '+55 31 97777-9012' }, lastMessage: 'Obrigada! Vou pensar e retorno amanha.', lastMessageAt: '1h', unreadCount: 0, status: 'pending', assignee: 'Carlos', priority: 'normal' },
  { id: '4', channel: 'whatsapp', lead: { name: 'Ricardo Oliveira', phone: '+55 41 96666-3456' }, lastMessage: 'Perfeito, podemos agendar uma aula experimental?', lastMessageAt: '2h', unreadCount: 0, status: 'open', assignee: 'Ana', priority: 'normal' },
  { id: '5', channel: 'instagram', lead: { name: 'Fernanda Costa', phone: '+55 51 95555-7890' }, lastMessage: 'Tem turma no horario da noite?', lastMessageAt: '3h', unreadCount: 2, status: 'open', priority: 'normal' },
  { id: '6', channel: 'whatsapp', lead: { name: 'Lucas Mendes', phone: '+55 11 94444-1234' }, lastMessage: 'Pode me enviar o contrato por favor?', lastMessageAt: '5h', unreadCount: 0, status: 'resolved', assignee: 'Maria', priority: 'normal' },
  { id: '7', channel: 'messenger', lead: { name: 'Camila Rodrigues' }, lastMessage: 'Quero comecar o mais rapido possivel!', lastMessageAt: '6h', unreadCount: 1, status: 'open', priority: 'high', aiSuggestion: 'Lead quente - sugerir agendamento imediato' },
  { id: '8', channel: 'whatsapp', lead: { name: 'Marcos Silva', phone: '+55 21 93333-5678' }, lastMessage: 'Boa tarde! Recebi o material, muito bom.', lastMessageAt: '1d', unreadCount: 0, status: 'pending', priority: 'normal' },
]

const initialMessages: Message[] = [
  { id: '1', direction: 'inbound', content: 'Ola! Vi o anuncio de voces no Instagram sobre o curso de ingles para negocios.', type: 'text', status: 'read', aiGenerated: false, createdAt: '10:30' },
  { id: '2', direction: 'inbound', content: 'Gostaria de saber mais informacoes sobre valores e horarios disponiveis.', type: 'text', status: 'read', aiGenerated: false, createdAt: '10:31' },
  { id: '3', direction: 'outbound', content: 'Ola Ana! Tudo bem? Que bom que voce se interessou pelo nosso curso Business English! Temos turmas nos seguintes horarios:\n\n- Segunda e Quarta: 19h-20h30\n- Terca e Quinta: 18h-19h30\n- Sabado: 9h-12h\n\nO investimento e de R$397/mes com material incluso.', type: 'text', status: 'read', aiGenerated: false, createdAt: '10:45', sender: 'Maria Consultora' },
  { id: '4', direction: 'inbound', content: 'Que legal! O horario de segunda e quarta seria perfeito pra mim.', type: 'text', status: 'read', aiGenerated: false, createdAt: '10:48' },
  { id: '5', direction: 'inbound', content: 'Voces tem aula experimental?', type: 'text', status: 'read', aiGenerated: false, createdAt: '10:48' },
  { id: '6', direction: 'outbound', content: 'Sim! Oferecemos uma aula experimental gratuita para voce conhecer nossa metodologia. Posso agendar para a proxima segunda-feira as 19h?', type: 'text', status: 'delivered', aiGenerated: true, createdAt: '10:52', sender: 'IA' },
  { id: '7', direction: 'inbound', content: 'Oi, gostaria de saber mais sobre o curso de ingles!', type: 'text', status: 'read', aiGenerated: false, createdAt: '11:15' },
]

const channelIcons = {
  whatsapp: MessageCircle,
  instagram: Camera,
  messenger: MessagesSquare,
}

const channelColors = {
  whatsapp: 'text-emerald-400',
  instagram: 'text-pink-400',
  messenger: 'text-blue-400',
}

const channelBg = {
  whatsapp: 'bg-emerald-500/10',
  instagram: 'bg-pink-500/10',
  messenger: 'bg-blue-500/10',
}

export default function InboxPage() {
  const [channel, setChannel] = useState<Channel>('all')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string>('1')
  const [messageText, setMessageText] = useState('')
  const [showAiSuggestion, setShowAiSuggestion] = useState(true)
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [isRecording, setIsRecording] = useState(false)
  const [showEmojiPanel, setShowEmojiPanel] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const filtered = mockConversations.filter((c) => {
    if (channel !== 'all' && c.channel !== channel) return false
    if (search && !c.lead.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const selected = mockConversations.find((c) => c.id === selectedId)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selectedId, messages])

  const totalUnread = mockConversations.reduce((sum, c) => sum + c.unreadCount, 0)

  const now = () => {
    const d = new Date()
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  const handleSend = useCallback(() => {
    if (!messageText.trim()) return
    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      direction: 'outbound',
      content: messageText.trim(),
      type: 'text',
      status: 'sent',
      aiGenerated: false,
      createdAt: now(),
    }
    setMessages((prev) => [...prev, newMsg])
    setMessageText('')
    setShowEmojiPanel(false)
  }, [messageText])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      direction: 'outbound',
      content: `[Arquivo: ${file.name}]`,
      type: 'document',
      status: 'sent',
      aiGenerated: false,
      createdAt: now(),
    }
    setMessages((prev) => [...prev, newMsg])
    e.target.value = ''
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      direction: 'outbound',
      content: '[Imagem enviada]',
      type: 'image',
      status: 'sent',
      aiGenerated: false,
      createdAt: now(),
    }
    setMessages((prev) => [...prev, newMsg])
    e.target.value = ''
  }

  const handleAudioToggle = () => {
    if (isRecording) {
      setIsRecording(false)
      const newMsg: Message = {
        id: `msg-${Date.now()}`,
        direction: 'outbound',
        content: '[Audio enviado]',
        type: 'audio',
        status: 'sent',
        aiGenerated: false,
        createdAt: now(),
      }
      setMessages((prev) => [...prev, newMsg])
    } else {
      setIsRecording(true)
    }
  }

  const handleEmojiClick = (emoji: string) => {
    setMessageText((prev) => prev + emoji)
    textareaRef.current?.focus()
  }

  const handleAiResponse = () => {
    setTimeout(() => {
      const aiMsg: Message = {
        id: `msg-${Date.now()}`,
        direction: 'outbound',
        content: 'Baseado no historico, sugiro oferecer a aula experimental gratuita para aumentar a conversao.',
        type: 'text',
        status: 'sent',
        aiGenerated: true,
        createdAt: now(),
        sender: 'IA',
      }
      setMessages((prev) => [...prev, aiMsg])
    }, 1000)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-[calc(100dvh-4rem)] -m-6">
      {/* Hidden file inputs */}
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

      {/* Conversation List */}
      <div className="w-[380px] flex flex-col border-r border-gray-200 bg-white">
        {/* List Header */}
        <div className="p-4 border-b border-gray-200 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Inbox</h2>
              <p className="text-xs text-gray-500">{totalUnread} nao lidas</p>
            </div>
            <div className="flex items-center gap-1">
              <button className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors">
                <Filter className="w-4 h-4" />
              </button>
              <button className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors">
                <Archive className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar conversas..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:border-sky-500/30 focus:outline-none transition-colors"
            />
          </div>

          {/* Channel Tabs */}
          <div className="flex gap-1">
            {[
              { key: 'all' as const, label: 'Todos', count: mockConversations.length },
              { key: 'whatsapp' as const, label: 'WhatsApp', count: mockConversations.filter((c) => c.channel === 'whatsapp').length },
              { key: 'instagram' as const, label: 'Instagram', count: mockConversations.filter((c) => c.channel === 'instagram').length },
              { key: 'messenger' as const, label: 'Messenger', count: mockConversations.filter((c) => c.channel === 'messenger').length },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setChannel(tab.key)}
                className={cn(
                  'flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  channel === tab.key
                    ? 'bg-sky-50 text-sky-700 border border-sky-200'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                )}
              >
                {tab.label}
                <span className="ml-1 opacity-60">{tab.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.map((conv) => {
            const ChannelIcon = channelIcons[conv.channel]
            const isActive = conv.id === selectedId

            return (
              <button
                key={conv.id}
                onClick={() => setSelectedId(conv.id)}
                className={cn(
                  'w-full flex items-start gap-3 p-4 text-left transition-colors border-b border-gray-100',
                  isActive ? 'bg-sky-50 border-l-2 border-l-sky-500' : 'hover:bg-gray-50'
                )}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center">
                    <span className="text-xs font-bold text-white">
                      {conv.lead.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </span>
                  </div>
                  <div className={cn('absolute -bottom-0.5 -right-0.5 p-0.5 rounded-full', channelBg[conv.channel])}>
                    <ChannelIcon className={cn('w-3 h-3', channelColors[conv.channel])} />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={cn('text-sm truncate', conv.unreadCount > 0 ? 'text-gray-900 font-semibold' : 'text-gray-700 font-medium')}>
                      {conv.lead.name}
                    </p>
                    <span className="text-[10px] text-gray-400 shrink-0 ml-2">{conv.lastMessageAt}</span>
                  </div>
                  <p className={cn('text-xs truncate mt-0.5', conv.unreadCount > 0 ? 'text-gray-700 font-medium' : 'text-gray-400')}>
                    {conv.lastMessage}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {conv.assignee && (
                      <span className="text-[10px] text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                        {conv.assignee}
                      </span>
                    )}
                    {conv.priority === 'urgent' && (
                      <span className="text-[10px] text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded font-medium">Urgente</span>
                    )}
                    {conv.priority === 'high' && (
                      <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-medium">Alta</span>
                    )}
                    {conv.aiSuggestion && (
                      <Sparkles className="w-3 h-3 text-amber-500" />
                    )}
                  </div>
                </div>

                {/* Unread badge */}
                {conv.unreadCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-sky-500 px-1.5 text-[10px] font-bold text-white shrink-0">
                    {conv.unreadCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Chat Area */}
      {selected ? (
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center">
                  <span className="text-xs font-bold text-white">
                    {selected.lead.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </span>
                </div>
                <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{selected.lead.name}</p>
                <div className="flex items-center gap-2">
                  {(() => { const CI = channelIcons[selected.channel]; return <CI className={cn('w-3 h-3', channelColors[selected.channel])} /> })()}
                  <span className="text-xs text-gray-500">{selected.lead.phone || selected.channel}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors">
                <Phone className="w-4 h-4" />
              </button>
              <button className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors">
                <Video className="w-4 h-4" />
              </button>
              <button className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors">
                <UserPlus className="w-4 h-4" />
              </button>
              <button className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors">
                <Star className="w-4 h-4" />
              </button>
              <button className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* AI Suggestion Bar */}
          {selected.aiSuggestion && showAiSuggestion && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="px-6 py-2 bg-amber-50 border-b border-amber-200 flex items-center gap-3"
            >
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <p className="text-xs text-amber-800 flex-1">{selected.aiSuggestion}</p>
              <button onClick={() => setShowAiSuggestion(false)} className="text-amber-500 hover:text-amber-700">
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-gray-50">
            <div className="flex justify-center">
              <span className="text-[10px] text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200">Hoje</span>
            </div>

            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn('flex', msg.direction === 'outbound' ? 'justify-end' : 'justify-start')}
              >
                <div className={cn(
                  'max-w-[70%] rounded-2xl px-4 py-2.5',
                  msg.direction === 'outbound'
                    ? msg.aiGenerated
                      ? 'bg-gradient-to-br from-sky-500 to-blue-600'
                      : 'bg-sky-500'
                    : 'bg-gray-100 border border-gray-200'
                )}>
                  {msg.aiGenerated && (
                    <div className="flex items-center gap-1 mb-1">
                      <Bot className="w-3 h-3 text-amber-200" />
                      <span className="text-[10px] text-amber-200 font-medium">Gerado por IA</span>
                    </div>
                  )}
                  {msg.sender && !msg.aiGenerated && msg.direction === 'outbound' && (
                    <p className="text-[10px] text-sky-200 mb-1">{msg.sender}</p>
                  )}
                  <p className={cn('text-sm whitespace-pre-wrap', msg.direction === 'outbound' ? 'text-white' : 'text-gray-900')}>{msg.content}</p>
                  <div className={cn('flex items-center gap-1 mt-1', msg.direction === 'outbound' ? 'justify-end' : '')}>
                    <span className={cn('text-[10px]', msg.direction === 'outbound' ? 'text-sky-200' : 'text-gray-400')}>{msg.createdAt}</span>
                    {msg.direction === 'outbound' && (
                      msg.status === 'read'
                        ? <CheckCheck className="w-3 h-3 text-sky-200" />
                        : <Check className="w-3 h-3 text-sky-200" />
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Emoji Panel */}
          <AnimatePresence>
            {showEmojiPanel && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="px-6 pb-2"
              >
                <div className="bg-white border border-gray-200 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-gray-500">Emojis</p>
                    <button onClick={() => setShowEmojiPanel(false)} className="text-gray-400 hover:text-gray-900 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {EMOJI_LIST.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleEmojiClick(emoji)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-lg"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Recording indicator */}
          {isRecording && (
            <div className="px-6 pb-2">
              <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2">
                <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span className="text-sm text-rose-700 font-medium">Gravando...</span>
                <button
                  onClick={handleAudioToggle}
                  className="ml-auto text-xs text-rose-600 hover:text-rose-800 font-medium"
                >
                  Parar e enviar
                </button>
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="px-6 py-4 bg-white border-t border-gray-200">
            <div className="flex items-end gap-2">
              <div className="flex gap-1">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                  title="Enviar arquivo"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <button
                  onClick={() => imageInputRef.current?.click()}
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                  title="Enviar imagem"
                >
                  <Image className="w-5 h-5" />
                </button>
                <button
                  onClick={handleAudioToggle}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    isRecording
                      ? 'text-rose-500 bg-rose-50 hover:bg-rose-100'
                      : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'
                  )}
                  title={isRecording ? 'Parar gravacao' : 'Gravar audio'}
                >
                  <Mic className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Digite sua mensagem..."
                  rows={1}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:border-sky-500/30 focus:outline-none resize-none transition-colors"
                />
              </div>
              <button
                onClick={() => setShowEmojiPanel(!showEmojiPanel)}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  showEmojiPanel
                    ? 'text-sky-500 bg-sky-50'
                    : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'
                )}
              >
                <Smile className="w-5 h-5" />
              </button>
              <button
                onClick={handleSend}
                className="p-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
              <button
                onClick={handleAiResponse}
                className="p-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white transition-colors"
                title="Gerar resposta com IA"
              >
                <Bot className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Inbox className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">Selecione uma conversa</h3>
            <p className="text-sm text-gray-500">Escolha uma conversa para comecar a atender</p>
          </div>
        </div>
      )}

      {/* Right Panel - Lead Info */}
      {selected && (
        <div className="w-[300px] border-l border-gray-200 overflow-y-auto">
          <div className="p-5 space-y-5">
            {/* Lead Card */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center mx-auto mb-3">
                <span className="text-lg font-bold text-white">
                  {selected.lead.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-gray-900">{selected.lead.name}</h3>
              <p className="text-xs text-gray-600">{selected.lead.phone}</p>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: Phone, label: 'Ligar' },
                { icon: Mail, label: 'Email' },
                { icon: UserPlus, label: 'Atribuir' },
              ].map((action) => (
                <button
                  key={action.label}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <action.icon className="w-4 h-4 text-gray-600" />
                  <span className="text-[10px] text-gray-600">{action.label}</span>
                </button>
              ))}
            </div>

            {/* Lead Details */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Detalhes</h4>
              {[
                { label: 'Canal', value: selected.channel.charAt(0).toUpperCase() + selected.channel.slice(1) },
                { label: 'Status', value: 'Lead Quente' },
                { label: 'Origem', value: 'Instagram Ads' },
                { label: 'Interesse', value: 'Business English' },
                { label: 'Score IA', value: '87/100' },
                { label: 'Consultor', value: selected.assignee || 'Nao atribuido' },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">{item.label}</span>
                  <span className="text-xs text-gray-900 font-medium">{item.value}</span>
                </div>
              ))}
            </div>

            {/* AI Insights */}
            <div className="bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-semibold text-gray-900">Insights IA</h4>
              </div>
              <ul className="space-y-1.5">
                <li className="text-xs text-gray-800 flex items-start gap-2">
                  <ArrowRight className="w-3 h-3 text-sky-400 mt-0.5 shrink-0" />
                  Lead com alta probabilidade de conversao (87%)
                </li>
                <li className="text-xs text-gray-800 flex items-start gap-2">
                  <ArrowRight className="w-3 h-3 text-sky-400 mt-0.5 shrink-0" />
                  Interesse demonstrado em horario noturno
                </li>
                <li className="text-xs text-gray-800 flex items-start gap-2">
                  <ArrowRight className="w-3 h-3 text-sky-400 mt-0.5 shrink-0" />
                  Sugestao: Oferecer aula experimental
                </li>
              </ul>
            </div>

            {/* Timeline */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Historico</h4>
              {[
                { time: 'Hoje 11:15', text: 'Mensagem recebida via WhatsApp', type: 'message' },
                { time: 'Hoje 10:52', text: 'IA enviou resposta automatica', type: 'ai' },
                { time: 'Hoje 10:45', text: 'Maria respondeu no WhatsApp', type: 'message' },
                { time: 'Ontem', text: 'Lead captado via Instagram Ads', type: 'lead' },
              ].map((event, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      'w-2 h-2 rounded-full mt-1.5',
                      event.type === 'ai' ? 'bg-amber-400' : event.type === 'lead' ? 'bg-emerald-400' : 'bg-indigo-400'
                    )} />
                    {i < 3 && <div className="w-px h-full bg-gray-100 mt-1" />}
                  </div>
                  <div>
                    <p className="text-xs text-gray-800">{event.text}</p>
                    <p className="text-[10px] text-gray-500">{event.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
