---
phase: 04-gestion-turnos
verified: 2026-05-29T00:00:00Z
status: human_needed
score: 14/14 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Navegar /admin/turnos y verificar que la tabla se carga con los turnos del día"
    expected: "La página muestra heading 'Turnos', los turnos de hoy pre-renderizados, y la barra de filtros visible"
    why_human: "Requiere datos seed en base de datos y servidor corriendo — no se puede verificar estáticamente"
  - test: "Cambiar estado de un turno PENDING: hacer click en 'Confirmar'"
    expected: "El badge cambia a 'Confirmado' de forma inmediata (optimista), aparece el link de WhatsApp en la columna Acciones"
    why_human: "Comportamiento de mutación de estado cliente → API → render requiere interacción de usuario"
  - test: "Click en 'Cancelar' en un turno PENDING"
    expected: "Aparece el confirm inline '¿Cancelar este turno?' con botones 'Sí, cancelar' y 'No'. Al confirmar, el badge cambia a 'Cancelado'"
    why_human: "Flujo de dos pasos (mostrar confirm + confirmar) requiere interacción de usuario"
  - test: "Click en 'Enviar WA' en un turno CONFIRMED"
    expected: "El ícono cambia a MessageCircleCheck y el label a 'WA enviado' de forma instantánea (optimismo). El link abre wa.me/549... en nueva pestaña"
    why_human: "Requiere verificar apertura de link externo + cambio optimista simultáneo"
  - test: "Buscar por DNI: tipear en el campo 'Buscar por DNI'"
    expected: "La tabla no actualiza inmediatamente — espera 300ms después del último keystroke antes de disparar el fetch"
    why_human: "El timing del debounce (300ms) no puede verificarse programáticamente"
  - test: "Cambiar el select de Médico"
    expected: "La tabla actualiza sin recarga de página, mostrando solo los turnos del médico seleccionado"
    why_human: "Comportamiento reactivo sin page reload requiere observación en browser"
  - test: "Limpiar el campo de fecha"
    expected: "La tabla muestra hasta 200 turnos de todas las fechas (safety cap)"
    why_human: "Requiere datos en múltiples fechas y observación de la UI"
  - test: "Filtro que no retorna resultados"
    expected: "Se muestra el empty state: ícono Calendar + 'Sin turnos para este filtro'"
    why_human: "Requiere un filtro que garantice cero resultados y observación visual"
---

# Phase 4: Gestión de Turnos — Verification Report

**Phase Goal:** El equipo puede ver, filtrar y gestionar el estado de todos los turnos.
**Verified:** 2026-05-29
**Status:** human_needed
**Re-verification:** No — verificación inicial

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | GET /api/admin/appointments returns appointments filtered by date, doctorId, status, dni | VERIFIED | `app/api/admin/appointments/route.ts` construye `where` condicional con los 4 params; `prisma.appointment.findMany` con `take: 200` |
| 2 | PATCH /api/admin/appointments/[id] updates status to CONFIRMED, CANCELLED, or COMPLETED | VERIFIED | `[id]/route.ts` valida contra `VALID_STATUSES`, ejecuta `prisma.appointment.update`, retorna appointment actualizado |
| 3 | PATCH /api/admin/appointments/[id]/whatsapp sets whatsappSent=true | VERIFIED | `[id]/whatsapp/route.ts` ejecuta `prisma.appointment.update({ data: { whatsappSent: true } })` |
| 4 | Los tres routes rechazan no-autenticados con 401 y roles no-ADMIN con 403 | VERIFIED | `requireAdmin` (síncrono) retorna `Response.json({ error: 'No autenticado' }, { status: 401 })` sin token; `{ status: 403 }` para `role !== 'ADMIN'` |
| 5 | Filtro de fecha usa constructor local (sin mismatch UTC) | VERIFIED | `const [year, month, day] = date.split('-').map(Number); where.date = new Date(year, month - 1, day)` — NO `new Date("YYYY-MM-DD")` |
| 6 | AppointmentsList renders tabla con 5 columnas: Paciente+DNI, Médico, Fecha+Hora, Estado, Acciones | VERIFIED | `components/admin/AppointmentsList.tsx` líneas 229-243: 5 `<th>` exactos |
| 7 | Filter bar con date/médico/estado/DNI que dispara refetch en cambio | VERIFIED | Dos `useEffect` separados: inmediato para date/doctorId/status (línea 86-89), debounced para dni (líneas 93-102) |
| 8 | DNI input debounced 300ms | VERIFIED | `setTimeout(..., 300)` + `clearTimeout` via `dniDebounceRef` (líneas 94-99) |
| 9 | PENDING rows: Confirmar + Cancelar con inline confirm antes del PATCH | VERIFIED | `cancellingId` state; `setCancellingId(appointment.id)` en click Cancelar; confirm inline en líneas 295-344 |
| 10 | CONFIRMED rows: link WhatsApp con ícono + swap optimista a MessageCircleCheck | VERIFIED | `handleWhatsAppClick` actualiza estado antes del fetch (líneas 138-145); `MessageCircleCheck` si `whatsappSent` (líneas 356-361) |
| 11 | Argentina phone normalization: strip leading 0, prepend 549 | VERIFIED | `appointment.patientPhone.replace(/^0/, '')` + `https://wa.me/549${phone}` (líneas 132-134) |
| 12 | Empty state con Calendar icon + "Sin turnos para este filtro" | VERIFIED | Líneas 216-224: `<Calendar>` + texto exacto |
| 13 | TurnosPage Server Component: pre-fetch SSR con Promise.all, pasa initialData+doctors+role | VERIFIED | `page.tsx` usa `await headers()`, `Promise.all([findMany appointments, findMany doctors])`, serializa fecha antes de pasar al cliente |
| 14 | Sidebar /admin/turnos nav item existe y tiene ruta activa | VERIFIED | `AdminSidebar.tsx` línea 17: `{ href: '/admin/turnos', label: 'Turnos', icon: Calendar }` |

