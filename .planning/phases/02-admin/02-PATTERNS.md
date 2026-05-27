# Phase 2: Admin - Pattern Map

**Mapped:** 2026-05-27
**Files analyzed:** 15 new/modified files
**Analogs found:** 14 / 15

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `app/(admin)/admin/page.tsx` | page (Server Component) | request-response | `app/(admin)/admin/page.tsx` (existing placeholder) | exact (replace) |
| `components/admin/StatCard.tsx` | component | request-response | `app/(auth)/login/page.tsx` (display pattern) | partial |
| `app/(admin)/especialidades/page.tsx` | page (Server Component) | CRUD | `app/(admin)/admin/page.tsx` + middleware.ts pattern | role-match |
| `components/admin/SpecialtiesList.tsx` | component | CRUD | `components/admin/AdminSidebar.tsx` (list + interaction) | role-match |
| `components/admin/SpecialtyForm.tsx` | component (Client) | CRUD | `app/(auth)/login/page.tsx` (form + fetch + router.refresh) | exact |
| `components/admin/Drawer.tsx` | component (Client) | request-response | no analog — framer-motion pattern from RESEARCH.md | no analog |
| `app/(admin)/medicos/page.tsx` | page (Server Component) | CRUD | `app/(admin)/especialidades/page.tsx` (sister page) | exact |
| `components/admin/DoctorsList.tsx` | component | CRUD | `components/admin/SpecialtiesList.tsx` (sister component) | exact |
| `components/admin/DoctorForm.tsx` | component (Client) | CRUD + file-I/O | `app/(auth)/login/page.tsx` (form base) + `lib/supabase.ts` | role-match |
| `components/admin/AvailabilityEditor.tsx` | component (Client) | CRUD + event-driven | `app/(auth)/login/page.tsx` (useState + fetch pattern) | partial |
| `app/(admin)/medicos/[id]/disponibilidad/page.tsx` | page (Server Component) | CRUD | `app/(admin)/especialidades/page.tsx` | role-match |
| `app/api/admin/specialties/route.ts` | route handler | request-response | `app/api/auth/login/route.ts` | exact |
| `app/api/admin/specialties/[id]/route.ts` | route handler | request-response | `app/api/auth/login/route.ts` | role-match |
| `app/api/admin/doctors/route.ts` | route handler | request-response | `app/api/auth/login/route.ts` | exact |
| `app/api/admin/doctors/[id]/route.ts` | route handler | request-response | `app/api/auth/login/route.ts` | role-match |
| `app/api/admin/doctors/[id]/availability/route.ts` | route handler | CRUD | `app/api/auth/login/route.ts` | role-match |
| `components/admin/AdminSidebar.tsx` | component (Client) | request-response | itself (minor update) | exact |

---

## Pattern Assignments

### `app/(admin)/admin/page.tsx` (Server Component, request-response)

**Analog:** existing `app/(admin)/admin/page.tsx` (replace entirely)

**Imports pattern** (lines 1-3 of the replacement):
```typescript
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { StatCard } from '@/components/admin/StatCard'
```

**Auth/role-read pattern** — from `middleware.ts` (lines 26-30) + `app/(admin)/admin/page.tsx` convention:
```typescript
// In every admin Server Component page:
const headersList = await headers()  // MUST await — Next.js 15+/16 breaking change
const role = headersList.get('x-user-role') as 'ADMIN' | 'RECEPTIONIST'
```

**Core pattern** — Prisma groupBy for current week:
```typescript
// lib/utils.ts: add getWeekRange() helper (reused by dashboard + Phase 4)
function getWeekRange() {
  const now = new Date()
  const day = now.getDay() // 0=Sunday
  const diff = day === 0 ? -6 : 1 - day
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
    where: { date: { gte: monday, lte: sunday } },
    _count: { _all: true },
  })
  const stats = { PENDING: 0, CONFIRMED: 0, COMPLETED: 0, CANCELLED: 0 }
  for (const row of counts) {
    stats[row.status as keyof typeof stats] = row._count._all
  }
  return (
    <div className="p-6">
      <h1 className="font-display text-xl font-semibold text-text-primary mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {/* 4 StatCards */}
      </div>
    </div>
  )
}
```

---

### `components/admin/StatCard.tsx` (component, request-response)

**Analog:** `lib/utils.ts` for STATUS_COLORS/STATUS_LABELS; UI-SPEC for card structure.

**Imports pattern**:
```typescript
import { cn } from '@/lib/utils'
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/utils'
```

