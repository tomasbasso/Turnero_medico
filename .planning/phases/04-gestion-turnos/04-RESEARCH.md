# Phase 4: Gestión de Turnos — Research

**Researched:** 2026-05-29
**Domain:** Next.js 16 App Router — Admin appointment list, filtering, status management, WhatsApp integration
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01:** Vista — tabla con columnas (thead + tbody). Patrón consistente con el panel admin existente.
**D-02:** Columnas — 5 columnas compactas: Paciente+DNI | Médico | Fecha+Hora | Estado | Acciones.
**D-03:** Filtros — barra client-side arriba de la tabla: fecha, médico (select), estado (select), DNI (text input). Fetch con parámetros sin recargar la página.
**D-04:** Período default — hoy (fecha actual) al abrir `/admin/turnos`.
**D-05:** WhatsApp trigger — link aparece solo cuando se confirma un turno (estado → CONFIRMED).
**D-06:** Mensaje pre-llenado — `"Hola [patientName], tu turno con [doctorName] el [fecha] a las [hora] ha sido CONFIRMADO."`. Usar `formatDate` y `formatTime` de utils.
**D-07:** whatsappSent tracking — PATCH automático al hacer click en el link. Indicador visual (ícono MessageCircleCheck teal) cuando `whatsappSent === true`.

### Claude's Discretion

- **Cambio de estado:** Inline en la tabla — dropdown o botones contextuales por estado. CONTEXT.md + UI-SPEC lean toward contextual buttons (PENDING → "Confirmar"/"Cancelar"). Use contextual buttons matching the UI-SPEC exactly.
- **Drawer de detalle (opcional):** Si se considera valioso mostrar datos extra (teléfono, email, obra social). UI-SPEC provides the Eye icon and Drawer usage pattern.
- **Paginación:** Volumen bajo — listar sin paginación a menos que sea necesario.
- **Estado vacío:** Mensaje amigable cuando no hay turnos para los filtros aplicados.

### Deferred Ideas (OUT OF SCOPE)

- Historial de cambios de estado (audit log por turno)
- Email de confirmación automático
- Exportar lista a CSV/Excel
- Gestión de pacientes (`/admin/pacientes`)
- Notificaciones en tiempo real (polling/WebSocket)
</user_constraints>

---

## Summary

Phase 4 adds the appointment management view for admin users. The work is entirely additive — no schema changes, no migrations, no new dependencies. All infrastructure (Prisma model, design tokens, auth helpers, utility functions, Drawer component) already exists.

The phase has three delivery layers: (1) three new Route Handlers under `app/api/admin/appointments/`, (2) one new Server Component page `app/(admin)/admin/turnos/page.tsx`, and (3) a client-side `AppointmentsList` component that owns filter state and re-fetch logic.

The critical implementation detail is the Prisma query for `GET /api/admin/appointments`: it must handle four optional filter params (`date`, `doctorId`, `status`, `dni`) with a conditional `where` clause, and include the `doctor` relation to render the Médico column. The WhatsApp integration is a pure client-side concern — URL construction with Argentina phone normalization and an optimistic `whatsappSent` state update on click.

