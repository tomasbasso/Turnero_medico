# Phase 3: Reserva Paciente - Research

**Researched:** 2026-05-27
**Domain:** Public booking wizard — Next.js 16 App Router, Prisma, framer-motion, Tailwind v4
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** DNI — solo números, 7-8 dígitos. Strip de puntos y espacios antes de validar y guardar.
- **D-02:** Teléfono — exactamente 10 dígitos numéricos (formato argentino sin prefijo internacional).
- **D-03:** Email — campo opcional (`String?`). Si se provee, validar formato básico (regex).
- **D-04:** Sin restricción de reserva por DNI — un paciente puede tener múltiples turnos el mismo día. La única protección de unicidad es `@@unique([doctorId, date, time])` a nivel DB.
- **D-05:** Obra social — agregar campo `patientInsurance String?` al modelo `Appointment`. Campo de texto libre, opcional. Requiere migración de schema.
- **D-06:** Ventana de reserva — 30 días hacia adelante desde hoy (configurable como constante).
- **D-07:** Vista de fechas — grilla de calendario mensual. Días con al menos un slot disponible en teal/activo; días sin disponibilidad o pasados en gris.
- **D-08:** Vista de horarios — chips/botones en grilla. Slot disponible: teal clickeable. Slot ocupado: gris, no clickeable (visible para contexto).
- **D-09:** Sin disponibilidad — si el médico no tiene turnos en los próximos 30 días, mostrar mensaje amigable con botón para volver al paso 2.

### Claude's Discretion

- **Estructura del wizard:** Ruta única `/reservar` con estado gestionado en React (useState lifting). No rutas por paso. Estado se pierde en recarga — aceptable.
- **Confirmación final:** Pantalla con resumen del turno. Sin email de confirmación en esta fase.
- **Race condition / doble booking:** `@@unique([doctorId, date, time])` rechaza duplicados. Mostrar error amigable.
- **APIs públicas:** Rutas bajo `app/api/public/` sin JWT. GET especialidades, médicos y slots; POST crear turno.
- **Glassmorphism en el wizard:** Estilo "Modern Clinical Sanctuary" — `backdrop-blur-md`, `bg-white/80` cards, bordes teal suaves.

### Deferred Ideas (OUT OF SCOPE)

- Email de confirmación automático al paciente — Fase 5 o nueva fase.
- Verificación de disponibilidad en tiempo real (WebSockets o polling) — overkill.
- Filtro de médicos sin disponibilidad en el paso 2 — mensaje en paso 3 es suficiente.

</user_constraints>

---

## Summary

Phase 3 builds the public 5-step booking wizard at `/reservar`. No authentication is involved — middleware already lists `/reservar` and `/api/public` as public paths, so no middleware changes are needed. The wizard is a single `'use client'` component that manages all state via `useState`; steps render conditionally inside a glassmorphic card.

The most technically complex piece is **slot generation**: given a doctor's `Availability` records (dayOfWeek + startTime + endTime) and their `durationMin`, the backend must generate every possible time slot across a 30-day window, then subtract slots already booked (existing `Appointment` rows for that doctor+date). This is pure Prisma + date arithmetic — no external library needed.

The schema requires one migration: adding `patientInsurance String?` to `Appointment`. The `@@unique([doctorId, date, time])` constraint already exists and acts as the race-condition guard — a second insert for the same slot will throw a Prisma unique constraint error (`P2002`), which the route handler catches and maps to a 409 response.

