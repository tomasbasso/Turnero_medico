---
phase: 04-gestion-turnos
reviewed: 2026-05-29T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - app/api/admin/appointments/route.ts
  - app/api/admin/appointments/[id]/route.ts
  - app/api/admin/appointments/[id]/whatsapp/route.ts
  - components/admin/AppointmentsList.tsx
  - app/(admin)/admin/turnos/page.tsx
findings:
  critical: 4
  warning: 4
  info: 2
  total: 10
status: issues_found
---

# Phase 04: Code Review Report

**Reviewed:** 2026-05-29T00:00:00Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Five files were reviewed covering the appointment management feature: three API route handlers, one client-side list component, and one server page. The implementation is structurally coherent and contains several well-intentioned guards (timezone comment in GET route, Prisma P2025 handling, debounced DNI filter). However, four critical defects were found: an untrusted HTTP header used as authorization signal, a missing authentication check on the server page, an unvalidated enum query parameter passed directly to Prisma, and a RECEPTIONIST role that sees the full UI but is blocked by every API call. Four warnings cover silent error swallowing, a race condition in concurrent fetches, a malformed WhatsApp URL builder, and a date-display off-by-one that contradicts a fix already applied in the API layer.

---

## Critical Issues

### CR-01: `x-user-role` header is untrusted — authorization spoofable

**File:** `app/(admin)/admin/turnos/page.tsx:7`
**Issue:** The server page reads the user's role from the raw incoming `x-user-role` HTTP header and passes it directly to the component as an authoritative value. Any caller (including an unauthenticated browser request) can set this header to any string. There is no JWT verification on this page — it queries the database and renders patient data without confirming the identity of the requester. The middleware presumably injects this header after verifying the JWT, but the page itself has no fallback guard. If the middleware is bypassed or misconfigured, the page leaks data.
**Fix:** Verify the JWT token directly in the page (reuse `requireAdmin` or an equivalent `requireAnyStaff` helper), or at minimum assert that the header value is one of the known roles and throw/redirect otherwise:
```typescript
// At the top of TurnosPage, before any DB query:
import { cookies } from 'next/headers'
import { verifyToken, COOKIE_NAME } from '@/lib/auth'
import { redirect } from 'next/navigation'

const cookieStore = await cookies()
const token = cookieStore.get(COOKIE_NAME)?.value
const payload = token ? verifyToken(token) : null
if (!payload || (payload.role !== 'ADMIN' && payload.role !== 'RECEPTIONIST')) {
  redirect('/login')
}
const role = payload.role
```

---

### CR-02: RECEPTIONIST role sees full UI but all API mutations return 403

**File:** `components/admin/AppointmentsList.tsx:32` / `lib/auth-helpers.ts:19`
**Issue:** `AppointmentsListProps` declares `role: 'ADMIN' | 'RECEPTIONIST'`, and the page passes the role header value straight through. However, `requireAdmin` in every API route enforces `payload.role !== 'ADMIN'` with a 403 Forbidden response. A RECEPTIONIST user will see Confirm and Cancel buttons and will attempt to call `PATCH /api/admin/appointments/:id`, but every such call will silently fail (see CR-03 for related silent failure). This is a functional correctness defect: the component exposes controls that are always unauthorized for an entire role class. It also creates a misleading UX — the component renders action buttons but never acts on them.
**Fix:** Either extend `requireAdmin` to accept RECEPTIONIST for appointment mutations (create a `requireStaff` helper), or hide the action buttons in the component when `role === 'RECEPTIONIST'`. Both sides should be consistent. If RECEPTIONISTs should be able to manage appointments, fix the API guard:
```typescript
// lib/auth-helpers.ts — new helper
export function requireStaff(request: NextRequest): { payload: JWTPayload } | Response {
  const token = request.cookies.get(COOKIE_NAME)?.value
  if (!token) return Response.json({ error: 'No autenticado' }, { status: 401 })
  const payload = verifyToken(token)
  if (!payload) return Response.json({ error: 'No autenticado' }, { status: 401 })
  if (payload.role !== 'ADMIN' && payload.role !== 'RECEPTIONIST') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }
  return { payload }
}
```

