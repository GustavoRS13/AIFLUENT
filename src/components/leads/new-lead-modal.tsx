'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  UserPlus, Loader2, User, Phone, Mail, MessageCircle, MapPin,
  Briefcase, GraduationCap, Tag, Sparkles, X, Plus,
  Flame, Thermometer, Snowflake, ChevronRight, ChevronLeft,
  Camera, Globe, Search, Users, Calendar, MessagesSquare, Target,
  CheckCircle2, Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LeadSource, LeadTemperature } from '@/types'

const steps = [
  { id: 'personal', label: 'Dados Pessoais', icon: User },
  { id: 'contact', label: 'Contato', icon: Phone },
  { id: 'qualification', label: 'Qualificacao', icon: GraduationCap },
  { id: 'tags', label: 'Tags & Notas', icon: Tag },
]

const sourceOptions: { value: LeadSource; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'instagram', label: 'Instagram', icon: Camera, color: 'text-pink-400 bg-pink-500/10 border-pink-500/20' },
  { value: 'facebook', label: 'Facebook', icon: MessagesSquare, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  { value: 'google', label: 'Google', icon: Search, color: 'text-green-400 bg-green-500/10 border-green-500/20' },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  { value: 'website', label: 'Site', icon: Globe, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
  { value: 'referral', label: 'Indicacao', icon: Users, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  { value: 'event', label: 'Evento', icon: Calendar, color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
  { value: 'meta_ads', label: 'Meta Ads', icon: Target, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
  { value: 'manual', label: 'Manual', icon: UserPlus, color: 'text-gray-500 bg-gray-100 border-gray-300' },
]

const temperatureConfig = {
  cold: { label: 'Frio', icon: Snowflake, color: 'text-blue-400 bg-blue-500/10 border-blue-500/30', desc: 'Primeiro contato' },
  warm: { label: 'Morno', icon: Thermometer, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30', desc: 'Demonstrou interesse' },
  hot: { label: 'Quente', icon: Flame, color: 'text-rose-400 bg-rose-500/10 border-rose-500/30', desc: 'Pronto para fechar' },
}

const courseOptions = [
  'Ingles - Business', 'Ingles - Conversacao', 'Ingles - Preparatorio', 'Ingles - Kids',
  'Espanhol - Business', 'Espanhol - Conversacao', 'Espanhol - Preparatorio',
]

const levelOptions = ['Iniciante', 'Basico', 'Intermediario', 'Avancado', 'Fluente']

const suggestedTags = [
  'VIP', 'Corporativo', 'Estudante', 'Reativacao', 'Premium', 'Indicacao',
  'Black Friday', 'Matricula', 'Trial', 'Follow-up', 'Urgente', 'B2B',
]

interface FormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  whatsapp: string
  company: string
  jobTitle: string
  source: LeadSource
  temperature: LeadTemperature
  courseInterest: string
  languageLevel: string
  city: string
  state: string
  notes: string
  tags: string[]
}

const defaultForm: FormData = {
  firstName: '', lastName: '', email: '', phone: '', whatsapp: '',
  company: '', jobTitle: '', source: 'manual', temperature: 'warm',
  courseInterest: '', languageLevel: '', city: '', state: '', notes: '', tags: [],
}

interface NewLeadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: () => void
}

export function NewLeadModal({ open, onOpenChange, onCreated }: NewLeadModalProps) {
  const [form, setForm] = React.useState<FormData>({ ...defaultForm })
  const [step, setStep] = React.useState(0)
  const [loading, setLoading] = React.useState(false)
  const [success, setSuccess] = React.useState(false)
  const [tagInput, setTagInput] = React.useState('')
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [apiError, setApiError] = React.useState('')

  const resetForm = () => {
    setForm({ ...defaultForm })
    setStep(0)
    setLoading(false)
    setSuccess(false)
    setTagInput('')
    setErrors({})
    setApiError('')
  }

  const handleOpenChange = (v: boolean) => {
    if (!v) resetForm()
    onOpenChange(v)
  }

  const update = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (key in errors) setErrors((prev) => { const n = { ...prev }; delete n[key]; return n })
  }

  const addTag = (tag: string) => {
    const t = tag.trim()
    if (t && !form.tags.includes(t)) update('tags', [...form.tags, t])
    setTagInput('')
  }

  const removeTag = (tag: string) => update('tags', form.tags.filter((t) => t !== tag))

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!form.firstName.trim()) e.firstName = 'Nome obrigatorio'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email invalido'
    setErrors(e)
    if (Object.keys(e).length > 0) setStep(0)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)
    setApiError('')
    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.replace(/\D/g, '') || undefined,
      whatsapp: form.whatsapp.replace(/\D/g, '') || undefined,
      company: form.company.trim() || undefined,
      jobTitle: form.jobTitle.trim() || undefined,
      source: form.source,
      temperature: form.temperature,
      courseInterest: form.courseInterest || undefined,
      languageLevel: form.languageLevel || undefined,
      city: form.city.trim() || undefined,
      state: form.state.trim() || undefined,
      notes: form.notes.trim() || undefined,
      tags: form.tags,
    }
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        setSuccess(true)
        setTimeout(() => { onCreated?.(); handleOpenChange(false) }, 1200)
      } else {
        const data = await res.json().catch(() => ({}))
        setApiError(data.error || `Erro ${res.status}: falha ao criar lead`)
      }
    } catch {
      setApiError('Erro de conexao. Verifique sua rede.')
    } finally {
      setLoading(false)
    }
  }

  const aiScore = React.useMemo(() => {
    let s = 20
    if (form.firstName) s += 5
    if (form.email) s += 15
    if (form.phone) s += 10
    if (form.whatsapp) s += 10
    if (form.courseInterest) s += 15
    if (form.temperature === 'hot') s += 15
    else if (form.temperature === 'warm') s += 8
    if (form.tags.length > 0) s += 5
    if (form.company) s += 5
    return Math.min(s, 100)
  }, [form])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={() => handleOpenChange(false)} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-black/50"
      >
        {/* Success overlay */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4"
              >
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </motion.div>
              <p className="text-xl font-bold text-gray-900">Lead Criado!</p>
              <p className="text-sm text-gray-500 mt-1">{form.firstName} foi adicionado com sucesso</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-gray-900" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Novo Lead</h2>
              <p className="text-xs text-gray-400">Preencha os dados para cadastrar</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* AI Score */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-indigo-500/10 to-blue-500/10 border border-indigo-500/20 rounded-lg">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-bold text-gray-900">{aiScore}</span>
              <span className="text-[10px] text-gray-500">Score IA</span>
            </div>
            <button onClick={() => handleOpenChange(false)} className="p-2 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-1 px-6 py-3 border-b border-gray-200 bg-white">
          {steps.map((s, i) => (
            <React.Fragment key={s.id}>
              <button
                onClick={() => setStep(i)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  step === i
                    ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                    : step > i
                      ? 'text-emerald-400 bg-emerald-500/10'
                      : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
                )}
              >
                <s.icon className="w-3.5 h-3.5" />
                {s.label}
              </button>
              {i < steps.length - 1 && <ChevronRight className="w-3 h-3 text-gray-600" />}
            </React.Fragment>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          <AnimatePresence mode="wait">
            {/* Step 1: Personal */}
            {step === 0 && (
              <motion.div key="personal" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-500 mb-1.5">Nome *</label>
                    <input
                      value={form.firstName} onChange={(e) => update('firstName', e.target.value)}
                      placeholder="Nome do lead"
                      className={cn('w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500/50 focus:outline-none transition-colors', errors.firstName ? 'border-rose-500/50' : 'border-gray-200')}
                    />
                    {errors.firstName && <p className="text-[10px] text-rose-400 mt-1">{errors.firstName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1.5">Sobrenome</label>
                    <input
                      value={form.lastName} onChange={(e) => update('lastName', e.target.value)}
                      placeholder="Sobrenome"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500/50 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-500 mb-1.5">Empresa</label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input value={form.company} onChange={(e) => update('company', e.target.value)} placeholder="Nome da empresa" className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500/50 focus:outline-none transition-colors" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1.5">Cargo</label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input value={form.jobTitle} onChange={(e) => update('jobTitle', e.target.value)} placeholder="Cargo / Funcao" className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500/50 focus:outline-none transition-colors" />
                    </div>
                  </div>
                </div>

                {/* Source Selector */}
                <div>
                  <label className="block text-sm text-gray-500 mb-2">Origem do Lead</label>
                  <div className="grid grid-cols-3 gap-2">
                    {sourceOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => update('source', opt.value)}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all',
                          form.source === opt.value ? opt.color : 'text-gray-400 bg-white border-gray-200 hover:bg-gray-50'
                        )}
                      >
                        <opt.icon className="w-3.5 h-3.5" />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Contact */}
            {step === 1 && (
              <motion.div key="contact" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                <div>
                  <label className="block text-sm text-gray-500 mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input value={form.email} onChange={(e) => update('email', e.target.value)} type="email" placeholder="email@exemplo.com" className={cn('w-full pl-10 pr-4 py-2.5 bg-gray-50 border rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500/50 focus:outline-none transition-colors', errors.email ? 'border-rose-500/50' : 'border-gray-200')} />
                  </div>
                  {errors.email && <p className="text-[10px] text-rose-400 mt-1">{errors.email}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-500 mb-1.5">Telefone</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="(11) 99999-9999" className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500/50 focus:outline-none transition-colors" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1.5">WhatsApp</label>
                    <div className="relative">
                      <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input value={form.whatsapp} onChange={(e) => update('whatsapp', e.target.value)} placeholder="(11) 99999-9999" className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500/50 focus:outline-none transition-colors" />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-500 mb-1.5">Cidade</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input value={form.city} onChange={(e) => update('city', e.target.value)} placeholder="Sao Paulo" className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500/50 focus:outline-none transition-colors" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1.5">Estado</label>
                    <input value={form.state} onChange={(e) => update('state', e.target.value)} placeholder="SP" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500/50 focus:outline-none transition-colors" />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Qualification */}
            {step === 2 && (
              <motion.div key="qualification" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                {/* Temperature */}
                <div>
                  <label className="block text-sm text-gray-500 mb-2">Temperatura do Lead</label>
                  <div className="grid grid-cols-3 gap-3">
                    {(Object.entries(temperatureConfig) as [LeadTemperature, typeof temperatureConfig.cold][]).map(([key, cfg]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => update('temperature', key)}
                        className={cn(
                          'flex flex-col items-center gap-2 p-4 rounded-xl border transition-all',
                          form.temperature === key ? cfg.color : 'text-gray-400 bg-white border-gray-200 hover:bg-gray-50'
                        )}
                      >
                        <cfg.icon className="w-6 h-6" />
                        <span className="text-sm font-semibold">{cfg.label}</span>
                        <span className="text-[10px] opacity-70">{cfg.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Course */}
                <div>
                  <label className="block text-sm text-gray-500 mb-2">Curso de Interesse</label>
                  <div className="flex flex-wrap gap-2">
                    {courseOptions.map((course) => (
                      <button
                        key={course}
                        type="button"
                        onClick={() => update('courseInterest', course)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                          form.courseInterest === course
                            ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30'
                            : 'text-gray-500 bg-white border-gray-200 hover:bg-gray-50'
                        )}
                      >
                        {course}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Language Level */}
                <div>
                  <label className="block text-sm text-gray-500 mb-2">Nivel do Idioma</label>
                  <div className="flex gap-2">
                    {levelOptions.map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => update('languageLevel', level)}
                        className={cn(
                          'flex-1 py-2 rounded-xl text-xs font-medium border transition-all text-center',
                          form.languageLevel === level
                            ? 'bg-purple-600/20 text-purple-400 border-purple-500/30'
                            : 'text-gray-400 bg-white border-gray-200 hover:bg-gray-50'
                        )}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                {/* AI Prediction */}
                <div className="bg-gradient-to-br from-indigo-500/10 to-blue-500/10 border border-indigo-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-semibold text-gray-900">Previsao IA</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div animate={{ width: `${aiScore}%` }} className={cn('h-full rounded-full', aiScore >= 70 ? 'bg-emerald-500' : aiScore >= 40 ? 'bg-amber-500' : 'bg-gray-400')} />
                      </div>
                    </div>
                    <span className={cn('text-sm font-bold', aiScore >= 70 ? 'text-emerald-400' : aiScore >= 40 ? 'text-amber-400' : 'text-gray-500')}>
                      {aiScore}%
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">
                    {aiScore >= 70 ? 'Alta probabilidade de conversao' : aiScore >= 40 ? 'Probabilidade moderada - investir em follow-up' : 'Preencha mais dados para melhorar a previsao'}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Step 4: Tags & Notes */}
            {step === 3 && (
              <motion.div key="tags" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                {/* Tags */}
                <div>
                  <label className="block text-sm text-gray-500 mb-2">Tags</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {form.tags.map((tag) => (
                      <span key={tag} className="flex items-center gap-1 px-2.5 py-1 bg-indigo-500/20 text-indigo-400 text-xs font-medium rounded-lg border border-indigo-500/30">
                        {tag}
                        <button onClick={() => removeTag(tag)} className="hover:text-gray-900 transition-colors"><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2 mb-3">
                    <input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput) } }}
                      placeholder="Digite uma tag e pressione Enter"
                      className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500/50 focus:outline-none transition-colors"
                    />
                    <button onClick={() => addTag(tagInput)} className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm transition-colors">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 mb-2">Sugestoes:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {suggestedTags.filter((t) => !form.tags.includes(t)).map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => addTag(tag)}
                          className="px-2 py-1 text-[10px] text-gray-400 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-700 transition-colors"
                        >
                          + {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm text-gray-500 mb-1.5">Notas</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => update('notes', e.target.value)}
                    placeholder="Observacoes, contexto, informacoes relevantes..."
                    rows={4}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500/50 focus:outline-none resize-none transition-colors"
                  />
                </div>

                {/* Summary */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Resumo</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Nome', value: `${form.firstName} ${form.lastName}`.trim() || '-' },
                      { label: 'Email', value: form.email || '-' },
                      { label: 'Telefone', value: form.phone || '-' },
                      { label: 'Origem', value: sourceOptions.find((s) => s.value === form.source)?.label || '-' },
                      { label: 'Temperatura', value: temperatureConfig[form.temperature].label },
                      { label: 'Curso', value: form.courseInterest || '-' },
                      { label: 'Tags', value: form.tags.length > 0 ? form.tags.join(', ') : '-' },
                      { label: 'Score IA', value: `${aiScore}%` },
                    ].map((item) => (
                      <div key={item.label} className="flex justify-between">
                        <span className="text-[10px] text-gray-400">{item.label}</span>
                        <span className="text-[10px] text-gray-700 font-medium text-right truncate ml-2">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Error Message */}
        {apiError && (
          <div className="mx-6 mb-2 px-4 py-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2">
            <X className="w-4 h-4 text-rose-400 shrink-0" />
            <p className="text-xs text-rose-400">{apiError}</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center gap-1">
            {steps.map((_, i) => (
              <div key={i} className={cn('h-1.5 rounded-full transition-all', step === i ? 'w-6 bg-indigo-500' : step > i ? 'w-3 bg-emerald-500' : 'w-3 bg-gray-200')} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button onClick={() => setStep(step - 1)} className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
                <ChevronLeft className="w-4 h-4" /> Voltar
              </button>
            )}
            {step < steps.length - 1 ? (
              <button onClick={() => setStep(step + 1)} className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors">
                Proximo <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={loading} className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-sm font-medium rounded-xl transition-all disabled:opacity-50">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {loading ? 'Criando...' : 'Criar Lead'}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
