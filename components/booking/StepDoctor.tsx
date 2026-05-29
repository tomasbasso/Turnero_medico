'use client'
import { useState, useEffect } from 'react'
import { UserX, Clock } from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'

type DoctorOption = {
  id: number
  name: string
  bio?: string | null
  avatar?: string | null
  durationMin: number
}

export function StepDoctor({
  specialtyId,
  specialtyName,
  onSelect,
  onBack,
}: {
  specialtyId: number
  specialtyName?: string
  onSelect: (doctor: DoctorOption) => void
  onBack: () => void
}) {
  const [doctors, setDoctors] = useState<DoctorOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/public/doctors?specialtyId=${specialtyId}`)
      .then((r) => r.json())
      .then((data) => setDoctors(data.doctors ?? []))
      .catch(() => setError('No se pudo cargar los médicos'))
      .finally(() => setLoading(false))
  }, [specialtyId])

  return (
    <div>
      <h2 className="text-xl font-semibold font-display text-text-primary mb-1">Elegí tu médico</h2>
      {specialtyName && (
        <p className="text-sm text-text-secondary mb-4">Especialidad: {specialtyName}</p>
      )}

      {loading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-slate-200 animate-pulse rounded-xl h-20" />
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-error">{error}</p>
      )}

      {!loading && !error && doctors.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
          <UserX className="h-8 w-8 text-text-muted" />
          <p className="text-base font-semibold font-display">Sin médicos disponibles</p>
          <p className="text-sm text-text-secondary">
            No hay médicos registrados para esta especialidad.
          </p>
          <button
            onClick={onBack}
            className="mt-2 px-4 py-2 rounded-lg border border-[rgba(13,148,136,0.3)] text-primary text-sm font-semibold transition-all hover:bg-primary/5"
          >
            ← Volver a especialidades
          </button>
        </div>
      )}

      {!loading && !error && doctors.length > 0 && (
        <div className="flex flex-col gap-3">
          {doctors.map((doctor) => (
            <div
              key={doctor.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(doctor)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelect(doctor)
                }
              }}
              className={cn(
                'bg-white/70 backdrop-blur-sm rounded-xl shadow-card border border-border p-4 flex items-start gap-3 cursor-pointer transition-all duration-200 hover:border-accent/40 hover:shadow-modal'
              )}
            >
              {doctor.avatar ? (
                <img
                  src={doctor.avatar}
                  alt={doctor.name}
                  className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary/20 text-primary text-sm font-semibold flex items-center justify-center flex-shrink-0">
                  {getInitials(doctor.name)}
                </div>
              )}
              <div className="flex flex-col gap-0.5">
                <p className="text-base font-semibold text-text-primary">{doctor.name}</p>
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-text-secondary" />
                  <span className="text-sm text-text-secondary">
                    {doctor.durationMin} min por turno
                  </span>
                </div>
                {doctor.bio && (
                  <p className="text-sm text-text-secondary line-clamp-2">{doctor.bio}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
