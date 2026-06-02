'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, FileText, Send, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Note {
  id: string
  title: string
  description?: string | null
  createdAt: string
  user?: { id: string; name: string } | null
}

interface NotesSectionProps {
  leadId: string
  notes: Note[]
  onNoteAdded?: () => void
}

export function NotesSection({ leadId, notes, onNoteAdded }: NotesSectionProps) {
  const [open, setOpen] = useState(true)
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!text.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'note',
          title: 'Nota adicionada',
          description: text.trim(),
          leadId,
        }),
      })
      if (res.ok) {
        setText('')
        onNoteAdded?.()
      }
    } catch {
      // silently fail
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-gray-50"
      >
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-sky-500" />
          <span className="text-sm font-medium text-gray-900">Notas</span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
            {notes.length}
          </span>
        </div>
        <ChevronDown
          className={cn('h-4 w-4 text-gray-400 transition-transform', open && 'rotate-180')}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-gray-100 px-4 py-3 space-y-3">
              {/* Input */}
              <div className="flex gap-2">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Adicionar uma nota..."
                  rows={2}
                  className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-sky-400 focus:outline-none resize-none transition-colors"
                />
                <button
                  onClick={handleSave}
                  disabled={!text.trim() || saving}
                  className="self-end rounded-lg bg-sky-500 p-2 text-white transition-colors hover:bg-sky-400 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>

              {/* Notes list */}
              {notes.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {notes.map((note) => (
                    <div key={note.id} className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.description || note.title}</p>
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-gray-400">
                        {note.user && <span>{note.user.name}</span>}
                        <span>
                          {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true, locale: ptBR })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {notes.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-2">Nenhuma nota ainda</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
