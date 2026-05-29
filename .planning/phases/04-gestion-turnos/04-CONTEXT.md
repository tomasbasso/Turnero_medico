# Phase 4: Gestión de Turnos - Context

**Gathered:** 2026-05-28
**Status:** Ready for planning

<domain>
## Phase Boundary

El equipo admin puede ver, filtrar y gestionar el estado de todos los turnos reservados por pacientes. Incluye: lista con filtros (fecha, médico, estado, DNI), cambio de estado del turno, y envío de mensaje WhatsApp al confirmar via link wa.me. Esta fase NO incluye notificaciones automáticas, historial de cambios de estado, ni gestión de usuarios.

</domain>

<decisions>
## Implementation Decisions

### Layout de lista
- **D-01:** Vista — **tabla con columnas** (thead + tbody). Patrón consistente con el panel admin existente.
- **D-02:** Columnas — 5 columnas compactas: **Paciente+DNI** | **Médico** | **Fecha+Hora** | **Estado** | **Acciones**. Datos relacionados agrupados en una celda para no fragmentar.
- **D-03:** Filtros — **barra client-side** arriba de la tabla: filtro por fecha, médico (select), estado (select), y búsqueda por DNI (input texto). El componente cliente hace fetch con los parámetros sin recargar la página.
- **D-04:** Período default — **hoy** (fecha actual) al abrir `/admin/turnos`. La vista más útil para la operatoria diaria.

### WhatsApp
- **D-05:** Trigger — el link WhatsApp aparece **solo cuando se confirma** un turno (estado → CONFIRMED). Acción contextual al confirmar.
- **D-06:** Mensaje pre-llenado — `"Hola [patientName], tu turno con [doctorName] el [fecha] a las [hora] ha sido CONFIRMADO."`. Usar `formatDate` y `formatTime` de utils.
- **D-07:** whatsappSent tracking — **PATCH automático** al hacer click en el link: `PATCH /api/admin/appointments/[id]/whatsapp` marca `whatsappSent=true`. Mostrar indicador visual en la fila (ícono teal o check verde) cuando `whatsappSent` es true.

### Claude's Discretion
Las siguientes áreas no se discutieron; el planner tiene libertad dentro de los patrones establecidos:

- **Cambio de estado:** Inline en la tabla — dropdown o botones contextuales por estado (ej: mostrar "Confirmar" / "Cancelar" cuando está PENDING). Debe ser operable sin salir de la lista.
- **Drawer de detalle (opcional):** Si el planner considera valioso mostrar datos extra (teléfono, email, obra social), puede agregar un drawer accesible desde un ícono en la columna Acciones. No obligatorio.
- **Paginación:** El volumen de un consultorio es bajo. El planner puede listar sin paginación o con paginación simple si lo considera necesario.
- **Estado vacío:** Mensaje amigable cuando no hay turnos para los filtros aplicados.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Proyecto y schema
- `.planning/PROJECT.md` — stack, convenciones críticas (await cookies, await params, Response.json), design system "Modern Clinical Sanctuary", regla No Harsh Borders
- `.planning/ROADMAP.md` — goal y success criteria de Fase 4
- `prisma/schema.prisma` — modelo Appointment (id, doctorId, patientName, patientDni, patientPhone, patientEmail, patientInsurance, date @db.Date, time, status, notes, whatsappSent, createdAt). Índices en date, status, patientDni.

### Design system
- `app/globals.css` — design tokens (colores teal, fuentes Outfit+Inter, radios, shadows, variables CSS)

### Código existente (leer antes de escribir código nuevo)
- `lib/utils.ts` — cn(), formatDate, formatTime, formatDni, STATUS_LABELS, STATUS_COLORS, getWeekRange
- `lib/auth-helpers.ts` — requireAdmin() para Route Handlers de admin
- `lib/prisma.ts` — singleton Prisma
- `lib/auth.ts` — verifyToken, COOKIE_NAME, JWTPayload
- `components/admin/AdminSidebar.tsx` — nav ya tiene `/admin/turnos` declarado
- `components/admin/Drawer.tsx` — patrón overlay/modal establecido (si se agrega drawer de detalle)
- `app/(admin)/admin/especialidades/page.tsx` — patrón Server Component + Client Component list ya establecido