**Primary recommendation:** Follow the `especialidades/page.tsx` + `SpecialtiesList.tsx` split exactly. Three files per concern: page (Server Component initial fetch), list component (client, owns filter state + refetch), table sub-component (pure render). Three Route Handlers: GET list, PATCH status, PATCH whatsappSent.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Auth guard on all admin routes | Middleware (already active) | Route Handlers (requireAdmin) | Middleware injects `x-user-role`; Route Handlers re-verify for mutations |
| Initial appointments fetch (today's date) | Frontend Server (SSR) | — | Server Component does the first Prisma query; avoids client waterfall on first load |
| Filter state + refetch on change | Browser / Client | API | Client component owns filter state; fires GET with query params on change |
| Status PATCH (CONFIRMED/CANCELLED/COMPLETED) | API / Backend | — | Mutation must be server-side for auth; client calls PATCH and updates local state optimistically |
| whatsappSent PATCH | API / Backend | — | Single-field update; client fires fire-and-forget after link click |
| WhatsApp URL construction | Browser / Client | — | `patientPhone` is available in client component state; URL built at render time |
| Argentina phone normalization (strip leading 0, add 549) | Browser / Client | — | Transformation at URL construction time, no server needed |
| Status badge rendering | Browser / Client | — | Uses `STATUS_COLORS`/`STATUS_LABELS` from utils — pure UI |

---

## Standard Stack

### Core (all already installed — zero new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 16.2.6 | Route Handlers + Server Components | Project foundation [VERIFIED: node_modules/next/package.json] |
| Prisma Client | (project version) | Database queries with optional filtering | ORM already in use throughout the project [VERIFIED: prisma/schema.prisma] |
| lucide-react | (project version) | `MessageCircle`, `MessageCircleCheck`, `Calendar`, `Eye` icons | Already installed; used in existing admin components [VERIFIED: Drawer.tsx imports] |
| Tailwind v4 + CSS vars | (project version) | Design tokens via `@theme inline` in globals.css | No config file — tokens consumed as `bg-surface`, `text-accent`, etc. [VERIFIED: app/globals.css] |

### Supporting (already in project)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lib/utils.ts` exports | — | `cn()`, `formatDate()`, `formatTime()`, `formatDni()`, `STATUS_LABELS`, `STATUS_COLORS` | Every component in this phase uses these [VERIFIED: lib/utils.ts] |
| `lib/auth-helpers.ts` | — | `requireAdmin()` guard returning `Response` on failure | All three Route Handlers [VERIFIED: lib/auth-helpers.ts] |
| `lib/prisma.ts` | — | Singleton Prisma client | All Route Handlers [VERIFIED: existing routes] |
| `components/admin/Drawer.tsx` | — | Slide-in overlay for optional appointment detail view | If planner adds detail drawer [VERIFIED: components/admin/Drawer.tsx] |
| `framer-motion` | (project version) | Powers Drawer animation | Already imported in Drawer.tsx [VERIFIED: Drawer.tsx] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native `<input type="date">` | Date picker library | No new dep; native picker is sufficient for this admin tool's low-volume use |
| Contextual action buttons | Dropdown `<select>` for status change | Buttons match the existing SpecialtiesList inline-confirm pattern; dropdown would need custom styling |
| Fire-and-forget PATCH for whatsappSent | Awaited PATCH before opening link | Optimistic update is better UX; `window.open` and fetch can fire simultaneously |

**Installation:** No new packages required. [VERIFIED: all listed packages already in project]

---

## Package Legitimacy Audit

No new packages are introduced in this phase. All dependencies are pre-existing project dependencies.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
Browser
  │
  ├─ [Page load] GET /admin/turnos
  │     └─ turnos/page.tsx (Server Component)
  │           ├─ reads x-user-role from middleware headers
  │           ├─ prisma.appointment.findMany({ date: today, include: doctor })
  │           └─ renders <AppointmentsList initialData={...} doctors={...} role={...} />
  │
  └─ [User interaction] AppointmentsList (Client Component)
        ├─ owns: filters state { date, doctorId, status, dni }
        ├─ on filter change → GET /api/admin/appointments?date=&doctorId=&status=&dni=
        │     └─ appointments/route.ts: requireAdmin → prisma.findMany(where:conditional) → Response.json
        │
        ├─ on "Confirmar" / "Cancelar" → PATCH /api/admin/appointments/[id]
        │     └─ appointments/[id]/route.ts: requireAdmin → validate transition → prisma.update → Response.json
        │
        └─ on WhatsApp link click (CONFIRMED only)
              ├─ window.open(wa.me URL)   [immediate]
              └─ PATCH /api/admin/appointments/[id]/whatsapp  [fire-and-forget]
                    └─ appointments/[id]/whatsapp/route.ts: requireAdmin → prisma.update(whatsappSent:true)
```

### Recommended Project Structure

```
app/
├── (admin)/admin/turnos/
│   └── page.tsx                           # Server Component — initial fetch for today
│
app/api/admin/appointments/
├── route.ts                               # GET list (4 optional query params)
└── [id]/
    ├── route.ts                           # PATCH status
    └── whatsapp/
        └── route.ts                       # PATCH whatsappSent
│
components/admin/
├── AppointmentsList.tsx                   # Client Component — filter state + refetch
├── AppointmentsFilterBar.tsx              # Sub-component — 4 filter controls (or inline in AppointmentsList)
└── AppointmentsTable.tsx                  # Sub-component — pure table render (or inline in AppointmentsList)
```

Note on component split: the SpecialtiesList precedent keeps everything in one client component file. For this phase the table is more complex (5 columns, contextual actions, inline confirm) so splitting into AppointmentsList (container) + sub-components is cleaner, but both approaches work.

### Pattern 1: GET Route Handler with Optional Query Param Filtering

**What:** Build a Prisma `where` object conditionally from URL search params. Only add a filter key if the param is non-empty.
**When to use:** Any list endpoint where all filters are optional and can be combined.

```typescript
// Source: verified from existing patterns in app/api/admin/ + Prisma docs
// app/api/admin/appointments/route.ts
import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const authResult = requireAdmin(request)
  if (authResult instanceof Response) return authResult

  const { searchParams } = request.nextUrl
  const date      = searchParams.get('date')      // "YYYY-MM-DD" or null
  const doctorId  = searchParams.get('doctorId')  // numeric string or null
  const status    = searchParams.get('status')    // enum string or null
  const dni       = searchParams.get('dni')       // partial string or null

  // Build conditional where object
  const where: Record<string, unknown> = {}

  if (date) {
    const [year, month, day] = date.split('-').map(Number)
    const dateObj = new Date(year, month - 1, day)
    where.date = dateObj
  }
  if (doctorId && !isNaN(Number(doctorId))) {
    where.doctorId = Number(doctorId)
  }
  if (status) {
    where.status = status
  }
  if (dni) {
    where.patientDni = { contains: dni }
  }

  const appointments = await prisma.appointment.findMany({
    where,
    orderBy: [{ date: 'asc' }, { time: 'asc' }],
    include: {
      doctor: {
        select: { id: true, name: true, specialtyId: true },
      },
    },
  })

  return Response.json({ appointments })
}
```

**Key pitfall — date filtering:** `Appointment.date` is `@db.Date` (PostgreSQL DATE type). Prisma maps this to a JavaScript `Date` at midnight UTC. When comparing, build the Date from year/month/day using local constructor `new Date(year, month-1, day)` to avoid timezone offset shifting the date. The `@@index([date])` index on the model will make this query fast. [VERIFIED: prisma/schema.prisma]

### Pattern 2: PATCH Route Handler with `await params`

**What:** Dynamic route handler. In Next.js 16, `params` is a Promise — must be awaited before destructuring. [VERIFIED: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md]

```typescript
// Source: verified from app/api/admin/doctors/[id]/route.ts + Next.js 16 docs
// app/api/admin/appointments/[id]/route.ts
import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

