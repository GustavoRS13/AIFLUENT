'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import {
  Send,
  Paperclip,
  Layout,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────────────────────

interface MessageInputProps {
  onSend: (message: string) => void
  onAttachment?: () => void
  onTemplate?: () => void
  onAiSuggest?: () => void
  disabled?: boolean
  placeholder?: string
}

// ── Component ────────────────────────────────────────────────────────────────

export function MessageInput({
  onSend,
  onAttachment,
  onTemplate,
  onAiSuggest,
  disabled,
  placeholder = 'Digite uma mensagem...',
}: MessageInputProps) {
  const [value, setValue] = React.useState('')
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  React.useEffect(() => {
    if (!textareaRef.current) return
    textareaRef.current.style.height = 'auto'
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
  }, [value])

  function handleSend() {
    const trimmed = value.trim()
    if (!trimmed) return
    onSend(trimmed)
    setValue('')
    // Reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const charCount = value.length
  const MAX_CHARS = 4096

  return (
    <div className="border-t border-gray-200 bg-gray-50 p-3">
      {/* Action buttons row */}
      <div className="flex items-center gap-1 mb-2">
        <button
          type="button"
          onClick={onAttachment}
          className="p-1.5 rounded-md text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
          title="Anexar arquivo"
        >
          <Paperclip className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onTemplate}
          className="p-1.5 rounded-md text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
          title="Inserir template"
        >
          <Layout className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onAiSuggest}
          className="p-1.5 rounded-md text-gray-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
          title="Sugestao da IA"
        >
          <Sparkles className="h-4 w-4" />
        </button>

        {charCount > 0 && (
          <span
            className={cn(
              'ml-auto text-[10px] tabular-nums',
              charCount > MAX_CHARS * 0.9 ? 'text-amber-400' : 'text-gray-400'
            )}
          >
            {charCount}/{MAX_CHARS}
          </span>
        )}
      </div>

      {/* Input row */}
      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={cn(
              'w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 resize-none transition-all',
              'focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/30',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            style={{ minHeight: '40px', maxHeight: '120px' }}
          />
        </div>

        <motion.button
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all',
            value.trim()
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-500'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          )}
          whileHover={value.trim() ? { scale: 1.05 } : undefined}
          whileTap={value.trim() ? { scale: 0.95 } : undefined}
        >
          <Send className="h-4 w-4" />
        </motion.button>
      </div>

      {/* Helper text */}
      <p className="text-[10px] text-gray-400 mt-1.5 ml-1">
        Enter para enviar, Shift+Enter para nova linha
      </p>
    </div>
  )
}
