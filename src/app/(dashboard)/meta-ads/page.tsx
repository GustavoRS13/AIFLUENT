'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Link2,
  Unlink,
  Plug,
  FileText,
  Inbox,
  PlugZap,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface FormItem {
  id: string
  formId: string
  formName?: string
  isLinked: boolean
  leadsReceived: number
  lastLeadAt?: string
}
interface Connection {
  status: string
  pageId?: string
  pageName?: string
  lastSyncAt?: string
  lastError?: string
  leadsReceived: number
}
interface MetaState {
  configured: boolean
  connection: Connection | null
  forms: FormItem[]
}

function fmtDate(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('pt-BR')
}

export default function MetaAdsPage() {
  const [state, setState] = useState<MetaState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [busyForm, setBusyForm] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/meta/connection')
      if (res.ok) {
        setState(await res.json())
        setError('')
      } else {
        setError('Falha ao carregar a conexão')
      }
    } catch {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }, [])

  /* eslint-disable react-hooks/set-state-in-effect -- carregamento + polling assíncrono */
  useEffect(() => {
    load()
    const t = setInterval(load, 10000)
    return () => clearInterval(t)
  }, [load])

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    if (sp.get('error')) setError(`Falha na conexão: ${sp.get('error')}`)
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  const connect = async () => {
    setError('')
    try {
      const res = await fetch('/api/meta/oauth/start')
      const d = await res.json()
      if (res.ok && d.url) window.location.href = d.url
      else setError(d.error || 'Integração Meta não configurada')
    } catch {
      setError('Erro ao iniciar a conexão')
    }
  }
  const disconnect = async () => {
    if (!confirm('Desconectar a conta Meta desta empresa?')) return
    await fetch('/api/meta/connection', { method: 'DELETE' })
    load()
  }
  const sync = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/meta/forms/sync', { method: 'POST' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error || 'Falha na sincronização')
      }
    } catch {
      setError('Erro ao sincronizar')
    } finally {
      setSyncing(false)
      load()
    }
  }
  const toggleLink = async (f: FormItem) => {
    setBusyForm(f.id)
    try {
      await fetch(`/api/meta/forms/${f.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isLinked: !f.isLinked }),
      })
    } catch {
      /* ignora */
    } finally {
      setBusyForm(null)
      load()
    }
  }

  const conn = state?.connection
  const connected = conn && conn.status === 'connected'

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Meta Ads — Lead Ads</h1>
        <p className="text-sm text-gray-400 mt-1">
          Conecte sua conta Meta para receber leads dos formulários Lead Ads
          automaticamente no funil.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-2xl py-16 flex items-center justify-center text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando...
        </div>
      ) : !state?.configured ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
          <Plug className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-gray-900">
            Integração Meta não configurada
          </h3>
          <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
            Defina as variáveis <code>META_APP_ID</code>,{' '}
            <code>META_APP_SECRET</code> e <code>META_VERIFY_TOKEN</code> no
            ambiente para habilitar a conexão.
          </p>
        </div>
      ) : !connected ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
          <PlugZap className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-gray-900">
            {conn?.status === 'error'
              ? 'Erro na conexão anterior'
              : 'Nenhuma conta conectada'}
          </h3>
          {conn?.lastError && (
            <p className="text-xs text-rose-500 mt-1">{conn.lastError}</p>
          )}
          <p className="text-xs text-gray-500 mt-1 mb-4">
            Conecte sua conta Meta para sincronizar os formulários Lead Ads.
          </p>
          <button
            onClick={connect}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors"
          >
            <Plug className="w-4 h-4" /> Conectar conta Meta
          </button>
        </div>
      ) : (
        <>
          {/* Status da conexão */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-50">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Conectado{conn?.pageName ? ` · ${conn.pageName}` : ''}
                  </p>
                  <p className="text-xs text-gray-500">
                    Último sync: {fmtDate(conn?.lastSyncAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={sync}
                  disabled={syncing}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <RefreshCw
                    className={cn('w-4 h-4', syncing && 'animate-spin')}
                  />
                  {syncing ? 'Sincronizando...' : 'Sincronizar'}
                </button>
                <button
                  onClick={disconnect}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-rose-200 text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                >
                  <Unlink className="w-4 h-4" /> Desconectar
                </button>
              </div>
            </div>
            {conn?.lastError && (
              <p className="text-xs text-rose-500 mt-3">
                Último erro: {conn.lastError}
              </p>
            )}
            <div className="grid grid-cols-3 gap-4 mt-5">
              <Stat label="Leads recebidos" value={conn?.leadsReceived ?? 0} />
              <Stat label="Formulários" value={state.forms.length} />
              <Stat
                label="Vinculados"
                value={state.forms.filter((f) => f.isLinked).length}
              />
            </div>
          </div>

          {/* Formulários */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">
                Formulários Lead Ads
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Vincule um formulário para que seus leads entrem no funil.
              </p>
            </div>
            {state.forms.length === 0 ? (
              <div className="py-12 text-center">
                <Inbox className="w-9 h-9 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">
                  Nenhum formulário sincronizado
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Clique em “Sincronizar” para buscar os formulários da página.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {state.forms.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between gap-4 px-6 py-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {f.formName || f.formId}
                        </p>
                        <p className="text-xs text-gray-400">
                          {f.leadsReceived} leads · último{' '}
                          {fmtDate(f.lastLeadAt)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleLink(f)}
                      disabled={busyForm === f.id}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50',
                        f.isLinked
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100',
                      )}
                    >
                      {f.isLinked ? (
                        <>
                          <Link2 className="w-3.5 h-3.5" /> Vinculado
                        </>
                      ) : (
                        <>
                          <Unlink className="w-3.5 h-3.5" /> Vincular
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}
