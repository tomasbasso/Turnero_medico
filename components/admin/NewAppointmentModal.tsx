'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import FocusTrap from 'focus-trap-react'
import { cn, formatTime } from '@/lib/utils'

type Doctor = { id: number; name: string; durationMin: number }
type Slot = { time: string; available: boolean }

interface NewAppointmentModalProps {
  doctors: Doctor[]
  onCreated: () => void
  onClose: () => void
}

const inputClass =
  'rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-[rgba(20,184,166,0.4)] focus:outline-none focus:ring-1 focus:ring-[rgba(20,184,166,0.4)] w-full'

// Generate 3 duration options: 1×, 2×, 3× the doctor's native slot size
function getDurationOptions(base: number): number[] {
  return [base, base * 2, base * 3]
}

export function NewAppointmentModal({ doctors, onCreated, onClose }: NewAppointmentModalProps) {
  const [doctorId, setDoctorId] = useState<number | ''>('')
  const [date, setDate] = useState('')
  const [durationMin, setDurationMin] = useState<number>(20)
  const [time, setTime] = useState<string | null>(null)
  const [slots, setSlots] = useState<Slot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [patientName, setPatientName] = useState('')
  const [patientDni, setPatientDni] = useState('')
  const [patientPhone, setPatientPhone] = useState('')
  const [patientEmail, setPatientEmail] = useState('')
  const [patientInsurance, setPatientInsurance] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  // When doctor changes, reset duration to the doctor's native slot size
  useEffect(() => {
    if (doctorId === '') return
    const doctor = doctors.find((d) => d.id === doctorId)
    if (doctor) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDurationMin(doctor.durationMin)
    }
  }, [doctorId, doctors])

  // Fetch slots when doctor, date, or duration changes
  useEffect(() => {
    if (!doctorId || !date) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSlots([])
      return
    }
    setSlotsLoading(true)
    setTime(null)
    fetch(`/api/public/slots?doctorId=${doctorId}&date=${date}&durationMin=${durationMin}`)
      .then((r) => r.json())
      .then((data) => setSlots(data.slots ?? []))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false))
  }, [doctorId, date, durationMin])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!doctorId || !date || !time) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId,
          date,
          time,
          durationMin,
          patientName,
          patientDni,
          patientPhone,
          patientEmail: patientEmail || undefined,
          patientInsurance: patientInsurance || undefined,
          notes: notes || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Error al guardar el turno.')
        return
      }
      onCreated()
    } catch {
      setError('Error de conexión. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <FocusTrap
        focusTrapOptions={{
          initialFocus: false,
          allowOutsideClick: true,
          escapeDeactivates: false,
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-appointment-title"
          className="relative w-full max-w-lg rounded-2xl bg-background shadow-xl overflow-y-auto max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border">
            <h2
              id="new-appointment-title"
              className="font-display text-lg font-semibold text-text-primary"
            >
              Nuevo turno
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar modal"
              className="text-text-secondary hover:text-text-primary transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            {/* Doctor */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Doctor</label>
              <select
                className={inputClass}
                value={doctorId}
                onChange={(e) => {
                  setDoctorId(e.target.value ? Number(e.target.value) : '')
                  setTime(null)
                }}
                required
              >
                <option value="">Seleccioná un doctor</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Fecha */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Fecha</label>
              <input
                type="date"
                className={inputClass}
                value={date}
                onChange={(e) => {
                  setDate(e.target.value)
                  setTime(null)
                }}
                required
              />
            </div>

            {/* Duración */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Duración</label>
              <div className="flex gap-2">
                {getDurationOptions(
                  doctors.find((d) => d.id === doctorId)?.durationMin ?? 20
                ).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setDurationMin(opt)
                      setTime(null)
                    }}
                    className={cn(
                      'px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors',
                      durationMin === opt
                        ? 'bg-accent text-white border-accent'
                        : 'bg-surface border-border text-text-secondary hover:border-accent hover:text-accent'
                    )}
                  >
                    {opt} min
                  </button>
                ))}
              </div>
            </div>

            {/* Slots */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Horario</label>
              {!doctorId || !date ? (
                <p className="text-sm text-text-muted italic">
                  Seleccioná doctor y fecha para ver los turnos disponibles.
                </p>
              ) : slotsLoading ? (
                <p className="text-sm text-text-muted">Cargando horarios...</p>
              ) : slots.length === 0 ? (
                <p className="text-sm text-text-muted">Sin turnos disponibles para esta fecha.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {slots.map((s) => (
                    <button
                      key={s.time}
                      type="button"
                      disabled={!s.available}
                      onClick={() => setTime(s.time)}
                      className={cn(
                        'px-3 py-1 rounded-lg text-sm font-medium border transition-colors',
                        !s.available && 'opacity-40 cursor-not-allowed border-border text-text-muted',
                        s.available &&
                          time === s.time &&
                          'bg-accent text-white border-accent',
                        s.available &&
                          time !== s.time &&
                          'border-border text-text-secondary hover:border-accent hover:text-accent'
                      )}
                    >
                      {formatTime(s.time)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <hr className="border-border" />

            {/* Datos del paciente */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Nombre completo *
                </label>
                <input
                  className={inputClass}
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">DNI *</label>
                <input
                  className={inputClass}
                  value={patientDni}
                  onChange={(e) => setPatientDni(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Teléfono *
                </label>
                <input
                  className={inputClass}
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Email</label>
                <input
                  type="email"
                  className={inputClass}
                  value={patientEmail}
                  onChange={(e) => setPatientEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Obra social
                </label>
                <input
                  className={inputClass}
                  value={patientInsurance}
                  onChange={(e) => setPatientInsurance(e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-text-secondary mb-1">Notas</label>
                <textarea
                  className={cn(inputClass, 'resize-none')}
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-error bg-error/10 border border-error/20 rounded-lg px-4 py-2">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !time}
                className={cn(
                  'btn-primary px-5 py-2 rounded-lg text-sm font-semibold',
                  (loading || !time) && 'opacity-50 cursor-not-allowed'
                )}
              >
                {loading ? 'Guardando...' : 'Guardar turno'}
              </button>
            </div>
          </form>
        </div>
      </FocusTrap>
    </div>
  )
}
