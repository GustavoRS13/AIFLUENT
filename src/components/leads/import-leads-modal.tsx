'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import Papa from 'papaparse'
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

// ── Lead field options for mapping ──────────────────────────────────────────

const leadFields = [
  { value: '', label: '-- Ignorar --' },
  { value: 'firstName', label: 'Nome' },
  { value: 'lastName', label: 'Sobrenome' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Telefone' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'source', label: 'Origem' },
  { value: 'temperature', label: 'Temperatura' },
  { value: 'courseInterest', label: 'Curso de Interesse' },
  { value: 'notes', label: 'Notas' },
  { value: 'city', label: 'Cidade' },
  { value: 'state', label: 'Estado' },
]

// ── Steps ───────────────────────────────────────────────────────────────────

type Step = 'upload' | 'mapping' | 'preview' | 'importing' | 'done'

interface ImportLeadsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportComplete?: (count: number) => void
}

export function ImportLeadsModal({ open, onOpenChange, onImportComplete }: ImportLeadsModalProps) {
  const [step, setStep] = React.useState<Step>('upload')
  const [file, setFile] = React.useState<File | null>(null)
  const [csvHeaders, setCsvHeaders] = React.useState<string[]>([])
  const [csvRows, setCsvRows] = React.useState<string[][]>([])
  const [mapping, setMapping] = React.useState<Record<string, string>>({})
  const [importProgress, setImportProgress] = React.useState(0)
  const [importResult, setImportResult] = React.useState<{
    success: number
    errors: number
  } | null>(null)
  const [dragActive, setDragActive] = React.useState(false)

  const resetState = () => {
    setStep('upload')
    setFile(null)
    setCsvHeaders([])
    setCsvRows([])
    setMapping({})
    setImportProgress(0)
    setImportResult(null)
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) resetState()
    onOpenChange(open)
  }

  // ── File parsing ──────────────────────────────────────────────────────────

  const parseFile = (f: File) => {
    setFile(f)
    Papa.parse(f, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as string[][]
        if (data.length < 2) return
        const headers = data[0]
        const rows = data.slice(1)
        setCsvHeaders(headers)
        setCsvRows(rows)

        // Auto-map by guessing common column names
        const autoMap: Record<string, string> = {}
        headers.forEach((h) => {
          const lower = h.toLowerCase().trim()
          if (lower.includes('nome') && !lower.includes('sobre')) autoMap[h] = 'firstName'
          else if (lower.includes('sobrenome') || lower.includes('last')) autoMap[h] = 'lastName'
          else if (lower.includes('email') || lower.includes('e-mail')) autoMap[h] = 'email'
          else if (lower.includes('telefone') || lower.includes('phone') || lower.includes('fone')) autoMap[h] = 'phone'
          else if (lower.includes('whatsapp') || lower.includes('wpp') || lower.includes('zap')) autoMap[h] = 'whatsapp'
          else if (lower.includes('origem') || lower.includes('source')) autoMap[h] = 'source'
          else if (lower.includes('temperatura') || lower.includes('temp')) autoMap[h] = 'temperature'
          else if (lower.includes('curso') || lower.includes('interest')) autoMap[h] = 'courseInterest'
          else if (lower.includes('nota') || lower.includes('obs') || lower.includes('note')) autoMap[h] = 'notes'
          else if (lower.includes('cidade') || lower.includes('city')) autoMap[h] = 'city'
          else if (lower.includes('estado') || lower.includes('uf') || lower.includes('state')) autoMap[h] = 'state'
        })
        setMapping(autoMap)
        setStep('mapping')
      },
      error: () => {
        // Could show a toast
      },
    })
  }

  // ── Drag & drop ───────────────────────────────────────────────────────────

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true)
    else if (e.type === 'dragleave') setDragActive(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const f = e.dataTransfer.files?.[0]
    if (f && (f.name.endsWith('.csv') || f.name.endsWith('.xlsx'))) {
      parseFile(f)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) parseFile(f)
  }

  // ── Import ────────────────────────────────────────────────────────────────

  const handleImport = async () => {
    setStep('importing')
    let success = 0
    let errors = 0
    const total = csvRows.length

    for (let i = 0; i < csvRows.length; i++) {
      const row = csvRows[i]
      const lead: Record<string, string> = {}
      csvHeaders.forEach((header, idx) => {
        const field = mapping[header]
        if (field && row[idx]) {
          lead[field] = row[idx]
        }
      })

      // Only import if at least firstName exists
      if (!lead.firstName) {
        errors++
        setImportProgress(Math.round(((i + 1) / total) * 100))
        continue
      }

      try {
        const res = await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...lead,
            source: lead.source || 'import',
            temperature: lead.temperature || 'warm',
          }),
        })
        if (res.ok) success++
        else errors++
      } catch {
        errors++
      }

      setImportProgress(Math.round(((i + 1) / total) * 100))
    }

    setImportResult({ success, errors })
    setStep('done')
    onImportComplete?.(success)
  }

  // ── Preview rows ──────────────────────────────────────────────────────────

  const previewRows = csvRows.slice(0, 5)
  const mappedHeaders = csvHeaders.filter((h) => mapping[h])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            <FileSpreadsheet className="mr-2 inline h-5 w-5 text-indigo-400" />
            Importar Leads
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Envie um arquivo CSV ou XLSX para importar leads.'}
            {step === 'mapping' && 'Mapeie as colunas do arquivo para os campos do lead.'}
            {step === 'preview' && 'Confira os dados antes de importar.'}
            {step === 'importing' && 'Importando leads...'}
            {step === 'done' && 'Importacao concluida.'}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 min-h-[300px]">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={cn(
                'flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-all',
                dragActive
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              )}
            >
              <Upload className={cn('h-10 w-10 mb-4', dragActive ? 'text-indigo-400' : 'text-gray-400')} />
              <p className="text-sm text-gray-700 mb-1">
                Arraste um arquivo aqui ou
              </p>
              <label className="cursor-pointer">
                <span className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
                  clique para selecionar
                </span>
                <input
                  type="file"
                  accept=".csv,.xlsx"
                  className="hidden"
                  onChange={handleFileInput}
                />
              </label>
              <p className="mt-3 text-xs text-gray-400">
                Formatos aceitos: CSV, XLSX
              </p>
            </div>
          )}

          {/* Step 2: Mapping */}
          {step === 'mapping' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
                <FileSpreadsheet className="h-4 w-4 text-indigo-400" />
                <span className="font-medium">{file?.name}</span>
                <span className="text-gray-400">
                  ({csvRows.length} linhas)
                </span>
              </div>

              <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1">
                {csvHeaders.map((header) => (
                  <div
                    key={header}
                    className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                  >
                    <span className="min-w-[140px] text-sm text-gray-500 truncate">
                      {header}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    <select
                      value={mapping[header] ?? ''}
                      onChange={(e) =>
                        setMapping((prev) => ({
                          ...prev,
                          [header]: e.target.value,
                        }))
                      }
                      className="flex-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    >
                      {leadFields.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="flex justify-between pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetState}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Voltar
                </Button>
                <Button
                  size="sm"
                  onClick={() => setStep('preview')}
                  disabled={mappedHeaders.length === 0}
                >
                  Proximo
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Pre-visualizacao das primeiras {previewRows.length} linhas:
              </p>
              <div className="overflow-auto rounded-lg border border-gray-200">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      {mappedHeaders.map((h) => (
                        <th
                          key={h}
                          className="px-3 py-2 text-left text-gray-500 font-medium"
                        >
                          {leadFields.find((f) => f.value === mapping[h])?.label ?? mapping[h]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, i) => (
                      <tr
                        key={i}
                        className="border-b border-gray-200"
                      >
                        {mappedHeaders.map((h) => {
                          const idx = csvHeaders.indexOf(h)
                          return (
                            <td
                              key={h}
                              className="px-3 py-1.5 text-gray-700"
                            >
                              {row[idx] || '--'}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="rounded-lg bg-white px-3 py-2 text-sm">
                <span className="text-gray-500">Total para importar: </span>
                <span className="font-semibold text-gray-800">{csvRows.length} leads</span>
              </div>

              <div className="flex justify-between pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep('mapping')}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Voltar
                </Button>
                <Button size="sm" onClick={handleImport}>
                  <Upload className="h-3.5 w-3.5" />
                  Importar {csvRows.length} leads
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Importing */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-6">
              <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
              <div className="w-full max-w-xs space-y-2">
                <Progress value={importProgress} showLabel />
              </div>
              <p className="text-sm text-gray-500">
                Importando leads... nao feche esta janela.
              </p>
            </div>
          )}

          {/* Step 5: Done */}
          {step === 'done' && importResult && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-900">
                  Importacao concluida
                </p>
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-emerald-400">
                    {importResult.success} leads importados com sucesso
                  </p>
                  {importResult.errors > 0 && (
                    <p className="flex items-center justify-center gap-1 text-sm text-rose-400">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {importResult.errors} erros
                    </p>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => handleOpenChange(false)}
              >
                Fechar
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
