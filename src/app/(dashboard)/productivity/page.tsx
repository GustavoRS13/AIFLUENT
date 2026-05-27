'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Trophy, Star, Flame, Zap, Target, Crown, Medal, Award,
  TrendingUp, Users, Clock, CheckCircle2, Calendar,
  ArrowUpRight, BarChart3, Sparkles, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type TabType = 'ranking' | 'goals' | 'achievements' | 'gamification'

interface TeamMember {
  id: string
  name: string
  role: string
  xp: number
  level: number
  leadsConverted: number
  revenue: number
  tasksCompleted: number
  avgResponseTime: number
  streak: number
  rank: number
  change: number
}

const mockRanking: TeamMember[] = [
  { id: '1', name: 'Pedro Closer', role: 'Closer', xp: 4850, level: 12, leadsConverted: 34, revenue: 45200, tasksCompleted: 67, avgResponseTime: 2.1, streak: 15, rank: 1, change: 0 },
  { id: '2', name: 'Maria Consultora', role: 'Consultora', xp: 4200, level: 11, leadsConverted: 28, revenue: 38900, tasksCompleted: 58, avgResponseTime: 3.4, streak: 8, rank: 2, change: 1 },
  { id: '3', name: 'Carlos Vendedor', role: 'Vendedor', xp: 3780, level: 10, leadsConverted: 22, revenue: 31500, tasksCompleted: 52, avgResponseTime: 4.2, streak: 5, rank: 3, change: -1 },
  { id: '4', name: 'Ana Especialista', role: 'Especialista', xp: 3450, level: 9, leadsConverted: 19, revenue: 27800, tasksCompleted: 48, avgResponseTime: 3.8, streak: 12, rank: 4, change: 2 },
  { id: '5', name: 'Raphael Ruiz', role: 'Admin', xp: 3200, level: 9, leadsConverted: 18, revenue: 24500, tasksCompleted: 42, avgResponseTime: 5.1, streak: 3, rank: 5, change: 0 },
]

interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  category: 'sales' | 'communication' | 'speed' | 'consistency'
  threshold: number
  xpReward: number
  unlocked: boolean
  progress: number
}

const mockAchievements: Achievement[] = [
  { id: '1', name: 'Primeiro Fechamento', description: 'Feche seu primeiro negocio', icon: '🎯', category: 'sales', threshold: 1, xpReward: 100, unlocked: true, progress: 100 },
  { id: '2', name: 'Maquina de Vendas', description: 'Converta 10 leads em um mes', icon: '⚡', category: 'sales', threshold: 10, xpReward: 500, unlocked: true, progress: 100 },
  { id: '3', name: 'Top Closer', description: 'Converta 50 leads no total', icon: '👑', category: 'sales', threshold: 50, xpReward: 1000, unlocked: false, progress: 68 },
  { id: '4', name: 'Comunicador Expert', description: 'Envie 1000 mensagens', icon: '💬', category: 'communication', threshold: 1000, xpReward: 300, unlocked: true, progress: 100 },
  { id: '5', name: 'Raio', description: 'Responda em menos de 1 minuto, 50 vezes', icon: '⚡', category: 'speed', threshold: 50, xpReward: 500, unlocked: false, progress: 42 },
  { id: '6', name: 'Consistente', description: 'Mantenha streak de 30 dias', icon: '🔥', category: 'consistency', threshold: 30, xpReward: 750, unlocked: false, progress: 50 },
  { id: '7', name: 'Cem Mil', description: 'Alcance R$100K em receita', icon: '💰', category: 'sales', threshold: 100000, xpReward: 2000, unlocked: false, progress: 45 },
  { id: '8', name: 'Mestre das Tarefas', description: 'Complete 200 tarefas', icon: '✅', category: 'consistency', threshold: 200, xpReward: 600, unlocked: false, progress: 33 },
]

interface Goal {
  id: string
  type: string
  label: string
  target: number
  current: number
  unit: string
  period: string
  icon: React.ElementType
  color: string
}

