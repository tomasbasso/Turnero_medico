# Phase 2: Admin - Context

**Gathered:** 2026-05-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Panel admin completo — el equipo del consultorio puede gestionar especialidades, médicos y disponibilidades desde rutas protegidas por JWT. El dashboard muestra métricas reales de la semana en curso. Esta fase NO incluye gestión de turnos (Fase 4) ni el wizard de reserva pública (Fase 3).

</domain>

<decisions>
## Implementation Decisions

### Dashboard
- **D-01:** Período de métricas — **semana en curso** (lunes a domingo de la semana actual).
- **D-02:** KPIs — **4 cards**: Pendientes / Confirmados / Completados / Cancelados. Cada card muestra el conteo de turnos en ese estado para la semana.
- **D-03:** Visual — **solo cards**, sin gráficos, sin tabla de próximos turnos debajo. Limpio y coherente con el design system.
- **D-04:** Carga — **Server Component** que consulta Prisma directamente. Sin fetch client-side, sin skeleton/loading state en el dashboard.

### Claude's Discretion
Las siguientes áreas no se discutieron; el planner tiene libertad dentro de los patrones establecidos:

- **Patrón ABM (Especialidades y Médicos):** Usar **list page + drawer/sheet lateral** para crear y editar. La lista es una página Server Component; el formulario se abre como overlay sin navegar a otra ruta. Evitar páginas `create/` y `edit/[id]/` separadas.
- **Editor de disponibilidad:** **Lista de franjas horarias por día** — por cada día de la semana, el admin puede agregar/quitar rangos (startTime–endTime). Coherente con el schema `Availability` (dayOfWeek, startTime, endTime). No hacer grilla interactiva de celdas.
- **Permisos por rol:**
  - `ADMIN` → CRUD completo en especialidades, médicos y disponibilidad.
  - `RECEPTIONIST` → solo lectura (puede ver listas pero no crear/editar/eliminar). El guard se aplica en el Server Component usando el header `x-user-role` inyectado por el middleware.
  - Proteger también los endpoints de API: verificar rol desde cookie en cada Route Handler.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project and Schema
- `.planning/PROJECT.md` — stack completo, convenciones críticas (await cookies, await params, Response.json), design system
- `.planning/ROADMAP.md` — phase goal y success criteria de Fase 2
- `prisma/schema.prisma` — modelos: Specialty, Doctor, Availability, Appointment, User (roles)

### Design System and UI
- `app/globals.css` — design tokens (colores teal, fuentes, radios, shadows, variables CSS)
- `scratch/DESIGN.md` — "Modern Clinical Sanctuary", reglas de diseño, No Harsh Borders rule

### Existing Code (read before writing new code)
- `components/admin/AdminSidebar.tsx` — nav pattern, active state, rutas `/admin/medicos` y `/admin/especialidades` ya declaradas
- `app/(admin)/layout.tsx` — layout: sidebar (w-56) + main (flex-1, overflow-y-auto)
- `lib/utils.ts` — cn(), formatDate, formatTime, getInitials, STATUS_LABELS, STATUS_COLORS
- `lib/auth.ts` — JWT sign/verify, getAuthFromHeaders (lee x-user-id, x-user-role desde headers del middleware)
- `lib/supabase.ts` — uploadAvatar(file, doctorId) → URL pública en Supabase Storage
- `middleware.ts` — inyecta x-user-id, x-user-role, x-user-email en cada request admin

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `cn()` (`lib/utils.ts`) — conditional Tailwind classes, usar en todos los componentes
- `getInitials(name)` (`lib/utils.ts`) — para avatar fallback cuando no hay imagen
- `formatDate`, `formatTime` (`lib/utils.ts`) — para mostrar fechas/horas de turnos en dashboard
- `uploadAvatar(file, doctorId)` (`lib/supabase.ts`) — listo para el form de médico, retorna URL pública
- `AdminSidebar` — ya tiene rutas `/admin/medicos` y `/admin/especialidades` declaradas; páginas deben existir o el nav rompe

### Established Patterns
- **Server Components para páginas, 'use client' para forms interactivos** — login page ya sigue este patrón
- **Route Handlers:** `Response.json()` (no `NextResponse.json()`); `await params`; `await cookies()`
- **Auth en Server Components:** `import { headers } from 'next/headers'` → leer `x-user-role` header
- **Auth en Route Handlers:** leer cookie `tm_token`, verificar con `verifyToken()` de `lib/auth.ts`
- **Tokens de diseño:** `text-text-primary`, `text-text-secondary`, `bg-background`, `bg-surface`, `text-accent`, `bg-primary/20`, `border-border`

### Integration Points
- `app/(admin)/admin/page.tsx` — placeholder a reemplazar con dashboard real
- `app/(admin)/` route group — todas las páginas admin van aquí: `medicos/`, `especialidades/`
- `app/api/admin/` — crear endpoints REST: `/api/admin/specialties`, `/api/admin/doctors`, `/api/admin/doctors/[id]/availability`
- Prisma models: `Specialty` (id, name, description, color, isActive), `Doctor` (id, name, specialtyId, avatar, bio, phone, durationMin, isActive, availabilities[]), `Availability` (doctorId, dayOfWeek, startTime, endTime)

</code_context>

<specifics>
## Specific Ideas

- El dashboard debe mostrar los conteos de la **semana en curso** (no el día de hoy, no histórico)
- Cards del dashboard: usar colores coherentes con `STATUS_COLORS` del utils (amber para pending, teal para confirmed, slate para completed, red para cancelled)
- Avatar del médico: input file → uploadAvatar() → guardar URL en `Doctor.avatar`. Mostrar preview antes de guardar. Fallback: initials con `getInitials(name)`.
- La disponibilidad se edita por médico: en la página de edición del médico, hay una sección de disponibilidad. O página separada `/admin/medicos/[id]/disponibilidad`.

</specifics>

<deferred>
## Deferred Ideas

- Gestión de turnos desde el dashboard (quick actions, cambiar estado desde ahí) — pertenece a Fase 4
- Gráfico de barras de turnos por día — scope creep, puede agregarse en Fase 5 (pulido)
- Gestión de usuarios (RECEPTIONIST / DOCTOR accounts) — no está en el roadmap de Fase 2, considerarlo para Fase 5 o nueva fase
- Notificaciones / indicadores en tiempo real — fuera de scope

None — la discusión se mantuvo dentro del scope de la fase.

</deferred>

---

*Phase: 2-admin*
*Context gathered: 2026-05-27*
