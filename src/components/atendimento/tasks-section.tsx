'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, CheckSquare, Plus, Loader2, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Task {
  id: string
  title: string
  status: string
  priority: string
  dueDate?: string | null
  assignee?: { id: string; name: string } | null
}

interface TasksSectionProps {
  leadId: string
  tasks: Task[]
  onTaskCreated?: () => void
  onTaskToggled?: () => void
}

const priorityColors: Record<string, string> = {
  low: 'text-gray-400',
  medium: 'text-sky-500',
  high: 'text-amber-500',
  urgent: 'text-rose-500',
}

const priorityLabels: Record<string, string> = {
  low: 'Baixa',
  medium: 'Media',
  high: 'Alta',
  urgent: 'Urgente',
}

export function TasksSection({ leadId, tasks, onTaskCreated, onTaskToggled }: TasksSectionProps) {
  const [open, setOpen] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState('medium')
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  async function handleCreate() {
    if (!title.trim()) return
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        priority,
        type: 'task',
      }
      if (dueDate) body.dueDate = new Date(dueDate).toISOString()

      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setTitle('')
        setDueDate('')
        setPriority('medium')
        setShowCreate(false)
        onTaskCreated?.()
      }
    } catch {
      // silently fail
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(taskId: string, currentStatus: string) {
    setTogglingId(taskId)
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed'
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      onTaskToggled?.()
    } catch {
      // silently fail
    } finally {
      setTogglingId(null)
    }
  }

  const pendingTasks = tasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled')
  const completedTasks = tasks.filter((t) => t.status === 'completed')

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-gray-50"
      >
        <div className="flex items-center gap-2">
          <CheckSquare className="h-4 w-4 text-sky-500" />
          <span className="text-sm font-medium text-gray-900">Tarefas</span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
            {pendingTasks.length}
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
              {/* Create button */}
              {!showCreate && (
                <button
                  onClick={() => setShowCreate(true)}
                  className="flex w-full items-center gap-2 rounded-lg border border-dashed border-gray-200 px-3 py-2 text-xs text-gray-500 transition-colors hover:border-sky-300 hover:text-sky-600"
                >
                  <Plus className="h-3.5 w-3.5" /> Nova tarefa
                </button>
              )}

              {/* Inline create form */}
              <AnimatePresence>
                {showCreate && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 space-y-2">
                      <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Titulo da tarefa..."
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:border-sky-400 focus:outline-none"
                        onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                      />
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                          <input
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="w-full rounded-lg border border-gray-200 bg-white pl-8 pr-3 py-1.5 text-xs text-gray-700 focus:border-sky-400 focus:outline-none"
                          />
                        </div>
                        <select
                          value={priority}
                          onChange={(e) => setPriority(e.target.value)}
                          className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 focus:border-sky-400 focus:outline-none"
                        >
                          <option value="low">Baixa</option>
                          <option value="medium">Media</option>
                          <option value="high">Alta</option>
                          <option value="urgent">Urgente</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleCreate}
                          disabled={!title.trim() || saving}
                          className="rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-sky-400 disabled:opacity-50"
                        >
                          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Criar'}
                        </button>
                        <button
                          onClick={() => { setShowCreate(false); setTitle(''); setDueDate(''); setPriority('medium') }}
                          className="rounded-lg px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Pending tasks */}
              {pendingTasks.length > 0 && (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {pendingTasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-50 transition-colors">
                      <button
                        onClick={() => handleToggle(task.id, task.status)}
                        disabled={togglingId === task.id}
                        className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-gray-300 transition-colors hover:border-sky-400"
                      >
                        {togglingId === task.id && <Loader2 className="h-3 w-3 animate-spin text-gray-400" />}
                      </button>
                      <span className="flex-1 text-sm text-gray-700 truncate">{task.title}</span>
                      <span className={cn('text-[10px] font-medium', priorityColors[task.priority])}>
                        {priorityLabels[task.priority]}
                      </span>
                      {task.dueDate && (
                        <span className="text-[10px] text-gray-400">
                          {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true, locale: ptBR })}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Completed tasks */}
              {completedTasks.length > 0 && (
                <div className="space-y-1 opacity-60">
                  <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider px-2">Concluidas</p>
                  {completedTasks.slice(0, 3).map((task) => (
                    <div key={task.id} className="flex items-center gap-2 rounded-lg px-2 py-1">
                      <button
                        onClick={() => handleToggle(task.id, task.status)}
                        disabled={togglingId === task.id}
                        className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-sky-400 bg-sky-500 transition-colors"
                      >
                        <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <span className="flex-1 text-sm text-gray-400 line-through truncate">{task.title}</span>
                    </div>
                  ))}
                </div>
              )}

              {pendingTasks.length === 0 && completedTasks.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-2">Nenhuma tarefa</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