**Score:** 14/14 truths verified

---

## Required Artifacts

| Artifact | Estado | Nivel | Detalles |
|----------|--------|-------|----------|
| `app/api/admin/appointments/route.ts` | VERIFIED | Existe + Sustantivo + Conectado | Exporta `GET`, usa `prisma.appointment.findMany`, wired desde `AppointmentsList.tsx` |
| `app/api/admin/appointments/[id]/route.ts` | VERIFIED | Existe + Sustantivo + Conectado | Exporta `PATCH`, `await params`, P2025 guard, wired desde `AppointmentsList.tsx` |
| `app/api/admin/appointments/[id]/whatsapp/route.ts` | VERIFIED | Existe + Sustantivo + Conectado | Exporta `PATCH`, `await params`, `whatsappSent: true`, P2025 guard |
| `components/admin/AppointmentsList.tsx` | VERIFIED | Existe + Sustantivo + Conectado | `'use client'`, named export, wired desde `page.tsx` con initialData |
| `app/(admin)/admin/turnos/page.tsx` | VERIFIED | Existe + Sustantivo + Conectado | Server Component async, `await headers()`, `Promise.all`, renderiza AppointmentsList |

---

## Key Link Verification

| From | To | Via | Estado | Detalles |
|------|----|-----|--------|----------|
| `AppointmentsList.tsx` | `/api/admin/appointments` | `useEffect` → `fetchAppointments` → `fetch(...)` | WIRED | Línea 71: `fetch('/api/admin/appointments?${params.toString()}')` |
| `AppointmentsList.tsx` | `/api/admin/appointments/${id}` | `handleStatusChange` → PATCH | WIRED | Línea 110: `fetch('/api/admin/appointments/${id}', { method: 'PATCH' })` |
| `AppointmentsList.tsx` | `/api/admin/appointments/${id}/whatsapp` | `handleWhatsAppClick` → PATCH fire-and-forget | WIRED | Línea 141: `fetch('/api/admin/appointments/${id}/whatsapp', { method: 'PATCH' })` |
| `turnos/page.tsx` | `AppointmentsList` | `<AppointmentsList initialData={appointments} doctors={doctors} role={role} />` | WIRED | Línea 38 de `page.tsx` |
| `turnos/page.tsx` | `prisma.appointment.findMany` | `Promise.all` con today date local | WIRED | Líneas 13-19 de `page.tsx` |
| `app/api/admin/appointments/route.ts` | `prisma.appointment.findMany` | `where` condicional + `take: 200` | WIRED | Líneas 44-54 de `route.ts` |

