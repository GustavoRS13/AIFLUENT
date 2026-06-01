'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2, Circle, Clock, AlertTriangle, Plus,
  Calendar, MoreHorizontal, Flag,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Task = {
  id: string
  title: string
  type: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  dueDate: string
  assignee: { name: string; avatar?: string }
  creator: string
}

const mockTasks: Task[] = [
  { id: '1', title: 'Ligar para lead quente — Ana Silva', type: 'call', priority: 'urgent', status: 'pending', dueDate: '2026-05-28', assignee: { name: 'Maria Consultora' }, creator: 'AIFLUENT' },
  { id: '2', title: 'Enviar proposta comercial — Empresa XYZ', type: 'email', priority: 'high', status: 'in_progress', dueDate: '2026-05-29', assignee: { name: 'Carlos Vendedor' }, creator: 'AIFLUENT' },
  { id: '3', title: 'Follow-up campanha Black Friday', type: 'task', priority: 'medium', status: 'pending', dueDate: '2026-05-30', assignee: { name: 'Ana Especialista' }, creator: 'AIFLUENT' },
  { id: '4', title: 'Preparar apresentação para reunião', type: 'meeting', priority: 'high', status: 'pending', dueDate: '2026-05-28', assignee: { name: 'Pedro Closer' }, creator: 'AIFLUENT' },
  { id: '5', title: 'Revisar métricas da campanha de Espanhol', type: 'task', priority: 'medium', status: 'completed', dueDate: '2026-05-27', assignee: { name: 'Maria Consultora' }, creator: 'AIFLUENT' },
  { id: '6', title: 'Atualizar base de leads do Instagram', type: 'task', priority: 'low', status: 'pending', dueDate: '2026-06-01', assignee: { name: 'Carlos Vendedor' }, creator: 'AIFLUENT' },
  { id: '7', title: 'Responder WhatsApp pendentes', type: 'task', priority: 'urgent', status: 'in_progress', dueDate: '2026-05-27', assignee: { name: 'Ana Especialista' }, creator: 'AIFLUENT' },
  { id: '8', title: 'Criar campanha de reativação', type: 'task', priority: 'high', status: 'pending', dueDate: '2026-05-31', assignee: { name: 'AIFLUENT' }, creator: 'AIFLUENT' },
  { id: '9', title: 'Agendar reunião com lead corporativo', type: 'meeting', priority: 'high', status: 'pending', dueDate: '2026-05-29', assignee: { name: 'Pedro Closer' }, creator: 'AIFLUENT' },
  { id: '10', title: 'Enviar material didático para leads quentes', type: 'email', priority: 'medium', status: 'completed', dueDate: '2026-05-26', assignee: { name: 'Maria Consultora' }, creator: 'AIFLUENT' },
]

const priorityConfig = {
  low: { color: 'text-gray-500', bg: 'bg-gray-100', icon: Flag, label: 'Baixa' },
  medium: { color: 'text-blue-400', bg: 'bg-blue-400/10', icon: Flag, label: 'Média' },
  high: { color: 'text-amber-400', bg: 'bg-amber-400/10', icon: AlertTriangle, label: 'Alta' },
  urgent: { color: 'text-rose-400', bg: 'bg-rose-400/10', icon: AlertTriangle, label: 'Urgente' },
}

const statusConfig = {
  pending: { color: 'text-gray-500', icon: Circle, label: 'Pendente' },
  in_progress: { color: 'text-blue-400', icon: Clock, label: 'Em Andamento' },
  completed: { color: 'text-emerald-400', icon: CheckCircle2, label: 'Concluída' },
  cancelled: { color: 'text-gray-400', icon: Circle, label: 'Cancelada' },
}

export default function TasksPage() {
  const [tasks, setTasks] = useState(mockTasks)
  const [filter, setFilter] = useState<string>('all')
  const [showNewTask, setShowNewTask] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  const filtered = filter === 'all' ? tasks : tasks.filter((t) => t.status === filter)
  const counts = {
    all: tasks.length,
    pending: tasks.filter((t) => t.status === 'pending').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
    completed: tasks.filter((t) => t.status === 'completed').length,
  }

  function toggleStatus(id: string) {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, status: t.status === 'completed' ? 'pending' : 'completed' }
          : t
      )
    )
  }

  function addTask() {
    if (!newTitle.trim()) return
    setTasks((prev) => [
      {
        id: String(Date.now()),
        title: newTitle,
        type: 'task',
        priority: 'medium',
        status: 'pending',
        dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        assignee: { name: 'AIFLUENT' },
        creator: 'AIFLUENT',
      },
      ...prev,
    ])
    setNewTitle('')
    setShowNewTask(false)
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tarefas</h1>
          <p className="text-gray-500 mt-1">{counts.pending} pendentes · {counts.in_progress} em andamento</p>
        </div>
        <button
          onClick={() => setShowNewTask(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova Tarefa
        </button>
      </div>

      <div className="flex items-center gap-2">
        {[
          { key: 'all', label: 'Todas' },
          { key: 'pending', label: 'Pendentes' },
          { key: 'in_progress', label: 'Em Andamento' },
          { key: 'completed', label: 'Concluídas' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              filter === f.key
                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            )}
          >
            {f.label}
            <span className="ml-2 text-xs opacity-60">{counts[f.key as keyof typeof counts]}</span>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {showNewTask && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-2xl">
              <Circle className="w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTask()}
                placeholder="Título da tarefa..."
                className="flex-1 bg-transparent text-gray-900 placeholder-gray-400 outline-none"
                autoFocus
              />
              <button onClick={addTask} className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-500 transition-colors">
                Adicionar
              </button>
              <button onClick={() => setShowNewTask(false)} className="px-3 py-1.5 text-gray-500 text-sm hover:text-gray-900 transition-colors">
                Cancelar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-2">
        <AnimatePresence>
          {filtered.map((task, i) => {
            const StatusIcon = statusConfig[task.status].icon
            const PriorityIcon = priorityConfig[task.priority].icon

            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: i * 0.03 }}
                className={cn(
                  'group flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-200 transition-all cursor-pointer',
                  task.status === 'completed' && 'opacity-60'
                )}
              >
                <button onClick={() => toggleStatus(task.id)} className="shrink-0">
                  <StatusIcon className={cn('w-5 h-5 transition-colors', statusConfig[task.status].color)} />
                </button>

                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-medium text-gray-900 truncate', task.status === 'completed' && 'line-through text-gray-400')}>
                    {task.title}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={cn('flex items-center gap-1 text-xs', priorityConfig[task.priority].color)}>
                      <PriorityIcon className="w-3 h-3" />
                      {priorityConfig[task.priority].label}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Calendar className="w-3 h-3" />
                      {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-gray-900">
                        {task.assignee.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 hidden lg:block">{task.assignee.name.split(' ')[0]}</span>
                  </div>
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreHorizontal className="w-4 h-4 text-gray-400 hover:text-gray-900" />
                  </button>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