**Primary recommendation:** Build as three parallel deliverables — (1) Prisma migration, (2) public API routes, (3) wizard UI components — then wire together.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Wizard UI (5 steps, state, animations) | Browser / Client | — | All state is local React; no server rendering needed for wizard steps |
| `/reservar` page shell | Frontend Server (SSR) | — | Server Component page that renders the `'use client'` BookingWizard; sets `<title>` metadata |
| Public layout (no sidebar) | Frontend Server (SSR) | — | `app/(public)/layout.tsx` — simple full-width layout with no nav |
| GET specialties, doctors, slots | API / Backend | — | Prisma queries in Route Handlers; no auth |
| POST appointment (create booking) | API / Backend | — | Validates input, inserts Appointment, handles P2002 unique error |
| Slot generation algorithm | API / Backend | — | Pure date arithmetic inside the `/slots` route handler |
| Schema migration (patientInsurance) | Database / Storage | — | `prisma db push` or `prisma migrate dev` |
| Race condition guard | Database / Storage | API / Backend | DB unique constraint is the authoritative guard; API maps error to friendly message |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.2.6 | App Router, Route Handlers, layouts | Project foundation — already installed |
| React | 19.2.4 | Client Components, `useState`, `useEffect` | Project foundation |
| Prisma Client | 6.19.3 | DB queries (findMany, create, transaction) | Project ORM — already installed |
| Tailwind CSS | v4 | Design tokens, utility classes | Project design system — globals.css @theme |
| framer-motion | 12.40.0 | Step transitions, success animation, chip entrance | Already installed; Drawer.tsx proves pattern |
| lucide-react | 1.16.0 | Icons: Stethoscope, UserX, CalendarX, Clock, CheckCircle2, Loader2, ChevronLeft, ChevronRight | Already installed |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lib/utils.ts` (cn, formatDate, formatTime) | n/a (local) | Class merging, date/time formatting | Always — in every wizard component |
| `lib/prisma.ts` | n/a (local) | Singleton Prisma client | Every public Route Handler |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom slot generator | date-fns / dayjs | No library needed — the slot algorithm is simple arithmetic. External library adds bundle weight for no gain. |
| useState for wizard state | useReducer, Context | wizard has 5 known steps and ~10 state values; useState is sufficient and avoids boilerplate |
| Manual unique check before insert | DB unique constraint | DB constraint is atomic and race-condition-safe; application-level pre-check is not |

**Installation:** No new packages required. All dependencies are already present.

---

## Package Legitimacy Audit

> No new packages are installed in this phase. All libraries (Next.js, framer-motion, lucide-react, Prisma, Tailwind) are already present in `node_modules` from prior phases.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
Patient Browser
    │
    ▼
[GET /api/public/specialties]
    │  ← no auth header
    ▼
Specialty list displayed (Step 1)
    │ user selects specialty
    ▼
[GET /api/public/doctors?specialtyId=N]
    │
    ▼
Doctor list displayed (Step 2)
    │ user selects doctor
    ▼
[GET /api/public/slots?doctorId=N&date=YYYY-MM-DD]  ← per day click
    │
    │  Route Handler:
    │  1. Load doctor.availabilities for dayOfWeek matching date
    │  2. Generate all time slots (startTime → endTime by durationMin)
    │  3. Load existing Appointments for doctor+date
    │  4. Mark each slot available/occupied
    ▼
Calendar + chip grid displayed (Step 3)
    │ user selects date + time slot
    ▼
Patient form displayed (Step 4)
    │ user fills name/DNI/phone/insurance/email
    │ validation runs on blur + submit
    ▼
[POST /api/public/appointments]
    │  body: { doctorId, date, time, patientName, patientDni,
    │          patientPhone, patientEmail?, patientInsurance? }
    │
    ├─ DB insert succeeds → 201 → Step 5 confirmation
    └─ DB P2002 unique error → 409 → inline race-condition error (stay on Step 4)
```

### Recommended Project Structure

```
app/
├── (public)/
│   ├── layout.tsx              # Full-width layout, no sidebar
│   └── reservar/
│       └── page.tsx            # Server Component: metadata + <BookingWizard />
├── api/
│   └── public/
│       ├── specialties/
│       │   └── route.ts        # GET: active specialties ordered by name
│       ├── doctors/
│       │   └── route.ts        # GET ?specialtyId=N: active doctors with availability
│       ├── slots/
│       │   └── route.ts        # GET ?doctorId=N&date=YYYY-MM-DD: generated slots
│       └── appointments/
│           └── route.ts        # POST: create appointment, handle P2002
components/
└── booking/
    ├── BookingWizard.tsx        # 'use client' — root wizard, owns all state
    ├── StepProgress.tsx         # 5-dot progress bar with connector lines
    ├── StepSpecialty.tsx        # Step 1: specialty card grid
    ├── StepDoctor.tsx           # Step 2: doctor list
    ├── StepDateTime.tsx         # Step 3: calendar + time chips
    ├── StepPatientForm.tsx      # Step 4: form with validation
    ├── StepConfirmation.tsx     # Step 5: success summary
    ├── CalendarGrid.tsx         # Monthly calendar sub-component
    └── TimeSlotChips.tsx        # Chip grid sub-component
prisma/
└── schema.prisma               # Add patientInsurance String? to Appointment
```

### Pattern 1: Public Route Handler (No Auth)

**What:** Route Handler that skips JWT verification — no cookie reading needed.
**When to use:** All `app/api/public/` endpoints.