const VALID_STATUSES = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'] as const

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = requireAdmin(request)
  if (authResult instanceof Response) return authResult

  const { id } = await params   // MUST await — Next.js 16 requirement
  const numericId = parseInt(id, 10)
  if (isNaN(numericId)) return Response.json({ error: 'ID inválido' }, { status: 400 })

  const body = await request.json().catch(() => null)
  if (!body?.status || !VALID_STATUSES.includes(body.status)) {
    return Response.json({ error: 'Estado inválido' }, { status: 400 })
  }

  const appointment = await prisma.appointment.update({
    where: { id: numericId },
    data: { status: body.status },
    include: { doctor: { select: { id: true, name: true } } },
  })

  return Response.json({ appointment })
}
```

### Pattern 3: Server Component Initial Fetch (page.tsx)

**What:** Server Component reads `x-user-role` header (injected by middleware) and does the initial Prisma query for today's appointments. Passes to client component as props. Pattern is identical to `especialidades/page.tsx` and `medicos/page.tsx`. [VERIFIED: app/(admin)/admin/especialidades/page.tsx, app/(admin)/admin/medicos/page.tsx]

```typescript
// Source: verified from app/(admin)/admin/especialidades/page.tsx
// app/(admin)/admin/turnos/page.tsx
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { AppointmentsList } from '@/components/admin/AppointmentsList'