---

### CR-03: `status` query parameter passed to Prisma without enum validation

**File:** `app/api/admin/appointments/route.ts:30-33`
**Issue:** The `status` query parameter is accepted from the URL and inserted directly into the Prisma `where` clause without checking it against the valid enum values (`PENDING`, `CONFIRMED`, `CANCELLED`, `COMPLETED`). Prisma will throw a runtime exception when an invalid string (e.g., `status=DROP_TABLE` or even `status=pending` with wrong case) is supplied, producing an unhandled 500 error instead of a clean 400. The same pattern is applied correctly for `doctorId` (guarded with `isNaN`) but overlooked for `status`.
**Fix:**
```typescript
const VALID_STATUSES = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'] as const
// …
if (status) {
  if (!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    return Response.json({ error: 'Estado inválido' }, { status: 400 })
  }
  where.status = status
}
```

---

### CR-04: `handleStatusChange` silently discards API errors — UI becomes inconsistent

**File:** `components/admin/AppointmentsList.tsx:105-123`
**Issue:** When `fetch` returns a non-OK response (e.g., 403 for a RECEPTIONIST, 404 if the record was deleted, or 500 for server error), the `if (res.ok)` branch is skipped and execution falls through to `finally` — which clears `loadingId` and `cancellingId`. No error message is shown. The user clicks "Confirmar", the spinner stops, and nothing changes; the button is available again with no indication of failure. For the cancellation confirm flow (`cancellingId`), this is especially misleading: after clicking "Sí, cancelar", the dialog dismisses silently and the appointment still shows as PENDING.
**Fix:**
```typescript
async function handleStatusChange(id: number, status: string) {
  setLoadingId(id)
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
      setError('No se pudo actualizar el estado. Intentá de nuevo.')
    }
  } catch {
    setError('Error de red. Intentá de nuevo.')
  } finally {
    setLoadingId(null)
    setCancellingId(null)
  }
}
```

---

## Warnings

### WR-01: Concurrent fetch race condition — filter + DNI debounce fire simultaneously

**File:** `components/admin/AppointmentsList.tsx:85-101`
**Issue:** Two separate `useEffect` hooks both call `fetchAppointments`. The first fires on `filters.date`, `filters.doctorId`, and `filters.status` changes; the second (debounced 300ms) fires on `filters.dni` changes. When a user edits the `status` dropdown while a DNI debounce timer is still pending, two `fetch` requests are launched concurrently. `setAppointments` is called by whichever resolves last, which may be the older request. The stale result silently overwrites the fresh one with no indication to the user.

Additionally, the DNI effect captures `filters` via closure at the moment the effect runs — but `filters` is not in its dependency array. If `date`, `doctorId`, or `status` change between when the 300ms timer is set and when it fires, the debounced fetch will use a stale snapshot of those filters.
**Fix:** Use an abort controller to cancel in-flight requests when a new fetch starts, and include a complete `filters` snapshot in the debounce closure:
```typescript
const abortRef = useRef<AbortController | null>(null)

const fetchAppointments = useCallback(async (currentFilters: typeof filters) => {
  if (abortRef.current) abortRef.current.abort()
  abortRef.current = new AbortController()
  setLoading(true)
  setError(null)
  try {
    // … build params …
    const res = await fetch(`/api/admin/appointments?${params}`, {
      signal: abortRef.current.signal,
    })
    if (!res.ok) throw new Error('fetch failed')
    const data = await res.json()
    setAppointments(data.appointments)
  } catch (err) {
    if ((err as Error).name !== 'AbortError') {
      setError('No se pudieron cargar los turnos. Recargá la página.')
    }
  } finally {
    setLoading(false)
  }
}, [])
```

---

### WR-02: `buildWhatsAppUrl` produces double country-code numbers

