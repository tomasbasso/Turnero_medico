# Carga Manual de Turnos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir al staff (ADMIN, DOCTOR, RECEPTIONIST) crear turnos manualmente desde /admin/turnos, con soporte de duración variable (20/40/60 min) que bloquea los slots intermedios del calendario.

**Architecture:** Se agrega `durationMin` al modelo Appointment para registrar la duración real de cada turno. La lógica de disponibilidad de slots se migra de coincidencia exacta a detección de solapamiento de rangos `[T, T+D)`. Un modal `NewAppointmentModal` en la cabecera de `AppointmentsList` orquesta la selección de doctor → fecha → duración → slot → datos del paciente y llama al nuevo handler `POST /api/admin/appointments` que crea el turno como `CONFIRMED`.

**Tech Stack:** Next.js App Router, Prisma, TypeScript, Tailwind CSS, lucide-react

---

## File Map

| Archivo | Acción |
|---|---|
| `prisma/schema.prisma` | Modificar — agregar `durationMin Int @default(20)` a `Appointment` |
| `app/api/public/slots/route.ts` | Modificar — aceptar `?durationMin`, lógica de solapamiento |
| `app/api/public/appointments/route.ts` | Modificar — agregar lookup de doctor + pasar `durationMin` al crear |
| `app/api/admin/appointments/route.ts` | Modificar — agregar handler `POST` con auth, validación y overlap check |
| `components/admin/NewAppointmentModal.tsx` | Crear — modal client component completo |
| `components/admin/AppointmentsList.tsx` | Modificar — tipo Doctor, botón, estado modal, integración |
| `app/(admin)/admin/turnos/page.tsx` | Modificar — agregar `durationMin` al select de doctors |

---

## Task 1: Schema — agregar durationMin a Appointment

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Agregar el campo al modelo Appointment**

Abrir `prisma/schema.prisma`. En el modelo `Appointment`, después de la línea `notes String?`, agregar:

```prisma
durationMin  Int               @default(20)
```

El bloque completo del modelo Appointment queda:

```prisma
model Appointment {
  id           Int               @id @default(autoincrement())
  doctorId     Int
  doctor       Doctor            @relation(fields: [doctorId], references: [id])
  patientName  String
  patientDni   String
  patientPhone String
  patientEmail     String?
  patientInsurance String?
  date             DateTime          @db.Date
  time         String
  durationMin  Int               @default(20)
  status       AppointmentStatus @default(PENDING)
  notes        String?
  whatsappSent Boolean           @default(false)
  createdAt    DateTime          @default(now()) @db.Timestamp(6)
  updatedAt    DateTime          @updatedAt @db.Timestamp(6)

  @@index([patientDni])
  @@index([date])
  @@index([status])
}
```

- [ ] **Step 2: Aplicar el schema a la base de datos**

```bash
npx prisma db push
```

Output esperado: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 3: Verificar que TypeScript compila**

```bash
npx tsc --noEmit
```

