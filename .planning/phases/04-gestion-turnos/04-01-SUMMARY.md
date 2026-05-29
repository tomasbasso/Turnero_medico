---
phase: 04-gestion-turnos
plan: "01"
subsystem: api
tags: [appointments, admin, route-handlers, prisma, auth]
dependency_graph:
  requires:
    - lib/auth-helpers.ts
    - lib/prisma.ts
    - prisma/schema.prisma (Appointment model, AppointmentStatus enum)
  provides:
    - GET /api/admin/appointments (list con filtros condicionales)
    - PATCH /api/admin/appointments/[id] (status update)
    - PATCH /api/admin/appointments/[id]/whatsapp (whatsappSent flag)
  affects:
    - components/admin/AppointmentsList.tsx (plan 02 lo consumirá)
tech_stack:
  added: []
  patterns:
    - conditional Prisma where object from URL searchParams
    - await params (Next.js 16 dynamic route handlers)
    - P2025 error guard with try/catch
    - local-time Date constructor to avoid UTC timezone mismatch
key_files:
  created:
    - app/api/admin/appointments/route.ts
    - app/api/admin/appointments/[id]/route.ts
    - app/api/admin/appointments/[id]/whatsapp/route.ts
  modified: []
decisions:
  - "Response.json usado en los tres handlers (no NextResponse.json) — patrón establecido del proyecto"
  - "new Date(year, month-1, day) constructor local para filtro de fecha — evita mismatch UTC con @db.Date de Prisma"
  - "requireAdmin consistente en todas las mutaciones — RECEPTIONIST no puede cambiar estado (A1 del research)"
  - "(error as { code?: string }).code pattern para P2025 — evita import de PrismaClientKnownRequestError"
  - "take: 200 como cap de seguridad en GET list sin filtro de fecha"
metrics:
  duration: "~15 minutos"
  completed: "2026-05-29"
  tasks_completed: 2
  tasks_total: 2
  files_created: 3
  files_modified: 0
---

# Phase 4 Plan 01: API de Gestión de Turnos — Summary

## One-Liner

Tres Route Handlers REST para gestión de turnos: GET list con cuatro filtros condicionales (date/doctorId/status/dni), PATCH de estado contra enum validado, y PATCH para marcar whatsappSent=true; todos protegidos con requireAdmin.

## Tasks Completed

| Task | Descripción | Commit | Archivos |
|------|-------------|--------|---------|
| 1 | GET /api/admin/appointments — list con filtros condicionales | fc637bd | app/api/admin/appointments/route.ts |
| 2 | PATCH /[id] status + PATCH /[id]/whatsapp | 3a95102 | app/api/admin/appointments/[id]/route.ts, app/api/admin/appointments/[id]/whatsapp/route.ts |

## Verification

- `npm run build` pasa sin errores de TypeScript.
- Los tres routes aparecen en la salida del build: `/api/admin/appointments`, `/api/admin/appointments/[id]`, `/api/admin/appointments/[id]/whatsapp`.

## Key Implementation Details

### Filtro de fecha (TURNO-05 / D-04)

El campo `Appointment.date` es `@db.Date` (PostgreSQL DATE). Para evitar el mismatch de timezone UTC, se usa el constructor local:

```typescript
const [year, month, day] = date.split('-').map(Number)
where.date = new Date(year, month - 1, day)
```

`new Date("YYYY-MM-DD")` parsea UTC midnight, que en UTC-3 (Argentina) es el día anterior a las 21:00 local. El constructor de tres argumentos usa tiempo local.

### await params (Next.js 16)

Ambos handlers dinámicos usan `const { id } = await params` obligatorio. Sin el await, `id` sería `"[object Promise]"` y `parseInt` retornaría NaN.

### P2025 guard

```typescript
if ((error as { code?: string }).code === 'P2025') {
  return Response.json({ error: 'Turno no encontrado' }, { status: 404 })
}
```

Patrón inline sin import adicional — evita la dependencia de `@prisma/client/runtime/library`.

### Mass assignment prevention (T-04-05)

- `/[id]/route.ts` solo lee `body.status` — no spread del body en Prisma data.
- `/[id]/whatsapp/route.ts` ignora el body completamente — siempre `data: { whatsappSent: true }`.

## Deviations from Plan

None — plan ejecutado exactamente como estaba escrito.

## Threat Surface Scan

Ninguna superficie nueva no contemplada en el threat model del plan. Los tres endpoints están cubiertos por T-04-01, T-04-02, T-04-03, T-04-04, T-04-05.

## Self-Check: PASSED

- app/api/admin/appointments/route.ts: FOUND
- app/api/admin/appointments/[id]/route.ts: FOUND
- app/api/admin/appointments/[id]/whatsapp/route.ts: FOUND
- Commit fc637bd: FOUND
- Commit 3a95102: FOUND
- npm run build: exit 0
