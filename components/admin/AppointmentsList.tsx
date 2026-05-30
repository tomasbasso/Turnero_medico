'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { MessageCircle, MessageCircleCheck, Calendar } from 'lucide-react'
import { cn, formatDate, formatTime, formatDni, STATUS_LABELS, STATUS_COLORS } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW'

type Doctor = { id: number; name: string }

type Appointment = {
  id: number
  doctorId: number
  patientName: string
  patientDni: string
  patientPhone: string
  patientEmail: string | null
  patientInsurance: string | null
  date: string
  time: string
  status: AppointmentStatus
  notes: string | null
  whatsappSent: boolean
  doctor: Doctor
}

interface AppointmentsListProps {
  initialData: Appointment[]
  doctors: Doctor[]
  role: 'ADMIN' | 'RECEPTIONIST'
}

// ─── Constants ────────────────────────────────────────────────────────────────

const inputClass =
  'rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-[rgba(20,184,166,0.4)] focus:outline-none focus:ring-1 focus:ring-[rgba(20,184,166,0.4)]'

type Tab = 'pendientes' | 'pordia'

const TAB_FILTERS: Record<Tab, { date: string; doctorId: string; status: string; dni: string }> = {
  pendientes: { date: '', doctorId: '', status: 'PENDING', dni: '' },
  pordia: { date: new Date().toISOString().split('T')[0], doctorId: '', status: '', dni: '' },
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AppointmentsList({ initialData, doctors, role }: AppointmentsListProps) {
  const [activeTab, setActiveTab] = useState<Tab>('pendientes')
  const [appointments, setAppointments] = useState<Appointment[]>(initialData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState(TAB_FILTERS.pendientes)
  const [cancellingId, setCancellingId] = useState<number | null>(null)
  const [loadingId, setLoadingId] = useState<number | null>(null)
  const [mutationError, setMutationError] = useState<string | null>(null)

  const dniDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ─── Fetch appointments ──────────────────────────────────────────────────

  const fetchAppointments = useCallback(
    async (currentFilters: typeof filters) => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams()
        if (currentFilters.date) params.set('date', currentFilters.date)
        if (currentFilters.doctorId) params.set('doctorId', currentFilters.doctorId)
        if (currentFilters.status) params.set('status', currentFilters.status)
        if (currentFilters.dni) params.set('dni', currentFilters.dni)

        const res = await fetch(`/api/admin/appointments?${params.toString()}`)
        if (!res.ok) throw new Error('fetch failed')
        const data = await res.json()
        setAppointments(data.appointments)
      } catch {
        setError('No se pudieron cargar los turnos. Recargá la página.')
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // ─── Effect: date / doctorId / status — immediate fetch ─────────────────

  useEffect(() => {
    fetchAppointments(filters)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.date, filters.doctorId, filters.status])

  // ─── Effect: DNI — debounced 300ms ──────────────────────────────────────

  useEffect(() => {
    if (dniDebounceRef.current) clearTimeout(dniDebounceRef.current)
    dniDebounceRef.current = setTimeout(() => {
      fetchAppointments(filters)
    }, 300)
    return () => {
      if (dniDebounceRef.current) clearTimeout(dniDebounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.dni])

  // ─── Handlers ───────────────────────────────────────────────────────────

  function handleTabChange(tab: Tab) {
    setActiveTab(tab)
    setFilters(TAB_FILTERS[tab])
    setCancellingId(null)
    setMutationError(null)
  }

  async function handleStatusChange(id: number, status: string) {
    setLoadingId(id)
    setMutationError(null)
    try {
      const res = await fetch(`/api/admin/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        const data = await res.json()
        setAppointments((prev) =>
          prev.map((a) => (a.id === id ? { ...a, ...data.appointment } : a))
        )
      } else {
        setMutationError('No se pudo actualizar el turno. Intentá de nuevo.')
      }
    } catch {
      setMutationError('No se pudo actualizar el turno. Intentá de nuevo.')
    } finally {
      setLoadingId(null)
      setCancellingId(null)
    }
  }

  function buildWhatsAppUrl(appointment: Appointment): string {
    const phone = appointment.patientPhone.replace(/^0/, '')
    const message = `Hola ${appointment.patientName}, tu turno con ${appointment.doctor.name} el ${formatDate(appointment.date)} a las ${formatTime(appointment.time)} ha sido CONFIRMADO.`
    return `https://wa.me/549${phone}?text=${encodeURIComponent(message)}`
  }

  function handleWhatsAppClick(id: number) {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, whatsappSent: true } : a))
    )
    fetch(`/api/admin/appointments/${id}/whatsapp`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ whatsappSent: true }),
    }).catch(console.error)
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        <button
          onClick={() => handleTabChange('pendientes')}
          className={cn(
            'px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors',
            activeTab === 'pendientes'
              ? 'border-accent text-accent'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          )}
        >
          Pendientes
        </button>
        <button
          onClick={() => handleTabChange('pordia')}
          className={cn(
            'px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors',
            activeTab === 'pordia'
              ? 'border-accent text-accent'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          )}
        >
          Por día
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {activeTab === 'pordia' && (
          <input
            type="date"
            className={inputClass}
            value={filters.date}
            onChange={(e) => setFilters((f) => ({ ...f, date: e.target.value }))}
          />
        )}
        <select
          className={cn(inputClass, 'w-48')}
          value={filters.doctorId}
          onChange={(e) => setFilters((f) => ({ ...f, doctorId: e.target.value }))}
        >
          <option value="">Todos los médicos</option>
          {doctors.map((d) => (
            <option key={d.id} value={String(d.id)}>
              {d.name}
            </option>
          ))}
        </select>
        {activeTab === 'pordia' && (
          <select
            className={cn(inputClass, 'w-40')}
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          >
            <option value="">Todos los estados</option>
            {(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'] as AppointmentStatus[]).map(
              (s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              )
            )}
          </select>
        )}
        <input
          type="text"
          className={cn(inputClass, 'w-40')}
          placeholder="Buscar por DNI"
          value={filters.dni}
          onChange={(e) => setFilters((f) => ({ ...f, dni: e.target.value }))}
        />
      </div>

      {/* Mutation error */}
      {mutationError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-error">
          {mutationError}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="py-8 text-center text-sm text-text-secondary">Cargando...</div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="py-8 text-center text-sm text-text-secondary">{error}</div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="bg-surface rounded-xl shadow-card">
          {appointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="h-10 w-10 text-text-muted mb-3" />
              <p className="text-sm font-semibold text-text-primary mb-1">
                Sin turnos para este filtro
              </p>
              <p className="text-sm text-text-secondary">
                Probá con otra fecha, médico o estado.
              </p>
            </div>
          ) : (
            <table className="w-full table-auto">
              <thead className="border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wide">
                    Paciente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wide">
                    Médico
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wide">
                    Fecha y Hora
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wide w-32">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wide w-40 text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appointment) => (
                  <tr
                    key={appointment.id}
                    className="border-b border-border last:border-b-0 hover:bg-background transition-colors"
                  >
                    {/* Paciente + DNI */}
                    <td className="px-6 py-4 align-top">
                      <p className="text-sm font-semibold text-text-primary">
                        {appointment.patientName}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {formatDni(appointment.patientDni)}
                      </p>
                    </td>

                    {/* Médico */}
                    <td className="px-6 py-4 align-top">
                      <span className="text-sm text-text-primary">
                        {appointment.doctor.name}
                      </span>
                    </td>

                    {/* Fecha + Hora */}
                    <td className="px-6 py-4 align-top">
                      <p className="text-sm text-text-primary">
                        {formatDate(appointment.date)}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {formatTime(appointment.time)}
                      </p>
                    </td>

                    {/* Estado */}
                    <td className="px-6 py-4 align-top w-32">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                          STATUS_COLORS[appointment.status]
                        )}
                      >
                        {STATUS_LABELS[appointment.status]}
                      </span>
                    </td>

                    {/* Acciones */}
                    <td className="px-6 py-4 align-top w-40">
                      {appointment.status === 'PENDING' && role === 'ADMIN' && (
                        <>
                          {cancellingId === appointment.id ? (
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-xs text-text-secondary">
                                ¿Cancelar este turno?
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  className="text-sm font-semibold text-error"
                                  onClick={() =>
                                    handleStatusChange(appointment.id, 'CANCELLED')
                                  }
                                >
                                  Sí, cancelar
                                </button>
                                <button
                                  className="text-sm text-text-secondary"
                                  onClick={() => setCancellingId(null)}
                                >
                                  No
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                className={cn(
                                  'text-sm font-semibold text-teal-700 hover:text-teal-900 transition-colors',
                                  loadingId === appointment.id &&
                                    'opacity-50 cursor-not-allowed'
                                )}
                                disabled={loadingId === appointment.id}
                                onClick={() =>
                                  handleStatusChange(appointment.id, 'CONFIRMED')
                                }
                              >
                                Confirmar
                              </button>
                              <button
                                className={cn(
                                  'text-sm font-semibold text-error hover:text-red-700 transition-colors',
                                  loadingId === appointment.id &&
                                    'opacity-50 cursor-not-allowed'
                                )}
                                disabled={loadingId === appointment.id}
                                onClick={() => setCancellingId(appointment.id)}
                              >
                                Cancelar
                              </button>
                            </div>
                          )}
                        </>
                      )}

                      {appointment.status === 'CONFIRMED' && (
                        <div className="flex flex-col items-end gap-1.5">
                          <a
                            href={buildWhatsAppUrl(appointment)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => handleWhatsAppClick(appointment.id)}
                            className="flex items-center gap-1 text-sm text-accent hover:underline"
                          >
                            {appointment.whatsappSent ? (
                              <MessageCircleCheck className="h-4 w-4 text-accent" />
                            ) : (
                              <MessageCircle className="h-4 w-4 text-accent" />
                            )}
                            {appointment.whatsappSent ? 'WA enviado' : 'Enviar WA'}
                          </a>
                          <div className="flex items-center gap-2">
                            <button
                              className={cn(
                                'text-sm font-semibold text-teal-700 hover:text-teal-900 transition-colors',
                                loadingId === appointment.id && 'opacity-50 cursor-not-allowed'
                              )}
                              disabled={loadingId === appointment.id}
                              onClick={() => handleStatusChange(appointment.id, 'COMPLETED')}
                            >
                              Completar
                            </button>
                            <button
                              className={cn(
                                'text-sm font-semibold text-orange-600 hover:text-orange-800 transition-colors',
                                loadingId === appointment.id && 'opacity-50 cursor-not-allowed'
                              )}
                              disabled={loadingId === appointment.id}
                              onClick={() => handleStatusChange(appointment.id, 'NO_SHOW')}
                            >
                              Ausente
                            </button>
                          </div>
                        </div>
                      )}

                      {(appointment.status === 'CANCELLED' ||
                        appointment.status === 'COMPLETED' ||
                        appointment.status === 'NO_SHOW' ||
                        (appointment.status === 'PENDING' && role !== 'ADMIN')) && (
                        <span className="text-xs text-text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
