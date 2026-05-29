# Phase 3: Reserva Paciente - Pattern Map

**Mapped:** 2026-05-27
**Files analyzed:** 13 new/modified files
**Analogs found:** 13 / 13

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `prisma/schema.prisma` | model | CRUD | `prisma/schema.prisma` (self — additive edit) | exact |
| `app/(public)/layout.tsx` | config/layout | request-response | `app/(admin)/layout.tsx` | exact |
| `app/(public)/reservar/page.tsx` | component (Server) | request-response | `app/(admin)/admin/especialidades/page.tsx` | exact |
| `app/api/public/specialties/route.ts` | route | request-response | `app/api/admin/specialties/route.ts` | exact (minus auth) |
| `app/api/public/doctors/route.ts` | route | request-response | `app/api/admin/doctors/route.ts` | exact (minus auth) |
| `app/api/public/slots/route.ts` | route | request-response + transform | `app/api/admin/doctors/route.ts` | role-match |
| `app/api/public/appointments/route.ts` | route | CRUD | `app/api/admin/specialties/route.ts` | role-match |
| `components/booking/BookingWizard.tsx` | component (Client) | event-driven | `app/(auth)/login/page.tsx` + `components/admin/Drawer.tsx` | role-match |
| `components/booking/StepSpecialty.tsx` | component (Client) | event-driven | `components/admin/SpecialtiesList.tsx` | role-match |
| `components/booking/StepDoctor.tsx` | component (Client) | event-driven | `components/admin/SpecialtiesList.tsx` | role-match |
| `components/booking/StepDateTime.tsx` | component (Client) | event-driven | `components/admin/Drawer.tsx` | partial-match |
| `components/booking/StepPatientForm.tsx` | component (Client) | request-response | `app/(auth)/login/page.tsx` | exact |
| `components/booking/StepConfirmation.tsx` | component (Client) | event-driven | `components/admin/Drawer.tsx` + `lib/utils.ts` | role-match |

---

## Pattern Assignments

### `prisma/schema.prisma` (model, CRUD)

**Analog:** `prisma/schema.prisma` (self — additive edit)

**Current Appointment model** (lines 60–80):
```prisma
model Appointment {
  id           Int               @id @default(autoincrement())
  doctorId     Int
  doctor       Doctor            @relation(fields: [doctorId], references: [id])
  patientName  String
  patientDni   String
  patientPhone String
  patientEmail String?
  date         DateTime          @db.Date
  time         String
  status       AppointmentStatus @default(PENDING)
  notes        String?
  whatsappSent Boolean           @default(false)
  createdAt    DateTime          @default(now()) @db.Timestamp(6)
  updatedAt    DateTime          @updatedAt @db.Timestamp(6)

  @@unique([doctorId, date, time])
  @@index([patientDni])
  @@index([date])
  @@index([status])
}
```

**Migration action:** Add `patientInsurance String?` after `patientEmail String?`. The field is nullable, so `npm run db:push` applies it without data loss.

**Field to add:**
```prisma
patientInsurance String?
```

**Apply with:** `npm run db:push` (project uses db push workflow — no migrations folder exists).

---

### `app/(public)/layout.tsx` (config/layout, request-response)

**Analog:** `app/(admin)/layout.tsx` (lines 1–12)

**Analog imports + structure** (`app/(admin)/layout.tsx`, lines 1–12):
```typescript
import { AdminSidebar } from '@/components/admin/AdminSidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
```

**Public layout pattern (no sidebar, no html/body):**
```typescript
// app/(public)/layout.tsx
// NO 'use client' — Server Component
// NO <html> or <body> — root app/layout.tsx already provides those
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  )
}
```

**Critical rule confirmed from `app/layout.tsx` (lines 22–34):** Root layout owns `<html lang="es">` and `<body>`. The `(public)` layout MUST NOT re-wrap with those tags — hydration error otherwise.

---

### `app/(public)/reservar/page.tsx` (component, request-response)

**Analog:** `app/(admin)/admin/especialidades/page.tsx` (lines 1–22)

**Server Component page pattern** (full file):
```typescript
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { SpecialtiesList } from '@/components/admin/SpecialtiesList'

export default async function EspecialidadesPage() {
  const headersList = await headers()
  const role = headersList.get('x-user-role') as 'ADMIN' | 'RECEPTIONIST'

  const specialties = await prisma.specialty.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="font-display text-xl font-semibold text-text-primary">Especialidades</h1>
      </div>
      <SpecialtiesList specialties={specialties} role={role} />
    </div>
  )
}
```

