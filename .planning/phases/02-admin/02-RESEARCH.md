# Phase 2: Admin — Research

**Researched:** 2026-05-27
**Domain:** Next.js 16 App Router, Prisma 6, framer-motion 12, Supabase Storage, admin CRUD UI
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Dashboard**
- D-01: Período de métricas — semana en curso (lunes a domingo de la semana actual).
- D-02: KPIs — 4 cards: Pendientes / Confirmados / Completados / Cancelados. Cada card muestra el conteo de turnos en ese estado para la semana.
- D-03: Visual — solo cards, sin gráficos, sin tabla de próximos turnos debajo.
- D-04: Carga — Server Component que consulta Prisma directamente. Sin fetch client-side, sin skeleton/loading state en el dashboard.

**ABM Pattern (Claude's Discretion — now locked)**
- List page (Server Component) + drawer/sheet lateral para crear y editar. La lista es Server Component; el formulario se abre como overlay sin navegar a otra ruta. Sin páginas `create/` y `edit/[id]/` separadas.

**Availability Editor (Claude's Discretion — now locked)**
- Lista de franjas horarias por día — por cada día de la semana, el admin puede agregar/quitar rangos (startTime–endTime). No hacer grilla interactiva de celdas.

**Permissions (Claude's Discretion — now locked)**
- ADMIN: CRUD completo.
- RECEPTIONIST: solo lectura (listas visibles, botones CRUD ocultos). Guard en Server Component vía header `x-user-role`.
- Endpoints de API: verificar rol desde cookie en cada Route Handler.

**Avatar (Specifics — locked)**
- file input → uploadAvatar(file, doctorId) → guardar URL en Doctor.avatar. Preview antes de guardar. Fallback: initials con getInitials(name).

### Claude's Discretion

All implementation details not listed above: file naming, component composition, React state shape, error boundary approach, specific Prisma query structure (groupBy vs findMany+count).

### Deferred Ideas (OUT OF SCOPE)

- Gestión de turnos desde el dashboard (quick actions) — Fase 4
- Gráfico de barras de turnos por día — Fase 5
- Gestión de usuarios (RECEPTIONIST/DOCTOR accounts) — Fase 5 or new phase
- Notificaciones / indicadores en tiempo real
</user_constraints>

---

## Summary

Phase 2 builds the full admin panel on top of the Phase 1 foundation. The implementation is straightforward because all the infrastructure already exists: JWT auth, middleware that injects role headers, the Prisma schema with all necessary models, `lib/supabase.ts` with `uploadAvatar()`, and the admin layout with sidebar.

The work divides into four independent tracks: (1) dashboard metrics with a Prisma groupBy query for the current week, (2) Specialties ABM with a drawer pattern and `input[type=color]`, (3) Doctors ABM with the same drawer pattern plus avatar upload, and (4) the Availability editor as a separate page with client-side array state. All tracks share the same API route pattern (cookies from request object, `await params`, `Response.json()`), the same drawer component, and the same role-guard mechanism.

The main technical decision point is the mutation/refresh pattern: the project's established pattern from the login page uses Route Handlers + `router.refresh()` on the client after a successful fetch. This is appropriate here — Server Actions are an option but would require changing auth verification approach since the existing auth reads from cookies via `verifyToken()`, not a session library. The Route Handler + fetch + `router.refresh()` pattern is consistent with Phase 1 and should be followed.

**Primary recommendation:** Use Route Handlers for all mutations (consistent with existing codebase). After each mutation the Client Component calls `router.refresh()` which re-runs the Server Component and shows updated data without a full page reload.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Dashboard metrics query | Server (RSC) | — | D-04: Server Component + Prisma direct, no client fetch |
| Specialties list render | Server (RSC) | — | Data fetched at request time in page.tsx |
| Specialty create/edit form | Client Component | API (Route Handler) | Requires interactivity (drawer open/close, controlled inputs, submit state) |
| Doctor create/edit form | Client Component | API (Route Handler) | File input + preview require browser APIs |
| Avatar upload | Client Component + Supabase Storage | API (Route Handler) | `uploadAvatar()` uses browser File API; upload happens in browser |
| Availability editor interactive state | Client Component | API (Route Handler) | Array of time ranges per day requires useState |
| Availability data fetch (initial) | Server (RSC) | — | Page fetches existing availability server-side before passing to client |
| Role guard (UI element visibility) | Server (RSC) | Middleware | Reads x-user-role header; hides CRUD buttons conditionally in JSX |
| Role guard (API) | API (Route Handler) | — | Every admin Route Handler verifies cookie + role before mutating |
| Drawer animation | Client Component | — | framer-motion AnimatePresence runs in browser |

---

## Standard Stack

All packages below are already installed. No new `npm install` is required for this phase.

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.2.6 | App Router, Server Components, Route Handlers | Project foundation |
| react | 19.2.4 | Client Components, useState, useRouter | Project foundation |
| @prisma/client | 6.19.3 | Database queries (groupBy, findMany, create, update, delete) | Project ORM |
| framer-motion | 12.40.0 | Drawer slide animation (AnimatePresence + motion.div) | Already in dependencies |
| lucide-react | 1.16.0 | Icons (Loader2, X, Plus, Edit, Trash2, etc.) | Already in dependencies |
| @supabase/supabase-js | 2.106.2 | Avatar upload via uploadAvatar() in lib/supabase.ts | Already in dependencies |

### No new packages required
The UI spec explicitly states: "All UI is hand-rolled with Tailwind v4 tokens and lucide-react icons. No third-party component registries." [CITED: .planning/phases/02-admin/02-UI-SPEC.md, Registry Safety section]

---

## Package Legitimacy Audit

No new packages are installed in this phase. All packages were validated in Phase 1.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
Browser (Client)
  │
  ├─ AdminSidebar (Client Component) — usePathname for active state
  │
  ├─ /admin (RSC) ──────────────────── prisma.appointment.groupBy() ──► PostgreSQL
  │     └─ StatCards (x4, pure display)
  │
  ├─ /admin/especialidades (RSC) ────── prisma.specialty.findMany() ──► PostgreSQL
  │     └─ SpecialtiesDrawer (Client) ─► fetch POST/PUT /api/admin/specialties[/id]
  │           └─ on success: router.refresh() ──► re-runs RSC page
  │
  ├─ /admin/medicos (RSC) ───────────── prisma.doctor.findMany() ─────► PostgreSQL
  │     └─ DoctorDrawer (Client) ──────► uploadAvatar() ──────────────► Supabase Storage
  │           │                          fetch POST/PUT /api/admin/doctors[/id]
  │           └─ on success: router.refresh()
  │
  └─ /admin/medicos/[id]/disponibilidad (RSC + Client)
        RSC: prisma.availability.findMany({ where: { doctorId } })
        Client: AvailabilityEditor (useState array per day)
          └─ on save: fetch PUT /api/admin/doctors/[id]/availability
                └─ on success: show inline success message

API Layer (Route Handlers)
  ├─ /api/admin/specialties          GET, POST
  ├─ /api/admin/specialties/[id]     PUT, DELETE
  ├─ /api/admin/doctors              GET, POST
  ├─ /api/admin/doctors/[id]         PUT, DELETE
  └─ /api/admin/doctors/[id]/availability  GET, PUT (full replace)

All Route Handlers:
  1. Read cookie: request.cookies.get('tm_token')?.value
  2. verifyToken(token) → JWTPayload | null
  3. Check payload.role === 'ADMIN' for mutations
  4. await params (Promise<{id: string}>)
  5. return Response.json(...)
```

### Recommended Project Structure

```
app/
├── (admin)/
│   ├── layout.tsx                   # existing — no changes needed
│   ├── admin/
│   │   └── page.tsx                 # REPLACE placeholder with real dashboard
│   ├── especialidades/
│   │   └── page.tsx                 # Server Component — list + drawer container
│   └── medicos/
│       ├── page.tsx                 # Server Component — list + drawer container
│       └── [id]/
│           └── disponibilidad/
│               └── page.tsx         # Server Component — fetches, renders AvailabilityEditor
├── api/
│   └── admin/
│       ├── specialties/
│       │   ├── route.ts             # GET (list), POST (create)
│       │   └── [id]/
│       │       └── route.ts         # PUT (update), DELETE
│       └── doctors/
│           ├── route.ts             # GET (list with specialty), POST (create)
│           └── [id]/
│               ├── route.ts         # PUT (update), DELETE
│               └── availability/
│                   └── route.ts     # GET, PUT (full replace)
components/
└── admin/
    ├── AdminSidebar.tsx             # existing — update py-2.5 → py-3
    ├── Drawer.tsx                   # NEW — shared animated drawer shell
    ├── SpecialtyForm.tsx            # NEW — create/edit form (Client Component)
    ├── DoctorForm.tsx               # NEW — create/edit form with avatar (Client Component)
    ├── AvailabilityEditor.tsx       # NEW — 7-day time range editor (Client Component)
    ├── StatCard.tsx                 # NEW — dashboard stat card
    ├── SpecialtiesList.tsx          # NEW — list rows + inline delete confirm
    └── DoctorsList.tsx              # NEW — list rows + inline delete confirm
```

### Pattern 1: Server Component Page with Client Drawer

The page is async Server Component that reads `x-user-role` from headers, fetches data via Prisma, and passes it to a Client Component that manages drawer open/close state.

```typescript
// Source: Next.js 16 docs — Server Components + headers()
// app/(admin)/especialidades/page.tsx
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { SpecialtiesList } from '@/components/admin/SpecialtiesList'

export default async function EspecialidadesPage() {
  const headersList = await headers()
  const role = headersList.get('x-user-role') as 'ADMIN' | 'RECEPTIONIST'

  const specialties = await prisma.specialty.findMany({
    orderBy: { name: 'asc' },
  })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-xl font-semibold text-text-primary">
          Especialidades
        </h1>
        {role === 'ADMIN' && <CreateSpecialtyButton />}
      </div>
      <SpecialtiesList specialties={specialties} role={role} />
    </div>
  )
}
```

**Key: `headers()` is async — always `await headers()`** [VERIFIED: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md]

### Pattern 2: Route Handler with Cookie Auth

Established pattern from Phase 1 (`app/api/auth/login/route.ts`). All admin Route Handlers follow this:

```typescript
// Source: verified from existing app/api/auth/login/route.ts + route.md docs
import { NextRequest } from 'next/server'
import { verifyToken, COOKIE_NAME } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  // 1. Auth from cookie directly on request object (no await cookies() needed)
  const token = request.cookies.get(COOKIE_NAME)?.value
  const payload = token ? verifyToken(token) : null

  if (!payload || payload.role !== 'ADMIN') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 2. Parse body
  const body = await request.json().catch(() => null)
  if (!body?.name) {
    return Response.json({ error: 'Nombre es requerido' }, { status: 400 })
  }

  // 3. Mutate
  const specialty = await prisma.specialty.create({
    data: { name: body.name, description: body.description, color: body.color ?? '#0d9488' },
  })

  // 4. Return with Response.json() — NOT NextResponse.json()
  return Response.json({ specialty }, { status: 201 })
}
```

**Key: reading cookie from `request.cookies.get()` is sync, no await needed. `params` in dynamic routes IS async and requires `await params`.** [VERIFIED: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md]

### Pattern 3: Dynamic Route Handler with await params

```typescript
// Source: route.md — v15.0.0-RC context.params is now a Promise
// app/api/admin/specialties/[id]/route.ts
import { NextRequest } from 'next/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params  // MUST await — this is a Promise in Next.js 15+/16
  const numericId = parseInt(id, 10)
  // ...
}
```

**Critical: `params` is a `Promise<{id: string}>` in Next.js 15+ (and 16). Always `await params`.** [VERIFIED: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md Version History]

### Pattern 4: Animated Drawer with framer-motion AnimatePresence

```typescript
// Source: framer-motion 12 confirmed via node_modules — AnimatePresence + motion exports verified
// components/admin/Drawer.tsx
'use client'