```typescript
// Source: app/api/admin/specialties/route.ts (contrast pattern — this omits auth)
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

### Pattern 2: Query Params in Route Handler

**What:** Read `?doctorId=N&date=YYYY-MM-DD` via `request.nextUrl.searchParams`.
**When to use:** GET /api/public/slots and GET /api/public/doctors.

```typescript
// Source: Next.js 16 route.md — URL Query Parameters section
// app/api/public/slots/route.ts
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const doctorId = searchParams.get('doctorId')
  const date = searchParams.get('date') // 'YYYY-MM-DD'

  if (!doctorId || !date) {
    return Response.json({ error: 'doctorId y date son requeridos' }, { status: 400 })
  }
  // ... slot generation logic
}
```

### Pattern 3: Slot Generation Algorithm

**What:** Generate time chips from Availability rows minus booked Appointments.
**When to use:** Inside GET /api/public/slots.

```typescript
// Source: [VERIFIED: prisma/schema.prisma] — Availability(dayOfWeek, startTime, endTime), Doctor(durationMin)
// [VERIFIED: Next.js 16 route.md] — route handler pattern

function generateSlots(startTime: string, endTime: string, durationMin: number): string[] {
  const slots: string[] = []
  const [startH, startM] = startTime.split(':').map(Number)
  const [endH, endM] = endTime.split(':').map(Number)
  let currentMinutes = startH * 60 + startM
  const endMinutes = endH * 60 + endM

  while (currentMinutes + durationMin <= endMinutes) {
    const h = Math.floor(currentMinutes / 60).toString().padStart(2, '0')
    const m = (currentMinutes % 60).toString().padStart(2, '0')
    slots.push(`${h}:${m}`)
    currentMinutes += durationMin
  }
  return slots
}

// In the route handler:
// 1. Determine dayOfWeek from date string (0=Sunday per JS Date)
// 2. Load doctor availabilities WHERE dayOfWeek = targetDayOfWeek
// 3. For each availability: generate slots
// 4. Load booked appointments for doctorId + date
// 5. For each slot: mark as { time, available: !bookedSet.has(time) }
```

**Critical date gotcha:** The `date` column in Prisma schema is `@db.Date`. When querying appointments by date, use Prisma's date equality. The `date` string from the client is `YYYY-MM-DD`. Convert to `new Date(date + 'T00:00:00.000Z')` or `new Date(date)` — but test against the actual DB timezone. [ASSUMED: timezone behavior with `@db.Date` and Supabase/Postgres — verify date equality works without timezone offset when querying].

### Pattern 4: Race Condition Handling (P2002)

**What:** Catch Prisma unique constraint violation and return 409.
**When to use:** POST /api/public/appointments.

```typescript
// Source: [VERIFIED: prisma/schema.prisma] — @@unique([doctorId, date, time])
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'

export async function POST(request: NextRequest) {
  // ... validation ...
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
    return Response.json({ error: 'Error al crear el turno' }, { status: 500 })
  }
}
```

### Pattern 5: Wizard State Shape

**What:** Single `useState` object in BookingWizard.tsx that owns all selections.
**When to use:** The `'use client'` root component.

```typescript
// Source: [ASSUMED] — pattern derived from 03-CONTEXT.md Claude's Discretion decisions

type WizardState = {
  step: 1 | 2 | 3 | 4 | 5
  selectedSpecialty: { id: number; name: string; color: string } | null
  selectedDoctor: { id: number; name: string; durationMin: number; avatarUrl?: string; bio?: string } | null
  selectedDate: string | null        // 'YYYY-MM-DD'
  selectedTime: string | null        // 'HH:MM'
  patientName: string
  patientDni: string
  patientPhone: string
  patientInsurance: string
  patientEmail: string
  confirmedAppointment: { id: number; [key: string]: unknown } | null
}
```

### Pattern 6: framer-motion Step Transition

**What:** Animate step changes with slide + fade.
**When to use:** Wrapping each step's content in BookingWizard.

```typescript
// Source: [VERIFIED: components/admin/Drawer.tsx] — confirms AnimatePresence + motion pattern
// Source: 03-UI-SPEC.md Animation Contracts

import { AnimatePresence, motion } from 'framer-motion'

// Inside BookingWizard render:
<AnimatePresence mode="wait">
  <motion.div
    key={step}
    initial={{ opacity: 0, x: direction > 0 ? 40 : -40 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: direction > 0 ? -40 : 40 }}
    transition={{ duration: direction > 0 ? 0.25 : 0.2, ease: 'easeOut' }}
  >
    {/* step content */}
  </motion.div>
</AnimatePresence>
```

**Note:** Track `direction` (1 = forward, -1 = back) in state to determine slide direction.

### Pattern 7: Public Layout (Route Group)

**What:** Route group `(public)` with a minimal layout — full-width, no sidebar.
**When to use:** `app/(public)/layout.tsx`.

```typescript
// Source: [VERIFIED: app/(admin)/layout.tsx] — existing route group pattern
// Source: [VERIFIED: Next.js 16 docs/route-groups.md]