**Public page adaptation:** The `/reservar` page is simpler — no `headers()` call, no data prefetch. It just sets metadata and renders the `'use client'` BookingWizard. Pattern: thin Server Component wrapper.

```typescript
// app/(public)/reservar/page.tsx
import type { Metadata } from 'next'
import { BookingWizard } from '@/components/booking/BookingWizard'

export const metadata: Metadata = {
  title: 'Reservar turno — Turnero Médico',
  description: 'Reservá tu turno médico en línea, sin registrarte.',
}

export default function ReservarPage() {
  return <BookingWizard />
}
```

---

### `app/api/public/specialties/route.ts` (route, request-response)

**Analog:** `app/api/admin/specialties/route.ts` (lines 1–16)

**Admin GET pattern (with auth)** (lines 1–16):
```typescript
import { NextRequest } from 'next/server'
import { verifyToken, COOKIE_NAME } from '@/lib/auth'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value
  const payload = token ? verifyToken(token) : null
  if (!payload) return Response.json({ error: 'No autenticado' }, { status: 401 })

  const specialties = await prisma.specialty.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  })
  return Response.json({ specialties })
}
```

**Public version (drop auth block, add select for minimal payload):**
```typescript
// app/api/public/specialties/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_request: NextRequest) {
  const specialties = await prisma.specialty.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, color: true },
  })
  return Response.json({ specialties })
}
```

**Key differences from admin analog:**
- No `verifyToken` / cookie check — `/api/public` is in `PUBLIC_PATHS` in `middleware.ts` (line 7)
- `select` instead of full record — reduces payload to what the wizard needs
- Response format: `Response.json()` not `NextResponse.json()` — confirmed project convention

---

### `app/api/public/doctors/route.ts` (route, request-response)

**Analog:** `app/api/admin/doctors/route.ts` (lines 1–19)

**Admin GET pattern** (lines 1–19):
```typescript
import { NextRequest } from 'next/server'
import { verifyToken, COOKIE_NAME } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value
  const payload = token ? verifyToken(token) : null
  if (!payload) return Response.json({ error: 'No autenticado' }, { status: 401 })

  const doctors = await prisma.doctor.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    include: {
      specialty: { select: { id: true, name: true, color: true } },
    },
  })
  return Response.json({ doctors })
}
```

**Query params pattern** — read `?specialtyId=N` via `request.nextUrl.searchParams`:
```typescript
// app/api/public/doctors/route.ts
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const specialtyId = request.nextUrl.searchParams.get('specialtyId')
  if (!specialtyId) {
    return Response.json({ error: 'specialtyId es requerido' }, { status: 400 })
  }

  const doctors = await prisma.doctor.findMany({
    where: { isActive: true, specialtyId: parseInt(specialtyId, 10) },
    orderBy: { name: 'asc' },
    select: {
      id: true, name: true, bio: true, avatar: true, durationMin: true,
    },
  })
  return Response.json({ doctors })
}
```

---

### `app/api/public/slots/route.ts` (route, request-response + transform)

**Analog:** `app/api/admin/doctors/route.ts` (route structure) — no direct analog for slot generation logic.

**Route structure pattern** (from `app/api/admin/specialties/[id]/route.ts`, lines 1–14):
```typescript
import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = requireAdmin(request)
  if (authResult instanceof Response) return authResult

  const { id } = await params
  const numericId = parseInt(id, 10)
  if (isNaN(numericId)) return Response.json({ error: 'ID inválido' }, { status: 400 })
  // ...
}
```

**Query params read pattern** (from RESEARCH.md, Pattern 2):
```typescript
const searchParams = request.nextUrl.searchParams
const doctorId = searchParams.get('doctorId')
const date = searchParams.get('date') // 'YYYY-MM-DD'

if (!doctorId || !date) {
  return Response.json({ error: 'doctorId y date son requeridos' }, { status: 400 })
}
```

**Prisma parallel query pattern** (confirmed by `app/api/admin/doctors/route.ts` — single findMany; use Promise.all for two):
```typescript
const [doctor, existingAppointments] = await Promise.all([
  prisma.doctor.findUnique({
    where: { id: doctorId, isActive: true },
    include: { availabilities: { where: { dayOfWeek } } },
  }),
  prisma.appointment.findMany({
    where: { doctorId, date: targetDate, status: { not: 'CANCELLED' } },
    select: { time: true },
  }),
])
```