import { AnimatePresence, motion } from 'framer-motion'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export function Drawer({ open, onClose, title, children }: DrawerProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/40 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          {/* Sheet panel */}
          <motion.div
            className="fixed right-0 top-0 h-full w-full max-w-md bg-surface rounded-l-xl shadow-modal z-50 flex flex-col"
            initial={{ x: 400 }}
            animate={{ x: 0 }}
            exit={{ x: 400 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {/* 4px accent bar */}
            <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-primary to-accent rounded-tl-xl" />
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-display text-xl font-semibold text-text-primary pl-2">
                {title}
              </h2>
              <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
```

**AnimatePresence wraps the conditional `{open && ...}` — this is the standard framer-motion pattern for mount/unmount animations.** [VERIFIED: framer-motion 12.40.0 exports confirmed via node evaluation]

### Pattern 5: Dashboard Prisma Query — groupBy for current week

```typescript
// Source: Prisma 6 groupBy confirmed in @prisma/client/runtime/library.d.ts
// app/(admin)/admin/page.tsx (Server Component)
import { prisma } from '@/lib/prisma'

function getWeekRange() {
  const now = new Date()
  const day = now.getDay() // 0=Sunday
  const diff = day === 0 ? -6 : 1 - day // offset to Monday
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return { monday, sunday }
}

export default async function AdminDashboardPage() {
  const { monday, sunday } = getWeekRange()

  const counts = await prisma.appointment.groupBy({
    by: ['status'],
    where: {
      date: { gte: monday, lte: sunday },
    },
    _count: { _all: true },
  })

  // Transform to { PENDING: N, CONFIRMED: N, COMPLETED: N, CANCELLED: N }
  const stats = { PENDING: 0, CONFIRMED: 0, COMPLETED: 0, CANCELLED: 0 }
  for (const row of counts) {
    stats[row.status] = row._count._all
  }
  // ...render 4 StatCards
}
```

**Important:** The `Appointment.date` field is `@db.Date` (date-only in PostgreSQL). The JS `Date` objects passed to Prisma `gte`/`lte` will be compared against date-only columns. Prisma handles the coercion. [VERIFIED: prisma/schema.prisma — `date DateTime @db.Date`; groupBy in @prisma/client/runtime/library.d.ts]

**Alternative query approach:** `prisma.appointment.findMany` + JS `reduce` by status. Equivalent, slightly more data over the wire but simpler. Either is acceptable.

### Pattern 6: Client Component Mutation with router.refresh()

```typescript
// Source: Established in Phase 1 login page (app/(auth)/login/page.tsx)
'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function SpecialtyForm({ specialty, onClose }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch(
        specialty ? `/api/admin/specialties/${specialty.id}` : '/api/admin/specialties',
        {
          method: specialty ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, description, color }),
        }
      )
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Ocurrió un error al guardar. Intentá nuevamente.')
        return
      }
      onClose()
      router.refresh()  // Re-runs the Server Component, shows updated list
    } catch {
      setError('Ocurrió un error al guardar. Intentá nuevamente.')
    } finally {
      setLoading(false)
    }
  }
}
```

**`router.refresh()` is documented in Next.js 16 mutating-data.md as the correct approach after Route Handler mutations from Client Components.** [VERIFIED: node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md]

### Pattern 7: Avatar Upload — Client-side preview + uploadAvatar()

```typescript
// Source: lib/supabase.ts uploadAvatar() — verified by reading the file
'use client'

