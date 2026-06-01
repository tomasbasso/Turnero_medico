'use client'
import { useState, useEffect } from 'react'
import { Stethoscope } from 'lucide-react'
import { cn } from '@/lib/utils'

type SpecialtyOption = { id: number; name: string; color: string }

export function StepSpecialty({
  onSelect,
}: {
  onSelect: (specialty: SpecialtyOption) => void
}) {
  const [specialties, setSpecialties] = useState<SpecialtyOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  function handleFetch() {
    fetch('/api/public/specialties')
      .then((r) => r.json())
      .then((data) => setSpecialties(data.specialties ?? []))
      .catch(() => setError('No se pudo cargar las especialidades'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    handleFetch()
  }, [])

  return (
    <div>
      <h2 className="text-xl font-semibold font-display text-text-primary mb-4">
        Elegí una especialidad
      </h2>

      {loading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-border animate-pulse rounded-xl h-24" />
          ))}
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-error">{error}</p>
          <button
            onClick={() => {
              setError(null)
              setLoading(true)
              handleFetch()
            }}
            className="text-sm text-primary underline"
          >
            Intentá nuevamente
          </button>
        </div>
      )}

      {!loading && !error && specialties.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <Stethoscope className="h-8 w-8 text-text-muted" />
          <p className="text-base font-semibold font-display">No hay especialidades disponibles</p>
          <p className="text-sm text-text-secondary">
            El consultorio no tiene especialidades configuradas. Intentá más tarde.
          </p>
        </div>
      )}

      {!loading && !error && specialties.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {specialties.map((specialty) => (
            <div
              key={specialty.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(specialty)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelect(specialty)
                }
              }}
              className={cn(
                'card-lift bg-surface/70 backdrop-blur-sm rounded-xl shadow-card border p-4 flex flex-col items-center gap-2 cursor-pointer',
                'hover:border-accent/40',
                'border-border'
              )}
            >
              <div
                className="w-12 h-12 rounded-full"
                style={{ backgroundColor: specialty.color }}
              />
              <p className="text-base font-semibold text-text-primary text-center">
                {specialty.name}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
