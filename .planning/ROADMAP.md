# Roadmap: Turnero M√©dico

## Overview

Sistema de gesti√≥n de turnos para consultorio m√©dico. Pacientes reservan turnos v√≠a un wizard p√∫blico; el equipo m√©dico gestiona especialidades, m√©dicos, disponibilidades y el estado de los turnos desde un panel admin protegido por JWT.

Stack: Next.js 16 (App Router) + Prisma + PostgreSQL (Supabase) + JWT + Tailwind v4.

## Phases

- [x] **Phase 1: Fundaci√≥n** ‚Äî Infraestructura base: design system, auth JWT, layouts, login, APIs auth, seed
- [ ] **Phase 2: Admin** ‚Äî Panel admin: dashboard, ABM especialidades, ABM m√©dicos, disponibilidad, upload avatar
- [ ] **Phase 3: Reserva Paciente** ‚Äî Wizard 5 pasos, generaci√≥n de slots, APIs p√∫blicas, bloqueo doble turno
- [ ] **Phase 4: Gesti√≥n de Turnos** ‚Äî Lista + filtros, cambio de estado, integraci√≥n WhatsApp, b√∫squeda por DNI
- [ ] **Phase 5: Pulido y Deploy** ‚Äî Dark mode, WCAG AA, rate limiting, deploy Vercel + Supabase

## Phase Details

### Phase 1: Fundaci√≥n
**Goal**: Infraestructura base lista para todas las fases siguientes ‚Äî design system, autenticaci√≥n JWT, layouts, seed de datos.
**Depends on**: Nothing (first phase)
**Success Criteria** (what must be TRUE):
  1. Admin puede hacer login y logout con JWT en cookie
  2. Design system (tokens, fuentes, colores teal) aplicado globalmente
  3. Sidebar admin funcional con navegaci√≥n
  4. Seed popula 5 especialidades, 5 m√©dicos y 2 usuarios admin/receptionist
  5. TypeScript pasa sin errores

Plans:
- [x] 01-01: Design system, globals.css, fuentes, layout ra√≠z
- [x] 01-02: Auth JWT ‚Äî lib/auth.ts, middleware, API login/logout/me
- [x] 01-03: Admin layout, sidebar, dashboard placeholder, seed script

### Phase 2: Admin
**Goal**: Panel admin completo ‚Äî el equipo m√©dico puede gestionar especialidades, m√©dicos y disponibilidades desde una UI protegida.
**Depends on**: Phase 1
**Success Criteria** (what must be TRUE):
  1. Dashboard muestra m√©tricas reales (turnos hoy, pendientes, confirmados)
  2. Admin puede crear, editar y eliminar especialidades con color
  3. Admin puede crear, editar y eliminar m√©dicos con avatar (upload a Supabase Storage)
  4. Admin puede configurar la disponibilidad semanal de cada m√©dico
  5. Todas las operaciones tienen feedback visual (loading, success, error)
**Plans**: 7 plans

Plans:
- [ ] 02-01-PLAN.md ó Foundation: getWeekRange, requireAdmin helper, Drawer component, sidebar py-3 fix
- [ ] 02-02-PLAN.md ó Dashboard: real Server Component with groupBy, 4 StatCards for current week
- [ ] 02-03-PLAN.md ó Specialties API: GET list, POST create, PUT update, DELETE soft-delete
- [ ] 02-04-PLAN.md ó Doctors API + Availability API: CRUD doctors, full-replace availability transaction
- [ ] 02-05-PLAN.md ó Specialties UI: list page + Drawer + SpecialtyForm + inline delete confirm
- [ ] 02-06-PLAN.md ó Doctors UI: list page + Drawer + DoctorForm with avatar upload
- [ ] 02-07-PLAN.md ó Availability Editor UI: availability page + AvailabilityEditor with 7-day ranges

### Phase 3: Reserva Paciente
**Goal**: Paciente puede reservar un turno v√≠a wizard p√∫blico de 5 pasos sin necesidad de registro.
**Depends on**: Phase 2
**Success Criteria** (what must be TRUE):
  1. Paciente elige especialidad ‚Üí m√©dico ‚Üí fecha/hora ‚Üí datos ‚Üí confirmaci√≥n
  2. Slots se generan din√°micamente seg√∫n disponibilidad del m√©dico
  3. No se puede reservar un slot ya ocupado (bloqueo de doble turno)
  4. Turno queda en estado PENDING en la base de datos