function AvatarUpload({ doctorId, currentUrl }: { doctorId?: number; currentUrl?: string }) {
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null)
  const [file, setFile] = useState<File | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (!selected) return
    // Client-side preview — no upload yet
    setPreview(URL.createObjectURL(selected))
    setFile(selected)
  }

  // During form submit (called by parent DoctorForm):
  async function getAvatarUrl(): Promise<string | undefined> {
    if (!file) return undefined
    // uploadAvatar requires doctorId — for new doctors, must create doctor first, then upload
    if (!doctorId) throw new Error('Doctor must be created before uploading avatar')
    return uploadAvatar(file, doctorId)
  }
}
```

**Critical sequencing for new doctor:** `uploadAvatar(file, doctorId)` requires a `doctorId`. For CREATE flow: (1) POST /api/admin/doctors without avatar → get `doctorId` in response → (2) `uploadAvatar(file, doctorId)` → (3) PATCH /api/admin/doctors/[id] with `{ avatar: url }`. For EDIT flow: upload first (doctorId already known), then save form.

**Alternatively (simpler):** For CREATE, skip avatar on first save; allow editing avatar after creation. This avoids the two-step create-then-upload complexity. This choice is Claude's discretion — recommend the simpler two-step approach.

### Pattern 8: Availability State Management

```typescript
// Represents state for availability editor
type TimeRange = { startTime: string; endTime: string; id?: number }
type DayRanges = Record<number, TimeRange[]> // 0=Sunday, 1=Monday, ..., 6=Saturday