**Slot generation algorithm** (pure arithmetic — no analog in codebase, from RESEARCH.md verified pattern):
```typescript
function generateSlots(startTime: string, endTime: string, durationMin: number): string[] {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  let cur = sh * 60 + sm
  const end = eh * 60 + em
  const slots: string[] = []
  while (cur + durationMin <= end) {
    slots.push(
      `${String(Math.floor(cur / 60)).padStart(2, '0')}:${String(cur % 60).padStart(2, '0')}`
    )
    cur += durationMin
  }
  return slots
}
```

**Date construction (avoid timezone trap):**
```typescript
// CORRECT — local constructor, no Z suffix, no UTC shift
const [year, month, day] = dateStr.split('-').map(Number)
const targetDate = new Date(year, month - 1, day)
// WRONG — new Date('2026-05-27') → UTC midnight → shifts day in local timezone
```

---

### `app/api/public/appointments/route.ts` (route, CRUD)

**Analog:** `app/api/admin/specialties/route.ts` POST section (lines 18–36) for POST structure; P2002 handling is new.

**POST body parse + validation pattern** (`app/api/admin/specialties/route.ts`, lines 18–36):
```typescript
export async function POST(request: NextRequest) {
  const authResult = requireAdmin(request)
  if (authResult instanceof Response) return authResult

  const body = await request.json().catch(() => null)
  if (!body?.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    return Response.json({ error: 'El nombre es requerido' }, { status: 400 })
  }

  const { name, description, color } = body
  const specialty = await prisma.specialty.create({
    data: {
      name: name.trim(),
      description: description ?? null,
      color: color ?? '#0d9488',
    },
  })
  return Response.json({ specialty }, { status: 201 })
}
```

**P2002 race condition pattern (no analog in codebase — from RESEARCH.md):**
```typescript
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'

try {
  const appointment = await prisma.appointment.create({ data: { ... } })
  return Response.json({ appointment }, { status: 201 })
} catch (error) {
  if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
    return Response.json(
      { error: 'Este turno ya fue reservado. Elegí otro horario.' },
      { status: 409 }
    )
  }
  console.error(error)
  return Response.json({ error: 'Error al crear el turno' }, { status: 500 })
}
```

**DNI + phone server-side validation:**
```typescript
const dniClean = String(patientDni ?? '').replace(/[\s.]/g, '')
if (!/^\d{7,8}$/.test(dniClean)) {
  return Response.json({ error: 'DNI inválido' }, { status: 400 })
}
const phoneClean = String(patientPhone ?? '').replace(/\D/g, '')
if (phoneClean.length !== 10) {
  return Response.json({ error: 'Teléfono inválido' }, { status: 400 })
}
```

---

### `components/booking/BookingWizard.tsx` (component, event-driven)

**Analog 1:** `app/(auth)/login/page.tsx` — `'use client'` with `useState`, `fetch`, error state, loading state (lines 1–42)
**Analog 2:** `components/admin/Drawer.tsx` — `AnimatePresence` + `motion.div` pattern (lines 1–52)

**'use client' + useState pattern** (`app/(auth)/login/page.tsx`, lines 1–18):
```typescript
'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', { ... })
      // ...
    } catch {
      setError('Error de conexión. Intente nuevamente.')
    } finally {
      setLoading(false)
    }
  }
```

**AnimatePresence pattern** (`components/admin/Drawer.tsx`, lines 1–51):
```typescript
'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'

export function Drawer({ open, onClose, title, children }: DrawerProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/40 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed right-0 top-0 h-full w-full max-w-md bg-surface rounded-l-xl shadow-modal z-50 flex flex-col"
            initial={{ x: 400 }}
            animate={{ x: 0 }}
            exit={{ x: 400 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
```

**Wizard step transition pattern** (key on `step`, `mode="wait"`, direction-aware):
```typescript
// BookingWizard.tsx — use AnimatePresence mode="wait" + key={step}
<AnimatePresence mode="wait">
  <motion.div
    key={step}
    initial={{ opacity: 0, x: direction * 40 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: direction * -40 }}
    transition={{ duration: direction === 1 ? 0.25 : 0.2, ease: 'easeOut' }}
  >
    {/* step content */}
  </motion.div>
</AnimatePresence>
```

