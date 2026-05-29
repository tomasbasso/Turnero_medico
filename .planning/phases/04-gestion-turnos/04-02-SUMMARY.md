---
phase: 04-gestion-turnos
plan: "02"
subsystem: ui
tags: [appointments, admin, client-component, filter, whatsapp]
dependency_graph:
  requires:
    - app/api/admin/appointments/route.ts (plan 04-01)
    - app/api/admin/appointments/[id]/route.ts (plan 04-01)
    - app/api/admin/appointments/[id]/whatsapp/route.ts (plan 04-01)
    - lib/utils.ts (cn, formatDate, formatTime, formatDni, STATUS_LABELS, STATUS_COLORS)
    - lucide-react (MessageCircle, MessageCircleCheck, Calendar)
  provides:
    - components/admin/AppointmentsList.tsx (AppointmentsList named export)
  affects:
    - app/(admin)/admin/turnos/page.tsx (plan 04-03 lo importará como Client Component)
tech_stack:
  added: []
  patterns:
    - use client directive with useState/useEffect/useCallback/useRef
    - URLSearchParams for filter-driven GET fetch without page reload
    - 300ms debounce on text input via setTimeout/clearTimeout + useRef
    - optimistic state update via setAppointments(prev => prev.map(...))
    - fire-and-forget PATCH for whatsappSent (no await before link navigation)
    - inline cancel confirm pattern (cancellingId state, matching SpecialtiesList deletingId)
    - Argentina phone normalization: replace(/^0/, '') + hardcoded 549 prefix
key_files:
  created:
    - components/admin/AppointmentsList.tsx
  modified: []
decisions:
  - "No router.refresh() en handleStatusChange — actualiza appointments state directamente para preservar filtros activos (Research Pitfall 4)"
  - "handleWhatsAppClick actualiza estado optimistamente antes del fetch — fire-and-forget PATCH (Pattern 5)"
  - "Tipos definidos inline (no import de Prisma client en Client Component) — AppointmentStatus, Doctor, Appointment"
  - "DNI debounced a 300ms; date/doctorId/status fire fetch inmediato — misma lógica de UX pero implementación separada con dos useEffect"
  - "cancellingId state para inline confirm de cancelación — patrón idéntico a deletingId de SpecialtiesList"
metrics:
  duration: "~20 minutos"
  completed: "2026-05-29"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 0
---

# Phase 4 Plan 02: AppointmentsList Component — Summary

## One-Liner

Client Component que combina barra de filtros (fecha/médico/estado/DNI con debounce), tabla de turnos con 5 columnas, mutaciones de estado inline, confirmación de cancelación, y link WhatsApp optimista con tracking de envío.

## Tasks Completed

| Task | Descripción | Commit | Archivos |
|------|-------------|--------|---------|
| 1 | Filter state, fetch logic, type definitions | 13f4f7b | components/admin/AppointmentsList.tsx |
| 2 | Table render, status actions, WhatsApp integration | 13f4f7b | components/admin/AppointmentsList.tsx (mismo commit) |

> Nota: Las tareas 1 y 2 se implementaron en un único commit ya que son partes inseparables del mismo archivo. El criterio de task 1 (fetch/state) y task 2 (render/handlers) se verificaron independientemente antes del commit.

## Verification

- `npm run build` pasa sin errores de TypeScript.
- Criterios de aceptación verificados con `grep`:
  - `'use client'` en línea 1
  - `toISOString().split` para fecha default
  - `300` y `clearTimeout` para debounce DNI
  - Sin `router.refresh()` en el archivo
  - `wa.me/549` en buildWhatsAppUrl
  - `encodeURIComponent` en buildWhatsAppUrl
  - `replace(/^0/, '')` en buildWhatsAppUrl
  - `STATUS_COLORS[` para badge
  - `Sin turnos para este filtro` en empty state

## Key Implementation Details

### Filter UX y dos useEffect separados

Se implementaron dos `useEffect` separados para diferenciar el comportamiento:

1. **Inmediato** (date, doctorId, status): `useEffect(() => fetchAppointments(filters), [filters.date, filters.doctorId, filters.status])`
2. **Debounced 300ms** (dni): `useEffect` con `setTimeout`/`clearTimeout` via `useRef<ReturnType<typeof setTimeout> | null>(null)`

Este diseño evita que el DNI input dispare fetches en cada keystroke mientras los selectores responden instantáneamente.

### handleWhatsAppClick — optimismo + fire-and-forget

```typescript
function handleWhatsAppClick(id: number) {
  setAppointments((prev) =>
    prev.map((a) => (a.id === id ? { ...a, whatsappSent: true } : a))
  )
  fetch(`/api/admin/appointments/${id}/whatsapp`, { ... }).catch(console.error)
}
```

El `setAppointments` corre sincrónicamente antes del fetch — la UI swapea el ícono a `MessageCircleCheck` de forma instantánea. El PATCH es fuego-y-olvida (`.catch(console.error)` es suficiente).

### Inline cancel confirm — patrón SpecialtiesList

Idéntico al `deletingId` en `SpecialtiesList.tsx`:
- `cancellingId: number | null` — null = no confirmando
- Click en "Cancelar" → `setCancellingId(appointment.id)` → muestra "¿Cancelar este turno?" + "Sí, cancelar" / "No"
- "Sí, cancelar" → `handleStatusChange(id, 'CANCELLED')` → en success `setCancellingId(null)` (via finally)
- "No" → `setCancellingId(null)`

### Argentina phone normalization

```typescript
const phone = appointment.patientPhone.replace(/^0/, '')
return `https://wa.me/549${phone}?text=${encodeURIComponent(message)}`
```

`549` = `54` (código de país Argentina) + `9` (prefijo móvil). El `replace(/^0/, '')` maneja edge cases donde el número almacenado tiene un 0 inicial.

## Deviations from Plan

None — plan ejecutado exactamente como estaba escrito.

## Threat Surface Scan

Ninguna superficie nueva no contemplada en el threat model del plan.

- T-04-06 mitigado: `encodeURIComponent(message)` aplicado; phone viene de DB (solo dígitos); prefijo `549` hardcodeado.
- T-04-07 aceptado: El cliente envía PATCH a Route Handler autenticado; el servidor valida el enum de status.
- T-04-08 aceptado: La página está protegida por middleware admin.
- T-04-SC aceptado: Sin nuevos paquetes npm instalados.

## Known Stubs

None — el componente acepta `initialData` como prop del Server Component (plan 04-03). Hasta que plan 04-03 cree la página, el componente no tiene punto de entrada, pero eso es intencional por diseño (wave 2 → wave 3).

## Self-Check: PASSED

- components/admin/AppointmentsList.tsx: FOUND
- Commit 13f4f7b: FOUND
- npm run build: exit 0
- 'use client' en línea 1: VERIFIED
- toISOString().split: VERIFIED
- 300 + clearTimeout: VERIFIED
- Sin router.refresh(): VERIFIED
- wa.me/549: VERIFIED
- encodeURIComponent: VERIFIED
- replace(/^0/: VERIFIED
- STATUS_COLORS[: VERIFIED
- Sin turnos para este filtro: VERIFIED