**File:** `components/admin/AppointmentsList.tsx:125-129`
**Issue:** The function strips a leading `0` with `replace(/^0/, '')` and then prepends `549` (Argentina's country + mobile code). If `patientPhone` is stored as `+549XXXXXXXXXX` or `549XXXXXXXXXX` (both common formats when collected with country code), the resulting URL becomes `https://wa.me/549549XXXXXXXXXX` — an invalid number. The leading-zero strip only handles the legacy Argentine format `0XXXXXXXXXX`. There is no normalization for phones already in E.164 or with `+` prefix.
**Fix:** Normalize the phone to digits-only, strip any leading country prefix, then reconstruct:
```typescript
function buildWhatsAppUrl(appointment: Appointment): string {
  // Remove all non-digits, then strip leading 54 (country code) if present,
  // then strip leading 9 (Argentine mobile trunk) if present,
  // then prepend 549 for WhatsApp Click-to-Chat format.
  let phone = appointment.patientPhone.replace(/\D/g, '')
  if (phone.startsWith('549')) phone = phone.slice(3)
  else if (phone.startsWith('54')) phone = phone.slice(2)
  if (phone.startsWith('9')) phone = phone.slice(1)
  const message = `Hola ${appointment.patientName}, …`
  return `https://wa.me/549${phone}?text=${encodeURIComponent(message)}`
}
```

---

### WR-03: `formatDate` in `utils.ts` has UTC off-by-one for `YYYY-MM-DD` strings

**File:** `lib/utils.ts:10-16`
**Issue:** `formatDate` creates `new Date(date)` from a `YYYY-MM-DD` string. The ECMAScript spec parses date-only strings as UTC midnight. In UTC-3 (Argentina), this shifts the date one day back during `toLocaleDateString`-style formatting. For example, `"2025-06-15"` becomes `2025-06-14` when displayed. The API GET route has an explicit comment acknowledging and fixing this exact issue for the query layer (using the local-time constructor), but the display layer in `utils.ts` repeats the same mistake. The symptom is that every date in the table will appear one day earlier than the stored value for Argentine users.
**Fix:**
```typescript
export function formatDate(date: Date | string): string {
  let d: Date
  if (typeof date === 'string') {
    const [year, month, day] = date.split('-').map(Number)
    d = new Date(year, month - 1, day) // local-time constructor avoids UTC shift
  } else {
    d = date
  }
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(d)
}
```

---

### WR-04: `getInitials` in `utils.ts` crashes on empty string input

**File:** `lib/utils.ts:27-33`
**Issue:** `getInitials('')` calls `''.split(' ')` → `['']`, then maps `n => n[0]`, where `n[0]` on an empty string is `undefined`. `[undefined].join('').toUpperCase()` returns `'UNDEFINED'`-adjacent garbage in some runtimes or an empty string in others — but the real risk is that `n[0]` is `undefined`, and calling `.toUpperCase()` on the joined string of `undefined` values produces `'UNDEFINED'` if any element is `undefined`. This is an out-of-scope file but the function is imported and used by admin components.

More concretely: if `patientName` or `name` is an empty string (edge case from bad data), the result is unpredictable.
**Fix:**
```typescript
export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0] ?? '')
    .filter(Boolean)
    .join('')
    .toUpperCase()
}
```

---

## Info

### IN-01: `console.error` in fire-and-forget WhatsApp fetch

**File:** `components/admin/AppointmentsList.tsx:139`
**Issue:** The `fetch` call that persists `whatsappSent: true` uses `.catch(console.error)`. Debug output is written to the browser console on failure. The error is still not surfaced to the user, but `console.error` should not remain in production code.
**Fix:** Either silently swallow the error (the optimistic UI update already happened), or set a visible error state if the flag must be reliable:
```typescript
fetch(`/api/admin/appointments/${id}/whatsapp`, { method: 'PATCH', … })
  .catch(() => { /* non-critical — optimistic update already applied */ })
```

---

### IN-02: Magic number `take: 200` without named constant

**File:** `app/api/admin/appointments/route.ts:47`
**Issue:** The safety cap `take: 200` is an unexplained magic number inline in the query. Its purpose is noted in a comment, but the value itself is not a named constant, making it easy to miss or change without understanding the implication.
**Fix:**
```typescript
const MAX_APPOINTMENTS_PER_QUERY = 200

// … in findMany:
take: MAX_APPOINTMENTS_PER_QUERY,
```

---

_Reviewed: 2026-05-29T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
