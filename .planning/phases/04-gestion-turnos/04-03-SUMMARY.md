---
phase: 04-gestion-turnos
plan: "03"
subsystem: pages
tags: [appointments, admin, server-component, ssr, prisma]
dependency_graph:
  requires:
    - app/api/admin/appointments/route.ts (plan 04-01)
    - components/admin/AppointmentsList.tsx (plan 04-02)
    - lib/prisma.ts
    - next/headers (await headers)
  provides:
    - app/(admin)/admin/turnos/page.tsx (TurnosPage Server Component)
  affects:
    - AdminSidebar /admin/turnos nav item (now resolves to a real route)
tech_stack:
  added: []
  patterns:
    - async Server Component with await headers()
    - Promise.all for parallel Prisma queries
    - Date.setHours(0,0,0,0) for local-timezone today boundary
    - Prisma Date → ISO string serialization before passing to Client Component
key_files:
  created:
    - app/(admin)/admin/turnos/page.tsx
  modified: []
decisions:
  - "Serialize date with toISOString().split('T')[0] before passing to AppointmentsList — Prisma returns Date, client type expects string (Rule 1 fix)"
  - "Use rawAppointments + map to avoid TypeScript error without changing AppointmentsList types"
metrics:
  duration: "~10 minutos"
  completed: "2026-05-29"
  tasks_completed: 1
  tasks_total: 1
  files_created: 1
  files_modified: 0
---

# Phase 4 Plan 03: TurnosPage Server Component — Summary

## One-Liner

Server Component que pre-renderiza los turnos del día actual via Promise.all sobre Prisma, serializa fechas a string y pasa initialData + doctors + role al AppointmentsList cliente, activando la ruta /admin/turnos sin waterfall.

## Tasks Completed

| Task | Descripción | Commit | Archivos |
|------|-------------|--------|---------|
| 1 | TurnosPage Server Component con fetch paralelo y serialización de fechas | da10f68 | app/(admin)/admin/turnos/page.tsx |

## Verification

- `npm run build` pasa sin errores de TypeScript (exit 0).
- Ruta `/admin/turnos` aparece como dinámica (ƒ) en el output del build.
- Criterios de aceptación verificados con `grep`:
  - `await headers()` presente en página
  - `Promise.all` presente
  - `setHours(0, 0, 0, 0)` presente
  - `<AppointmentsList initialData={appointments} doctors={doctors} role={role} />` presente
  - Heading "Turnos" en el JSX
  - Sin `'use client'` en el archivo

## Key Implementation Details

### Serialización Date → string

Prisma devuelve el campo `date` como `Date` de JavaScript, pero el tipo `Appointment` en `AppointmentsList.tsx` (definido inline como `date: string`) espera una cadena ISO como llega desde la API JSON. La corrección mapea los resultados antes de pasarlos:

```typescript
const appointments = rawAppointments.map((a) => ({
  ...a,
  date: a.date.toISOString().split('T')[0],
}))
```

Esto hace consistente el initialData con los datos que llegan del fetch cliente posterior.

### Fecha local con setHours

```typescript
const today = new Date()
today.setHours(0, 0, 0, 0)
```

Mismo patrón que el GET route handler (plan 04-01) para evitar el UTC mismatch en la query Prisma con `@db.Date`.

### Estructura del componente

```
TurnosPage (async Server Component)
├── await headers() → role
├── Promise.all([
│     prisma.appointment.findMany(today + doctor relation)
│     prisma.doctor.findMany(active)
│   ])
├── serialize dates
└── <AppointmentsList initialData doctors role />
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Serialización de Date a string para el Client Component**
- **Found during:** Task 1 — npm run build
- **Issue:** Prisma devuelve `date: Date` pero `AppointmentsList` define su tipo local `Appointment` con `date: string` (coherente con la forma JSON de la API). TypeScript error en línea 32.
- **Fix:** Mapear `rawAppointments` a `appointments` con `date: a.date.toISOString().split('T')[0]` antes de pasar como prop.
- **Files modified:** app/(admin)/admin/turnos/page.tsx
- **Commit:** da10f68 (mismo commit, corregido antes del commit final)

## Threat Surface Scan

Ninguna superficie nueva no contemplada en el threat model del plan.

- T-04-09 aceptado: Middleware ya redirige requests no autenticados antes de que llegue al Server Component.
- T-04-10 aceptado: Los datos SSR solo se sirven a sesiones admin autenticadas.
- T-04-SC aceptado: Sin nuevos paquetes npm instalados.

## Known Stubs

None — la fase 4 está completa. AppointmentsList ya recibe datos reales del Server Component.

## Self-Check: PASSED

- app/(admin)/admin/turnos/page.tsx: FOUND
- Commit da10f68: FOUND
- npm run build: exit 0
- await headers(): VERIFIED
- Promise.all: VERIFIED
- setHours(0,0,0,0): VERIFIED
- AppointmentsList initialData={appointments} doctors={doctors} role={role}: VERIFIED
- Heading "Turnos": VERIFIED
- Sin 'use client': VERIFIED
- /admin/turnos en output del build: VERIFIED