**Core pattern** — from RESEARCH.md Pattern 5 / UI-SPEC:
```typescript
// STATUS_COLORS from lib/utils.ts (lines 43-48):
// { PENDING: 'bg-amber-100 text-amber-700', CONFIRMED: 'bg-teal-100 text-teal-700', ... }

// STATUS_LABELS from lib/utils.ts (lines 36-41):
// { PENDING: 'Pendiente', CONFIRMED: 'Confirmado', ... }

const STATUS_BORDER: Record<string, string> = {
  PENDING:   'border-amber-400',
  CONFIRMED: 'border-teal-500',
  COMPLETED: 'border-slate-400',
  CANCELLED: 'border-red-400',
}

// Card structure (pure display, no 'use client'):
export function StatCard({ status, count }: { status: string; count: number }) {
  return (
    <div className={cn('bg-surface rounded-xl shadow-card p-6 border-l-4', STATUS_BORDER[status])}>
      <span className={cn('text-xs', STATUS_COLORS[status])}>{STATUS_LABELS[status]}</span>
      <p className="font-display text-3xl font-semibold text-text-primary">{count}</p>
      <p className="text-xs text-text-secondary mt-1">turnos esta semana</p>
    </div>
  )
}
```

---

### `app/(admin)/especialidades/page.tsx` (Server Component, CRUD)

**Analog:** `app/(admin)/admin/page.tsx` (structure) + `middleware.ts` header injection pattern.

**Imports pattern**:
```typescript
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { SpecialtiesList } from '@/components/admin/SpecialtiesList'
```

**Auth/role-guard pattern** — Source: `middleware.ts` lines 26-30, `lib/auth.ts` lines 8-13:
```typescript
const headersList = await headers()
const role = headersList.get('x-user-role') as 'ADMIN' | 'RECEPTIONIST'
// Role guard for UI: pass role to Client Component; CRUD buttons rendered only if role === 'ADMIN'
// Do NOT use display:none — exclude from JSX entirely
```

**Core data-fetch pattern**:
```typescript
const specialties = await prisma.specialty.findMany({
  orderBy: { name: 'asc' },
})
// Pass specialties + role to SpecialtiesList (Client Component manages drawer state)
```

**Page structure**:
```typescript
export default async function EspecialidadesPage() {
  const headersList = await headers()
  const role = headersList.get('x-user-role') as 'ADMIN' | 'RECEPTIONIST'
  const specialties = await prisma.specialty.findMany({ orderBy: { name: 'asc' } })
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-xl font-semibold text-text-primary">Especialidades</h1>
      </div>
      <SpecialtiesList specialties={specialties} role={role} />
    </div>
  )
}
```

---

### `components/admin/SpecialtiesList.tsx` (component, CRUD)

**Analog:** `components/admin/AdminSidebar.tsx` for the Client Component + interaction pattern.

**Imports pattern** — from `AdminSidebar.tsx` lines 1-13:
```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Edit, Trash2, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Drawer } from '@/components/admin/Drawer'
import { SpecialtyForm } from '@/components/admin/SpecialtyForm'
```

**Core pattern** — drawer open/close state + inline delete confirm:
```typescript
// Drawer open state + selected item for edit:
const [drawerOpen, setDrawerOpen] = useState(false)
const [editing, setEditing] = useState<Specialty | null>(null)

function openCreate() { setEditing(null); setDrawerOpen(true) }
function openEdit(s: Specialty) { setEditing(s); setDrawerOpen(true) }
function closeDrawer() { setDrawerOpen(false); setEditing(null) }

// Inline delete confirm — per-row state:
const [deletingId, setDeletingId] = useState<number | null>(null)
```

**Delete pattern** — analogous to logout in `AdminSidebar.tsx` lines 27-31:
```typescript
async function handleDelete(id: number) {
  await fetch(`/api/admin/specialties/${id}`, { method: 'DELETE' })
  router.refresh()  // re-runs Server Component, list updates
  setDeletingId(null)
}
```

**Role-gated buttons** — buttons excluded from JSX (not hidden with CSS):
```typescript
{role === 'ADMIN' && (
  <button onClick={() => openCreate()} className="...">
    <Plus className="h-4 w-4" /> Nueva especialidad
  </button>
)}
```

---

### `components/admin/SpecialtyForm.tsx` (Client Component, CRUD)

**Analog:** `app/(auth)/login/page.tsx` — exact same fetch + useState + router.refresh pattern.

