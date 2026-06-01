'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { HeartPulse, Shield, Clock, Users } from 'lucide-react'

// ─── Left panel feature list ─────────────────────────────────────────────────
const FEATURES = [
  { icon: Clock,   label: 'Gestión de turnos en tiempo real' },
  { icon: Users,   label: 'Administración de médicos y pacientes' },
  { icon: Shield,  label: 'Acceso seguro y controlado' },
]

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') ?? '/admin'

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Error al iniciar sesión')
        return
      }

      router.push(callbackUrl)
      router.refresh()
    } catch {
      setError('Error de conexión. Intente nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-background">

      {/* ── LEFT PANEL ─────────────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[46%] relative overflow-hidden flex-col items-center justify-center px-12 py-16"
           style={{ background: 'linear-gradient(145deg, #0d9488 0%, #0f766e 50%, #065f46 100%)' }}>

        {/* Decorative blobs */}
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full opacity-20"
             style={{ background: 'radial-gradient(circle, #5eead4, transparent)' }} />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full opacity-15"
             style={{ background: 'radial-gradient(circle, #14b8a6, transparent)' }} />
        <div className="absolute top-1/3 right-0 w-48 h-48 rounded-full opacity-10"
             style={{ background: 'radial-gradient(circle, #ccfbf1, transparent)' }} />

        <div className="relative z-10 max-w-xs text-white">
          {/* Logo */}
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl mb-8"
               style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.2)' }}>
            <HeartPulse className="h-8 w-8 text-white" />
          </div>

          <h1 className="font-display text-3xl font-bold leading-tight mb-2">
            Turnero Médico
          </h1>
          <p className="text-sm font-medium mb-1" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Plataforma Administrativa v2.0
          </p>

          <div className="my-8 h-px w-full" style={{ background: 'rgba(255,255,255,0.15)' }} />

          <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.75)' }}>
            Sistema completo para la gestión de consultorios médicos.
          </p>

          <ul className="flex flex-col gap-4">
            {FEATURES.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
                     style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>
                  {label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── RIGHT PANEL ────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:px-16">

        {/* Mobile logo (hidden on desktop) */}
        <div className="mb-8 flex flex-col items-center gap-3 lg:hidden">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent shadow-md">
            <HeartPulse className="h-6 w-6 text-white" />
          </div>
          <h1 className="font-display text-xl font-semibold text-text-primary">Turnero Médico</h1>
        </div>

        <div className="w-full max-w-sm">
          {/* Heading */}
          <div className="mb-8">
            <h2 className="font-display text-2xl font-semibold text-text-primary">Bienvenido</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Ingresá a tu panel de gestión
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">

            {/* Email */}
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-text-secondary">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@clinica.com"
                className="input-focus w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text-primary placeholder:text-text-muted transition-all outline-none"
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="text-sm font-medium text-text-secondary">
                  Contraseña
                </label>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline focus:outline-none"
                  tabIndex={-1}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-focus w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text-primary placeholder:text-text-muted transition-all outline-none"
              />
            </div>

            {/* Remember me */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              <span className="text-sm text-text-secondary">Recordarme</span>
            </label>

            {/* Error */}
            {error && (
              <p className="rounded-lg bg-error/10 px-4 py-2.5 text-sm text-error">
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full rounded-lg py-3 text-sm font-semibold transition-all"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Ingresando...
                </span>
              ) : (
                'Ingresar'
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="mt-8 text-center text-xs text-text-muted">
            © {new Date().getFullYear()} Turnero Médico &mdash; Todos los derechos reservados
          </p>
          <div className="mt-2 flex justify-center gap-4">
            <button className="text-xs text-text-muted hover:text-text-secondary">Privacidad</button>
            <button className="text-xs text-text-muted hover:text-text-secondary">Términos</button>
            <button className="text-xs text-text-muted hover:text-text-secondary">Contacto</button>
          </div>
        </div>
      </div>

    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