export default async function TurnosPage() {
  const headersList = await headers()
  const role = headersList.get('x-user-role') as 'ADMIN' | 'RECEPTIONIST'

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [appointments, doctors] = await Promise.all([
    prisma.appointment.findMany({
      where: { date: today },
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
      include: { doctor: { select: { id: true, name: true } } },
    }),
    prisma.doctor.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ])

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="font-display text-xl font-semibold text-text-primary">Turnos</h1>
      </div>
      <AppointmentsList initialData={appointments} doctors={doctors} role={role} />
    </div>
  )
}
```

### Pattern 4: WhatsApp URL Construction with Argentina Phone Normalization

**What:** Build the `wa.me` URL. Argentina mobile prefix: country code `54`, mobile prefix `9`. Strip leading `0` from the stored 10-digit phone number (which is stored without country prefix, e.g. `1154321234`). [VERIFIED: app/api/public/appointments/route.ts stores `phoneClean` = 10 digits, no country prefix]

```typescript
// Source: verified from 04-CONTEXT.md D-06, 04-UI-SPEC.md WhatsApp section, public appointments route
function buildWhatsAppUrl(appointment: {
  patientName: string
  patientPhone: string
  doctor: { name: string }
  date: string | Date
  time: string
}): string {
  // phone is stored as 10 digits (e.g. "1154321234") — strip leading 0 if present
  const phone = appointment.patientPhone.replace(/^0/, '')
  const message = `Hola ${appointment.patientName}, tu turno con ${appointment.doctor.name} el ${formatDate(appointment.date)} a las ${formatTime(appointment.time)} ha sido CONFIRMADO.`
  return `https://wa.me/549${phone}?text=${encodeURIComponent(message)}`
}
```

**Argentina convention:** `549` = `54` (country) + `9` (mobile). The `9` is required for WhatsApp to reach Argentine mobile numbers. [VERIFIED: 04-CONTEXT.md D-07, 04-UI-SPEC.md]

### Pattern 5: Optimistic whatsappSent Update + Fire-and-Forget PATCH

**What:** When user clicks the WhatsApp link, immediately update local state (`whatsappSent: true`) and fire the PATCH without blocking the link navigation. Do not `await` the fetch before `window.open`.

```typescript
// Source: 04-UI-SPEC.md Interaction States + 04-CONTEXT.md D-07
function handleWhatsAppClick(appointmentId: number) {
  // 1. Optimistic update — swap icon immediately
  setAppointments(prev =>
    prev.map(a => a.id === appointmentId ? { ...a, whatsappSent: true } : a)
  )
  // 2. Fire-and-forget PATCH — do NOT block link open
  fetch(`/api/admin/appointments/${appointmentId}/whatsapp`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ whatsappSent: true }),
  }).catch(console.error)
  // 3. Link navigation handled by <a href={url} target="_blank"> — no window.open needed
}
```

### Pattern 6: whatsapp/route.ts — Single-Field PATCH

```typescript
// app/api/admin/appointments/[id]/whatsapp/route.ts
import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = requireAdmin(request)
  if (authResult instanceof Response) return authResult

  const { id } = await params
  const numericId = parseInt(id, 10)
  if (isNaN(numericId)) return Response.json({ error: 'ID inválido' }, { status: 400 })

  await prisma.appointment.update({
    where: { id: numericId },
    data: { whatsappSent: true },
  })

  return Response.json({ ok: true })
}
```

### Pattern 7: Inline Cancel Confirmation (matching SpecialtiesList pattern)

**What:** When user clicks "Cancelar", expand inline text in the Acciones cell: "¿Cancelar este turno?" + "Sí, cancelar" (error color) + "No". No modal. No full-page re-render. Use local state `cancellingId: number | null`. [VERIFIED: components/admin/SpecialtiesList.tsx inline delete pattern]

```typescript
// Local state pattern — identical to deletingId in SpecialtiesList
const [cancellingId, setCancellingId] = useState<number | null>(null)
const [loadingId, setLoadingId] = useState<number | null>(null)