**Imports pattern** — from `login/page.tsx` lines 1-4:
```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
```

**Core form pattern** — from `login/page.tsx` lines 16-42:
```typescript
const router = useRouter()
const [loading, setLoading] = useState(false)
const [error, setError] = useState('')
// Controlled inputs: const [name, setName] = useState(specialty?.name ?? '')

async function handleSubmit(e: React.FormEvent) {
  e.preventDefault()
  setError('')
  setLoading(true)
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
    router.refresh()
  } catch {
    setError('Ocurrió un error al guardar. Intentá nuevamente.')
  } finally {
    setLoading(false)
  }
}
```

**Input field style** — from `login/page.tsx` lines 98-107 (canonical pattern):
```typescript
<input
  type="text"
  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary
             transition-all outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
/>
```

**Submit button style** — from `login/page.tsx` lines 138-154:
```typescript
<button
  type="submit"
  disabled={loading}
  className="w-full rounded-lg bg-gradient-to-r from-primary to-accent py-2.5 text-sm font-semibold text-white
             transition-all hover:shadow-[0_0_12px_rgba(20,184,166,0.4)] hover:opacity-90
             disabled:opacity-60 disabled:cursor-not-allowed"
>
  {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Guardar especialidad'}
</button>
```

**Error display** — from `login/page.tsx` lines 131-135:
```typescript
{error && (
  <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-error">{error}</p>
)}
```

---

### `components/admin/Drawer.tsx` (Client Component, request-response)

**Analog:** None in codebase. Use RESEARCH.md Pattern 4 (framer-motion AnimatePresence).

**Imports pattern**:
```typescript
'use client'

import { AnimatePresence, motion } from 'framer-motion'
```

**Core pattern** — verified framer-motion 12.40.0 (from RESEARCH.md Pattern 4):
```typescript
export function Drawer({ open, onClose, title, children }: DrawerProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/40 z-40"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed right-0 top-0 h-full w-full max-w-md bg-surface rounded-l-xl shadow-modal z-50 flex flex-col"
            initial={{ x: 400 }} animate={{ x: 0 }} exit={{ x: 400 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-primary to-accent rounded-tl-xl" />
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-display text-xl font-semibold text-text-primary pl-2">{title}</h2>
              <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
```

Note: Do NOT use `backdrop-blur` — reserved for public Booking Wizard only (UI-SPEC rule).

---

### `app/(admin)/medicos/page.tsx` (Server Component, CRUD)

**Analog:** `app/(admin)/especialidades/page.tsx` — identical structure, different model and list component.

**Core pattern** — same as especialidades page, with doctor-specific Prisma include:
```typescript
const doctors = await prisma.doctor.findMany({
  orderBy: { name: 'asc' },
  include: { specialty: { select: { name: true, color: true } } },
})
// Pass doctors + role to DoctorsList client component
```

---

### `components/admin/DoctorsList.tsx` (component, CRUD)

**Analog:** `components/admin/SpecialtiesList.tsx` — identical pattern, doctor-specific fields.

Avatar fallback pattern — from `lib/utils.ts` lines 27-34:
```typescript
import { getInitials } from '@/lib/utils'

// In row render:
{doctor.avatar ? (
  <img src={doctor.avatar} alt={doctor.name} className="h-8 w-8 rounded-full object-cover" />
) : (
  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
    {getInitials(doctor.name)}
  </div>
)}
```

---

### `components/admin/DoctorForm.tsx` (Client Component, CRUD + file-I/O)

**Analog:** `app/(auth)/login/page.tsx` (form base) + `lib/supabase.ts` lines 16-31 (upload).

**Imports pattern**:
```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { uploadAvatar } from '@/lib/supabase'
import { getInitials } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
```

**Avatar upload pattern** — from `lib/supabase.ts` lines 16-31:
```typescript
// uploadAvatar signature: uploadAvatar(file: File, doctorId: number): Promise<string>
// Path generated: avatars/doctor-${doctorId}.${ext}
// Uses supabase.storage.from('turnero').upload(path, file, { upsert: true })

// Preview before upload:
const [preview, setPreview] = useState<string | null>(currentAvatarUrl ?? null)
const [file, setFile] = useState<File | null>(null)

function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
  const selected = e.target.files?.[0]
  if (!selected) return
  setPreview(URL.createObjectURL(selected))  // client-side preview, no upload yet
  setFile(selected)
}
```