---

## Data-Flow Trace (Level 4)

| Artifact | Variable de datos | Fuente | Datos reales | Estado |
|----------|-------------------|--------|-------------|--------|
| `AppointmentsList.tsx` | `appointments` (useState) | `initialData` prop (SSR) + re-fetch desde `/api/admin/appointments` | Sí — `prisma.appointment.findMany` en page.tsx Y en route.ts | FLOWING |
| `turnos/page.tsx` | `rawAppointments` | `prisma.appointment.findMany({ where: { date: today } })` | Sí — query Prisma con filtro de fecha local | FLOWING |
| `[id]/route.ts` | `appointment` | `prisma.appointment.update(...)` + retorna resultado | Sí — `return Response.json({ appointment })` retorna el registro actualizado | FLOWING |
| `[id]/whatsapp/route.ts` | — | `prisma.appointment.update({ data: { whatsappSent: true } })` | Sí — escribe a DB, retorna `{ ok: true }` | FLOWING |

---

## Behavioral Spot-Checks

| Comportamiento | Verificación estática | Estado |
|----------------|----------------------|--------|
| `requireAdmin` retorna 401 sin token | `auth-helpers.ts` líneas 10-12: `return Response.json({ error: 'No autenticado' }, { status: 401 })` cuando no hay token | PASS |
| `requireAdmin` retorna 403 para rol no-ADMIN | `auth-helpers.ts` líneas 19-21: `return Response.json({ error: 'Forbidden' }, { status: 403 })` cuando `payload.role !== 'ADMIN'` | PASS |
| `await params` en handlers dinámicos | Ambos `[id]/route.ts` y `[id]/whatsapp/route.ts` tienen `const { id } = await params` (Next.js 16) | PASS |
| P2025 guard en handlers PATCH | Ambos handlers tienen `if ((error as { code?: string }).code === 'P2025')` con `status: 404` | PASS |
| Serialización Date → string en page.tsx | `a.date.toISOString().split('T')[0]` en línea 30 de `page.tsx` — evita error TypeScript y mismatch de tipos | PASS |
| No `router.refresh()` en AppointmentsList | Grep confirma ausencia — actualiza state directamente | PASS |

Step 7b SKIPPED para los checks de servidor real — no se puede arrancar el servidor Next.js en este entorno.

---

## Probe Execution

No se declararon probes en los PLAN files. Los SUMMARYs reportan `npm run build: exit 0` — no verificable estáticamente sin ejecutar el build.

---

## Requirements Coverage

| Requisito | Plan | Descripción | Estado | Evidencia |
|-----------|------|-------------|--------|-----------|
| TURNO-01 | 04-01, 04-02, 04-03 | Lista de turnos con filtros por fecha, médico, estado | SATISFIED | GET handler con filtros condicionales + filter bar en AppointmentsList |
| TURNO-02 | 04-01, 04-02 | Admin puede cambiar estado de turno | SATISFIED | PATCH /[id] + handleStatusChange en AppointmentsList |
| TURNO-03 | 04-01, 04-02 | Link WhatsApp al confirmar (wa.me) | SATISFIED | PATCH /whatsapp + buildWhatsAppUrl + handleWhatsAppClick |
| TURNO-04 | 04-02, 04-03 | Envío de mensaje WhatsApp (link wa.me) | SATISFIED | `wa.me/549${phone}?text=${encodeURIComponent(message)}` en buildWhatsAppUrl |
| TURNO-05 | 04-01, 04-02, 04-03 | Búsqueda de paciente por DNI | SATISFIED | `patientDni: { contains: dni }` en route.ts + campo DNI con debounce en AppointmentsList |

---

## Anti-Patterns Found

| Archivo | Línea | Patrón | Severidad | Impacto |
|---------|-------|--------|-----------|---------|
| `AppointmentsList.tsx` | 293 | `appointment.status === 'PENDING' && role === 'ADMIN'` — Confirmar/Cancelar solo visible para ADMIN | Info | Intencional: RECEPTIONIST no puede cambiar estado (documentado en SUMMARY 04-01). La UI muestra "—" para PENDING+RECEPTIONIST. API refuerza con 403. |