async function handleStatusChange(id: number, status: string) {
  setLoadingId(id)
  const res = await fetch(`/api/admin/appointments/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
  setLoadingId(null)
  setCancellingId(null)
  if (res.ok) {
    const data = await res.json()
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, ...data.appointment } : a))
  }
}
```

### Anti-Patterns to Avoid

- **`NextResponse.json()` in non-cookie routes:** All three Route Handlers in this phase use `Response.json()`. `NextResponse.json()` is only used where response headers must be set (e.g., setting cookies). [VERIFIED: all existing admin routes use `Response.json()`]
- **`router.refresh()` for status updates:** Do NOT use `router.refresh()` (which triggers a full Server Component re-render) for status changes or whatsappSent updates. Update local `appointments` state directly in the client component. The SpecialtiesList uses `router.refresh()` but that pattern is appropriate there because the list is passed as Server Component props and Drawer creates/updates records — here the client owns the state after initial load.
- **Not awaiting `params`:** In Next.js 16, `params` is a `Promise<{ id: string }>`. Destructuring without `await` silently returns a pending Promise — `id` will be undefined. Always `const { id } = await params`. [VERIFIED: Next.js 16 route.md docs + existing doctors/[id]/route.ts]
- **Blocking WhatsApp link on PATCH response:** The link must open immediately. Do not `await` the whatsappSent PATCH before navigating.
- **Date construction with `new Date("YYYY-MM-DD")`:** String constructor parses as UTC midnight, which will shift by timezone. Use `new Date(year, month-1, day)` (local time constructor) to match the stored `@db.Date` value.
- **Using `prisma.appointment.update` without checking record existence:** For PATCH endpoints, if the appointment ID doesn't exist, Prisma throws `P2025`. Wrap in try/catch or use `findUnique` first if returning a 404 is important.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Status badge colors | Custom color map | `STATUS_COLORS` + `STATUS_LABELS` from `lib/utils.ts` | Already defined, consistent with all existing admin views |
| Date formatting | Custom formatter | `formatDate()` from `lib/utils.ts` | Handles `es-AR` locale, date/string input — already tested in Phase 3 |
| Time formatting | Custom formatter | `formatTime()` from `lib/utils.ts` | Returns `"HH:MM hs"` format expected in UI-SPEC |
| DNI formatting | Custom regex | `formatDni()` from `lib/utils.ts` | Adds thousands separators for Argentine DNI format |
| Class merging | String concat | `cn()` from `lib/utils.ts` | Handles conditional classes safely |
| Slide-in detail panel | Custom modal | `Drawer` from `components/admin/Drawer.tsx` | Already animated with framer-motion, sized, and styled |
| Auth check | Re-implement cookie parsing | `requireAdmin()` from `lib/auth-helpers.ts` | Returns `Response` directly if unauthorized — one-liner guard |
| Prisma singleton | New PrismaClient | `prisma` from `lib/prisma.ts` | Prevents connection pool exhaustion in dev hot-reload |

**Key insight:** This phase has zero novel infrastructure. Everything needed exists. The implementation is entirely about wiring existing utilities into the new views and routes.

---

## Common Pitfalls

### Pitfall 1: `requireAdmin` blocks RECEPTIONIST role

**What goes wrong:** `requireAdmin()` in `lib/auth-helpers.ts` checks `payload.role !== 'ADMIN'` and returns 403 for RECEPTIONIST. If receptionists need to change appointment statuses or send WhatsApp messages, all three Route Handlers will reject their requests.
**Why it happens:** `requireAdmin` was designed for CRUD operations on master data (specialties, doctors). Appointment status management may be a RECEPTIONIST-level operation.
**How to avoid:** The CONTEXT.md and UI-SPEC do not explicitly address RECEPTIONIST access to these endpoints. The existing page pattern (`especialidades/page.tsx`) passes `role` to client components but the APIs use `requireAdmin`. Decision: either (a) use `requireAdmin` consistently (RECEPTIONIST cannot change status via UI anyway since the page reads role), or (b) create a `requireStaff()` helper that accepts ADMIN or RECEPTIONIST. Given the UI-SPEC passes `role` prop to `AppointmentsList` and the SpecialtiesList only shows edit/delete to ADMIN, use `requireAdmin` consistently in all mutation routes unless explicitly changed. [ASSUMED — role access for mutations is not stated in CONTEXT.md]
**Warning signs:** RECEPTIONIST login + attempt to confirm a turno → 403 error in browser console.

### Pitfall 2: Date filtering timezone mismatch

**What goes wrong:** `Appointment.date` is stored as PostgreSQL DATE (midnight UTC). A JavaScript `new Date("2026-05-29")` parses as UTC midnight, which in UTC-3 (Argentina) corresponds to 2026-05-28 21:00 local. Prisma's equality filter on a DATE column may not match the expected records.
**Why it happens:** String date constructor uses UTC; PostgreSQL DATE stores dates without timezone.
**How to avoid:** Always construct the date using `new Date(year, month-1, day)` (local time, no timezone offset). This matches how the existing public appointments route creates dates before storing them. [VERIFIED: app/api/public/appointments/route.ts line 41]
**Warning signs:** Filter for today shows 0 results despite appointments existing; or shows yesterday's records.

### Pitfall 3: Forgetting `await params` in dynamic route handlers

**What goes wrong:** Code like `const { id } = params` (without `await`) destructures a Promise object, making `id` the string `"[object Promise]"` which fails `parseInt`.
**Why it happens:** Next.js 15+ changed `params` from a plain object to a Promise. Pre-16 code works without `await` but silently breaks in 16.
**How to avoid:** Always `const { id } = await params`. Verified in `app/api/admin/doctors/[id]/route.ts` which already uses this pattern correctly. [VERIFIED: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md + existing doctors route]
**Warning signs:** `parseInt(id, 10)` returns `NaN` → 400 "ID inválido" for all requests.

### Pitfall 4: `router.refresh()` causes filter loss

**What goes wrong:** If `handleStatusChange` calls `router.refresh()` (like SpecialtiesList does after delete), the page re-renders from the Server Component, resetting the client filter state to the default (today, all doctors, all statuses).
**Why it happens:** `router.refresh()` invalidates the Server Component cache and re-renders, discarding all client state.
**How to avoid:** Update the `appointments` state array directly in the client component using `setAppointments(prev => ...)` with the updated record from the PATCH response. Never call `router.refresh()` for inline status updates. [ASSUMED — based on React/Next.js client state behavior]
**Warning signs:** After confirming a turno, all filters reset to defaults.

### Pitfall 5: `encodeURIComponent` on WhatsApp message

**What goes wrong:** If `encodeURIComponent` is omitted from the query string, spaces and special characters (accents, commas) in the message break the URL. WhatsApp shows a malformed or empty pre-fill.
**Why it happens:** URL query strings require percent-encoding for non-ASCII characters.
**How to avoid:** Always wrap the message in `encodeURIComponent()` before appending to `?text=`. [VERIFIED: 04-UI-SPEC.md WhatsApp section]
**Warning signs:** WhatsApp opens but pre-fill message is empty or truncated.

### Pitfall 6: Prisma `P2025` on PATCH for non-existent appointment

**What goes wrong:** `prisma.appointment.update({ where: { id: X } })` throws `PrismaClientKnownRequestError` with code `P2025` if record doesn't exist, causing an unhandled 500.
**Why it happens:** Prisma `update` requires the record to exist; it does not return null like `findUnique`.
**How to avoid:** Wrap the update in try/catch. If `error.code === 'P2025'`, return `Response.json({ error: 'Turno no encontrado' }, { status: 404 })`. [ASSUMED — standard Prisma error handling pattern]

---

## Code Examples

### Status badge (from UI-SPEC)

```typescript
// Source: 04-UI-SPEC.md Component Inventory — Status badge
<span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', STATUS_COLORS[status])}>
  {STATUS_LABELS[status]}
</span>
```

### Filter bar input base class (from UI-SPEC)

```typescript
// Source: 04-UI-SPEC.md Filter bar
const inputClass = "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-[rgba(20,184,166,0.4)] focus:outline-none focus:ring-1 focus:ring-[rgba(20,184,166,0.4)]"
```

### Table wrapper and row classes (from UI-SPEC, matches SpecialtiesList)

```typescript
// Source: 04-UI-SPEC.md + components/admin/SpecialtiesList.tsx
// Container
<div className="bg-surface rounded-xl shadow-card">
  <table className="w-full table-auto">
    <thead className="border-b border-border">
      <tr>
        <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wide">
          Paciente
        </th>
        {/* ... */}
      </tr>
    </thead>
    <tbody>
      <tr className="border-b border-border last:border-b-0 hover:bg-background transition-colors">
        <td className="px-6 py-4 align-top">...</td>
      </tr>
    </tbody>
  </table>
</div>
```

### WhatsApp action in Acciones column (from UI-SPEC)

```typescript
// Source: 04-UI-SPEC.md Component Inventory — Acciones column CONFIRMED state
{appointment.status === 'CONFIRMED' && (
  <a
    href={buildWhatsAppUrl(appointment)}
    target="_blank"
    rel="noopener noreferrer"
    onClick={() => handleWhatsAppClick(appointment.id)}
    className="flex items-center gap-1 text-sm text-accent hover:underline"
  >
    {appointment.whatsappSent
      ? <MessageCircleCheck className="h-4 w-4 text-accent" />
      : <MessageCircle className="h-4 w-4 text-accent" />
    }
    {appointment.whatsappSent ? 'WA enviado' : 'Enviar WA'}
  </a>
)}
```

### Empty state (from UI-SPEC)

```typescript
// Source: 04-UI-SPEC.md Component Inventory — Empty state
<div className="flex flex-col items-center justify-center py-12 text-center">
  <Calendar className="h-10 w-10 text-text-muted mb-3" />
  <p className="text-sm font-semibold text-text-primary mb-1">Sin turnos para este filtro</p>
  <p className="text-sm text-text-secondary">Probá con otra fecha, médico o estado.</p>
</div>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `params.id` (sync) | `await params` → `params.id` | Next.js 15+ | Breaking — all dynamic route handlers must await params |
| `NextResponse.json()` | `Response.json()` (Web API) | Next.js 15+ | Non-cookie routes use native Response; NextResponse only for cookie/header mutations |
| `prisma migrate dev` | `prisma db push` | Project convention | No migration files — direct schema push to Supabase |
| `next/headers` cookies() sync | `await cookies()` | Next.js 15+ | In this phase, cookies are read via `request.cookies` in Route Handlers (no await needed); Server Component pages read from middleware-injected headers, not cookies directly |

**Deprecated/outdated:**
- `NextResponse.json()` in Route Handlers without cookie setting: replaced by `Response.json()`. Project already follows this convention consistently. [VERIFIED: all existing admin routes]

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | RECEPTIONIST role cannot change appointment status (requireAdmin blocks them) | Pitfall 1, Pattern 2 | Receptionist UI would silently fail all mutations; would need a new `requireStaff()` helper |
| A2 | `router.refresh()` should NOT be used for inline status updates in this component | Pitfall 4, Pattern 7 | If used, filter state resets on every action — poor UX but not a bug |
| A3 | Prisma P2025 handling needed in PATCH routes | Pitfall 6 | Unhandled 500 errors if appointment ID is stale/deleted between fetch and action |
| A4 | Phone number stored as 10 digits without country prefix (verified in public appointments POST) | Pattern 4 | WhatsApp URL gets double country code if assumption is wrong — wa.me/54954... |

**A4 note:** This was verified — `app/api/public/appointments/route.ts` stores `phoneClean` which strips all non-digits, producing 10 digits. The normalization `replace(/^0/, '')` handles edge cases where a leading 0 exists.

---

## Open Questions (RESOLVED)

1. **RECEPTIONIST role access to status mutations** — RESOLVED: `requireAdmin` used consistently across all three Route Handlers. RECEPTIONIST cannot mutate appointment status. If this needs to change, a one-line `requireStaff()` helper can be added in Phase 5.

2. **Debounce on DNI text input** — RESOLVED: 300ms debounce via `setTimeout`/`clearTimeout` in a separate `useEffect` in AppointmentsList. Date/doctorId/status selects fetch immediately. No new library required.

3. **Pagination decision** — RESOLVED: No pagination. `take: 200` safety cap on the GET endpoint prevents unbounded queries if user clears the date filter.

---

## Environment Availability

Step 2.6: SKIPPED — this phase adds only TypeScript/TSX files following existing project patterns. No new external tools, services, CLIs, or runtimes are required. All dependencies (Node.js, Prisma, Next.js, PostgreSQL via Supabase) are already active from previous phases.

---

## Validation Architecture

No `config.json` found — treating nyquist_validation as enabled.

### Test Framework

No test framework is configured in this project. No `jest.config.*`, `vitest.config.*`, `pytest.ini`, or `__tests__/` directory was found in the project.

| Property | Value |
|----------|-------|
| Framework | None configured |
| Config file | none |
| Quick run command | n/a — manual verification only |
| Full suite command | n/a |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TURNO-01 | GET /api/admin/appointments returns filtered list | manual-only | n/a | ❌ no test infra |
| TURNO-02 | PATCH /api/admin/appointments/[id] updates status | manual-only | n/a | ❌ no test infra |
| TURNO-03 | PATCH /api/admin/appointments/[id]/whatsapp sets whatsappSent | manual-only | n/a | ❌ no test infra |
| TURNO-04 | WhatsApp URL correctly encodes Argentina number | manual-only | n/a | ❌ no test infra |
| TURNO-05 | Filter by date shows only matching appointments | manual-only | n/a | ❌ no test infra |

### Wave 0 Gaps

None — no test framework configured. All verification is manual using the running Next.js dev server and Supabase database.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | JWT verified via `requireAdmin()` in all Route Handlers |
| V3 Session Management | no | Session managed in Phase 1; no changes here |
| V4 Access Control | yes | `requireAdmin()` guard on all three mutation endpoints |
| V5 Input Validation | yes | `status` validated against enum; `id` validated as integer; `date`/`doctorId`/`status`/`dni` params sanitized before Prisma query |
| V6 Cryptography | no | No crypto operations in this phase |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unauthenticated status change | Elevation of privilege | `requireAdmin()` on all PATCH routes returns 401/403 |
| SQL injection via filter params | Tampering | Prisma parameterized queries — no raw SQL |
| Phone number XSS via WhatsApp URL | Tampering | `encodeURIComponent()` on message; phone digits-only from storage |
| Mass assignment via PATCH body | Tampering | PATCH /[id] only reads `body.status`; PATCH /whatsapp only sets `whatsappSent: true` — no spread of body into Prisma data |
| Open redirect via wa.me | Spoofing | Not applicable — wa.me is a known safe external domain; no server-side redirect |

---

## Project Constraints (from CLAUDE.md / AGENTS.md)

The following directives from `AGENTS.md` (via `CLAUDE.md` @-include) are mandatory:

1. **Read `node_modules/next/dist/docs/` before writing code.** Confirmed: route handler docs read; `params` is a Promise in Next.js 16. [VERIFIED]
2. **`await params`** — dynamic route handlers must `await params` before destructuring. [VERIFIED: route.md + existing doctors/[id]/route.ts]
3. **`await cookies()`** — not applicable in this phase; cookies are read via `request.cookies.get()` in Route Handlers (synchronous on NextRequest), and Server Component pages read from middleware-injected headers, not `cookies()`.
4. **`Response.json()` not `NextResponse.json()`** — all three new Route Handlers must use `Response.json()`. No cookies are set in this phase. [VERIFIED: all existing admin routes follow this]
5. **`db push` not `migrate dev`** — no schema changes in this phase; not applicable but noted.
6. **Heed deprecation notices** — no deprecated APIs used in this phase's patterns.

---

## Sources

### Primary (HIGH confidence)
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` — Route Handler params as Promise, Response.json usage [VERIFIED]
- `prisma/schema.prisma` — Appointment model fields, indexes, enum values [VERIFIED]
- `lib/utils.ts` — All utility function signatures and STATUS_* exports [VERIFIED]
- `lib/auth-helpers.ts` — `requireAdmin()` signature and role check behaviour [VERIFIED]
- `app/api/admin/specialties/route.ts` — GET list pattern [VERIFIED]
- `app/api/admin/doctors/[id]/route.ts` — PATCH with `await params` pattern [VERIFIED]
- `app/(admin)/admin/especialidades/page.tsx` — Server Component + Client Component split pattern [VERIFIED]
- `app/(admin)/admin/medicos/page.tsx` — `Promise.all` initial fetch pattern [VERIFIED]
- `components/admin/SpecialtiesList.tsx` — Inline confirm pattern, `deletingId` state, table row classes [VERIFIED]
- `components/admin/Drawer.tsx` — Drawer props and usage [VERIFIED]
- `app/globals.css` — All design tokens [VERIFIED]
- `middleware.ts` — Auth flow, `x-user-role` header injection, PUBLIC_PATHS [VERIFIED]
- `app/api/public/appointments/route.ts` — Phone storage format (10 digits, no country prefix) [VERIFIED]
- `.planning/phases/04-gestion-turnos/04-CONTEXT.md` — All locked decisions [VERIFIED]
- `.planning/phases/04-gestion-turnos/04-UI-SPEC.md` — Component inventory, classes, copywriting contract [VERIFIED]

### Secondary (MEDIUM confidence)
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/next-request.md` — `request.nextUrl.searchParams` for query param access [VERIFIED]

### Tertiary (LOW confidence — training knowledge)
- WhatsApp `wa.me` URL format with `549` Argentina prefix — well-established wa.me convention but not verified via official WhatsApp documentation in this session [ASSUMED — consistent with CONTEXT.md D-06 and UI-SPEC]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies verified in project files
- Architecture: HIGH — patterns copied directly from verified existing code
- API patterns: HIGH — verified from Next.js 16 docs and existing route handlers
- WhatsApp URL: MEDIUM — wa.me format verified from project CONTEXT.md; Argentina prefix is ASSUMED (training knowledge, consistent with project decisions)
- Pitfalls: HIGH — `await params` and date pitfalls verified from docs and code

**Research date:** 2026-05-29
**Valid until:** 2026-06-29 (stable stack — Next.js 16 conventions, Prisma, Tailwind v4)