### APIs existentes (patrón a seguir)
- `app/api/admin/specialties/route.ts` — patrón GET list + POST con requireAdmin
- `app/api/admin/doctors/[id]/route.ts` — patrón GET/PUT/DELETE con requireAdmin y await params

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `STATUS_LABELS` + `STATUS_COLORS` (`lib/utils.ts`) — colores amber/teal/red/slate para badge de estado en la tabla
- `formatDate`, `formatTime`, `formatDni` (`lib/utils.ts`) — para columnas Fecha+Hora y Paciente+DNI
- `cn()` (`lib/utils.ts`) — para clases Tailwind condicionales en badges y botones de acción
- `requireAdmin()` (`lib/auth-helpers.ts`) — guard listo para todos los Route Handlers de esta fase
- `Drawer.tsx` — overlay reutilizable si se agrega drawer de detalle de turno

### Established Patterns
- **Server Component + Client Component:** Página Server Component que pasa datos iniciales; lista interactiva como Client Component con fetch propio para refetch al filtrar.
- **Route Handlers:** `Response.json()` (no `NextResponse.json()`); `await params`; `requireAdmin()` para verificar auth.
- **Tokens de diseño:** `text-text-primary`, `text-text-secondary`, `bg-background`, `bg-surface`, `text-accent`, `bg-primary/20`, `border-border` — usar en tabla y filtros.
- **Tailwind v4:** Sin `tailwind.config.js` — configuración via `@theme` en globals.css.

### Integration Points
- `app/(admin)/admin/` — crear `turnos/page.tsx` bajo el route group admin (ya protegido por middleware).
- `app/api/admin/` — crear `appointments/route.ts` (GET list) y `appointments/[id]/route.ts` (PATCH status) y `appointments/[id]/whatsapp/route.ts` (PATCH whatsappSent).
- `AdminSidebar` — `/admin/turnos` ya está declarado como nav item; solo necesita que exista la ruta.
- Schema `Appointment` — todos los campos necesarios ya existen, no hay migración requerida.

</code_context>

<specifics>
## Specific Ideas

- Tabla: columna Paciente muestra nombre en negrita y DNI formateado (con `formatDni`) en texto secundario debajo.
- Columna Estado: badge pill con colores `STATUS_COLORS` (amber/teal/red/slate). Consistente con design system.
- Columna Acciones: botones contextuales según el estado actual (PENDING → "Confirmar" + "Cancelar"; CONFIRMED → ícono WhatsApp; todos → opcional ícono detalle).
- WhatsApp link: `https://wa.me/549${patientPhone}?text=encodeURIComponent(mensaje)` (código de país Argentina 54, 9 para celular).
- Indicador whatsappSent: ícono MessageCircleCheck de lucide-react en teal cuando ya se envió el mensaje.
- Filtros: selects nativos o componentes simples — sin date picker complejo. Input de fecha tipo `<input type="date">` para filtro de fecha.

</specifics>

<deferred>
## Deferred Ideas

- Historial de cambios de estado (audit log por turno) — nueva feature, no está en scope.
- Email de confirmación automático al confirmar — pertenece a Fase 5 (pulido) o nueva fase.
- Exportar lista de turnos a CSV/Excel — scope creep, fuera de roadmap.
- Gestión de pacientes (`/admin/pacientes`) — sidebar lo tiene declarado pero está fuera del scope de Fase 4.
- Notificaciones en tiempo real (polling/WebSocket) cuando entran nuevos turnos — Fase 5 o nueva fase.

None — la discusión se mantuvo dentro del scope de la fase.

</deferred>

---

*Phase: 4-gestion-turnos*
*Context gathered: 2026-05-28*