No se encontraron: `TBD`, `FIXME`, `XXX` (deuda no referenciada), `return null`/`return []` como stubs, ni `placeholder`/`coming soon` en los archivos modificados.

---

## Observación sobre la discrepancia RECEPTIONIST

El plan `04-02` define `role: 'ADMIN' | 'RECEPTIONIST'` como prop, pero `requireAdmin` en los tres Route Handlers rechaza con **403 a RECEPTIONIST**. La UI condiciona las acciones con `role === 'ADMIN'`, mostrando "—" para RECEPTIONIST en turnos PENDING. Esta asimetría es **intencional** según la decisión documentada en 04-01-SUMMARY: "requireAdmin consistente en todas las mutaciones — RECEPTIONIST no puede cambiar estado". El prop `role` en AppointmentsList habilita diferenciación de UI futura sin cambios de API.

---

## Human Verification Required

### 1. Carga inicial de /admin/turnos

**Test:** Navegar a `/admin/turnos` con sesión ADMIN activa.
**Expected:** La página muestra el heading "Turnos", la barra de filtros y la tabla con los turnos del día pre-renderizados (sin loading spinner en el primer paint).
**Why human:** Requiere base de datos con datos seed + servidor Next.js corriendo.

### 2. Cambio de estado PENDING → CONFIRMED

**Test:** Hacer click en "Confirmar" en un turno con estado PENDING.
**Expected:** El badge cambia inmediatamente a "Confirmado" (optimismo), y aparece el link "Enviar WA" en la columna Acciones. No hay recarga de página.
**Why human:** Mutación con optimismo y re-render reactivo requiere interacción real.

### 3. Inline confirm para Cancelar

**Test:** Hacer click en "Cancelar" en un turno PENDING.
**Expected:** Aparece "¿Cancelar este turno?" con botones "Sí, cancelar" y "No". Al confirmar, el badge cambia a "Cancelado" y la columna Acciones muestra "—".
**Why human:** Flujo de dos pasos no verificable estáticamente.

### 4. WhatsApp link — optimismo + URL correcta

**Test:** Hacer click en "Enviar WA" en un turno CONFIRMED.
**Expected:** El ícono cambia a MessageCircleCheck y el label a "WA enviado" instantáneamente. El enlace abre `https://wa.me/549{phone}?text=...` en nueva pestaña con el mensaje de confirmación.
**Why human:** Verificación del link externo y del tracking optimista requiere browser real.

### 5. Debounce de 300ms en campo DNI

**Test:** Tipear rápidamente en "Buscar por DNI" (ej: "1", "12", "123").
**Expected:** Solo se dispara un fetch — después de 300ms de inactividad — no por cada tecla.
**Why human:** El timing del debounce no puede verificarse sin ejecutar el código.

### 6. Filtros encadenados sin recarga

**Test:** Cambiar el select de Médico y luego el de Estado.
**Expected:** La tabla se actualiza en cada cambio sin recargar la página, manteniendo los valores de los otros filtros activos.
**Why human:** Comportamiento reactivo multi-filtro requiere observación en browser.

### 7. Empty state

**Test:** Seleccionar una fecha sin turnos o un médico sin turnos.
**Expected:** Se muestra el ícono Calendar con "Sin turnos para este filtro" y el texto secundario.
**Why human:** Requiere datos que garanticen cero resultados en el filtro.

### 8. Safety cap de 200 resultados

**Test:** Limpiar el campo de fecha y observar cuántos registros se cargan.
**Expected:** Se muestran como máximo 200 turnos.
**Why human:** Requiere más de 200 turnos en la base de datos para verificar el cap.

---

## Gaps Summary

No se encontraron gaps. Todos los artefactos existen, son sustantivos, están conectados y el flujo de datos es real. Los 4 criterios de éxito del ROADMAP están cubiertos:

1. Lista de turnos con filtros por fecha, médico, estado — VERIFIED
2. Admin puede cambiar estado de turno — VERIFIED
3. Búsqueda de paciente por DNI — VERIFIED
4. Envío de mensaje WhatsApp al confirmar (link wa.me) — VERIFIED

El status es `human_needed` por las verificaciones de comportamiento interactivo (debounce, optimismo, routing, UI reactiva) que no pueden verificarse estáticamente.

---

_Verificado: 2026-05-29_
_Verificador: Claude (gsd-verifier)_