**Two-step CREATE flow** (from RESEARCH.md Pattern 7 — avatar requires doctorId):
```typescript
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault()
  setLoading(true)
  setError('')
  try {
    // Step 1: create doctor without avatar
    const res = await fetch('/api/admin/doctors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, specialtyId, bio, phone, durationMin }),
    })
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Error'); return }
    const { doctor } = await res.json()

    // Step 2: if file selected, upload and patch avatar URL
    if (file) {
      const avatarUrl = await uploadAvatar(file, doctor.id)
      await fetch(`/api/admin/doctors/${doctor.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: avatarUrl }),
      })
    }

    onClose()
    router.refresh()
  } catch {
    setError('Ocurrió un error al guardar. Intentá nuevamente.')
  } finally {
    setLoading(false)
  }
}
```

---

### `components/admin/AvailabilityEditor.tsx` (Client Component, CRUD + event-driven)

**Analog:** `app/(auth)/login/page.tsx` (useState + fetch pattern base).

**Imports pattern**:
```typescript
'use client'

import { useState } from 'react'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
```

**State shape** — from RESEARCH.md Pattern 8:
```typescript
type TimeRange = { startTime: string; endTime: string; id?: number }
type DayRanges = Record<number, TimeRange[]>  // 0=Sunday ... 6=Saturday

const [ranges, setRanges] = useState<DayRanges>(() => {
  const initial: DayRanges = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] }
  for (const avail of initialAvailabilities) {
    initial[avail.dayOfWeek].push({ startTime: avail.startTime, endTime: avail.endTime, id: avail.id })
  }
  return initial
})

function addRange(day: number) {
  setRanges(prev => ({ ...prev, [day]: [...prev[day], { startTime: '09:00', endTime: '17:00' }] }))
}
function removeRange(day: number, index: number) {
  setRanges(prev => ({ ...prev, [day]: prev[day].filter((_, i) => i !== index) }))
}
```

**Save pattern** — fetch PUT + inline success/error (no router.refresh navigation needed):
```typescript
async function handleSave() {
  setLoading(true)
  setError('')
  // Validate: endTime > startTime for every range
  for (const [day, dayRanges] of Object.entries(ranges)) {
    for (const r of dayRanges) {
      if (r.endTime <= r.startTime) {
        setError(`Franja inválida el ${DAY_NAMES[Number(day)]}: el fin debe ser posterior al inicio.`)
        setLoading(false)
        return
      }
    }
  }
  try {
    const availabilities = Object.entries(ranges).flatMap(([day, rs]) =>
      rs.map(r => ({ dayOfWeek: Number(day), startTime: r.startTime, endTime: r.endTime }))
    )
    const res = await fetch(`/api/admin/doctors/${doctorId}/availability`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ availabilities }),
    })
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Error'); return }
    setSuccess(true)
  } catch {
    setError('Ocurrió un error al guardar. Intentá nuevamente.')
  } finally {
    setLoading(false)
  }
}
```

---

### `app/(admin)/medicos/[id]/disponibilidad/page.tsx` (Server Component, CRUD)

**Analog:** `app/(admin)/especialidades/page.tsx` — same Server Component pattern, fetches availability and renders a Client Component editor.

**Core pattern**:
```typescript
// IMPORTANT: params is a Promise in Next.js 15+/16 — must await
export default async function DisponibilidadPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const doctorId = parseInt(id, 10)

  const [doctor, availabilities] = await Promise.all([
    prisma.doctor.findUnique({ where: { id: doctorId }, select: { name: true } }),
    prisma.availability.findMany({ where: { doctorId }, orderBy: { dayOfWeek: 'asc' } }),
  ])

  return (
    <div className="p-6">
      <h1 className="font-display text-xl font-semibold text-text-primary mb-6">
        Disponibilidad — {doctor?.name}
      </h1>
      <AvailabilityEditor doctorId={doctorId} initialAvailabilities={availabilities} />
    </div>
  )
}
```

---

### `app/api/admin/specialties/route.ts` (Route Handler, request-response)

**Analog:** `app/api/auth/login/route.ts` — exact same structure.

**Imports pattern** — from `login/route.ts` lines 1-4:
```typescript
import { NextRequest } from 'next/server'
import { verifyToken, COOKIE_NAME } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
```

**Auth guard pattern** — from `login/route.ts` adapted for admin routes:
```typescript
// CORRECT for Route Handlers: read cookie from request object (sync, no await needed)
const token = request.cookies.get(COOKIE_NAME)?.value
const payload = token ? verifyToken(token) : null