// Initialize from server-fetched Availability[]
const [ranges, setRanges] = useState<DayRanges>(() => {
  const initial: DayRanges = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] }
  for (const avail of initialAvailabilities) {
    initial[avail.dayOfWeek].push({ startTime: avail.startTime, endTime: avail.endTime, id: avail.id })
  }
  return initial
})

// Add range
function addRange(day: number) {
  setRanges(prev => ({
    ...prev,
    [day]: [...prev[day], { startTime: '09:00', endTime: '17:00' }]
  }))
}

// Remove range
function removeRange(day: number, index: number) {
  setRanges(prev => ({
    ...prev,
    [day]: prev[day].filter((_, i) => i !== index)
  }))
}
```

**Save strategy:** Full replace — DELETE all existing Availability for the doctor, then INSERT new ones. The API endpoint `PUT /api/admin/doctors/[id]/availability` receives the full array. [CITED: 02-CONTEXT.md Specifics — "Replaces entire availability for the doctor (full replace, not delta)"]

```typescript
// API handler: full replace
// app/api/admin/doctors/[id]/availability/route.ts
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const doctorId = parseInt(id, 10)
  const body = await request.json()
  // body.availabilities: Array<{ dayOfWeek: number, startTime: string, endTime: string }>

  await prisma.$transaction([
    prisma.availability.deleteMany({ where: { doctorId } }),
    prisma.availability.createMany({ data: body.availabilities.map(a => ({ ...a, doctorId })) }),
  ])

  return Response.json({ ok: true })
}
```

**`onDelete: Cascade` on Availability means deleting a Doctor auto-deletes their Availability. No need for manual cleanup on doctor delete.** [VERIFIED: prisma/schema.prisma — `onDelete: Cascade`]

### Anti-Patterns to Avoid

- **Using `NextResponse.json()` in Route Handlers:** Always `Response.json()`. The project established this in Phase 1 and the official docs confirm it. [VERIFIED: app/api/auth/login/route.ts]
- **Forgetting `await params`:** Route Handler `context.params` is a `Promise` in Next.js 15+/16. Destructuring without await results in a Promise object, not the params values. [VERIFIED: route.md Version History v15.0.0-RC]
- **Calling `cookies()` when cookie can be read from request directly:** In Route Handlers, prefer `request.cookies.get(COOKIE_NAME)?.value` — synchronous and sufficient. Reserve `await cookies()` from `next/headers` for Server Components and Server Actions.
- **Using `backdrop-blur` in admin components:** The UI spec explicitly reserves glassmorphism for the public Booking Wizard only. [CITED: 02-UI-SPEC.md Animation Contracts]
- **Rendering hidden CRUD buttons with CSS `display:none`:** The UI spec mandates excluding them from JSX output for ADMIN-only buttons. [CITED: 02-UI-SPEC.md Role-Gated UI Elements]
- **Doing avatar upload before doctor creation for new doctors:** `uploadAvatar(file, doctorId)` sets the path as `avatars/doctor-${doctorId}.ext` — requires a real ID. For CREATE flow, create doctor first (without avatar), then upload.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drawer animation | Custom CSS transitions or keyframes | `framer-motion AnimatePresence + motion.div` | Already installed, spec-compliant x/opacity transitions, handles mount/unmount cleanly |
| Role check boilerplate | Inline cookie parsing in each handler | Extract `requireAdmin(request)` helper (or `requireRole(request, 'ADMIN')`) | DRY: 5+ Route Handlers all need the same pattern |
| Date range for current week | Ad-hoc date arithmetic | `getWeekRange()` utility in `lib/utils.ts` | Reused by dashboard RSC and potentially Phase 4 |
| Conditional Tailwind classes | Manual string concatenation | `cn()` from `lib/utils.ts` | Already in codebase |
| Avatar fallback initials | Custom logic | `getInitials(name)` from `lib/utils.ts` | Already in codebase |
| Status color lookups | Hardcoded strings | `STATUS_COLORS` from `lib/utils.ts` | Already in codebase, used by dashboard cards |

**Key insight:** All the hard plumbing (JWT, Prisma, Supabase, design tokens) is already done. This phase is 95% application-layer UI work on top of a solid Phase 1 foundation.

---

## Common Pitfalls

### Pitfall 1: `params` is a Promise — destructuring without await

**What goes wrong:** `const { id } = params` returns the Promise object, not the resolved value. `parseInt(id, 10)` returns `NaN`. Prisma query with `NaN` id returns null or throws.
**Why it happens:** Breaking change in Next.js 15.0.0-RC (applies to 16). Previous versions had sync params.
**How to avoid:** Always `const { id } = await params` in every Route Handler.
**Warning signs:** `prisma.specialty.findUnique({ where: { id: NaN } })` returns null; 404 responses when the resource exists.

### Pitfall 2: Dashboard date comparison with `@db.Date` columns

**What goes wrong:** `Appointment.date` is `DateTime @db.Date` — stored as a date-only value in PostgreSQL. Passing a full `DateTime` JS object to `gte`/`lte` may have timezone edge cases.
**Why it happens:** PostgreSQL `DATE` type vs JavaScript `Date` object timezone offset.
**How to avoid:** Use `new Date(year, month, day, 0, 0, 0, 0)` for start of day (local time). Alternatively, use ISO string `'YYYY-MM-DD'` format: Prisma accepts string for `@db.Date` fields.
**Warning signs:** Dashboard shows 0 counts for a week that has appointments in the database.

### Pitfall 3: `uploadAvatar()` called before Doctor ID exists

**What goes wrong:** `uploadAvatar(file, doctorId)` generates path `avatars/doctor-${doctorId}.ext`. If called with `undefined` or before creation, path is `avatars/doctor-undefined.ext`.
**Why it happens:** CREATE flow doesn't have a DB ID until after the INSERT.
**How to avoid:** For CREATE: POST to create doctor (no avatar) → get ID → upload → PATCH doctor with avatar URL. Only attempt upload if `file` is non-null.
**Warning signs:** Avatar URL is `avatars/doctor-undefined.jpg` in the DB.

### Pitfall 4: Drawer not closing when route changes

**What goes wrong:** `AnimatePresence` doesn't unmount if `open` state is not driven by the parent. If the user navigates away without closing, the drawer persists.
**Why it happens:** The drawer open state is local to the page's Client Component container. Navigation destroys the component tree, which is fine — but if open state is lifted improperly, it can leak.
**How to avoid:** Keep drawer open state in the lowest common ancestor (the page-level Client Component wrapper that includes both the list and the drawer trigger). Reset state on navigation via `useEffect` listening to `pathname`.
**Warning signs:** Drawer appears open on returning to the page.

### Pitfall 5: Availability editor saves with invalid time ranges

**What goes wrong:** A range where `endTime <= startTime` is submitted. The API creates the record, but the slot generator in Phase 3 will produce 0 or invalid slots.
**Why it happens:** Client-side validation skipped or only validated on the client.
**How to avoid:** Validate in the AvailabilityEditor Client Component (show inline error per the UI spec) AND validate in the PUT Route Handler before inserting.
**Warning signs:** `endTime: "08:00"`, `startTime: "09:00"` stored in DB.

### Pitfall 6: Role check reads `x-user-role` in a Route Handler instead of cookie

**What goes wrong:** `headers()` injected by middleware contains `x-user-role`, but Route Handlers execute server-side and the middleware headers may not be reliably available the same way as in RSC.
**Why it happens:** Confusion between RSC auth (use `headers()` → `x-user-role`) and Route Handler auth (use cookie → `verifyToken()`).
**How to avoid:** In **Server Components (RSC)**: read `x-user-role` from `await headers()`. In **Route Handlers**: read `tm_token` from `request.cookies.get(COOKIE_NAME)` and verify with `verifyToken()`. This is exactly what Phase 1 established. [VERIFIED: middleware.ts injects headers; login/route.ts uses cookie directly]

---

## Code Examples

### Verified patterns from official sources

#### Dashboard stat card structure (from UI-SPEC)
```tsx
// Source: 02-UI-SPEC.md — Dashboard screen contract
const STATUS_BORDER = {
  PENDING: 'border-amber-400',
  CONFIRMED: 'border-teal-500',
  COMPLETED: 'border-slate-400',
  CANCELLED: 'border-red-400',
}