const mockGoals: Goal[] = [
  { id: '1', type: 'leads', label: 'Leads Convertidos', target: 30, current: 18, unit: 'leads', period: 'Maio 2026', icon: Users, color: 'text-emerald-400' },
  { id: '2', type: 'revenue', label: 'Receita', target: 50000, current: 31500, unit: 'BRL', period: 'Maio 2026', icon: TrendingUp, color: 'text-indigo-400' },
  { id: '3', type: 'tasks', label: 'Tarefas Concluidas', target: 60, current: 42, unit: 'tarefas', period: 'Maio 2026', icon: CheckCircle2, color: 'text-amber-400' },
  { id: '4', type: 'response', label: 'Tempo de Resposta', target: 3, current: 4.2, unit: 'min', period: 'Maio 2026', icon: Clock, color: 'text-cyan-400' },
]

const rankIcons = [Crown, Medal, Award]
const rankColors = ['text-amber-400', 'text-slate-300', 'text-amber-600']

export default function ProductivityPage() {
  const [tab, setTab] = useState<TabType>('ranking')

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Produtividade</h1>
          <p className="text-slate-400 mt-1">Ranking, metas, conquistas e gamificacao</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl">
            <Flame className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-bold text-amber-400">Streak: 15 dias</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-xl">
            <Star className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-bold text-indigo-400">4.850 XP</span>
          </div>
        </div>
      </div>

      {/* Level Progress */}
      <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <span className="text-lg font-extrabold text-white">12</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Level 12 - Expert</p>
              <p className="text-xs text-slate-400">850 XP para o proximo nivel</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-300">4.850 / 5.700 XP</p>
          </div>
        </div>
        <div className="h-3 bg-slate-800/50 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '85%' }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        {[
          { key: 'ranking' as const, label: 'Ranking', icon: Trophy },
          { key: 'goals' as const, label: 'Metas', icon: Target },
          { key: 'achievements' as const, label: 'Conquistas', icon: Award },
          { key: 'gamification' as const, label: 'Gamificacao', icon: Zap },
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

      {/* Ranking Tab */}
      {tab === 'ranking' && (
        <div className="space-y-3">
          {mockRanking.map((member, i) => {
            const RankIcon = i < 3 ? rankIcons[i] : undefined

            return (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  'flex items-center gap-4 p-4 rounded-2xl border transition-colors',
                  i === 0
                    ? 'bg-gradient-to-r from-amber-500/10 to-yellow-500/5 border-amber-500/20'
                    : 'bg-slate-800/30 border-white/5 hover:bg-slate-800/50'
                )}
              >
                {/* Rank */}
                <div className="w-10 text-center shrink-0">
                  {RankIcon ? (
                    <RankIcon className={cn('w-6 h-6 mx-auto', rankColors[i])} />
                  ) : (
                    <span className="text-lg font-bold text-slate-500">#{member.rank}</span>
                  )}
                </div>

                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-white">
                    {member.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white">{member.name}</p>
                    <span className="text-[10px] text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded">Lvl {member.level}</span>
                  </div>
                  <p className="text-xs text-slate-500">{member.role}</p>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-6 shrink-0">
                  <div className="text-center">
                    <p className="text-sm font-bold text-emerald-400">{member.leadsConverted}</p>
                    <p className="text-[10px] text-slate-500">Conversoes</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-indigo-400">R${(member.revenue / 1000).toFixed(1)}K</p>
                    <p className="text-[10px] text-slate-500">Receita</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-amber-400">{member.tasksCompleted}</p>
                    <p className="text-[10px] text-slate-500">Tarefas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-cyan-400">{member.avgResponseTime}m</p>
                    <p className="text-[10px] text-slate-500">Resp.</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Flame className="w-4 h-4 text-orange-400" />
                    <span className="text-sm font-bold text-orange-400">{member.streak}</span>
                  </div>
                </div>

                {/* Change indicator */}
                <div className="w-8 text-center shrink-0">
                  {member.change > 0 && <ArrowUpRight className="w-4 h-4 text-emerald-400 mx-auto" />}
                  {member.change < 0 && <ArrowUpRight className="w-4 h-4 text-rose-400 mx-auto rotate-90" />}
                  {member.change === 0 && <span className="text-xs text-slate-600">-</span>}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Goals Tab */}
      {tab === 'goals' && (
        <div className="grid grid-cols-2 gap-4">
          {mockGoals.map((goal, i) => {
            const pct = goal.type === 'response'
              ? Math.max(0, Math.min(100, (goal.target / goal.current) * 100))
              : Math.min(100, (goal.current / goal.target) * 100)

            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-slate-800/30 backdrop-blur border border-white/5 rounded-2xl p-5 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <goal.icon className={cn('w-5 h-5', goal.color)} />
                    <h3 className="text-sm font-semibold text-white">{goal.label}</h3>
                  </div>
                  <span className="text-xs text-slate-500">{goal.period}</span>
                </div>

                <div>
                  <div className="flex items-end justify-between mb-2">
                    <p className="text-2xl font-bold text-white">
                      {goal.type === 'revenue' ? `R$${(goal.current / 1000).toFixed(1)}K` : goal.current}
                    </p>
                    <p className="text-sm text-slate-500">
                      / {goal.type === 'revenue' ? `R$${(goal.target / 1000).toFixed(0)}K` : `${goal.target} ${goal.unit}`}
                    </p>
                  </div>
                  <div className="h-2.5 bg-slate-800/50 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 1, ease: 'easeOut', delay: i * 0.1 }}
                      className={cn(
                        'h-full rounded-full',
                        pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                      )}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{Math.round(pct)}% concluido</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Achievements Tab */}
      {tab === 'achievements' && (
        <div className="grid grid-cols-2 gap-4">
          {mockAchievements.map((achievement, i) => (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                'relative overflow-hidden rounded-2xl p-5 border transition-colors',
                achievement.unlocked
                  ? 'bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20'
                  : 'bg-slate-800/30 border-white/5 opacity-70'
              )}
            >
              <div className="flex items-start gap-3">
                <div className="text-3xl">{achievement.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-white">{achievement.name}</h3>
                    {achievement.unlocked && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{achievement.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded font-medium">
                      +{achievement.xpReward} XP
                    </span>
                    {!achievement.unlocked && (
                      <span className="text-[10px] text-slate-500">{achievement.progress}%</span>
                    )}
                  </div>
                  {!achievement.unlocked && (
                    <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden mt-2">
                      <div
                        className="h-full bg-indigo-500/50 rounded-full"
                        style={{ width: `${achievement.progress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Gamification Tab */}
      {tab === 'gamification' && (
        <div className="grid grid-cols-3 gap-6">
          {/* Daily Challenges */}
          <div className="col-span-2 bg-slate-800/30 backdrop-blur border border-white/5 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              <h3 className="text-lg font-semibold text-white">Desafios Diarios</h3>
            </div>
            {[
              { title: 'Responder 10 leads em menos de 5 min', reward: 50, progress: 7, target: 10, icon: '⚡' },
              { title: 'Converter 3 leads', reward: 100, progress: 1, target: 3, icon: '🎯' },
              { title: 'Completar 5 tarefas', reward: 30, progress: 3, target: 5, icon: '✅' },
              { title: 'Enviar 1 campanha', reward: 40, progress: 0, target: 1, icon: '📢' },
              { title: 'Fazer 5 ligacoes', reward: 35, progress: 2, target: 5, icon: '📞' },
            ].map((challenge, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-slate-800/20">
                <span className="text-xl">{challenge.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{challenge.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all"
                        style={{ width: `${(challenge.progress / challenge.target) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400">{challenge.progress}/{challenge.target}</span>
                  </div>
                </div>
                <span className="text-xs text-amber-400 font-bold">+{challenge.reward} XP</span>
              </div>
            ))}
          </div>

          {/* Weekly Summary */}
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-semibold text-white">Resumo Semanal</h3>
              </div>
              {[
                { label: 'XP Ganho', value: '+1.250' },
                { label: 'Posicao', value: '#1 (+2)' },
                { label: 'Conquistas', value: '2 novas' },
                { label: 'Streak', value: '15 dias' },
                { label: 'Desafios', value: '18/25' },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">{item.label}</span>
                  <span className="text-xs font-bold text-white">{item.value}</span>
                </div>
              ))}
            </div>

            <div className="bg-slate-800/30 border border-white/5 rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-white">Proxima Recompensa</h3>
              <div className="text-center py-3">
                <div className="text-4xl mb-2">🏆</div>
                <p className="text-sm font-semibold text-white">Top Closer</p>
                <p className="text-xs text-slate-400 mt-1">Converta 50 leads</p>
                <p className="text-xs text-indigo-400 mt-2">68% concluido</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
