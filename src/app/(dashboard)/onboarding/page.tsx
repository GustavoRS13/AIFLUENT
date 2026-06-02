'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bot, ArrowRight, ArrowLeft, Check, Upload, Plus, Trash2,
  GripVertical, Loader2, Sparkles, Users, BarChart3, Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/* ── Typing effect hook ──────────────────────────────────────────────────── */

function useTypingEffect(text: string, speed = 30, trigger = true) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!trigger) { setDisplayed(''); setDone(false); return }
    setDisplayed('')
    setDone(false)
    let i = 0
    const interval = setInterval(() => {
      i++
      setDisplayed(text.slice(0, i))
      if (i >= text.length) { clearInterval(interval); setDone(true) }
    }, speed)
    return () => clearInterval(interval)
  }, [text, speed, trigger])

  return { displayed, done }
}

/* ── Constants ───────────────────────────────────────────────────────────── */

const SEGMENTS = [
  { id: 'educacao', label: 'Educacao / Idiomas' },
  { id: 'b2b', label: 'B2B' },
  { id: 'b2c', label: 'B2C' },
  { id: 'outro', label: 'Outro' },
]

const DEFAULT_STAGES = [
  'Base',
  'Prospeccao',
  'Conexao',
  'Proposta',
  'Negociacao',
  'Fechamento',
]

const STAGE_COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#06b6d4',
  '#f59e0b',
  '#f97316',
  '#10b981',
]

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
}

/* ── Main component ──────────────────────────────────────────────────────── */