// app/(public)/layout.tsx
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  )
}
```

**Important:** The root `app/layout.tsx` already applies `<html>` and `<body>` with fonts. The public layout must NOT re-wrap with `<html>`/`<body>`. It only adds a container `<div>`.

**Route group caveat:** Per Next.js 16 docs, navigating between routes using *different root layouts* triggers a full page reload. Since `(public)` and `(admin)` both use the same root `app/layout.tsx` (not separate root layouts), this is not an issue here. `(public)/layout.tsx` is a nested layout within the root, not a replacement root layout.

### Pattern 8: Prisma Schema Migration

**What:** Add `patientInsurance String?` to `Appointment` model.
**When to use:** Wave 0 of the plan — must run before any API writes.

```prisma
// Source: [VERIFIED: prisma/schema.prisma] — current Appointment model
// Add to Appointment model:
patientInsurance String?
```

Apply with `npx prisma db push` (project uses `db:push` script, no migrations folder found).

**No migrations folder exists** — project uses `prisma db push` workflow (`npm run db:push`). The schema addition is additive (nullable column) so `db push` will add it without data loss.

### Anti-Patterns to Avoid

- **`NextResponse.json()` in Route Handlers:** Use `Response.json()`. This is a verified project convention enforced throughout Phase 2 route handlers.
- **Re-checking auth in public routes:** Public routes under `/api/public/` must NOT import `verifyToken` or read `tm_token` cookie. Middleware already bypasses them.
- **Synchronous `params` access:** Always `const { id } = await params` — `params` is `Promise<{...}>` in Next.js 16. Verified in Next.js docs and existing Phase 2 route handlers.
- **Blocking UI on calendar-wide slot pre-computation:** Fetch slots only per-day-click (`GET /api/public/slots?doctorId=N&date=YYYY-MM-DD`), not for the entire 30-day window at once.
- **JavaScript `Date` timezone trap:** `new Date('2026-05-27')` parses as UTC midnight. In environments with UTC+offset, this rolls to the previous day locally. Always parse date strings explicitly: `new Date(year, month - 1, day)` or keep as string throughout the slot algorithm.
- **`input type="number"` for DNI/phone:** Use `type="text" inputMode="numeric"`. Type number causes issues with leading zeros and mobile UX on iOS.
- **`backdropFilter` without vendor prefix in some browsers:** Tailwind v4's `backdrop-blur-md` handles this correctly via the `@tailwindcss/postcss` plugin already in devDependencies.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Race condition prevention | Application-level "check then insert" | DB `@@unique` constraint + catch P2002 | Check-then-insert is not atomic — two concurrent requests both pass the check, both insert, one fails. DB constraint is atomic. |
| Class merging with Tailwind | String concatenation | `cn()` from `lib/utils.ts` | Already exists; handles falsy values correctly |
| Date formatting for display | Custom format function | `formatDate()` / `formatTime()` from `lib/utils.ts` | Already locale-aware (es-AR) |
| Slot time math | date-fns / dayjs | Native arithmetic (minutes integer math) | Trivial with integer minutes; no library justifies the bundle |
| Initials avatar fallback | Custom logic | `getInitials()` from `lib/utils.ts` | Already exists |
| Animation primitives | CSS keyframes | framer-motion (already installed) | `AnimatePresence` + `motion.div` handle exit animations correctly; CSS cannot do conditional exit direction |

**Key insight:** The slot algorithm looks complex but is ~20 lines of integer math. The real complexity is the DB date equality gotcha and the race condition — both already solved by the schema design.

---

## Common Pitfalls

### Pitfall 1: Date Storage vs. Display Timezone Mismatch

**What goes wrong:** Patient selects "27 de mayo" in the calendar. The stored `date` in Postgres is `2026-05-26` (one day earlier) because `new Date('2026-05-27')` is parsed as UTC midnight, and Supabase/Postgres stores it as `2026-05-27T00:00:00Z` — but the slot query uses JS Date comparisons that shift to local time.

**Why it happens:** ISO 8601 date-only strings parse as UTC in JavaScript. If the server runs in a non-UTC timezone, the resulting Date object represents the previous day locally.

**How to avoid:** In the slot route handler, treat the incoming `date` string (`YYYY-MM-DD`) as a date key, not a Date object. For the Prisma query, pass the date as `new Date(date + 'T12:00:00.000Z')` and use `gte`/`lt` range OR keep the date as a raw string and use Prisma's `$queryRaw` with date casting — OR simply construct `new Date(year, month-1, day)` (local constructor, no timezone shift). [ASSUMED: the simplest safe approach is `new Date(\`${year}-${month}-${day}T00:00:00\`)` without the Z suffix, relying on local server time].

**Warning signs:** Appointments appear one day earlier than selected in the admin panel.

### Pitfall 2: `@@unique([doctorId, date, time])` — Date Type Must Match

