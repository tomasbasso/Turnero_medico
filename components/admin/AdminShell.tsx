'use client'

import { useState } from 'react'
import { Menu, HeartPulse } from 'lucide-react'
import { AdminSidebar } from './AdminSidebar'

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-background">

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar — off-screen on mobile, always visible on md+ */}
      <div
        className={[
          'fixed inset-y-0 left-0 z-30 transition-transform duration-300 ease-in-out',
          'md:relative md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <AdminSidebar onClose={() => setOpen(false)} />
      </div>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">

        {/* Mobile top bar */}
        <div className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3 md:hidden flex-shrink-0">
          <button
            onClick={() => setOpen(true)}
            className="rounded-lg p-1.5 text-text-secondary hover:bg-primary-light hover:text-primary transition-colors"
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent shadow-sm flex-shrink-0">
              <HeartPulse className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-display text-sm font-semibold text-text-primary">Turnero Médico</span>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