export default function OnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  // Step 1 state
  const [companyName, setCompanyName] = useState('')
  const [segment, setSegment] = useState('')

  // Step 2 state
  const [useCustom, setUseCustom] = useState(false)
  const [stages, setStages] = useState<string[]>([...DEFAULT_STAGES])
  const dragItem = useRef<number | null>(null)
  const dragOver = useRef<number | null>(null)

  // Step 3 state
  const [leadMode, setLeadMode] = useState<'demo' | 'manual' | 'import' | null>(null)
  const [manualLeads, setManualLeads] = useState([{ firstName: '', phone: '', source: 'manual' }])

  // Step 4 state (result)
  const [result, setResult] = useState<{ stages: number; leadsCreated: number } | null>(null)

  // Check if onboarding is needed
  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then((data) => {
        if (data.totalLeads > 0) {
          router.replace('/dashboard')
        } else {
          setLoading(false)
        }
      })
      .catch(() => setLoading(false))
  }, [router])

  const goNext = useCallback(() => { setDirection(1); setStep((s) => Math.min(s + 1, 3)) }, [])
  const goBack = useCallback(() => { setDirection(-1); setStep((s) => Math.max(s - 1, 0)) }, [])

  // Drag reorder handlers for custom stages
  const handleDragStart = (idx: number) => { dragItem.current = idx }
  const handleDragEnter = (idx: number) => { dragOver.current = idx }
  const handleDragEnd = () => {
    if (dragItem.current === null || dragOver.current === null) return
    const copy = [...stages]
    const dragged = copy.splice(dragItem.current, 1)[0]
    copy.splice(dragOver.current, 0, dragged)
    setStages(copy)
    dragItem.current = null
    dragOver.current = null
  }

  // Submit onboarding
  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        companyName,
        segment,
        createDemoData: leadMode === 'demo',
        customStages: useCustom ? stages : undefined,
      }

      if (leadMode === 'manual') {
        payload.manualLeads = manualLeads.filter((l) => l.firstName.trim())
      }

      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))

      if (data.success) {
        setResult({ stages: data.stages || 6, leadsCreated: data.leadsCreated || 0 })
      } else {
        setResult({ stages: useCustom ? stages.length : 6, leadsCreated: leadMode === 'demo' ? 10 : manualLeads.filter(l => l.firstName.trim()).length })
      }
      goNext()
    } catch {
      setResult({ stages: 6, leadsCreated: 0 })
      goNext()
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    )
  }

  return (
    <div className="relative flex min-h-[80vh] items-center justify-center overflow-hidden px-4">
      {/* Animated gradient orbs */}
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl"
          animate={{ x: [0, 30, -20, 0], y: [0, -20, 30, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-purple-600/15 blur-3xl"
          animate={{ x: [0, -30, 20, 0], y: [0, 20, -30, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-sky-500/10 blur-3xl"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        {/* Progress dots */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                i === step ? 'w-8 bg-indigo-500' : i < step ? 'w-2 bg-indigo-400' : 'w-2 bg-gray-300',
              )}
            />
          ))}
        </div>

        {/* Card */}
        <div className="glass-card rounded-2xl p-8 min-h-[420px] flex flex-col">
          <AnimatePresence mode="wait" custom={direction}>
            {step === 0 && <Step1Welcome key="s0" direction={direction} companyName={companyName} setCompanyName={setCompanyName} segment={segment} setSegment={setSegment} onNext={goNext} />}
            {step === 1 && <Step2Pipeline key="s1" direction={direction} segment={segment} stages={stages} setStages={setStages} useCustom={useCustom} setUseCustom={setUseCustom} onNext={goNext} onBack={goBack} onDragStart={handleDragStart} onDragEnter={handleDragEnter} onDragEnd={handleDragEnd} />}
            {step === 2 && <Step3Leads key="s2" direction={direction} leadMode={leadMode} setLeadMode={setLeadMode} manualLeads={manualLeads} setManualLeads={setManualLeads} onSubmit={handleSubmit} onBack={goBack} submitting={submitting} />}
            {step === 3 && <Step4Done key="s3" direction={direction} result={result} />}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

/* ── Step 1: Welcome ─────────────────────────────────────────────────────── */

function Step1Welcome({
  direction, companyName, setCompanyName, segment, setSegment, onNext,
}: {
  direction: number
  companyName: string
  setCompanyName: (v: string) => void
  segment: string
  setSegment: (v: string) => void
  onNext: () => void
}) {
  const msg = 'Ola! Sou o copiloto comercial da AIFLUENT. Vou configurar tudo para voce em 2 minutos.'
  const { displayed, done } = useTypingEffect(msg, 25)

  return (
    <motion.div
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.3 }}
      className="flex flex-1 flex-col"
    >
      {/* AI avatar + message */}
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/20 shrink-0">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-900 leading-relaxed min-h-[40px]">
            {displayed}
            {!done && <span className="inline-block w-0.5 h-4 bg-indigo-500 animate-pulse ml-0.5 align-text-bottom" />}
          </p>
        </div>
      </div>

      {/* Company name */}
      <div className="space-y-1.5 mb-4">
        <label className="text-xs font-medium text-gray-500">Qual o nome da sua empresa?</label>
        <input
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Ex: Escola de Idiomas ABC"
          className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 text-sm text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>

      {/* Segment */}
      <div className="space-y-1.5 mb-6">
        <label className="text-xs font-medium text-gray-500">Em qual segmento voce atua?</label>
        <div className="grid grid-cols-2 gap-2">
          {SEGMENTS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSegment(s.id)}
              className={cn(
                'rounded-lg border px-3 py-2 text-sm transition-all',
                segment === s.id
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500/20'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Next */}
      <div className="mt-auto flex justify-end">
        <button
          type="button"
          disabled={!companyName.trim() || !segment}
          onClick={onNext}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Proximo <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  )
}

/* ── Step 2: Pipeline ────────────────────────────────────────────────────── */

function Step2Pipeline({
  direction, segment, stages, setStages, useCustom, setUseCustom,
  onNext, onBack, onDragStart, onDragEnter, onDragEnd,
}: {
  direction: number
  segment: string
  stages: string[]
  setStages: (v: string[]) => void
  useCustom: boolean
  setUseCustom: (v: boolean) => void
  onNext: () => void
  onBack: () => void
  onDragStart: (i: number) => void
  onDragEnter: (i: number) => void
  onDragEnd: () => void
}) {
  const segmentLabel = SEGMENTS.find((s) => s.id === segment)?.label || segment
  const msg = `Baseado no segmento "${segmentLabel}", sugiro este pipeline:`
  const { displayed, done } = useTypingEffect(msg, 25)

  const addStage = () => setStages([...stages, ''])
  const removeStage = (idx: number) => setStages(stages.filter((_, i) => i !== idx))
  const updateStage = (idx: number, val: string) => {
    const copy = [...stages]
    copy[idx] = val
    setStages(copy)
  }

  return (
    <motion.div
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.3 }}
      className="flex flex-1 flex-col"
    >
      {/* AI message */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/20 shrink-0">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <p className="text-sm text-gray-900 leading-relaxed min-h-[20px]">
          {displayed}
          {!done && <span className="inline-block w-0.5 h-4 bg-indigo-500 animate-pulse ml-0.5 align-text-bottom" />}
        </p>
      </div>

      {/* Pipeline stages preview */}
      {!useCustom && (
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          {stages.map((s, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-white"
                style={{ backgroundColor: STAGE_COLORS[i % STAGE_COLORS.length] }}
              >
                {s}
              </span>
              {i < stages.length - 1 && <ArrowRight className="w-3 h-3 text-gray-400" />}
            </div>
          ))}
        </div>
      )}

      {/* Use suggestion vs customize */}
      {!useCustom ? (
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 shrink-0" /> {/* spacer for alignment */}
          <p className="text-sm text-gray-500">Quer customizar ou usar minha sugestao?</p>
        </div>
      ) : null}

      {!useCustom ? (
        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={onNext}
            className="flex-1 rounded-lg border border-indigo-500 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 transition-all hover:bg-indigo-100"
          >
            Usar sugestao
          </button>
          <button
            type="button"
            onClick={() => setUseCustom(true)}
            className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-all hover:border-gray-300"
          >
            Customizar
          </button>
        </div>
      ) : (
        /* Editable stages list */
        <div className="mb-4 space-y-2 max-h-48 overflow-y-auto pr-1">
          {stages.map((s, i) => (
            <div
              key={i}
              draggable
              onDragStart={() => onDragStart(i)}
              onDragEnter={() => onDragEnter(i)}
              onDragEnd={onDragEnd}
              onDragOver={(e) => e.preventDefault()}
              className="flex items-center gap-2 group"
            >
              <GripVertical className="w-4 h-4 text-gray-300 cursor-grab shrink-0" />
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: STAGE_COLORS[i % STAGE_COLORS.length] }}
              />
              <input
                type="text"
                value={s}
                onChange={(e) => updateStage(i, e.target.value)}
                className="flex-1 h-8 rounded-md border border-gray-200 bg-gray-50 px-3 text-sm text-gray-800 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20"
              />
              {stages.length > 2 && (
                <button type="button" onClick={() => removeStage(i)} className="text-gray-300 hover:text-red-400 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addStage}
            className="flex items-center gap-1.5 text-xs text-indigo-500 hover:text-indigo-600 transition-colors mt-1"
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar estagio
          </button>
        </div>
      )}

      {/* Navigation */}
      <div className="mt-auto flex items-center justify-between">
        <button type="button" onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        {useCustom && (
          <button
            type="button"
            disabled={stages.some((s) => !s.trim()) || stages.length < 2}
            onClick={onNext}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Proximo <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </motion.div>
  )
}

/* ── Step 3: First Leads ─────────────────────────────────────────────────── */

function Step3Leads({
  direction, leadMode, setLeadMode, manualLeads, setManualLeads,
  onSubmit, onBack, submitting,
}: {
  direction: number
  leadMode: 'demo' | 'manual' | 'import' | null
  setLeadMode: (v: 'demo' | 'manual' | 'import' | null) => void
  manualLeads: { firstName: string; phone: string; source: string }[]
  setManualLeads: (v: { firstName: string; phone: string; source: string }[]) => void
  onSubmit: () => void
  onBack: () => void
  submitting: boolean
}) {
  const msg = 'Hora de trazer seus leads! Escolha como comecar:'
  const { displayed, done } = useTypingEffect(msg, 25)

  const addManualLead = () => setManualLeads([...manualLeads, { firstName: '', phone: '', source: 'manual' }])
  const updateManualLead = (idx: number, field: string, val: string) => {
    const copy = [...manualLeads]
    copy[idx] = { ...copy[idx], [field]: val }
    setManualLeads(copy)
  }
  const removeManualLead = (idx: number) => setManualLeads(manualLeads.filter((_, i) => i !== idx))

  const canSubmit = () => {
    if (leadMode === 'demo') return true
    if (leadMode === 'manual') return manualLeads.some((l) => l.firstName.trim())
    if (leadMode === 'import') return false // import not yet implemented
    return false
  }

  return (
    <motion.div
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.3 }}
      className="flex flex-1 flex-col"
    >
      {/* AI message */}
      <div className="flex items-start gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/20 shrink-0">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <p className="text-sm text-gray-900 leading-relaxed min-h-[20px]">
          {displayed}
          {!done && <span className="inline-block w-0.5 h-4 bg-indigo-500 animate-pulse ml-0.5 align-text-bottom" />}
        </p>
      </div>

      {/* Mode selector */}
      {!leadMode && (
        <div className="grid grid-cols-1 gap-3 mb-6">
          <button
            type="button"
            onClick={() => setLeadMode('demo')}
            className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left transition-all hover:border-indigo-300 hover:bg-indigo-50/30"
          >
            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Bot className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Dados de demonstracao</p>
              <p className="text-xs text-gray-500">10 leads realistas para testar o sistema</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setLeadMode('manual')}
            className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left transition-all hover:border-indigo-300 hover:bg-indigo-50/30"
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Plus className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Criar manualmente</p>
              <p className="text-xs text-gray-500">Adicione seus primeiros leads agora</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setLeadMode('import')}
            className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left transition-all hover:border-indigo-300 hover:bg-indigo-50/30"
          >
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Upload className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Importar CSV / Excel</p>
              <p className="text-xs text-gray-500">Traga seus dados de outra plataforma</p>
            </div>
          </button>
        </div>
      )}

      {/* Demo mode selected */}
      {leadMode === 'demo' && (
        <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Bot className="w-4 h-4 text-indigo-500" />
            <p className="text-sm font-medium text-indigo-700">Dados de demonstracao</p>
          </div>
          <p className="text-xs text-indigo-600/80">
            Vou criar 10 leads de demonstracao com nomes, telefones e origens variadas para voce testar o sistema completo.
          </p>
        </div>
      )}

      {/* Manual mode */}
      {leadMode === 'manual' && (
        <div className="mb-4 space-y-3 max-h-52 overflow-y-auto pr-1">
          {manualLeads.map((lead, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={lead.firstName}
                onChange={(e) => updateManualLead(i, 'firstName', e.target.value)}
                placeholder="Nome"
                className="flex-1 h-8 rounded-md border border-gray-200 bg-gray-50 px-3 text-sm text-gray-800 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20"
              />
              <input
                type="text"
                value={lead.phone}
                onChange={(e) => updateManualLead(i, 'phone', e.target.value)}
                placeholder="Telefone"
                className="w-32 h-8 rounded-md border border-gray-200 bg-gray-50 px-3 text-sm text-gray-800 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20"
              />
              {manualLeads.length > 1 && (
                <button type="button" onClick={() => removeManualLead(i)} className="text-gray-300 hover:text-red-400 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addManualLead}
            className="flex items-center gap-1.5 text-xs text-indigo-500 hover:text-indigo-600 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar outro
          </button>
        </div>
      )}

      {/* Import mode */}
      {leadMode === 'import' && (
        <div className="mb-6 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center">
          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600 font-medium">Arraste seu arquivo ou clique para selecionar</p>
          <p className="text-xs text-gray-400 mt-1">CSV ou Excel (.xlsx) ate 10MB</p>
          <p className="text-xs text-amber-600 mt-3">Importacao completa disponivel em breve. Use dados de demonstracao por enquanto.</p>
          <button
            type="button"
            onClick={() => setLeadMode('demo')}
            className="mt-3 text-xs text-indigo-500 hover:text-indigo-600 font-medium"
          >
            Usar dados de demonstracao
          </button>
        </div>
      )}

      {/* Navigation */}
      <div className="mt-auto flex items-center justify-between">
        <button
          type="button"
          onClick={() => { if (leadMode) { setLeadMode(null) } else { onBack() } }}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        {leadMode && (
          <button
            type="button"
            disabled={!canSubmit() || submitting}
            onClick={onSubmit}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Configurando...
              </>
            ) : (
              <>
                Finalizar <Check className="w-4 h-4" />
              </>
            )}
          </button>
        )}
      </div>
    </motion.div>
  )
}

/* ── Step 4: Done ────────────────────────────────────────────────────────── */

function Step4Done({
  direction, result,
}: {
  direction: number
  result: { stages: number; leadsCreated: number } | null
}) {
  const router = useRouter()
  const msg = 'Tudo pronto! Seu workspace esta configurado.'
  const { displayed, done } = useTypingEffect(msg, 25)

  return (
    <motion.div
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.3 }}
      className="flex flex-1 flex-col"
    >
      {/* AI message */}
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/20 shrink-0">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <p className="text-sm text-gray-900 leading-relaxed min-h-[20px]">
          {displayed}
          {!done && <span className="inline-block w-0.5 h-4 bg-indigo-500 animate-pulse ml-0.5 align-text-bottom" />}
        </p>
      </div>

      {/* Success summary */}
      <AnimatePresence>
        {done && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-3 mb-8"
          >
            <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
              <BarChart3 className="w-5 h-5 text-indigo-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">Pipeline</p>
                <p className="text-xs text-gray-500">{result?.stages || 6} estagios configurados</p>
              </div>
              <Check className="w-4 h-4 text-emerald-500 ml-auto" />
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
              <Users className="w-5 h-5 text-indigo-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">Leads</p>
                <p className="text-xs text-gray-500">{result?.leadsCreated || 0} cadastrados</p>
              </div>
              <Check className="w-4 h-4 text-emerald-500 ml-auto" />
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
              <Zap className="w-5 h-5 text-indigo-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">Copiloto IA</p>
                <p className="text-xs text-gray-500">Ativo e pronto para ajudar</p>
              </div>
              <Check className="w-4 h-4 text-emerald-500 ml-auto" />
            </div>

            <div className="flex items-start gap-3 pt-2">
              <div className="w-10 h-10 shrink-0" />
              <p className="text-xs text-gray-500">
                Vou te levar para o Dashboard &mdash; la voce pode ver seus leads e eu vou te ajudar.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CTA */}
      {done && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-auto flex justify-center"
        >
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-500 hover:to-indigo-400"
          >
            <Sparkles className="w-4 h-4" /> Comecar a usar
          </button>
        </motion.div>
      )}
    </motion.div>
  )
}