**What goes wrong:** The `date` column is `@db.Date` (date only, no time). When inserting, passing a full `DateTime` (with time component) to a `Date`-typed column may cause silent truncation or type mismatch errors depending on Prisma/Postgres behavior.

**Why it happens:** Prisma maps `DateTime @db.Date` — you must pass a `Date` object (or ISO string that Prisma interprets as date-only). Passing `new Date()` (which includes time) to a `@db.Date` field works in Prisma because Prisma truncates to date on the Postgres side, but the comparison must be consistent.

**How to avoid:** When creating the Appointment, use `date: new Date(selectedDate)` where `selectedDate` is `YYYY-MM-DD`. Verify the unique constraint fires correctly in a test scenario before finalizing.

**Warning signs:** Duplicate bookings get inserted despite the unique constraint.

### Pitfall 3: `Prisma migrate` vs `prisma db push`

**What goes wrong:** Running `prisma migrate dev` when the project uses `db push` may create a migrations folder and diverge the workflow. Alternatively, running `db push` when a migrations folder exists may conflict with applied migrations.

**Why it happens:** The project has no `prisma/migrations` folder — it uses the `db push` workflow (confirmed by `npm run db:push` script and absence of migrations directory).

**How to avoid:** Use `npm run db:push` to apply the `patientInsurance` addition. This is safe because the column is nullable (additive migration, no data loss).

**Warning signs:** `prisma migrate dev` creates unexpected migration files.

### Pitfall 4: `AnimatePresence mode="wait"` Required for Step Transitions

**What goes wrong:** Step content flashes or both old and new steps render simultaneously during transition.

**Why it happens:** Without `mode="wait"`, AnimatePresence allows new content to mount before the exiting content finishes its exit animation.

**How to avoid:** Use `<AnimatePresence mode="wait">` with a stable `key={step}` on the motion div. Confirmed working pattern from existing `Drawer.tsx`.

**Warning signs:** Two steps visible simultaneously during transition.

### Pitfall 5: iOS Safari Auto-Zoom on Input Focus

**What goes wrong:** Mobile users experience the page zooming in when focusing on DNI or phone inputs.

**Why it happens:** iOS Safari auto-zooms when an input's font size is less than 16px.

**How to avoid:** Use `text-base` (16px) on all form inputs. The UI-SPEC explicitly requires this. Never use `text-sm` on `<input>` elements.

**Warning signs:** Input fields use `text-sm` in the form.

### Pitfall 6: `(public)` Route Group and Root Layout Conflict

**What goes wrong:** If `app/(public)/layout.tsx` accidentally includes `<html>` and `<body>` tags, the root `app/layout.tsx` already provides those — nested duplicate tags cause hydration errors.

**Why it happens:** Copy-pasting from the root layout into a nested layout.

**How to avoid:** `app/(public)/layout.tsx` must only return a `<div>` (or Fragment) wrapper, NOT `<html>`/`<body>`. The root layout handles those. Confirmed by examining `app/(admin)/layout.tsx` — it only wraps with `<div className="flex h-screen">`.

---

## Code Examples

### GET /api/public/slots — Complete Logic Sketch

```typescript
// Source: [VERIFIED: prisma/schema.prisma] Availability + Appointment models
// Source: [VERIFIED: Next.js 16 docs/route.md] URL Query Parameters pattern

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

const BOOKING_WINDOW_DAYS = 30

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const doctorIdStr = searchParams.get('doctorId')
  const dateStr = searchParams.get('date') // 'YYYY-MM-DD'

  if (!doctorIdStr || !dateStr) {
    return Response.json({ error: 'doctorId y date son requeridos' }, { status: 400 })
  }

  const doctorId = parseInt(doctorIdStr, 10)
  const [year, month, day] = dateStr.split('-').map(Number)
  const targetDate = new Date(year, month - 1, day)  // local, no timezone shift

  // Validate within booking window
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const maxDate = new Date(today)
  maxDate.setDate(today.getDate() + BOOKING_WINDOW_DAYS)
  if (targetDate < today || targetDate > maxDate) {
    return Response.json({ slots: [] })
  }

  const dayOfWeek = targetDate.getDay() // 0=Sunday, matches Availability.dayOfWeek

  const [doctor, existingAppointments] = await Promise.all([
    prisma.doctor.findUnique({
      where: { id: doctorId, isActive: true },
      include: {
        availabilities: { where: { dayOfWeek } },
      },
    }),
    prisma.appointment.findMany({
      where: {
        doctorId,
        date: targetDate,
        status: { not: 'CANCELLED' },
      },
      select: { time: true },
    }),
  ])

  if (!doctor) return Response.json({ error: 'Médico no encontrado' }, { status: 404 })

  const bookedTimes = new Set(existingAppointments.map((a) => a.time))

  const slots: { time: string; available: boolean }[] = []
  for (const av of doctor.availabilities) {
    const generated = generateSlots(av.startTime, av.endTime, doctor.durationMin)
    for (const time of generated) {
      slots.push({ time, available: !bookedTimes.has(time) })
    }
  }
  // Sort by time
  slots.sort((a, b) => a.time.localeCompare(b.time))

  return Response.json({ slots })
}

function generateSlots(startTime: string, endTime: string, durationMin: number): string[] {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  let cur = sh * 60 + sm
  const end = eh * 60 + em
  const slots: string[] = []
  while (cur + durationMin <= end) {
    slots.push(`${String(Math.floor(cur / 60)).padStart(2, '0')}:${String(cur % 60).padStart(2, '0')}`)
    cur += durationMin
  }
  return slots
}
```

