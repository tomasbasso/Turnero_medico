'use client'

import { useState } from 'react'
import { Loader2, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type TimeRange = { startTime: string; endTime: string; id?: number }
type DayRanges = Record<number, TimeRange[]>
type AvailabilityItem = { id: number; dayOfWeek: number; startTime: string; endTime: string }

interface AvailabilityEditorProps {
  doctorId: number
  initialAvailabilities: AvailabilityItem[]
  role: 'ADMIN' | 'RECEPTIONIST'
}

const DAY_NAMES: string[] = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
]

const DAY_ORDER: number[] = [1, 2, 3, 4, 5, 6, 0]

export function AvailabilityEditor({
  doctorId,
  initialAvailabilities,
  role,
}: AvailabilityEditorProps) {
  const [ranges, setRanges] = useState<DayRanges>(() => {
    const initial: DayRanges = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] }
    for (const avail of initialAvailabilities) {
      initial[avail.dayOfWeek].push({
        startTime: avail.startTime,
        endTime: avail.endTime,
        id: avail.id,
      })
    }
    return initial
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  function addRange(day: number) {
    setRanges((prev) => ({
      ...prev,
      [day]: [...prev[day], { startTime: '09:00', endTime: '17:00' }],
    }))
  }

  function removeRange(day: number, index: number) {
    setRanges((prev) => ({
      ...prev,
      [day]: prev[day].filter((_, i) => i !== index),
    }))
  }

  function updateRange(
    day: number,
    index: number,
    field: 'startTime' | 'endTime',
    value: string,
  ) {
    setRanges((prev) => {
      const updated = [...prev[day]]
      updated[index] = { ...updated[index], [field]: value }
      return { ...prev, [day]: updated }
    })
  }

  async function handleSave() {
    for (const dayRanges of Object.values(ranges)) {
      for (const r of dayRanges) {
        if (r.endTime <= r.startTime) {
          setError('La hora de fin debe ser posterior a la hora de inicio.')
          return
        }
      }
    }

    setLoading(true)
    setError('')
    setSuccess(false)

    const availabilities = Object.entries(ranges).flatMap(([day, rs]) =>
      rs.map((r) => ({
        dayOfWeek: Number(day),
        startTime: r.startTime,
        endTime: r.endTime,
      })),
    )

    try {
      const res = await fetch('/api/admin/doctors/' + doctorId + '/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availabilities }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'No se pudo guardar. Intentá nuevamente.')
        return
      }
      setSuccess(true)
    } catch {
      setError('No se pudo guardar. Intentá nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  const timeInputClass = (disabled: boolean) =>
    cn(
      'rounded-lg border border-border px-2 py-1.5 text-sm text-text-primary w-28 focus:outline-none focus:border-[rgba(13,148,136,0.4)] focus:ring-2 focus:ring-[rgba(13,148,136,0.2)]',
      disabled && 'opacity-60 cursor-not-allowed',
    )

  const isAdmin = role === 'ADMIN'

  return (
    <div className="space-y-6">
      {DAY_ORDER.map((dayIndex) => (
        <div key={dayIndex} className="bg-surface rounded-xl shadow-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary mb-3">
            {DAY_NAMES[dayIndex]}
          </p>

          {ranges[dayIndex].length === 0 && (
            <p className="text-xs text-text-muted mb-2">Sin disponibilidad</p>
          )}

          {ranges[dayIndex].map((range, i) => (
            <div key={i}>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="time"
                  value={range.startTime}
                  onChange={(e) => updateRange(dayIndex, i, 'startTime', e.target.value)}
                  disabled={!isAdmin}
                  className={timeInputClass(!isAdmin)}
                />
                <span className="text-text-secondary">—</span>
                <input
                  type="time"
                  value={range.endTime}
                  onChange={(e) => updateRange(dayIndex, i, 'endTime', e.target.value)}
                  disabled={!isAdmin}
                  className={timeInputClass(!isAdmin)}
                />
                {isAdmin && (
                  <button
                    type="button"
                    aria-label="Eliminar franja"
                    onClick={() => removeRange(dayIndex, i)}
                    className="text-error hover:text-error transition-colors p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {range.endTime <= range.startTime && (
                <p className="text-xs text-error mb-1">
                  La hora de fin debe ser posterior a la hora de inicio.
                </p>
              )}
            </div>
          ))}

          {isAdmin && (
            <button
              type="button"
              onClick={() => addRange(dayIndex)}
              className="flex items-center gap-1 text-sm text-accent hover:text-primary transition-colors mt-1"
            >
              <Plus className="h-4 w-4" />
              Agregar franja
            </button>
          )}
        </div>
      ))}

      <div className="mt-6 flex flex-col gap-3">
        {error && <p className="text-sm text-error">{error}</p>}
        {success && (
          <p className="text-sm text-success">Disponibilidad guardada correctamente</p>
        )}
        {isAdmin && (
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="btn-primary self-start rounded-lg px-6 py-2 text-sm font-semibold transition-all duration-150 disabled:pointer-events-none"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2 inline" />
                Guardando...
              </>
            ) : (
              'Guardar disponibilidad'
            )}
          </button>
        )}
      </div>
    </div>
  )
}