function StatCard({ status, count }: { status: AppointmentStatus; count: number }) {
  return (
    <div className={`bg-surface rounded-xl shadow-card p-6 border-l-4 ${STATUS_BORDER[status]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs ${STATUS_COLORS[status]}`}>{STATUS_LABELS[status]}</span>
        {/* lucide icon 16px */}
      </div>
      <p className="font-display text-3xl font-semibold text-text-primary">{count}</p>
      <p className="text-xs text-text-secondary mt-1">turnos esta semana</p>
    </div>
  )
}
// Grid: grid grid-cols-2 gap-4 md:grid-cols-4
```

#### Input and label style (from UI-SPEC)
```tsx
// Source: 02-UI-SPEC.md — Form fields
<label className="block text-xs text-text-secondary mb-1">Nombre</label>
<input
  type="text"
  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary
             focus:outline-none focus:border-[rgba(13,148,136,0.4)] focus:ring-2 focus:ring-[rgba(13,148,136,0.2)]"
/>
```

#### Primary and secondary button styles (from UI-SPEC)
```tsx
// Source: 02-UI-SPEC.md — Buttons section
// Primary:
<button className="rounded-lg bg-gradient-to-r from-primary to-accent px-4 py-2 text-sm font-semibold text-white
                   transition-all duration-150 hover:shadow-[0_0_12px_rgba(20,184,166,0.4)]
                   disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none">
  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar especialidad'}