### POST /api/public/appointments — Race Condition Handling

```typescript
// Source: [VERIFIED: prisma/schema.prisma] @@unique([doctorId, date, time])
// Source: Prisma error codes (P2002 = unique constraint violation)
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!body) return Response.json({ error: 'Cuerpo requerido' }, { status: 400 })

  const { doctorId, date, time, patientName, patientDni, patientPhone, patientEmail, patientInsurance } = body

  // Validation (example — full validation in implementation)
  const dniClean = String(patientDni ?? '').replace(/[\s.]/g, '')
  if (!/^\d{7,8}$/.test(dniClean)) {
    return Response.json({ error: 'DNI inválido' }, { status: 400 })
  }
  const phoneClean = String(patientPhone ?? '').replace(/\D/g, '')
  if (phoneClean.length !== 10) {
    return Response.json({ error: 'Teléfono inválido' }, { status: 400 })
  }

  const [year, month, day] = String(date).split('-').map(Number)
  const appointmentDate = new Date(year, month - 1, day)

  try {
    const appointment = await prisma.appointment.create({
      data: {
        doctorId: Number(doctorId),
        date: appointmentDate,
        time: String(time),
        patientName: String(patientName).trim(),
        patientDni: dniClean,
        patientPhone: phoneClean,
        patientEmail: patientEmail ?? null,
        patientInsurance: patientInsurance ?? null,
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
    console.error(error)
    return Response.json({ error: 'Error al crear el turno' }, { status: 500 })
  }
}
```

### BookingWizard Shell (structure only)

```typescript
// Source: [VERIFIED: 03-UI-SPEC.md] State management section
// Source: [VERIFIED: 03-CONTEXT.md] Claude's Discretion — useState, no routing per step
'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

export function BookingWizard() {
  const [step, setStep] = useState<1|2|3|4|5>(1)
  const [direction, setDirection] = useState<1|-1>(1)
  const [selectedSpecialty, setSelectedSpecialty] = useState<SpecialtyOption | null>(null)
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorOption | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)   // 'YYYY-MM-DD'
  const [selectedTime, setSelectedTime] = useState<string | null>(null)   // 'HH:MM'
  // ... patient fields, confirmedAppointment

  function goTo(nextStep: 1|2|3|4|5) {
    setDirection(nextStep > step ? 1 : -1)
    setStep(nextStep)
  }

  return (
    <div className="min-h-screen bg-background flex items-start justify-center px-4 py-16">
      <div className="w-full max-w-2xl bg-white/80 backdrop-blur-md rounded-2xl shadow-modal border border-accent/20 p-6">
        <StepProgress currentStep={step} />
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -40 }}
            transition={{ duration: direction === 1 ? 0.25 : 0.2, ease: 'easeOut' }}
          >
            {step === 1 && <StepSpecialty onSelect={(s) => { setSelectedSpecialty(s); goTo(2) }} />}
            {step === 2 && <StepDoctor specialtyId={selectedSpecialty!.id} onSelect={(d) => { setSelectedDoctor(d); goTo(3) }} onBack={() => goTo(1)} />}
            {/* ... steps 3, 4, 5 */}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
```

### Calendar Day-of-Week Computation (JS Date to Prisma dayOfWeek)

