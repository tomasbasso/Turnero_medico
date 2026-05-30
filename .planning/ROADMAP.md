# Roadmap: Turnero Médico

## Overview

Sistema de gestión de turnos para consultorio médico. Pacientes reservan turnos vía un wizard público; el equipo médico gestiona especialidades, médicos, disponibilidades y el estado de los turnos desde un panel admin protegido por JWT.

Stack: Next.js 16 (App Router) + Prisma + PostgreSQL (Supabase) + JWT + Tailwind v4.

## Phases

- [x] **Phase 1: Fundación** — Infraestructura base: design system, auth JWT, layouts, login, APIs auth, seed
- [ ] **Phase 2: Admin** — Panel admin: dashboard, ABM especialidades, ABM médicos, disponibilidad, upload avatar
- [ ] **Phase 3: Reserva Paciente** — Wizard 5 pasos, generación de slots, APIs públicas, bloqueo doble turno
- [x] **Phase 4: Gestión de Turnos** — Lista + filtros, cambio de estado, integración WhatsApp, búsqueda por DNI (completed 2026-05-29)
- [ ] **Phase 5: Pulido y Deploy** — Dark mode, WCAG AA, rate limiting, deploy Vercel + Supabase

## Phase Details

### Phase 1: Fundación

**Goal**: Infraestructura base lista para todas las fases siguientes — design system, autenticación JWT, layouts, seed de datos.
**Depends on**: Nothing (first phase)
**Success Criteria** (what must be TRUE):

  1. Admin puede hacer login y logout con JWT en cookie
  2. Design system (tokens, fuentes, colores teal) aplicado globalmente
  3. Sidebar admin funcional con navegación
  4. Seed popula 5 especialidades, 5 médicos y 2 usuarios admin/receptionist
  5. TypeScript pasa sin errores

Plans:

- [x] 01-01: Design system, globals.css, fuentes, layout raíz
- [x] 01-02: Auth JWT — lib/auth.ts, middleware, API login/logout/me
- [x] 01-03: Admin layout, sidebar, dashboard placeholder, seed script

### Phase 2: Admin

**Goal**: Panel admin completo — el equipo médico puede gestionar especialidades, médicos y disponibilidades desde una UI protegida.
**Depends on**: Phase 1
**Success Criteria** (what must be TRUE):

  1. Dashboard muestra métricas reales (turnos hoy, pendientes, confirmados)
  2. Admin puede crear, editar y eliminar especialidades con color
  3. Admin puede crear, editar y eliminar médicos con avatar (upload a Supabase Storage)
  4. Admin puede configurar la disponibilidad semanal de cada médico
  5. Todas las operaciones tienen feedback visual (loading, success, error)

**Plans**: 7 plans
Plans:
**Wave 1**

- [x] 02-01-PLAN.md — Foundation: getWeekRange, requireAdmin helper, Drawer component, sidebar py-3 fix

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 02-02-PLAN.md — Dashboard: real Server Component with groupBy, 4 StatCards for current week
- [x] 02-03-PLAN.md — Specialties API: GET list, POST create, PUT update, DELETE soft-delete
- [x] 02-04-PLAN.md — Doctors API + Availability API: CRUD doctors, full-replace availability transaction

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 02-05-PLAN.md — Specialties UI: list page + Drawer + SpecialtyForm + inline delete confirm
- [x] 02-06-PLAN.md — Doctors UI: list page + Drawer + DoctorForm with avatar upload

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 02-07-PLAN.md — Availability Editor UI: availability page + AvailabilityEditor with 7-day ranges

### Phase 3: Reserva Paciente

**Goal**: Paciente puede reservar un turno vía wizard público de 5 pasos sin necesidad de registro.
**Depends on**: Phase 2
**Success Criteria** (what must be TRUE):

  1. Paciente elige especialidad → médico → fecha/hora → datos → confirmación
  2. Slots se generan dinámicamente según disponibilidad del médico
  3. No se puede reservar un slot ya ocupado (bloqueo de doble turno)
  4. Turno queda en estado PENDING en la base de datos

**Plans**: 5 plans

Plans:

**Wave 1** *(parallel — no dependencies)*

- [ ] 03-01-PLAN.md — Schema migration (patientInsurance D-05) + public layout + /reservar page shell
- [ ] 03-02-PLAN.md — Public APIs: GET specialties, GET doctors, GET slots with generateSlots algorithm

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 03-03-PLAN.md — POST /api/public/appointments — validation D-01/D-02/D-03/D-05 + P2002 race condition
- [ ] 03-04-PLAN.md — BookingWizard shell + StepProgress + StepSpecialty + StepDoctor (steps 1-2)

**Wave 3** *(blocked on Wave 2 completion)*

- [ ] 03-05-PLAN.md — StepDateTime + StepPatientForm + StepConfirmation + BookingWizard final wiring

### Phase 4: Gestión de Turnos

**Goal**: El equipo puede ver, filtrar y gestionar el estado de todos los turnos.
**Depends on**: Phase 3
**Success Criteria** (what must be TRUE):

  1. Lista de turnos con filtros por fecha, médico, estado
  2. Admin puede cambiar estado de turno (PENDING → CONFIRMED / CANCELLED / COMPLETED)
  3. Búsqueda de paciente por DNI
  4. Envío de mensaje WhatsApp al confirmar (link wa.me)

**Plans**: 3 plans

Plans:

**Wave 1**

- [x] 04-01-PLAN.md — API Layer: GET /api/admin/appointments (list+filters), PATCH /[id] (status), PATCH /[id]/whatsapp (whatsappSent)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 04-02-PLAN.md — AppointmentsList client component: filter bar, table with 5 columns, status actions, WhatsApp link, optimistic updates

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 04-03-PLAN.md — /admin/turnos Server Component page: SSR initial fetch for today, passes initialData+doctors to AppointmentsList

### Phase 5: Pulido y Deploy

**Goal**: App production-ready: accesibilidad, seguridad básica y desplegada en Vercel + Supabase.
**Depends on**: Phase 4
**Success Criteria** (what must be TRUE):

  1. Dark mode funcional
  2. Contraste WCAG AA en todos los componentes
  3. Rate limiting en endpoints críticos (login, reserva)
  4. App desplegada y accesible en Vercel

**Plans**: TBD

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Fundación | 3/3 | Complete | 2026-05-27 |
| 2. Admin | 0/TBD | Not started | - |
| 3. Reserva Paciente | 0/5 | Not started | - |
| 4. Gestión de Turnos | 3/3 | Complete   | 2026-05-29 |
| 5. Pulido y Deploy | 0/TBD | Not started | - |