**Glassmorphism card pattern** (`app/(auth)/login/page.tsx`, lines 55–60):
```typescript
<div className="relative w-full max-w-md">
  <div
    className="rounded-xl bg-white/80 p-8 shadow-modal backdrop-blur-xl"
    style={{ boxShadow: 'var(--shadow-md)' }}
  >
```

**Background gradient blob pattern** (`app/(auth)/login/page.tsx`, lines 47–53):
```typescript
<div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
  <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-accent opacity-10 blur-3xl" />
  <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-primary opacity-10 blur-3xl" />
</div>
```

---

### `components/booking/StepSpecialty.tsx` (component, event-driven)

**Analog:** `components/admin/SpecialtiesList.tsx` — card list with colored dot, click handler pattern (lines 1–146)

**Card list structure** (`components/admin/SpecialtiesList.tsx`, lines 78–95):
```typescript
<div className="bg-surface rounded-xl shadow-card">
  {specialties.map((specialty) => (
    <div
      key={specialty.id}
      className="flex items-center gap-4 px-6 py-4 border-b border-border last:border-b-0"
    >
      <div
        className="h-5 w-5 rounded-full flex-shrink-0"
        style={{ backgroundColor: specialty.color }}
      />
      <span className="text-sm font-semibold text-text-primary flex-1">
        {specialty.name}
      </span>
    </div>
  ))}
</div>
```

**Empty state pattern** (`components/admin/SpecialtiesList.tsx`, lines 62–77):
```typescript
{specialties.length === 0 ? (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <p className="text-text-primary font-semibold mb-2">Sin especialidades</p>
    <p className="text-text-secondary text-sm mb-6">
      Aún no hay especialidades registradas.
    </p>
  </div>
) : ( /* list */ )}
```

**Fetch on mount pattern** (`app/(auth)/login/page.tsx` fetch + error pattern, adapted for GET):
```typescript
// StepSpecialty uses useEffect to fetch specialties on mount:
useEffect(() => {
  setLoading(true)
  fetch('/api/public/specialties')
    .then(r => r.json())
    .then(data => setSpecialties(data.specialties ?? []))
    .catch(() => setError('No se pudo cargar las especialidades'))
    .finally(() => setLoading(false))
}, [])
```

---

### `components/booking/StepDoctor.tsx` (component, event-driven)

**Analog:** `components/admin/SpecialtiesList.tsx` — same list pattern; `app/(auth)/login/page.tsx` — fetch + error + loading state

**Fetch pattern with query param:**
```typescript
// Fetch doctors filtered by specialtyId — prop passed from BookingWizard
useEffect(() => {
  setLoading(true)
  fetch(`/api/public/doctors?specialtyId=${specialtyId}`)
    .then(r => r.json())
    .then(data => setDoctors(data.doctors ?? []))
    .catch(() => setError('No se pudo cargar los médicos'))
    .finally(() => setLoading(false))
}, [specialtyId])
```

**Doctor card with avatar fallback** — use `getInitials()` from `lib/utils.ts`:
```typescript
import { getInitials } from '@/lib/utils'

// Avatar fallback:
{doctor.avatar ? (
  <img src={doctor.avatar} alt={doctor.name} className="h-10 w-10 rounded-full object-cover" />
) : (
  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-sm font-semibold">
    {getInitials(doctor.name)}
  </div>
)}
```

---

### `components/booking/StepDateTime.tsx` (component, event-driven)

**Analog:** `components/admin/Drawer.tsx` — client component managing display state; no direct calendar analog exists in codebase.

**State management pattern** (from `components/admin/SpecialtiesList.tsx`, lines 22–47 — local state for active UI):
```typescript
'use client'
import { useState } from 'react'

// StepDateTime owns:
const [currentMonth, setCurrentMonth] = useState(() => {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() } // 0-indexed
})
const [slots, setSlots] = useState<{ time: string; available: boolean }[]>([])
const [loadingSlots, setLoadingSlots] = useState(false)
```

**cn() for conditional chip styling** (`lib/utils.ts`, lines 1–8):
```typescript
import { cn } from '@/lib/utils'

// Chip styling example:
className={cn(
  'rounded-lg px-3 py-2 text-sm font-medium transition-all',
  slot.available
    ? 'bg-primary/10 text-accent border border-accent/30 hover:bg-primary/20 cursor-pointer'
    : 'bg-surface text-text-muted border border-border cursor-not-allowed opacity-60'
)}
```