if (!payload) {
  return Response.json({ error: 'No autenticado' }, { status: 401 })
}
// For mutation endpoints: also check role
if (payload.role !== 'ADMIN') {
  return Response.json({ error: 'Forbidden' }, { status: 403 })
}
```

**Response pattern** — from `login/route.ts` lines 38-46 (use `Response.json()`, NOT `NextResponse.json()`):
```typescript
return Response.json({ specialty }, { status: 201 })
return Response.json({ error: 'Nombre es requerido' }, { status: 400 })
```

**Body parse pattern** — from `login/route.ts` line 7:
```typescript
const body = await request.json().catch(() => null)
if (!body?.name) {
  return Response.json({ error: 'Nombre es requerido' }, { status: 400 })
}
```

**GET handler** (read allowed for ADMIN and RECEPTIONIST):
```typescript
export async function GET(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value
  const payload = token ? verifyToken(token) : null
  if (!payload) return Response.json({ error: 'No autenticado' }, { status: 401 })

  const specialties = await prisma.specialty.findMany({ orderBy: { name: 'asc' } })
  return Response.json({ specialties })
}
```

---

### `app/api/admin/specialties/[id]/route.ts` (Route Handler, request-response)

**Analog:** `app/api/auth/login/route.ts` + dynamic route pattern from RESEARCH.md Pattern 3.

**Critical: `await params`** — from RESEARCH.md Pattern 3 (Next.js 15+/16 breaking change):
```typescript
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params  // MUST await — Promise in Next.js 15+/16
  const numericId = parseInt(id, 10)
  // ... auth guard, body parse, prisma.specialty.update(...)
  return Response.json({ specialty })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const numericId = parseInt(id, 10)
  // ... auth guard (ADMIN only), prisma.specialty.delete(...)
  return Response.json({ ok: true })
}
```

---

### `app/api/admin/doctors/route.ts` (Route Handler, request-response)

**Analog:** `app/api/admin/specialties/route.ts` — same structure, Doctor model fields.

**Explicit field destructure** (security — prevent mass assignment):
```typescript
// NEVER spread body directly into Prisma — explicitly list allowed fields:
const { name, specialtyId, bio, phone, durationMin } = body
await prisma.doctor.create({
  data: { name, specialtyId: Number(specialtyId), bio, phone, durationMin: Number(durationMin ?? 20) },
})
```

---

### `app/api/admin/doctors/[id]/route.ts` (Route Handler, request-response)

**Analog:** `app/api/admin/specialties/[id]/route.ts` — same dynamic route pattern.

---

### `app/api/admin/doctors/[id]/availability/route.ts` (Route Handler, CRUD)

**Analog:** `app/api/admin/specialties/[id]/route.ts` — dynamic route pattern.

**Full-replace transaction pattern** — from RESEARCH.md Pattern 8:
```typescript
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const doctorId = parseInt(id, 10)

  // Auth guard (ADMIN only for mutations)
  const token = request.cookies.get(COOKIE_NAME)?.value
  const payload = token ? verifyToken(token) : null
  if (!payload || payload.role !== 'ADMIN') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const availabilities = body?.availabilities
  if (!Array.isArray(availabilities)) {
    return Response.json({ error: 'availabilities array requerido' }, { status: 400 })
  }

  // Validate: endTime > startTime for all ranges (server-side guard)
  for (const a of availabilities) {
    if (a.endTime <= a.startTime) {
      return Response.json({ error: 'endTime debe ser mayor que startTime' }, { status: 400 })
    }
  }

  // Full replace in a single transaction
  await prisma.$transaction([
    prisma.availability.deleteMany({ where: { doctorId } }),
    prisma.availability.createMany({
      data: availabilities.map(a => ({ doctorId, dayOfWeek: a.dayOfWeek, startTime: a.startTime, endTime: a.endTime })),
    }),
  ])

  return Response.json({ ok: true })
}
```

---

### `components/admin/AdminSidebar.tsx` (minor update)

**Analog:** itself — update `py-2.5` to `py-3` on nav link items (line 54).

```typescript
// Before (line 54 current):
'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',

// After:
'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors',
```

---

## Shared Patterns

### Authentication in Route Handlers
**Source:** `app/api/auth/login/route.ts` lines 1-4, 6-13; `lib/auth.ts` lines 1-25
**Apply to:** ALL files under `app/api/admin/`

```typescript
import { NextRequest } from 'next/server'
import { verifyToken, COOKIE_NAME } from '@/lib/auth'

