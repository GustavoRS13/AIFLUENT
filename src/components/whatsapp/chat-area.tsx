'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowDown, Image, FileText, Check, CheckCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string
  direction: 'inbound' | 'outbound'
  type: 'text' | 'image' | 'document'
  content: string
  timestamp: string
  status?: 'sent' | 'delivered' | 'read'
}

interface ChatAreaProps {
  messages: ChatMessage[]
  contactName: string
  loading?: boolean
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(timestamp: string): string {
  const d = new Date(timestamp)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatDateSeparator(timestamp: string): string {
  const d = new Date(timestamp)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (d.toDateString() === today.toDateString()) return 'Hoje'
  if (d.toDateString() === yesterday.toDateString()) return 'Ontem'

  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function shouldShowDateSeparator(messages: ChatMessage[], idx: number): boolean {
  if (idx === 0) return true
  const curr = new Date(messages[idx].timestamp).toDateString()
  const prev = new Date(messages[idx - 1].timestamp).toDateString()
  return curr !== prev
}

function StatusIcon({ status }: { status?: string }) {
  if (!status) return null
  if (status === 'sent') return <Check className="h-3 w-3 text-gray-400" />
  if (status === 'delivered') return <CheckCheck className="h-3 w-3 text-gray-400" />
  if (status === 'read') return <CheckCheck className="h-3 w-3 text-blue-400" />
  return null
}

// ── Loading Skeleton ─────────────────────────────────────────────────────────

function ChatSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4">
      {Array.from({ length: 6 }).map((_, i) => {
        const isRight = i % 3 === 0
        return (
          <div key={i} className={cn('flex', isRight ? 'justify-end' : 'justify-start')}>
            <div
              className={cn(
                'rounded-xl animate-pulse',
                isRight ? 'bg-indigo-600/20' : 'bg-gray-100',
                i % 2 === 0 ? 'h-10 w-48' : 'h-16 w-64'
              )}
            />
          </div>
        )
      })}
    </div>
  )
}

// ── Component ────────────────────────────────────────────────────────────────

export function ChatArea({ messages, contactName, loading }: ChatAreaProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const [showScrollBtn, setShowScrollBtn] = React.useState(false)

  // Scroll to bottom on new messages
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Show/hide scroll-to-bottom button
  function handleScroll() {
    if (!scrollRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 200)
  }

  function scrollToBottom() {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }
  }

  if (loading) return <ChatSkeleton />

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-center p-6">
        <div>
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-50 border border-gray-200 text-gray-400 mx-auto mb-3">
            <FileText className="h-6 w-6" />
          </div>
          <p className="text-sm text-gray-500">Nenhuma mensagem com {contactName}</p>
          <p className="text-xs text-gray-400 mt-1">Comece a conversa enviando uma mensagem</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex-1 flex flex-col overflow-hidden">
      {/* Messages area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-1"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(100,116,139,0.06) 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      >
        {messages.map((msg, idx) => (
          <React.Fragment key={msg.id}>
            {/* Date separator */}
            {shouldShowDateSeparator(messages, idx) && (
              <div className="flex items-center justify-center py-3">
                <span className="px-3 py-1 rounded-full bg-gray-100 border border-gray-200 text-[11px] text-gray-500 font-medium">
                  {formatDateSeparator(msg.timestamp)}
                </span>
              </div>
            )}

            {/* Message bubble */}
            <motion.div
              className={cn(
                'flex',
                msg.direction === 'outbound' ? 'justify-end' : 'justify-start'
              )}
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <div
                className={cn(
                  'max-w-[75%] rounded-xl px-3 py-2 relative',
                  msg.direction === 'outbound'
                    ? 'bg-indigo-600/80 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                )}
              >
                {/* Content */}
                {msg.type === 'text' && (
                  <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                    {msg.content}
                  </p>
                )}

                {msg.type === 'image' && (
                  <div className="space-y-1.5">
                    <div className="w-56 h-36 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Image className="h-8 w-8 text-gray-500" />
                    </div>
                    {msg.content && (
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                )}

                {msg.type === 'document' && (
                  <div className="flex items-center gap-2 bg-black/10 rounded-lg p-2 min-w-[200px]">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/20">
                      <FileText className="h-5 w-5 text-indigo-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{msg.content}</p>
                      <p className="text-[10px] opacity-70">PDF</p>
                    </div>
                  </div>
                )}

                {/* Time and status */}
                <div
                  className={cn(
                    'flex items-center gap-1 mt-0.5',
                    msg.direction === 'outbound' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <span className="text-[10px] opacity-60">{formatTime(msg.timestamp)}</span>
                  {msg.direction === 'outbound' && <StatusIcon status={msg.status} />}
                </div>
              </div>
            </motion.div>
          </React.Fragment>
        ))}
      </div>

      {/* Scroll to bottom button */}
      <AnimatePresence>
        {showScrollBtn && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={scrollToBottom}
            className="absolute bottom-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 border border-gray-200 text-gray-700 hover:text-gray-900 shadow-lg transition-colors"
          >
            <ArrowDown className="h-4 w-4" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
