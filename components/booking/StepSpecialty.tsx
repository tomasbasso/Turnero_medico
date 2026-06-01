'use client'
import { useState, useEffect } from 'react'
import {
  Heart, Bone, Baby, Stethoscope, Brain, Microscope,
  Eye, Ear, Scissors, Pill, Activity, Wind,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type SpecialtyOption = { id: number; name: string; color: string }

// ─── Specialty metadata ────────────────────────────────────────────────────
const SPECIALTY_META: Record<string, { icon: React.ComponentType<{ className?: string }>; desc: string }> = {
  'Cardiología':      { icon: Heart,       desc: 'Corazón y sistema cardiovascular' },
  'Traumatología':    { icon: Bone,        desc: 'Huesos, articulaciones y músculos' },
  'Pediatría':        { icon: Baby,        desc: 'Salud infantil y adolescente' },
  'Clínica Médica':   { icon: Activity,    desc: 'Medicina general y preventiva' },
  'Clínica médica':   { icon: Activity,    desc: 'Medicina general y preventiva' },
  'Neurología':       { icon: Brain,       desc: 'Sistema nervioso y cerebro' },
  'Dermatología':     { icon: Microscope,  desc: 'Piel, cabello y uñas' },
  'Oftalmología':     { icon: Eye,         desc: 'Salud visual y ocular' },
  'Otorrinolaringología': { icon: Ear,     desc: 'Oído, nariz y garganta' },
  'Cirugía':          { icon: Scissors,    desc: 'Procedimientos quirúrgicos' },
  'Farmacología':     { icon: Pill,        desc: 'Terapia y medicamentos' },
  'Neumología':       { icon: Wind,        desc: 'Sistema respiratorio' },
}

function getSpecialtyMeta(name: string) {
  return (
    SPECIALTY_META[name] ??
    { icon: Stethoscope, desc: 'Consulta y diagnóstico médico' }
  )
}

export function StepSpecialty({
  onSelect,
}: {
  onSelect: (specialty: SpecialtyOption) => void
}) {
  const [specialties, setSpecialties] = useState<SpecialtyOption[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)

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
      <h2 className="text-xl font-semibold font-display text-text-primary mb-1">
        Elegí una especialidad
      </h2>
      <p className="text-sm text-text-secondary mb-5">
        Seleccioná el área médica que necesitás
      </p>

      {/* Skeleton */}
      {loading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-border/50 animate-pulse rounded-xl h-28" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex flex-col items-center gap-3 py-8">
          <p className="text-sm text-error">{error}</p>
          <button
            onClick={() => { setError(null); setLoading(true); handleFetch() }}
            className="text-sm text-primary underline"
          >
            Intentá nuevamente
          </button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && specialties.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <Stethoscope className="h-8 w-8 text-text-muted" />
          <p className="text-base font-semibold font-display">No hay especialidades disponibles</p>
          <p className="text-sm text-text-secondary">
            El consultorio no tiene especialidades configuradas.
          </p>
        </div>
      )}

      {/* Grid */}
      {!loading && !error && specialties.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {specialties.map((specialty) => {
            const { icon: Icon, desc } = getSpecialtyMeta(specialty.name)
            return (
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
                  'card-lift group relative bg-surface/70 backdrop-blur-sm rounded-xl shadow-card',
                  'border border-border hover:border-accent/50 hover:shadow-modal',
                  'p-4 flex flex-col items-start gap-2.5 cursor-pointer transition-all'
                )}
              >
                {/* Icon bubble */}
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl transition-transform group-hover:scale-110"
                  style={{ backgroundColor: specialty.color + '22', border: `1px solid ${specialty.color}44`, color: specialty.color }}
                >
                  <Icon className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-sm font-semibold text-text-primary leading-snug">
                    {specialty.name}
                  </p>
                  <p className="text-xs text-text-muted leading-snug mt-0.5">
                    {desc}
                  </p>
                </div>

                {/* Arrow hint */}
                <span
                  className="absolute right-3 top-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                  aria-hidden
                >
                  →
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