```typescript
// Source: [VERIFIED: prisma/schema.prisma] Availability.dayOfWeek is 0-6
// JS Date.getDay() returns 0=Sunday, 1=Monday ... 6=Saturday
// Prisma schema Availability.dayOfWeek: matches JS convention (0=Sunday)
// VERIFY with seed data: prisma/seed.ts should confirm dayOfWeek numbering

const targetDate = new Date(year, month - 1, day)
const dayOfWeek = targetDate.getDay() // 0=Sunday, matches schema
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `params` as plain object in Route Handlers | `params` as `Promise<{...}>`, must `await params` | Next.js v15.0.0-RC | All dynamic route handlers need `await params` — verified in existing Phase 2 code |
| `cookies()` synchronous | `cookies()` async, must `await cookies()` | Next.js v15.0.0-RC | All server-side cookie reads must await — verified in project conventions |
| `NextResponse.json()` | `Response.json()` (standard Web API) | Next.js v15 | Project-wide convention — all Phase 2 handlers use `Response.json()` |
| GET Route Handlers statically cached by default | GET Route Handlers dynamically rendered by default | Next.js v15.0.0-RC | Public GET endpoints return fresh data without needing `export const dynamic = 'force-dynamic'` |

**Deprecated/outdated:**
- `NextResponse.json()` in Route Handlers: still works but project convention is `Response.json()`. Never use `NextResponse.json()` in new routes.
- Synchronous `params`: `{ params }: { params: { id: string } }` — this was Next.js 14 syntax. Phase 3 must use `Promise<{...}>`.

---

## Runtime State Inventory

> This phase adds a new nullable column to an existing table — this is not a rename/refactor phase. However, schema migration has runtime implications.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `Appointment` table in Supabase Postgres — adding `patientInsurance String?` (nullable) | `npm run db:push` — additive migration, no data loss, existing rows get NULL |
| Live service config | No external service config changes needed | None |
| OS-registered state | None | None |
| Secrets/env vars | `DATABASE_URL` and `DIRECT_URL` already in `.env` — no new secrets needed | None |
| Build artifacts | Prisma Client must be regenerated after schema change | `npx prisma generate` (or implicit after `db:push`) |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All Next.js operations | Confirmed (project runs) | Unknown (not checked) | — |
| Prisma CLI | Schema migration (`db:push`) | Confirmed (in devDependencies) | 6.19.3 | — |
| Supabase Postgres | DB writes for Appointment | Confirmed (Phase 2 complete, seed worked) | — | — |
| framer-motion | Step transitions, success animation | Confirmed in node_modules | 12.40.0 | — |
| lucide-react | Icons throughout wizard | Confirmed in node_modules | 1.16.0 | — |

**Missing dependencies with no fallback:** None.

---

## Validation Architecture

> `workflow.nyquist_validation` key absent from `.planning/config.json` (file does not exist) — treating as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected — no jest.config.*, no vitest.config.*, no pytest.ini found |
| Config file | None — must be established in Wave 0 |
| Quick run command | TBD — depends on framework chosen in Wave 0 |
| Full suite command | TBD |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REQ-01 | Specialty list returns active specialties from DB | unit/integration | TBD | ❌ Wave 0 |
| REQ-02 | Doctor list filtered by specialtyId | unit/integration | TBD | ❌ Wave 0 |
| REQ-03 | Slot generation: correct slots for given availability + duration | unit | TBD | ❌ Wave 0 |
| REQ-03b | Slot generation: booked slots marked unavailable | unit/integration | TBD | ❌ Wave 0 |
| REQ-04 | Appointment POST creates DB record with status PENDING | integration | TBD | ❌ Wave 0 |
| REQ-04b | Duplicate booking returns 409 (P2002 handled) | integration | TBD | ❌ Wave 0 |
| REQ-05 | DNI validation: strips dots/spaces, rejects non-7-8-digit | unit | TBD | ❌ Wave 0 |
| REQ-06 | Phone validation: exactly 10 digits | unit | TBD | ❌ Wave 0 |

### Wave 0 Gaps

- [ ] No test framework configured — project has no test runner. **Recommend:** Add `vitest` + `@testing-library/react` in Wave 0, or declare manual-only testing for this phase.
- [ ] `generateSlots()` utility should be extracted to `lib/slots.ts` to enable isolated unit testing.
- [ ] Integration tests for public API routes require a test DB or mocked Prisma client.

**Note:** Given no test infrastructure exists in the project, the planner should either (a) establish vitest in Wave 0, or (b) explicitly declare this phase as manual-testing-only and document the manual test checklist. The slot generation algorithm and P2002 handling are the highest-value items for automated tests.

---

## Security Domain

> `security_enforcement` not configured — treating as enabled.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Public endpoints — no auth |
| V3 Session Management | No | No session for patients |
| V4 Access Control | Partial | Middleware already exempts `/api/public` — no additional guard needed; admin endpoints remain protected |
| V5 Input Validation | Yes | Server-side validation in POST handler: DNI 7-8 digits, phone 10 digits, email regex, required fields |
| V6 Cryptography | No | No crypto operations |

### Known Threat Patterns for Public Booking API

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Spam booking (flooding POST /api/public/appointments) | Denial of Service | Rate limiting — deferred to Phase 5, noted as risk |
| DNI enumeration (guessing patient data via GET) | Information Disclosure | GET endpoints return no patient data — only doctor/specialty/slot availability. No risk. |
| Malformed input causing DB errors | Tampering | Server-side validation before Prisma call; catch-all error handler returns 500 without stack trace |
| Booking other patients' slots | Tampering | No per-patient auth needed — `@@unique([doctorId, date, time])` makes slots inherently single-occupancy |

**Rate limiting note:** The POST endpoint has no rate limiting in this phase. A patient could spam bookings with different DNIs. This is deferred to Phase 5 per ROADMAP.md and CONTEXT.md deferred items.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `new Date(year, month-1, day)` (local constructor) avoids timezone shift when storing to Postgres `@db.Date` | Slot Algorithm, Pitfall 1 | Appointments stored on wrong date — patients see wrong day |
| A2 | `Availability.dayOfWeek` numbering matches JS `Date.getDay()` (0=Sunday) | Calendar, slot generation | Slots generated for wrong day of week |
| A3 | Prisma `db push` can add nullable column to existing Appointment table without data loss on Supabase | Schema Migration | Migration fails or corrupts data |
| A4 | `PrismaClientKnownRequestError` import path `@prisma/client/runtime/library` is correct for Prisma 6.x | Race Condition Pattern | P2002 catch block fails with import error |
| A5 | framer-motion 12.x `AnimatePresence mode="wait"` API is stable and matches the usage pattern | Animation | Step transitions break |

---

## Open Questions

1. **Seed data `dayOfWeek` convention**
   - What we know: Schema has `Availability.dayOfWeek Int` with no constraint.
   - What's unclear: Is 0=Sunday or 0=Monday in the seed? JS `Date.getDay()` uses 0=Sunday. If seed used 0=Monday (ISO week), slot generation breaks on Sundays.
   - Recommendation: Read `prisma/seed.ts` before implementing the slot route handler. Verify with a known doctor's seed availability.

2. **`@db.Date` equality in Prisma queries**
   - What we know: Schema uses `date DateTime @db.Date`. Prisma maps this to a date-only column.
   - What's unclear: Does `prisma.appointment.findMany({ where: { date: targetDate } })` do exact date equality or range comparison when `targetDate` is a JS Date with midnight time?
   - Recommendation: Test the query with a real record in the dev DB before finalizing the slot route. If needed, use `gte`/`lt` range: `{ date: { gte: startOfDay, lt: endOfDay } }`.

3. **`PrismaClientKnownRequestError` import in Prisma 6**
   - What we know: Prisma 6.19.3 is installed. The error class is in `@prisma/client/runtime/library`.
   - What's unclear: Import path may differ in Prisma 6 vs 5.
   - Recommendation: Before writing the POST handler, verify: `import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'` — if it throws, try `from '@prisma/client'` or inspect `node_modules/@prisma/client/runtime/`.

