'use client'
import { motion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'
import { formatDate, formatTime } from '@/lib/utils'

export function StepConfirmation({
  selectedSpecialtyName,
  selectedDoctorName,
  selectedDate,
  selectedTime,
  patientName,
  patientDni,
  patientInsurance,
  onReset,
}: {
  selectedSpecialtyName: string
  selectedDoctorName: string
  selectedDate: string
  selectedTime: string
  patientName: string
  patientDni: string
  patientInsurance: string
  onReset: () => void
}) {
  const rows = [
    { label: 'Especialidad', value: selectedSpecialtyName },
    { label: 'Médico', value: selectedDoctorName },
    { label: 'Fecha', value: formatDate(selectedDate) },
    { label: 'Hora', value: formatTime(selectedTime) },
    { label: 'Paciente', value: patientName },
    { label: 'DNI', value: patientDni },
    { label: 'Obra social', value: patientInsurance || 'No informada' },
  ]

  return (
    <div className="flex flex-col items-center text-center py-4">
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'backOut' }}
        className="flex flex-col items-center gap-3 mb-6"
      >
        <CheckCircle2 className="h-14 w-14 text-accent" />
        <h2 className="text-3xl font-semibold font-display text-text-primary">¡Turno reservado!</h2>
      </motion.div>

      <div className="bg-primary/10 border border-accent/20 rounded-xl p-5 mt-2 w-full text-left">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex justify-between items-baseline py-2 border-b border-border last:border-0"
          >
            <span className="text-sm font-semibold uppercase tracking-wide text-text-muted">
              {row.label}
            </span>
            <span className="text-base text-text-primary">{row.value}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-col items-center gap-2">
        <span className="bg-amber-100 text-amber-700 rounded-full px-3 py-1 text-sm font-semibold">
          PENDIENTE
        </span>
        <p className="text-sm text-text-secondary text-center">
          Tu turno está pendiente de confirmación por el consultorio.
        </p>
        <p className="text-sm text-text-secondary text-center">
          Te contactaremos para confirmar el turno.
        </p>
      </div>

      <button
        onClick={onReset}
        className="w-full mt-6 rounded-lg border border-[rgba(13,148,136,0.3)] text-primary py-3 text-sm font-semibold transition-all hover:bg-primary/5"
      >
        Reservar otro turno
      </button>
    </div>
  )
}
