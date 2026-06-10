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
  type FieldErrors = {
    patientName?: string
    patientDni?: string
    patientPhone?: string
    patientEmail?: string
  }

  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)

  function validate(): FieldErrors | null {
    const errs: FieldErrors = {}
    const dniClean = patientDni.replace(/[\s.]/g, '')
    if (!patientName.trim()) errs.patientName = 'Ingresá tu nombre completo.'
    if (!dniClean) errs.patientDni = 'Ingresá tu DNI.'
    else if (!/^\d{7,8}$/.test(dniClean)) errs.patientDni = 'El DNI debe tener 7 u 8 dígitos numéricos.'
    if (!patientPhone.trim()) errs.patientPhone = 'Ingresá tu teléfono.'
    if (patientEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patientEmail.trim())) {
      errs.patientEmail = 'Ingresá un email válido.'
    }
    return Object.keys(errs).length > 0 ? errs : null
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (errs) {
      setFieldErrors(errs)
      return
    }
    setFieldErrors({})
    setServerError(null)
    setLoading(true)
    const dniClean = patientDni.replace(/[\s.]/g, '')
    fetch('/api/public/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doctorId,
        date: selectedDate,
        time: selectedTime,
        patientName: patientName.trim(),
        patientDni: dniClean,
        patientPhone: patientPhone.trim(),
        patientInsurance: patientInsurance.trim() || null,
        patientEmail: patientEmail.trim() || null,
      }),
    })
      .then((r) => r.json().then((data) => ({ ok: r.ok, status: r.status, data })))
      .then(({ ok, status, data }) => {
        if (ok) {
          onSuccess(data.appointment)
        } else if (status === 409) {
          setServerError(data.error || 'Este turno ya fue reservado. Elegí otro horario.')
        } else {
          setServerError('Ocurrió un error al reservar. Intentá nuevamente.')
        }
      })
      .catch(() => setServerError('Ocurrió un error al reservar. Intentá nuevamente.'))
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
            onChange={(e) => { setPatientName(e.target.value); setFieldErrors((prev) => ({ ...prev, patientName: undefined })) }}
            placeholder="Ej: María García"
            className={cn(inputClass, fieldErrors.patientName && 'border-error')}
          />
          {fieldErrors.patientName && (
            <p className="text-xs text-error mt-1">{fieldErrors.patientName}</p>
          )}
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
            onChange={(e) => { setPatientDni(e.target.value); setFieldErrors((prev) => ({ ...prev, patientDni: undefined })) }}
            placeholder="Ej: 35421789"
            className={cn(inputClass, fieldErrors.patientDni && 'border-error')}
          />
          {fieldErrors.patientDni && (
            <p className="text-xs text-error mt-1">{fieldErrors.patientDni}</p>
          )}
        </div>

        <div>
          <label htmlFor="patientPhone" className="block text-sm text-text-secondary font-medium mb-1">
            Teléfono *
          </label>
          <input
            type="tel"
            id="patientPhone"
            value={patientPhone}
            onChange={(e) => { setPatientPhone(e.target.value); setFieldErrors((prev) => ({ ...prev, patientPhone: undefined })) }}
            placeholder="Ej: 2302587896"
            className={cn(inputClass, fieldErrors.patientPhone && 'border-error')}
          />
          {fieldErrors.patientPhone && (
            <p className="text-xs text-error mt-1">{fieldErrors.patientPhone}</p>
          )}
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
            onChange={(e) => { setPatientEmail(e.target.value); setFieldErrors((prev) => ({ ...prev, patientEmail: undefined })) }}
            placeholder="Ej: maria@gmail.com"
            className={cn(inputClass, fieldErrors.patientEmail && 'border-error')}
          />
          {fieldErrors.patientEmail && (
            <p className="text-xs text-error mt-1">{fieldErrors.patientEmail}</p>
          )}
        </div>

        {serverError && (
          <div role="alert" className="text-sm text-error bg-error/10 border border-error/20 rounded-lg px-4 py-3">
            {serverError}
            {serverError.includes('reservado') && (
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