</button>

// Secondary (dismiss):
<button className="rounded-lg border border-[rgba(13,148,136,0.3)] px-4 py-2 text-sm font-semibold text-primary
                   transition-all duration-150 hover:bg-primary/5">
  Descartar cambios
</button>
```

#### Inline delete confirmation row (from UI-SPEC)
```tsx
// Source: 02-UI-SPEC.md — Delete Specialty Confirmation
// State: 'idle' | 'confirming'
{deleteState === 'idle' ? (
  <>
    <button aria-label="Editar especialidad" onClick={() => openDrawer(specialty)}>
      <Edit className="h-4 w-4" />
    </button>
    <button
      aria-label="Eliminar especialidad"
      className="text-error hover:text-error"
      onClick={() => setDeleteState('confirming')}
    >
      <Trash2 className="h-4 w-4" />
    </button>
  </>
) : (
  <div className="flex items-center gap-2 transition-opacity opacity-100 duration-150">
    <span className="text-xs text-text-secondary">¿Confirmar eliminación?</span>
    <button className="text-sm font-semibold text-error" onClick={handleDelete}>Sí, eliminar</button>
    <button className="text-sm text-text-secondary" onClick={() => setDeleteState('idle')}>
      Descartar cambios
    </button>
  </div>
)}
```

#### Specialty color picker (from UI-SPEC)
```tsx
// Source: 02-UI-SPEC.md — color field uses <input type="color">
<div className="flex items-center gap-3">
  <input type="color" value={color} onChange={e => setColor(e.target.value)}
         className="h-8 w-8 rounded cursor-pointer border-0 p-0 bg-transparent" />
  <div className="h-6 w-6 rounded-full" style={{ backgroundColor: color }} />