// Inside each handler — sync read from request.cookies (no await needed):
const token = request.cookies.get(COOKIE_NAME)?.value
const payload = token ? verifyToken(token) : null
if (!payload) return Response.json({ error: 'No autenticado' }, { status: 401 })
if (payload.role !== 'ADMIN') return Response.json({ error: 'Forbidden' }, { status: 403 })
```

Recommended: extract `requireAdmin(request: NextRequest)` helper to avoid repeating this in 5+ handlers.

### Authentication in Server Components
**Source:** `middleware.ts` lines 25-30; `lib/auth.ts` lines 8-13
**Apply to:** ALL files under `app/(admin)/`

```typescript
import { headers } from 'next/headers'

const headersList = await headers()  // MUST await
const role = headersList.get('x-user-role') as 'ADMIN' | 'RECEPTIONIST'
// Use role to conditionally render CRUD controls (exclude from JSX, not display:none)
```

### Response format
**Source:** `app/api/auth/login/route.ts` lines 38-46; `app/api/auth/logout/route.ts` line 4
**Apply to:** ALL Route Handlers

```typescript
// Always Response.json() — NEVER NextResponse.json()
return Response.json({ data }, { status: 200 })
return Response.json({ error: 'Message' }, { status: 400 })
```

### Async params in dynamic Route Handlers
**Source:** RESEARCH.md Pattern 3 (verified against Next.js 15+/16 docs)
**Apply to:** `[id]/route.ts` files

```typescript
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params  // MUST await — breaking change in Next.js 15.0.0-RC
  const numericId = parseInt(id, 10)
```

### Client Component mutation pattern
**Source:** `app/(auth)/login/page.tsx` lines 16-42
**Apply to:** `SpecialtyForm.tsx`, `DoctorForm.tsx`, `AvailabilityEditor.tsx`

```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const router = useRouter()
const [loading, setLoading] = useState(false)
const [error, setError] = useState('')

// After successful mutation:
router.refresh()  // re-runs parent Server Component, list reflects changes
```

### Tailwind design tokens
**Source:** `app/globals.css`; used throughout `app/(auth)/login/page.tsx`
**Apply to:** ALL new components

```
Text:     text-text-primary, text-text-secondary, text-text-muted
Surfaces: bg-background, bg-surface
Accents:  text-accent, bg-primary/20, text-primary
Borders:  border-border
Errors:   text-error, bg-red-50
Shadows:  shadow-card, shadow-modal
```

### cn() conditional classes
**Source:** `lib/utils.ts` lines 1-8; `components/admin/AdminSidebar.tsx` line 13, lines 53-57
**Apply to:** ALL new components

```typescript
import { cn } from '@/lib/utils'

// Usage pattern from AdminSidebar.tsx lines 53-57:
className={cn(
  'base-classes-always-applied',
  condition && 'conditional-class',
  variable === 'value' ? 'class-a' : 'class-b',
)}
```

### Prisma singleton import
**Source:** `lib/prisma.ts` lines 1-11
**Apply to:** ALL Server Components and Route Handlers that touch the DB

```typescript
import { prisma } from '@/lib/prisma'
// Uses globalThis singleton to prevent connection exhaustion in dev hot-reload
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `components/admin/Drawer.tsx` | component (Client) | request-response | No animated drawer/sheet exists in codebase. Use framer-motion AnimatePresence pattern from RESEARCH.md Pattern 4. framer-motion 12.40.0 is installed and verified. |

---

## Metadata

**Analog search scope:** `app/`, `components/`, `lib/`, `middleware.ts`, `prisma/`
**Files scanned:** 12 existing files read in full
**Pattern extraction date:** 2026-05-27

**Key constraints enforced:**
- `await params` — mandatory in all dynamic Route Handlers (Next.js 15+/16 breaking change)
- `await headers()` — mandatory in Server Components (Next.js 15+ breaking change)
- `Response.json()` — never `NextResponse.json()` in Route Handlers
- No `backdrop-blur` in admin components (reserved for public Booking Wizard)
- CRUD buttons excluded from JSX for RECEPTIONIST (not hidden with CSS)
- Avatar upload requires existing `doctorId` — use two-step CREATE flow
- Route Handler auth: `request.cookies.get(COOKIE_NAME)` + `verifyToken()` (sync)
- Server Component auth: `await headers()` → `x-user-role` header (injected by middleware)