**Per-day slot fetch pattern:**
```typescript
async function handleDayClick(dateStr: string) {
  setSelectedDate(dateStr)
  setSelectedTime(null)
  setLoadingSlots(true)
  try {
    const res = await fetch(`/api/public/slots?doctorId=${doctorId}&date=${dateStr}`)
    const data = await res.json()
    setSlots(data.slots ?? [])
  } catch {
    setSlots([])
  } finally {
    setLoadingSlots(false)
  }
}
```

**No-availability message pattern** (`components/admin/SpecialtiesList.tsx`, empty state at lines 62–77):
```typescript
{slots.length === 0 && !loadingSlots && selectedDate && (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <p className="text-text-primary font-semibold mb-2">
      Este médico no tiene turnos disponibles
    </p>
    <button onClick={onBack} className="text-sm text-accent underline mt-2">
      Elegir otro médico
    </button>
  </div>
)}
```

---

### `components/booking/StepPatientForm.tsx` (component, request-response)

**Analog:** `app/(auth)/login/page.tsx` — exact match for form with state, validation, error display, loading button (lines 1–164)

**Form input pattern** (`app/(auth)/login/page.tsx`, lines 91–108):
```typescript
<div className="group relative">
  <label
    htmlFor="email"
    className="mb-1.5 block text-sm font-medium text-text-secondary"
  >
    Correo electrónico
  </label>
  <input
    id="email"
    type="email"
    autoComplete="email"
    required
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    placeholder="admin@clinica.com"
    className="w-full rounded-lg border border-border bg-white px-4 py-3 text-sm text-text-primary placeholder:text-text-muted transition-all outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
  />
</div>
```

**DNI/Phone input adaptation** (D-01, D-02 — use `type="text" inputMode="numeric"`, `text-base` to avoid iOS zoom):
```typescript
<input
  id="dni"
  type="text"
  inputMode="numeric"
  value={patientDni}
  onChange={(e) => setPatientDni(e.target.value.replace(/[\s.]/g, ''))}
  placeholder="12345678"
  className="w-full rounded-lg border border-border bg-white px-4 py-3 text-base text-text-primary placeholder:text-text-muted transition-all outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
/>
```

**Error display pattern** (`app/(auth)/login/page.tsx`, lines 131–134):
```typescript
{error && (
  <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-error">
    {error}
  </p>
)}
```

**Loading button pattern** (`app/(auth)/login/page.tsx`, lines 138–155):
```typescript
<button
  type="submit"
  disabled={loading}
  className="w-full rounded-lg bg-gradient-to-r from-primary to-accent py-3 text-sm font-semibold text-white transition-all hover:shadow-[0_0_12px_rgba(20,184,166,0.4)] hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
>
  {loading ? (
    <span className="flex items-center justify-center gap-2">
      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      Reservando...
    </span>
  ) : (
    'Confirmar turno'
  )}
</button>
```

**Client-side validation pattern** (inline, before fetch):
```typescript
function validate(): string | null {
  const dniClean = patientDni.replace(/[\s.]/g, '')
  if (!/^\d{7,8}$/.test(dniClean)) return 'El DNI debe tener 7 u 8 dígitos numéricos'
  const phoneClean = patientPhone.replace(/\D/g, '')
  if (phoneClean.length !== 10) return 'El teléfono debe tener exactamente 10 dígitos'
  if (!patientName.trim()) return 'El nombre completo es requerido'
  if (patientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patientEmail)) {
    return 'El email no tiene un formato válido'
  }
  return null
}
```

---

### `components/booking/StepConfirmation.tsx` (component, event-driven)

**Analog:** `components/admin/Drawer.tsx` (motion animation) + `lib/utils.ts` (formatDate, formatTime)

**formatDate + formatTime usage** (`lib/utils.ts`, lines 10–22):
```typescript
export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit', month: 'long', year: 'numeric',
  }).format(new Date(date))
}

export function formatTime(time: string): string {
  const [h, m] = time.split(':')
  return `${h}:${m} hs`
}
```

**Usage in confirmation:**
```typescript
import { formatDate, formatTime } from '@/lib/utils'

// Display:
<p>{formatDate(confirmedAppointment.date)}</p>
<p>{formatTime(confirmedAppointment.time)}</p>
```

