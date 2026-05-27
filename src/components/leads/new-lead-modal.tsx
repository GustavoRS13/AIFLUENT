'use client'

import * as React from 'react'
import {
  UserPlus,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { LeadSource, LeadTemperature } from '@/types'

// ── Source / temperature options ─────────────────────────────────────────────

const sourceOptions: { value: LeadSource; label: string }[] = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'google', label: 'Google' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'website', label: 'Site' },
  { value: 'referral', label: 'Indicacao' },
  { value: 'event', label: 'Evento' },
  { value: 'manual', label: 'Manual' },
]

const temperatureOptions: { value: LeadTemperature; label: string }[] = [
  { value: 'cold', label: 'Frio' },
  { value: 'warm', label: 'Morno' },
  { value: 'hot', label: 'Quente' },
]

// ── Form state ──────────────────────────────────────────────────────────────

interface FormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  whatsapp: string
  source: LeadSource
  temperature: LeadTemperature
  courseInterest: string
  notes: string
}

interface FormErrors {
  firstName?: string
  email?: string
  phone?: string
}

const defaultForm: FormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  whatsapp: '',
  source: 'manual',
  temperature: 'warm',
  courseInterest: '',
  notes: '',
}

// ── Component ───────────────────────────────────────────────────────────────

interface NewLeadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: () => void
}

export function NewLeadModal({ open, onOpenChange, onCreated }: NewLeadModalProps) {
  const [form, setForm] = React.useState<FormData>({ ...defaultForm })
  const [errors, setErrors] = React.useState<FormErrors>({})
  const [loading, setLoading] = React.useState(false)

  const resetForm = () => {
    setForm({ ...defaultForm })
    setErrors({})
    setLoading(false)
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) resetForm()
    onOpenChange(open)
  }

  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    // Clear error on edit
    if (key in errors) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[key as keyof FormErrors]
        return next
      })
    }
  }

  // ── Validation ────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const newErrors: FormErrors = {}
    if (!form.firstName.trim()) {
      newErrors.firstName = 'Nome e obrigatorio'
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Email invalido'
    }
    if (form.phone && form.phone.replace(/\D/g, '').length < 10) {
      newErrors.phone = 'Telefone deve ter pelo menos 10 digitos'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim() || undefined,
          phone: form.phone.replace(/\D/g, '') || undefined,
          whatsapp: form.whatsapp.replace(/\D/g, '') || undefined,
          source: form.source,
          temperature: form.temperature,
          courseInterest: form.courseInterest.trim() || undefined,
          notes: form.notes.trim() || undefined,
        }),
      })

      if (res.ok) {
        onCreated?.()
        handleOpenChange(false)
      }
    } catch {
      // Could show error toast
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            <UserPlus className="mr-2 inline h-5 w-5 text-indigo-400" />
            Novo Lead
          </DialogTitle>
          <DialogDescription>
            Preencha os dados do novo lead.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Nome *"
              placeholder="Nome"
              value={form.firstName}
              onChange={(e) => updateField('firstName', e.target.value)}
              error={errors.firstName}
            />
            <Input
              label="Sobrenome"
              placeholder="Sobrenome"
              value={form.lastName}
              onChange={(e) => updateField('lastName', e.target.value)}
            />
          </div>

          {/* Email */}
          <Input
            label="Email"
            type="email"
            placeholder="email@exemplo.com"
            value={form.email}
            onChange={(e) => updateField('email', e.target.value)}
            error={errors.email}
          />

          {/* Phone row */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Telefone"
              placeholder="(11) 99999-9999"
              value={form.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              error={errors.phone}
            />
            <Input
              label="WhatsApp"
              placeholder="(11) 99999-9999"
              value={form.whatsapp}
              onChange={(e) => updateField('whatsapp', e.target.value)}
            />
          </div>

          {/* Source + temperature */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-300">
                Origem
              </label>
              <Select
                value={form.source}
                onValueChange={(v) => updateField('source', v as LeadSource)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {sourceOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-300">
                Temperatura
              </label>
              <Select
                value={form.temperature}
                onValueChange={(v) => updateField('temperature', v as LeadTemperature)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {temperatureOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Course interest */}
          <Input
            label="Curso de Interesse"
            placeholder="Ex: Engenharia Civil"
            value={form.courseInterest}
            onChange={(e) => updateField('courseInterest', e.target.value)}
          />

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-300">
              Notas
            </label>
            <textarea
              placeholder="Observacoes sobre o lead..."
              value={form.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              rows={3}
              className={cn(
                'w-full resize-none rounded-lg border bg-slate-800/50 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 transition-all duration-200',
                'border-slate-700/50',
                'focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 focus:bg-slate-800/80'
              )}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              {loading ? 'Criando...' : 'Criar Lead'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
