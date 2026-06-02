'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Calendar,
  Stethoscope,
  BookOpen,
  Users,
  LogOut,
  HeartPulse,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/ThemeToggle'

const NAV_ITEMS = [
  { href: '/admin',                 label: 'Dashboard',      icon: LayoutDashboard },
  { href: '/admin/turnos',          label: 'Turnos',         icon: Calendar },
  { href: '/admin/medicos',         label: 'Médicos',        icon: Stethoscope },
  { href: '/admin/especialidades',  label: 'Especialidades', icon: BookOpen },
  { href: '/admin/pacientes',       label: 'Pacientes',      icon: Users },
]

export function AdminSidebar({ onClose }: { onClose?: () => void } = {}) {
  const pathname = usePathname()
  const router   = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="flex h-full w-56 flex-col border-r border-border bg-surface text-text-primary">

      {/* ── Logo ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent shadow-sm flex-shrink-0">
          <HeartPulse className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="font-display text-sm font-semibold text-text-primary block truncate">
            Turnero Médico
          </span>
          <span className="text-[10px] text-text-muted block">Panel de gestión</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden rounded-lg p-1 text-text-secondary hover:bg-primary-light hover:text-primary transition-colors"
            aria-label="Cerrar menú"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Navigation ───────────────────────────────────────────────────── */}
      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/admin' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary-light text-primary'
                  : 'text-text-secondary hover:bg-primary-light hover:text-primary',
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <div className="border-t border-border p-3 space-y-1">

        {/* Status + theme */}
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            <span className="text-xs text-text-muted">Operativo</span>
          </div>
          <ThemeToggle />
        </div>

        {/* User profile */}
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-background/50">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-light text-primary text-xs font-bold">
            AD
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-text-primary truncate">Administrador</p>
            <p className="text-[10px] text-text-muted truncate">admin@clinica.com</p>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-error/10 hover:text-error"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