**Success animation pattern** (from `components/admin/Drawer.tsx` motion div, adapted for entrance):
```typescript
import { motion } from 'framer-motion'

<motion.div
  initial={{ opacity: 0, scale: 0.9 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ duration: 0.3, ease: 'easeOut' }}
  className="flex flex-col items-center text-center gap-4 py-8"
>
  <CheckCircle2 className="h-16 w-16 text-accent" />
  <h2 className="font-display text-2xl font-semibold text-text-primary">
    ¡Turno reservado con éxito!
  </h2>
  {/* Summary details */}
</motion.div>
```

---

## Shared Patterns

### Response Format (ALL public Route Handlers)
**Source:** `app/api/admin/specialties/route.ts` lines 15–16
**Apply to:** All `app/api/public/*.ts` files
```typescript
// Always use Response.json(), never NextResponse.json()
return Response.json({ data })           // 200 success
return Response.json({ error }, { status: 400 })  // error
return Response.json({ data }, { status: 201 })   // created
```

### No Auth in Public Routes
**Source:** `middleware.ts` line 7 — `/api/public` is in `PUBLIC_PATHS`
**Apply to:** All `app/api/public/*.ts` files
```typescript
// DO NOT import or call any of these in public routes:
// import { verifyToken, COOKIE_NAME } from '@/lib/auth'
// import { requireAdmin } from '@/lib/auth-helpers'
// request.cookies.get(COOKIE_NAME)
```

### Prisma Singleton Import
**Source:** `lib/prisma.ts` lines 1–11
**Apply to:** All `app/api/public/*.ts` files
```typescript
import { prisma } from '@/lib/prisma'
```

### Body Parse Safety Pattern
**Source:** `app/api/admin/specialties/route.ts` line 22; `app/api/admin/doctors/route.ts` line 25
**Apply to:** POST handlers (appointments)
```typescript
const body = await request.json().catch(() => null)
if (!body) return Response.json({ error: 'Cuerpo requerido' }, { status: 400 })
```

### Design Token Classes (ALL wizard components)
**Source:** `app/(auth)/login/page.tsx` throughout; `components/admin/SpecialtiesList.tsx` throughout
**Apply to:** All `components/booking/*.tsx` files
```
text-text-primary     — headings, body text
text-text-secondary   — labels, hints
text-text-muted       — placeholders, copyright
bg-background         — page background
bg-surface            — card/panel backgrounds
text-accent           — teal accents, links
bg-primary/10         — subtle teal fill (chips, badges)
border-border         — neutral borders
border-accent/30      — teal borders (active state)
shadow-modal          — elevated card shadow (glassmorphic cards)
shadow-card           — list container shadow
font-display          — headings (Outfit font)
rounded-xl            — large cards
rounded-lg            — inputs, buttons, chips
```

### Glassmorphism Card Pattern
**Source:** `app/(auth)/login/page.tsx` lines 55–60
**Apply to:** `BookingWizard.tsx` outer container
```typescript
className="rounded-xl bg-white/80 p-8 shadow-modal backdrop-blur-xl"
style={{ boxShadow: 'var(--shadow-md)' }}
```

### cn() Utility for Conditional Classes
**Source:** `lib/utils.ts` lines 1–8
**Apply to:** All `components/booking/*.tsx` — chips, calendar days, active states
```typescript
import { cn } from '@/lib/utils'

cn('base-classes', condition && 'conditional-classes', otherCondition && 'more-classes')
```

### `'use client'` Directive Placement
**Source:** `app/(auth)/login/page.tsx` line 1; `components/admin/Drawer.tsx` line 1; `components/admin/SpecialtiesList.tsx` line 1
**Apply to:** All `components/booking/*.tsx` files (wizard components are all Client Components)
```typescript
'use client'
// Must be the very first line — before any imports
```

---

## No Analog Found

All files have analogs from the existing codebase. The following patterns had no existing codebase analog and rely solely on RESEARCH.md:

| Pattern | Source |
|---|---|
| Slot generation algorithm (`generateSlots()`) | RESEARCH.md Pattern 3 — pure arithmetic, no library |
| P2002 race condition catch | RESEARCH.md Pattern 4 — Prisma error code handling |
| Calendar grid (monthly view with day states) | RESEARCH.md Pattern 5 — no calendar component exists yet |
| `direction` state for animated step transitions | RESEARCH.md Pattern 6 — bidirectional slide animation |

---

## Metadata

**Analog search scope:** `app/`, `components/admin/`, `lib/`, `prisma/`, `middleware.ts`
**Files scanned:** 11 analog files read; 2 shared utility files (`lib/utils.ts`, `lib/prisma.ts`)
**Pattern extraction date:** 2026-05-27