Output esperado: sin errores.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): add durationMin to Appointment"
```

---

## Task 2: Actualizar slots API — solapamiento + param ?durationMin

**Files:**
- Modify: `app/api/public/slots/route.ts`

La lógica actual usa un `Set` de tiempos exactos. La nueva lógica usa rangos `[start, start+duration)` para detectar solapamientos. El endpoint acepta `?durationMin=N`; si está ausente, usa el `durationMin` del doctor.

- [ ] **Step 1: Reemplazar el contenido completo del archivo**

```typescript
import { type NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

const BOOKING_WINDOW_DAYS = 30

function generateSlots(startTime: string, endTime: string, durationMin: number): string[] {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  let cur = sh * 60 + sm
  const end = eh * 60 + em
  const slots: string[] = []
  while (cur + durationMin <= end) {
    const h = String(Math.floor(cur / 60)).padStart(2, '0')
    const m = String(cur % 60).padStart(2, '0')
    slots.push(`${h}:${m}`)
    cur += durationMin
  }
  return slots
}

function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export async function GET(request: NextRequest) {
  const doctorIdStr = request.nextUrl.searchParams.get('doctorId')
  const dateStr = request.nextUrl.searchParams.get('date')
  const durationMinStr = request.nextUrl.searchParams.get('durationMin')

  if (!doctorIdStr || !dateStr) {
    return Response.json({ error: 'doctorId y date son requeridos' }, { status: 400 })
  }

  const doctorId = parseInt(doctorIdStr, 10)
  if (isNaN(doctorId)) {
    return Response.json({ error: 'doctorId inválido' }, { status: 400 })
  }

  const [year, month, day] = dateStr.split('-').map(Number)
  const targetDate = new Date(year, month - 1, day)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const maxDate = new Date(today)
  maxDate.setDate(today.getDate() + BOOKING_WINDOW_DAYS)

  if (targetDate < today || targetDate > maxDate) {
    return Response.json({ slots: [] })
  }

  const dayOfWeek = targetDate.getDay()

  try {
    const [doctor, existingAppointments, timeOff] = await Promise.all([
      prisma.doctor.findUnique({
        where: { id: doctorId, isActive: true },
        include: { availabilities: { where: { dayOfWeek } } },
      }),
      prisma.appointment.findMany({
        where: {
          doctorId,
          date: { gte: targetDate, lt: new Date(year, month - 1, day + 1) },
          status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        },
        select: { time: true, durationMin: true },
      }),
      prisma.timeOff.findFirst({
        where: {
          doctorId,
          startDate: { lte: targetDate },
          endDate: { gte: targetDate },
        },
        select: { id: true },
      }),
    ])

    if (!doctor) {
      return Response.json({ error: 'Médico no encontrado' }, { status: 404 })
    }

    if (timeOff) {
      return Response.json({ slots: [] })
    }

    // Use query param duration if provided and valid; otherwise fall back to doctor default
    const parsedDur = durationMinStr ? parseInt(durationMinStr, 10) : NaN
    const requestedDur = !isNaN(parsedDur) && parsedDur > 0 ? parsedDur : doctor.durationMin

    const slots = doctor.availabilities
      .flatMap((av) => generateSlots(av.startTime, av.endTime, doctor.durationMin))
      .map((slotTime) => {
        const tMin = timeToMin(slotTime)
        const available = !existingAppointments.some((a) => {
          const aMin = timeToMin(a.time)
          // Overlap: existing appointment range [aMin, aMin+aDur) overlaps with [tMin, tMin+requestedDur)
          return aMin < tMin + requestedDur && aMin + a.durationMin > tMin
        })
        return { time: slotTime, available }
      })
      .sort((a, b) => a.time.localeCompare(b.time))

    return Response.json({ slots })
  } catch {
    return Response.json({ error: 'Error al obtener slots' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Output esperado: sin errores.

- [ ] **Step 3: Commit**

```bash
git add app/api/public/slots/route.ts
git commit -m "feat(slots): overlap-aware availability + ?durationMin param"
```

---

## Task 3: Actualizar public appointments API — almacenar durationMin

**Files:**
- Modify: `app/api/public/appointments/route.ts`

El wizard público no pasa durationMin en el body. La API necesita fetchear el doctor para obtener su `durationMin` y almacenarlo en el turno.

- [ ] **Step 1: Agregar lookup de doctor y durationMin al crear**

Reemplazar el contenido completo de `app/api/public/appointments/route.ts`:

```typescript
import { type NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!body) return Response.json({ error: 'Cuerpo requerido' }, { status: 400 })

  const { doctorId, date, time, patientName, patientDni, patientPhone, patientEmail, patientInsurance } = body

  if (!patientName || !String(patientName).trim()) {
    return Response.json({ error: 'El nombre es requerido' }, { status: 400 })
  }
  if (!doctorId || isNaN(Number(doctorId))) {
    return Response.json({ error: 'doctorId inválido' }, { status: 400 })
  }
  if (!date || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: 'Fecha inválida' }, { status: 400 })
  }
  if (!time || typeof time !== 'string') {
    return Response.json({ error: 'Hora inválida' }, { status: 400 })
  }

  const dniClean = String(patientDni ?? '').replace(/[\s.]/g, '')
  if (!/^\d{7,8}$/.test(dniClean)) {
    return Response.json({ error: 'El DNI debe tener 7 u 8 dígitos numéricos.' }, { status: 400 })
  }

  const phoneClean = String(patientPhone ?? '').replace(/\D/g, '')
  if (phoneClean.length !== 10) {
    return Response.json({ error: 'El teléfono debe tener exactamente 10 dígitos.' }, { status: 400 })
  }

  if (patientEmail && typeof patientEmail === 'string' && patientEmail.trim() !== '') {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patientEmail.trim())) {
      return Response.json({ error: 'Ingresá un email válido.' }, { status: 400 })
    }
  }

  const [year, month, day] = date.split('-').map(Number)
  const appointmentDate = new Date(year, month - 1, day)

  try {
    const doctor = await prisma.doctor.findUnique({
      where: { id: Number(doctorId), isActive: true },
      select: { durationMin: true },
    })
    if (!doctor) {
      return Response.json({ error: 'Doctor no encontrado' }, { status: 400 })
    }

    const appointment = await prisma.appointment.create({
      data: {
        doctorId: Number(doctorId),
        date: appointmentDate,
        time: String(time),
        durationMin: doctor.durationMin,
        patientName: String(patientName).trim(),
        patientDni: dniClean,
        patientPhone: phoneClean,
        patientEmail: patientEmail?.trim() || null,
        patientInsurance: patientInsurance?.trim() || null,
        status: 'PENDING',
      },
    })
    return Response.json({ appointment }, { status: 201 })
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
      return Response.json(
        { error: 'Este turno ya fue reservado. Elegí otro horario.' },
        { status: 409 }
      )
    }
    console.error('[POST /api/public/appointments]', error)
    return Response.json({ error: 'Error al crear el turno' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Output esperado: sin errores.

- [ ] **Step 3: Commit**

```bash
git add app/api/public/appointments/route.ts
git commit -m "feat(public-appointments): store durationMin from doctor on create"
```

---

## Task 4: Agregar POST handler a admin appointments API

**Files:**
- Modify: `app/api/admin/appointments/route.ts`

Handler `POST` con `requireStaff`, validación de campos, overlap check, y creación del turno como `CONFIRMED`.

- [ ] **Step 1: Agregar el handler POST al archivo existente**

Abrir `app/api/admin/appointments/route.ts`. El archivo actualmente tiene solo un `GET`. Agregar al final del archivo (después del `GET`):

```typescript
export async function POST(request: NextRequest) {
  const authResult = requireStaff(request)
  if (authResult instanceof Response) return authResult

  const body = await request.json().catch(() => null)
  if (!body) return Response.json({ error: 'Cuerpo requerido' }, { status: 400 })

  const {
    doctorId,
    date,
    time,
    durationMin,
    patientName,
    patientDni,
    patientPhone,
    patientEmail,
    patientInsurance,
    notes,
  } = body

  if (!doctorId || isNaN(Number(doctorId))) {
    return Response.json({ error: 'doctorId inválido' }, { status: 400 })
  }
  if (!date || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: 'Fecha inválida' }, { status: 400 })
  }
  if (!time || typeof time !== 'string' || !/^\d{2}:\d{2}$/.test(time)) {
    return Response.json({ error: 'Hora inválida' }, { status: 400 })
  }
  if (![20, 40, 60].includes(Number(durationMin))) {
    return Response.json({ error: 'Duración inválida. Valores permitidos: 20, 40, 60.' }, { status: 400 })
  }
  if (!patientName || !String(patientName).trim()) {
    return Response.json({ error: 'El nombre es requerido' }, { status: 400 })
  }
  const dniClean = String(patientDni ?? '').replace(/[\s.]/g, '')
  if (!/^\d{7,8}$/.test(dniClean)) {
    return Response.json({ error: 'El DNI debe tener 7 u 8 dígitos numéricos.' }, { status: 400 })
  }
  const phoneClean = String(patientPhone ?? '').replace(/\D/g, '')
  if (phoneClean.length !== 10) {
    return Response.json({ error: 'El teléfono debe tener exactamente 10 dígitos.' }, { status: 400 })
  }

  const [year, month, day] = date.split('-').map(Number)
  const appointmentDate = new Date(year, month - 1, day)
  const reqDur = Number(durationMin)

  const doctor = await prisma.doctor.findUnique({
    where: { id: Number(doctorId), isActive: true },
  })
  if (!doctor) {
    return Response.json({ error: 'Doctor no encontrado' }, { status: 404 })
  }

  // Overlap check
  const existing = await prisma.appointment.findMany({
    where: {
      doctorId: Number(doctorId),
      date: { gte: appointmentDate, lt: new Date(year, month - 1, day + 1) },
      status: { notIn: ['CANCELLED', 'NO_SHOW'] },
    },
    select: { time: true, durationMin: true },
  })

  function timeToMin(t: string): number {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }

  const reqMin = timeToMin(time)
  const hasConflict = existing.some((a) => {
    const aMin = timeToMin(a.time)
    return aMin < reqMin + reqDur && aMin + a.durationMin > reqMin
  })

  if (hasConflict) {
    return Response.json(
      { error: 'El horario ya no está disponible, elegí otro slot.' },
      { status: 409 }
    )
  }

  const appointment = await prisma.appointment.create({
    data: {
      doctorId: Number(doctorId),
      date: appointmentDate,
      time: String(time),
      durationMin: reqDur,
      patientName: String(patientName).trim(),
      patientDni: dniClean,
      patientPhone: phoneClean,
      patientEmail: patientEmail?.trim() || null,
      patientInsurance: patientInsurance?.trim() || null,
      notes: notes?.trim() || null,
      status: 'CONFIRMED',
    },
  })

  return Response.json({ appointment }, { status: 201 })
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Output esperado: sin errores.

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/appointments/route.ts
git commit -m "feat(admin-appointments): POST handler — manual CONFIRMED appointment"
```

---

## Task 5: Crear NewAppointmentModal

**Files:**
- Create: `components/admin/NewAppointmentModal.tsx`

- [ ] **Step 1: Crear el archivo**

```typescript
'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { cn, formatTime } from '@/lib/utils'

type Doctor = { id: number; name: string; durationMin: number }
type Slot = { time: string; available: boolean }
type DurationOption = 20 | 40 | 60

interface NewAppointmentModalProps {
  doctors: Doctor[]
  onCreated: () => void
  onClose: () => void
}

const inputClass =
  'rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-[rgba(20,184,166,0.4)] focus:outline-none focus:ring-1 focus:ring-[rgba(20,184,166,0.4)] w-full'

const DURATION_OPTIONS: DurationOption[] = [20, 40, 60]

export function NewAppointmentModal({ doctors, onCreated, onClose }: NewAppointmentModalProps) {
  const [doctorId, setDoctorId] = useState<number | ''>('')
  const [date, setDate] = useState('')
  const [durationMin, setDurationMin] = useState<DurationOption>(20)
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

  // When doctor changes, update default duration to match doctor's slot size
  useEffect(() => {
    if (doctorId === '') return
    const doctor = doctors.find((d) => d.id === doctorId)
    if (doctor) {
      const def = DURATION_OPTIONS.includes(doctor.durationMin as DurationOption)
        ? (doctor.durationMin as DurationOption)
        : 20
      setDurationMin(def)
    }
  }, [doctorId, doctors])

  // Fetch slots when doctor, date, or duration changes
  useEffect(() => {
    if (!doctorId || !date) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative w-full max-w-lg rounded-2xl bg-background shadow-xl overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border">
          <h2 className="font-display text-lg font-semibold text-text-primary">Nuevo turno</h2>
          <button
            type="button"
            onClick={onClose}
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
              {DURATION_OPTIONS.map((opt) => (
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
            <p className="text-sm text-error bg-red-50 border border-red-200 rounded-lg px-4 py-2">
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
                'px-5 py-2 rounded-lg bg-accent text-white text-sm font-semibold transition-colors',
                loading || !time
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-teal-600'
              )}
            >
              {loading ? 'Guardando...' : 'Guardar turno'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Output esperado: sin errores.

- [ ] **Step 3: Commit**

```bash
git add components/admin/NewAppointmentModal.tsx
git commit -m "feat(modal): NewAppointmentModal — staff manual appointment creation"
```

---

## Task 6: Integrar modal en AppointmentsList y página

**Files:**
- Modify: `components/admin/AppointmentsList.tsx`
- Modify: `app/(admin)/admin/turnos/page.tsx`

- [ ] **Step 1: Actualizar tipo Doctor en AppointmentsList**

En `components/admin/AppointmentsList.tsx`, cambiar la definición del tipo `Doctor`:

```typescript
// ANTES:
type Doctor = { id: number; name: string }

// DESPUÉS:
type Doctor = { id: number; name: string; durationMin: number }
```

- [ ] **Step 2: Agregar import de NewAppointmentModal y Plus**

Al principio del archivo, agregar a los imports:

```typescript
import { MessageCircle, MessageCircleCheck, Calendar, Plus } from 'lucide-react'
import { NewAppointmentModal } from '@/components/admin/NewAppointmentModal'
```

(Reemplazar la línea de import de lucide-react existente con la versión que incluye `Plus`.)

- [ ] **Step 3: Agregar estado showNewModal**

Dentro de la función `AppointmentsList`, después de la línea `const [mutationError, setMutationError] = useState<string | null>(null)`, agregar:

```typescript
const [showNewModal, setShowNewModal] = useState(false)
```

- [ ] **Step 4: Agregar botón "Nuevo turno" junto a los tabs**

En el JSX, la sección de tabs actualmente es:

```tsx
<div className="flex gap-1 mb-6 border-b border-border">
```

Reemplazarla por un wrapper que pone los tabs a la izquierda y el botón a la derecha:

```tsx
<div className="flex items-end justify-between mb-6 border-b border-border">
  <div className="flex gap-1">
```

Y cerrar el `div` de tabs antes del cierre del wrapper, luego agregar el botón:

```tsx
  </div>
  <button
    onClick={() => setShowNewModal(true)}
    className="mb-px flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-teal-600 transition-colors"
  >
    <Plus className="h-4 w-4" />
    Nuevo turno
  </button>
</div>
```

- [ ] **Step 5: Renderizar el modal al final del return**

Antes del `</div>` de cierre del return principal, agregar:

```tsx
{showNewModal && (
  <NewAppointmentModal
    doctors={doctors}
    onCreated={() => {
      setShowNewModal(false)
      fetchAppointments(filters)
    }}
    onClose={() => setShowNewModal(false)}
  />
)}
```

- [ ] **Step 6: Actualizar page.tsx — agregar durationMin al select de doctors**

En `app/(admin)/admin/turnos/page.tsx`, cambiar el select de doctors:

```typescript
// ANTES:
select: { id: true, name: true },

// DESPUÉS:
select: { id: true, name: true, durationMin: true },
```

- [ ] **Step 7: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Output esperado: sin errores.

- [ ] **Step 8: Commit**

```bash
git add components/admin/AppointmentsList.tsx app/(admin)/admin/turnos/page.tsx
git commit -m "feat(turnos): integrate NewAppointmentModal — Nuevo turno button for staff"
```

---

## Task 7: Verificación manual

- [ ] **Step 1: Iniciar el servidor**

```bash
npm run dev
```

- [ ] **Step 2: Verificar flujo completo**

1. Ir a `/admin/turnos` con usuario RECEPTIONIST o DOCTOR.
2. Verificar que aparece el botón **"Nuevo turno"** en la cabecera, junto a los tabs.
3. Hacer clic → verificar que se abre el modal.
4. Seleccionar un doctor y una fecha → verificar que aparecen los slots.
5. Cambiar la duración a **40 min** → verificar que los slots cambian (algunos que antes estaban disponibles quedan bloqueados si hay turnos cercanos).
6. Seleccionar un slot disponible → se resalta en teal.
7. Completar nombre, DNI (8 dígitos), teléfono (10 dígitos) → hacer clic en **Guardar turno**.
8. Verificar que el modal se cierra y el turno aparece en la lista con estado **Confirmado**.
9. Ir a `/reservar` y verificar que los slots bloqueados (por solapamiento) ya no aparecen como disponibles para ese doctor y fecha.
10. Intentar crear un turno en un horario ya ocupado → verificar que el modal muestra el error de conflicto sin cerrarse.