**Plans**: 7 plans

Plans:
- [ ] 02-01-PLAN.md ó Foundation: getWeekRange, requireAdmin helper, Drawer component, sidebar py-3 fix
- [ ] 02-02-PLAN.md ó Dashboard: real Server Component with groupBy, 4 StatCards for current week
- [ ] 02-03-PLAN.md ó Specialties API: GET list, POST create, PUT update, DELETE soft-delete
- [ ] 02-04-PLAN.md ó Doctors API + Availability API: CRUD doctors, full-replace availability transaction
- [ ] 02-05-PLAN.md ó Specialties UI: list page + Drawer + SpecialtyForm + inline delete confirm
- [ ] 02-06-PLAN.md ó Doctors UI: list page + Drawer + DoctorForm with avatar upload
- [ ] 02-07-PLAN.md ó Availability Editor UI: availability page + AvailabilityEditor with 7-day ranges

### Phase 4: Gesti√≥n de Turnos
**Goal**: El equipo puede ver, filtrar y gestionar el estado de todos los turnos.
**Depends on**: Phase 3
**Success Criteria** (what must be TRUE):
  1. Lista de turnos con filtros por fecha, m√©dico, estado
  2. Admin puede cambiar estado de turno (PENDING ‚Üí CONFIRMED / CANCELLED / COMPLETED)
  3. B√∫squeda de paciente por DNI
  4. Env√≠o de mensaje WhatsApp al confirmar (link wa.me)
**Plans**: 7 plans

Plans:
- [ ] 02-01-PLAN.md ó Foundation: getWeekRange, requireAdmin helper, Drawer component, sidebar py-3 fix
- [ ] 02-02-PLAN.md ó Dashboard: real Server Component with groupBy, 4 StatCards for current week
- [ ] 02-03-PLAN.md ó Specialties API: GET list, POST create, PUT update, DELETE soft-delete
- [ ] 02-04-PLAN.md ó Doctors API + Availability API: CRUD doctors, full-replace availability transaction
- [ ] 02-05-PLAN.md ó Specialties UI: list page + Drawer + SpecialtyForm + inline delete confirm
- [ ] 02-06-PLAN.md ó Doctors UI: list page + Drawer + DoctorForm with avatar upload
- [ ] 02-07-PLAN.md ó Availability Editor UI: availability page + AvailabilityEditor with 7-day ranges

### Phase 5: Pulido y Deploy
**Goal**: App production-ready: accesibilidad, seguridad b√°sica y desplegada en Vercel + Supabase.
**Depends on**: Phase 4
**Success Criteria** (what must be TRUE):
  1. Dark mode funcional
  2. Contraste WCAG AA en todos los componentes
  3. Rate limiting en endpoints cr√≠ticos (login, reserva)
  4. App desplegada y accesible en Vercel
**Plans**: 7 plans

Plans:
- [ ] 02-01-PLAN.md ó Foundation: getWeekRange, requireAdmin helper, Drawer component, sidebar py-3 fix
- [ ] 02-02-PLAN.md ó Dashboard: real Server Component with groupBy, 4 StatCards for current week
- [ ] 02-03-PLAN.md ó Specialties API: GET list, POST create, PUT update, DELETE soft-delete
- [ ] 02-04-PLAN.md ó Doctors API + Availability API: CRUD doctors, full-replace availability transaction
- [ ] 02-05-PLAN.md ó Specialties UI: list page + Drawer + SpecialtyForm + inline delete confirm
- [ ] 02-06-PLAN.md ó Doctors UI: list page + Drawer + DoctorForm with avatar upload
- [ ] 02-07-PLAN.md ó Availability Editor UI: availability page + AvailabilityEditor with 7-day ranges

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Fundaci√≥n | 3/3 | Complete | 2026-05-27 |
| 2. Admin | 0/TBD | Not started | - |
| 3. Reserva Paciente | 0/TBD | Not started | - |
| 4. Gesti√≥n de Turnos | 0/TBD | Not started | - |
| 5. Pulido y Deploy | 0/TBD | Not started | - |
