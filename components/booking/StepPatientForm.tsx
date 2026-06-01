'use client'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function StepPatientForm({
  doctorName,
  selectedDate,
  selectedTime,
  patientName,
  setPatientName,
  patientDni,
  setPatientDni,
  patientPhone,
  setPatientPhone,
  patientInsurance,
  setPatientInsurance,
  patientEmail,
  setPatientEmail,
  doctorId,
  onSuccess,
  onSlotTaken,
}: {
  doctorName: string
  selectedDate: string
  selectedTime: string
  patientName: string
  setPatientName: (v: string) => void
  patientDni: string
  setPatientDni: (v: string) => void
  patientPhone: string
  setPatientPhone: (v: string) => void
  patientInsurance: string
  setPatientInsurance: (v: string) => void
  patientEmail: string
  setPatientEmail: (v: string) => void
  doctorId: number
  onSuccess: (appointment: { id: number }) => void
  onSlotTaken: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function validate(): string | null {
    const dniClean = patientDni.replace(/[\s.]/g, '')
    if (!patientName.trim()) return 'Ingresá tu nombre completo.'
    if (!dniClean) return 'Ingresá tu DNI.'
    if (!/^\d{7,8}$/.test(dniClean)) return 'El DNI debe tener 7 u 8 dígitos numéricos.'
    const phoneClean = patientPhone.replace(/\D/g, '')
    if (!phoneClean) return 'Ingresá tu teléfono.'
    if (phoneClean.length !== 10) return 'El teléfono debe tener exactamente 10 dígitos.'
    if (patientEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patientEmail.trim())) {
      return 'Ingresá un email válido.'
    }
    return null
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    setLoading(true)
    const dniClean = patientDni.replace(/[\s.]/g, '')
    const phoneClean = patientPhone.replace(/\D/g, '')
    fetch('/api/public/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doctorId,
        date: selectedDate,
        time: selectedTime,
        patientName: patientName.trim(),
        patientDni: dniClean,
        patientPhone: phoneClean,
        patientInsurance: patientInsurance.trim() || null,
        patientEmail: patientEmail.trim() || null,
      }),
    })
      .then((r) => r.json().then((data) => ({ ok: r.ok, status: r.status, data })))
      .then(({ ok, status, data }) => {
        if (ok) {
          onSuccess(data.appointment)
        } else if (status === 409) {
          setError(data.error || 'Este turno ya fue reservado. Elegí otro horario.')
        } else {
          setError('Ocurrió un error al reservar. Intentá nuevamente.')
        }
      })
      .catch(() => setError('Ocurrió un error al reservar. Intentá nuevamente.'))
      .finally(() => setLoading(false))
  }

  const inputClass =
    'input-focus w-full rounded-lg border border-border bg-surface/90 px-3 py-3 min-h-[44px] text-base text-text-primary placeholder:text-text-muted outline-none'

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-xl font-semibold font-display text-text-primary mb-1">Tus datos</h2>
      <p className="text-sm text-text-secondary mb-4">
        Dr./Dra. {doctorName} · {selectedDate} · {selectedTime}
      </p>

      <div className="flex flex-col gap-4">
        <div>
          <label htmlFor="patientName" className="block text-sm text-text-secondary font-medium mb-1">
            Nombre completo *
          </label>
          <input
            type="text"
            id="patientName"
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            placeholder="Ej: María García"
            required
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="patientDni" className="block text-sm text-text-secondary font-medium mb-1">
            DNI *
          </label>
          <input
            type="text"
            inputMode="numeric"
            id="patientDni"
            value={patientDni}
            onChange={(e) => setPatientDni(e.target.value)}
            placeholder="Ej: 35421789"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="patientPhone" className="block text-sm text-text-secondary font-medium mb-1">
            Teléfono *
          </label>
          <input
            type="tel"
            inputMode="numeric"
            id="patientPhone"
            value={patientPhone}
            onChange={(e) => setPatientPhone(e.target.value)}
            placeholder="Ej: 2302587896"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="patientInsurance" className="block text-sm text-text-secondary font-medium mb-1">
            Obra social <span className="font-normal opacity-60">(opcional)</span>
          </label>
          <input
            type="text"
            id="patientInsurance"
            value={patientInsurance}
            onChange={(e) => setPatientInsurance(e.target.value)}
            placeholder="Ej: OSDE, Swiss Medical"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="patientEmail" className="block text-sm text-text-secondary font-medium mb-1">
            Email <span className="font-normal opacity-60">(opcional)</span>
          </label>
          <input
            type="email"
            id="patientEmail"
            value={patientEmail}
            onChange={(e) => setPatientEmail(e.target.value)}
            placeholder="Ej: maria@gmail.com"
            className={inputClass}
          />
        </div>

        {error && (
          <div role="alert" className="text-sm text-error bg-error/10 border border-error/20 rounded-lg px-4 py-3">
            {error}
            {error.includes('reservado') && (
              <button
                type="button"
                onClick={onSlotTaken}
                className="block text-sm text-primary underline mt-1"
              >
                ← Elegir otro horario
              </button>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className={cn(
            'btn-primary w-full rounded-lg py-3 text-sm font-semibold transition-all mt-2'
          )}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Reservando...
            </span>
          ) : (
            'Confirmar turno'
          )}
        </button>
      </div>
    </form>
  )
}