---

## Sources

### Primary (HIGH confidence)
- `prisma/schema.prisma` — Appointment, Doctor, Availability, Specialty models; @@unique constraint
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` — Route Handler patterns, `await params`, URL query params, `Response.json()`
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cookies.md` — async cookies pattern
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route-groups.md` — route group caveats (multiple root layouts = full reload)
- `app/(admin)/layout.tsx` — route group nested layout pattern (no html/body)
- `app/api/admin/doctors/[id]/route.ts` — `await params` verified in Phase 2
- `app/api/admin/specialties/route.ts` — `Response.json()` pattern verified
- `components/admin/Drawer.tsx` — framer-motion AnimatePresence + motion.div pattern
- `app/globals.css` — design tokens, @theme block, all color/radius/shadow variables
- `middleware.ts` — `/api/public` already in PUBLIC_PATHS — no middleware changes needed
- `.planning/phases/03-reserva-paciente/03-CONTEXT.md` — locked decisions D-01 through D-09
- `.planning/phases/03-reserva-paciente/03-UI-SPEC.md` — full interaction and visual contract
- `lib/utils.ts` — cn, formatDate, formatTime, formatDni, getInitials — reusable utilities

### Secondary (MEDIUM confidence)
- `package.json` — confirmed exact versions: next@16.2.6, framer-motion@12.40.0, lucide-react@1.16.0, prisma@6.19.3, react@19.2.4

### Tertiary (LOW confidence)
- A1–A5 in Assumptions Log — date handling and Prisma import paths require runtime verification

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages already installed, versions confirmed from node_modules
- API patterns: HIGH — verified from Next.js 16 official docs in node_modules
- Slot algorithm: HIGH (logic) / ASSUMED (date handling edge cases)
- Architecture: HIGH — route group pattern verified from existing (admin) group
- Pitfalls: HIGH — date pitfall documented from JS spec; others from existing code patterns
- Security: MEDIUM — ASVS mapping based on endpoint analysis; rate limiting is known gap

**Research date:** 2026-05-27
**Valid until:** 2026-06-26 (stable stack — 30 days)