</div>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Sync `params` in Route Handlers | `params` is a `Promise` — must `await params` | Next.js 15.0.0-RC | All dynamic Route Handlers must await params |
| `NextResponse.json()` for Route Handlers | `Response.json()` (native Web API) | Next.js 15+ | No NextResponse import needed in Route Handlers |
| `useFormState` | `useActionState` (React 19) | React 19 | If using Server Actions + pending state; not applicable here (we use fetch) |
| Sync `cookies()` / `headers()` | `await cookies()` / `await headers()` | Next.js 15+ | Must await in all async contexts |

**Deprecated/outdated:**
- `NextResponse.json()` in Route Handlers: still works but is unnecessary; `Response.json()` is the idiomatic choice per official docs and existing codebase.
- `useFormState`: replaced by `useActionState` in React 19. Not used in this phase (fetch-based mutations).

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | For the CREATE doctor flow with avatar, a two-step create-then-upload approach is cleaner than a single-step with temp ID. | Pattern 7 (Avatar Upload) | Minor UX: doctor is created without avatar, must save again to add photo. Low risk — acceptable UX tradeoff. |
| A2 | Dashboard groupBy query works correctly with PostgreSQL `DATE` type when JS Date objects are passed as `gte`/`lte` boundaries. | Pattern 5 (Dashboard Query) | Timezone edge cases could cause off-by-one counts. Mitigated by testing seed data. |
| A3 | `getAuthFromHeaders` is not exported from `lib/auth.ts` and the file does not contain it — auth in Route Handlers uses `request.cookies.get()` + `verifyToken()` directly. | Pattern 2 (Route Handler Auth) | The CONTEXT.md refers to `getAuthFromHeaders` but it's not in `lib/auth.ts`. The actual auth pattern must be inferred from the login route handler (which reads cookie from request directly). Confirmed by reading the file. |

**Note on A3:** `02-CONTEXT.md` mentioned `getAuthFromHeaders (lee x-user-id, x-user-role desde headers del middleware)` but this function does not exist in `lib/auth.ts`. The correct auth pattern for Route Handlers is `request.cookies.get(COOKIE_NAME)?.value` + `verifyToken()`, as established in Phase 1. The middleware-injected headers (`x-user-role`) are for Server Components only.

---

## Open Questions

1. **Avatar upload timing for new doctors**
   - What we know: `uploadAvatar(file, doctorId)` requires a real DB `doctorId`
   - What's unclear: Should the form block on avatar upload before confirming success, or skip avatar on create and let admin edit to add it?
   - Recommendation: Two-step approach — create doctor first (POST without avatar), then upload avatar and PATCH. If upload fails, doctor is still created (no avatar). User can retry by editing.

2. **AdminSidebar `py-2.5` → `py-3` correction**
   - What we know: UI-SPEC declares `py-3` as correct; sidebar uses `py-2.5`
   - What's unclear: Should this be a task in this phase, or a separate fix?
   - Recommendation: Include as task in Wave 0 setup (update AdminSidebar.tsx) — it's a one-line change.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| PostgreSQL (Supabase) | Prisma queries | ✓ (via DATABASE_URL) | — | — |
