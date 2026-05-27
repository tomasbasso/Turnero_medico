# Phase 3: Reserva Paciente - Context

**Gathered:** 2026-05-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Wizard público de 5 pasos (especialidad → médico → fecha/hora → datos → confirmación) que permite al paciente reservar un turno sin registrarse. Las APIs son públicas (sin JWT). El turno queda en estado PENDING. Esta fase NO incluye gestión ni cambio de estado de turnos (Fase 4), ni notificaciones automáticas.

</domain>

<decisions>
## Implementation Decisions

### Datos del paciente
- **D-01:** DNI — solo números, 7-8 dígitos. Strip de puntos y espacios antes de validar y guardar.
- **D-02:** Teléfono — exactamente 10 dígitos numéricos (formato argentino sin prefijo internacional). Ej: `2302587896`.
- **D-03:** Email — campo opcional (`String?`). Si se provee, validar formato básico (regex).
- **D-04:** Sin restricción de reserva por DNI — un paciente puede tener múltiples turnos el mismo día. La única protección de unicidad es `@@unique([doctorId, date, time])` a nivel DB.
- **D-05:** Obra social — agregar campo `patientInsurance String?` al modelo `Appointment`. Campo de texto libre, opcional. Requiere migración de schema.

### Generación de slots
- **D-06:** Ventana de reserva — **30 días hacia adelante** desde hoy (configurable como constante).
- **D-07:** Vista de fechas — **grilla de calendario mensual**. Días con al menos un slot disponible en color teal/activo; días sin disponibilidad o pasados en gris/deshabilitado.
- **D-08:** Vista de horarios — **chips/botones en grilla**. Slot disponible: teal clickeable. Slot ocupado: gris, no clickeable (visible para contexto).
- **D-09:** Sin disponibilidad — si el médico no tiene turnos en los próximos 30 días, mostrar mensaje amigable ("Este médico no tiene turnos disponibles") con botón para volver al paso 2 (elección de médico).

### Claude's Discretion
Las siguientes áreas no se discutieron; el planner tiene libertad dentro de los patrones establecidos:

- **Estructura del wizard:** Ruta única `/reservar` con estado gestionado en React (Context o useState lifting). No rutas por paso. El estado se pierde si el usuario recarga — comportamiento aceptable para este wizard.
- **Confirmación final:** Pantalla de confirmación con resumen del turno (médico, fecha, hora, nombre del paciente). Sin email de confirmación al paciente en esta fase.
- **Race condition / doble booking:** El `@@unique([doctorId, date, time])` del schema rechaza inserciones duplicadas. Mostrar error amigable si la inserción falla ("Este turno ya fue reservado, elegí otro horario").
- **APIs públicas:** Rutas bajo `app/api/public/` sin verificación de JWT. GET para leer especialidades, médicos y slots disponibles; POST para crear el turno.
- **Glassmorphism en el wizard:** Aplicar el estilo "Modern Clinical Sanctuary" definido en PROJECT.md — fondos con blur, bordes suaves, paleta teal.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Proyecto y schema
- `.planning/PROJECT.md` — stack, convenciones críticas (await cookies, await params), design system "Modern Clinical Sanctuary", regla No Harsh Borders
- `.planning/ROADMAP.md` — goal y success criteria de Fase 3
- `prisma/schema.prisma` — modelos Doctor, Specialty, Availability, Appointment. IMPORTANTE: agregar `patientInsurance String?` a Appointment en esta fase.

### Design system
- `app/globals.css` — design tokens (colores teal, fuentes Outfit+Inter, radios, shadows, variables CSS)

### Código existente (leer antes de escribir código nuevo)
- `lib/utils.ts` — cn(), formatDate, formatTime, STATUS_LABELS, STATUS_COLORS
- `lib/prisma.ts` — singleton Prisma
- `components/admin/Drawer.tsx` — patrón de overlay/modal ya establecido (referencia de componente interactivo)
- `app/(admin)/layout.tsx` — patrón de route group (crear `(public)` análogo para el wizard)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `cn()` (`lib/utils.ts`) — para clases Tailwind condicionales en chips y estados del calendario
- `formatDate`, `formatTime` (`lib/utils.ts`) — para mostrar fecha y hora en la pantalla de confirmación
- `lib/prisma.ts` — singleton para queries en Route Handlers públicas

### Established Patterns
- **Route groups:** `(admin)` ya establece el patrón. Crear `(public)` para el wizard en `/reservar`.
- **Route Handlers:** `Response.json()` (no `NextResponse.json()`); `await params`; `await cookies()` cuando aplique.
- **'use client' para interactividad:** El wizard completo es Client Component (state entre pasos). Server Components solo para la ruta raíz si aplica.
- **Tokens de diseño:** `text-text-primary`, `text-text-secondary`, `bg-background`, `bg-surface`, `text-accent`, `bg-primary/20`, `border-border` — usar en todos los componentes del wizard.
- **Tailwind v4:** Sin `tailwind.config.js` — configuración via `@theme` en globals.css.

### Integration Points
- `app/page.tsx` → ya redirige a `/admin`. El wizard vive en `/reservar` (ruta paralela, no nested bajo admin).
- `app/api/public/` — nueva carpeta para APIs sin autenticación (especialidades, médicos con disponibilidad, slots disponibles, POST turno).
- `prisma/schema.prisma` → migración para agregar `patientInsurance String?` a `Appointment`.

</code_context>

<specifics>
## Specific Ideas

- El wizard usa el estilo "Modern Clinical Sanctuary" con glassmorphism: fondos con `backdrop-blur`, cards con `bg-white/80` o similar, bordes suaves teal.
- Calendario: días habilitados (con al menos 1 slot libre) en teal, días sin disponibilidad en gris claro, día de hoy marcado de alguna forma.
- Chips de horario: grilla compacta tipo `grid-cols-3` o `grid-cols-4`. Teal para disponibles, gris/opaco para ocupados.
- Paso de datos: formulario con campos DNI (7-8 dígitos), Teléfono (10 dígitos numéricos), Nombre completo, Obra social (opcional), Email (opcional).
- Confirmación: mostrar resumen completo antes de confirmar (médico, especialidad, fecha, hora) y luego pantalla de éxito con el detalle del turno creado.

</specifics>

<deferred>
## Deferred Ideas

- Email de confirmación automático al paciente — pertenece a Fase 5 (pulido) o nueva fase.
- Verificación de disponibilidad en tiempo real (WebSockets o polling) — fuera de scope, overkill para esta fase.
- Filtro de médicos sin disponibilidad en el paso 2 — se evaluó pero se prefiere el mensaje en el paso 3 para mantener la lógica más simple.

</deferred>

---

*Phase: 3-reserva-paciente*
*Context gathered: 2026-05-27*
