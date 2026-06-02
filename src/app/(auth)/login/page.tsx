'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Mail, Lock, ArrowRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        if (result.error === 'Configuration') {
          setError('Erro de configuracao do servidor. Verifique AUTH_SECRET.')
        } else if (result.error === 'CredentialsSignin') {
          setError('Email ou senha incorretos.')
        } else {
          setError(`Erro: ${result.error}`)
        }
        setLoading(false)
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError(`Erro ao conectar: ${err instanceof Error ? err.message : 'Tente novamente'}`)
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden">
      {/* Animated gradient orbs */}
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl"
          animate={{
            x: [0, 30, -20, 0],
            y: [0, -20, 30, 0],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-purple-600/15 blur-3xl"
          animate={{
            x: [0, -30, 20, 0],
            y: [0, 20, -30, 0],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-indigo-500/10 blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Login card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-sm mx-4"
      >
        <div className="glass-card rounded-2xl p-8">
          {/* Brand */}
          <div className="mb-8 text-center">
            <img src="/logo.png" alt="AIFLUENT" className="mx-auto mb-4 h-14 w-14 rounded-2xl object-contain" />
            <h1 className="gradient-text text-2xl font-bold tracking-tight">
              AIFLUENT
            </h1>
            <p className="mt-1 text-sm text-gray-400">
              CRM Inteligente
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-600">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="text-xs font-medium text-gray-500"
              >
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="text-xs font-medium text-gray-500"
              >
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-gray-500">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-gray-200 bg-gray-100"
                />
                Lembrar de mim
              </label>
              <a
                href="#"
                className="text-indigo-400 transition-colors hover:text-indigo-300"
              >
                Esqueceu a senha?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={cn(
                'flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all',
                loading
                  ? 'cursor-not-allowed opacity-80'
                  : 'hover:from-indigo-500 hover:to-indigo-400 hover:shadow-indigo-500/30'
              )}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Entrar
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-100" />
            <span className="text-[10px] uppercase tracking-widest text-gray-400">
              ou
            </span>
            <div className="h-px flex-1 bg-gray-100" />
          </div>

          <p className="mt-4 text-center text-xs text-gray-400">
            Ainda nao tem conta?{' '}
            <a
              href="#"
              className="font-medium text-indigo-400 transition-colors hover:text-indigo-300"
            >
              Fale com vendas
            </a>
          </p>

        </div>
      </motion.div>
    </div>
  )
}