| Supabase Storage | Avatar upload | ✓ (via NEXT_PUBLIC_SUPABASE_URL) | — | — |
| framer-motion | Drawer animation | ✓ | 12.40.0 | CSS transition (degraded) |
| lucide-react | Icons | ✓ | 1.16.0 | — |
| @prisma/client | DB access | ✓ | 6.19.3 | — |

**Missing dependencies with no fallback:** None.
**Note:** `prisma generate` must have been run (Phase 1 established this). The Prisma client is in `.prisma/client/` but the PrismaClient import from `lib/prisma.ts` will error at runtime if not generated.

---

## Validation Architecture

No test framework is installed. No `nyquist_validation` config found. Tests are not part of this phase's scope. Manual validation via the running dev server covers all success criteria.

**Manual validation checklist for each success criterion:**
1. Dashboard shows 4 cards with correct counts for seeded appointments in current week
2. Create/edit/delete specialty via drawer works; list updates after each action
3. Create/edit/delete doctor with avatar works; avatar previews before save
4. Availability editor saves and reloads correctly per doctor
5. Loading states show during async operations; error messages appear on failure
6. RECEPTIONIST role sees lists but no create/edit/delete buttons

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | JWT + `verifyToken()` in every Route Handler |
| V3 Session Management | yes | HttpOnly cookie `tm_token`, 8h expiry — established in Phase 1 |
| V4 Access Control | yes | Role check (`payload.role === 'ADMIN'`) before all mutations |
| V5 Input Validation | yes | Server-side validation of required fields before Prisma operations |
| V6 Cryptography | no — not applicable | JWT signing handled by jsonwebtoken (Phase 1) |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unauthorized mutation via direct API call | Elevation of Privilege | Every POST/PUT/DELETE Route Handler verifies `verifyToken()` + role check before touching DB |
| RECEPTIONIST bypasses role check | Elevation of Privilege | API checks `payload.role`, not client-sent role header |
| Mass assignment on Doctor create/update | Tampering | Explicitly destructure allowed fields from body: `{ name, specialtyId, bio, phone, durationMin }` — never spread `body` directly into Prisma |
| Avatar upload to wrong doctor's path | Tampering | `uploadAvatar(file, doctorId)` path is `avatars/doctor-${doctorId}.ext` — only possible if caller controls `doctorId`; Route Handler verifies auth before returning doctorId |
| Missing auth check on availability endpoint | Elevation of Privilege | `PUT /api/admin/doctors/[id]/availability` must also verify JWT and ADMIN role |

**Critical auth rule:** Every Route Handler under `/api/admin/` must verify JWT from cookie before executing. No exceptions. RECEPTIONIST may read (GET), but cannot mutate (POST/PUT/DELETE).

---

## Sources

### Primary (HIGH confidence)
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` — Route Handler params Promise, Response.json(), cookies from request
- `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md` — router.refresh() after mutations, useActionState
- `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` — Route Handler conventions, caching behavior
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cookies.md` — cookies() is async API
- `node_modules/framer-motion` — AnimatePresence, motion exports verified via node evaluation
- `@prisma/client/runtime/library.d.ts` — groupBy operation confirmed in type definitions
- `prisma/schema.prisma` — Doctor.avatar field, Availability.onDelete Cascade, Appointment.date @db.Date
- `lib/auth.ts`, `lib/supabase.ts`, `lib/utils.ts`, `lib/prisma.ts` — existing utilities confirmed by direct file read
- `app/api/auth/login/route.ts` — established Route Handler auth pattern
- `.planning/phases/02-admin/02-CONTEXT.md` — all locked decisions
- `.planning/phases/02-admin/02-UI-SPEC.md` — full UI contract, copy, colors, animations

### Secondary (MEDIUM confidence)
- `scratch/DESIGN.md` — design system rationale, glassmorphism scope (admin vs public)

### Tertiary (LOW confidence)
- None — all claims verified against codebase or official bundled docs.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified in node_modules
- Architecture: HIGH — all patterns verified against existing code and bundled Next.js 16 docs
- Pitfalls: HIGH — derived from version history in official docs + schema analysis
- UI spec compliance: HIGH — read 02-UI-SPEC.md directly

**Research date:** 2026-05-27
**Valid until:** 2026-06-27 (stable stack, no fast-moving dependencies)
