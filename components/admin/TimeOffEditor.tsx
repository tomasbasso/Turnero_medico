'use client'

import { useState } from 'react'
import { Loader2, Plus, X, CalendarOff } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'

type TimeOffItem = {
  id: number
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  reason: string | null
}

interface TimeOffEditorProps {
  doctorId: number
  initialTimeOff: TimeOffItem[]
  role: 'ADMIN' | 'RECEPTIONIST'
}

const todayStr = () => new Date().toISOString().split('T')[0]

export function TimeOffEditor({ doctorId, initialTimeOff, role }: TimeOffEditorProps) {
  const [items, setItems] = useState<TimeOffItem[]>(initialTimeOff)
  const [startDate, setStartDate] = useState(todayStr())
  const [endDate, setEndDate] = useState(todayStr())
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [error, setError] = useState('')

  const isAdmin = role === 'ADMIN'

  async function handleAdd() {
    if (endDate < startDate) {
      setError('La fecha de fin debe ser igual o posterior a la de inicio.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/doctors/${doctorId}/timeoff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate, reason }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? 'No se pudo agregar el bloqueo.')
        return
      }
      const { timeOff } = await res.json()
      setItems((prev) =>
        [
          ...prev,
          {
            id: timeOff.id,
            startDate: timeOff.startDate.split('T')[0],
            endDate: timeOff.endDate.split('T')[0],
            reason: timeOff.reason,
          },
        ].sort((a, b) => a.startDate.localeCompare(b.startDate))
      )
      setReason('')
    } catch {
      setError('No se pudo agregar el bloqueo.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: number) {
    setDeletingId(id)
    setError('')
    try {
      const res = await fetch(`/api/admin/doctors/${doctorId}/timeoff/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        setError('No se pudo eliminar el bloqueo.')
        return
      }
      setItems((prev) => prev.filter((t) => t.id !== id))
    } catch {
      setError('No se pudo eliminar el bloqueo.')
    } finally {
      setDeletingId(null)
    }
  }

  const dateInputClass =
    'rounded-lg border border-border px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-[rgba(13,148,136,0.4)] focus:ring-2 focus:ring-[rgba(13,148,136,0.2)]'

  return (
    <div className="bg-surface rounded-xl shadow-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <CalendarOff className="h-4 w-4 text-text-secondary" />
        <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
          Bloqueos (vacaciones, feriados, ausencias)
        </p>
      </div>

      {items.length === 0 && (
        <p className="text-xs text-text-muted">Sin bloqueos cargados</p>
      )}

      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
            >
              <div>
                <p className="text-sm text-text-primary">
                  {t.startDate === t.endDate
                    ? formatDate(t.startDate)
                    : `${formatDate(t.startDate)} — ${formatDate(t.endDate)}`}
                </p>
                {t.reason && <p className="text-xs text-text-secondary">{t.reason}</p>}
              </div>
              {isAdmin && (
                <button
                  type="button"
                  aria-label="Eliminar bloqueo"
                  onClick={() => handleDelete(t.id)}
                  disabled={deletingId === t.id}
                  className="text-error hover:text-error transition-colors p-1 disabled:opacity-50"
                >
                  {deletingId === t.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {isAdmin && (
        <div className="flex flex-wrap items-end gap-2 pt-2 border-t border-border">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-text-secondary">Desde</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={dateInputClass}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-text-secondary">Hasta</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={dateInputClass}
            />
          </label>
          <label className="flex flex-col gap-1 flex-1 min-w-40">
            <span className="text-xs text-text-secondary">Motivo (opcional)</span>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: vacaciones"
              className={cn(dateInputClass, 'w-full')}
            />
          </label>
          <button
            type="button"
            onClick={handleAdd}
            disabled={loading}
            className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-primary to-accent px-4 py-2 text-sm font-semibold text-white transition-all duration-150 hover:shadow-[0_0_12px_rgba(20,184,166,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Agregar
          </button>
        </div>
      )}

      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  )
}
