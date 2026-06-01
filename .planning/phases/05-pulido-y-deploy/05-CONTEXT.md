# Phase 5: Pulido y Deploy - Context

**Gathered:** 2026-05-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Llevar la app a production-ready en su capa de **pulido y seguridad básica, funcionando en LOCAL**. Incluye tres piezas:

1. **Dark mode** funcional en toda la app (panel admin + wizard público).
2. **Accesibilidad WCAG AA** — contraste de tokens, focus states visibles, aria-labels, navegación por teclado, alt text.
3. **Rate limiting** en endpoints críticos (login y reserva pública), implementado con Upstash Redis y fallback in-memory para que corra en local sin credenciales.

**FUERA de scope inmediato (diferido por decisión del usuario):** el deploy a Vercel + Supabase prod se hace DESPUÉS. Esta fase deja todo funcionando y verificado en local; el código queda production-ready (env vars documentadas) pero NO se sube a la web todavía.

Esta fase NO incluye: notificaciones automáticas, emails, audit log, gestión de pacientes, ni features nuevas.

</domain>

<decisions>
## Implementation Decisions

### Dark mode
- **D-01:** Mecanismo — **clase `.dark` en `<html>`** (class-based, no `@media`-only). Permite toggle manual y override del sistema.
- **D-02:** Default inicial — **sigue `prefers-color-scheme` del sistema** en la primera visita; la elección manual del usuario **persiste en localStorage** y tiene prioridad en visitas siguientes.
- **D-03:** Alcance — aplica a **toda la app**: panel admin (superficies sólidas) Y wizard público (glassmorphism debe seguir legible en dark). Se redefinen los tokens CSS de `:root` dentro de un bloque `.dark` en `globals.css`.
- **D-04:** Anti-FOUC — script inline en el `<head>` del layout raíz que aplica la clase `dark` antes del paint para evitar flash de tema claro. (El planner decide la implementación exacta; debe ejecutarse antes de la hidratación de React.)
- **D-05:** Toggle UI — botón sol/luna (lucide-react `Sun`/`Moon`). Ubicación: sidebar admin + header del layout público. El planner decide el componente exacto.

### Accesibilidad WCAG AA
- **D-06:** Profundidad — auditoría **completa de pulido**, no solo contraste: (a) contraste AA (≥4.5:1 texto normal, ≥3:1 texto grande/UI) en ambos temas, (b) focus states visibles en todos los interactivos (`:focus-visible` ring teal), (c) `aria-label` en botones-icono (WhatsApp, toggle tema, close, etc.), (d) navegación por teclado en wizard, modal y drawer (focus trap + Escape para cerrar), (e) `alt` en avatares de médicos.
- **D-07:** Ajustes de token — si algún color teal sobre fondo no cumple AA, se ajusta el token (no se cambia el branding general). Documentar cualquier ajuste de paleta.

### Rate limiting
- **D-08:** Backend — **Upstash Redis** (`@upstash/ratelimit` + `@upstash/redis`) como backend de producción, leído de env vars (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`).
- **D-09:** Fallback local — si las env vars de Upstash **no están presentes**, usar un **limiter in-memory** (Map por IP con ventana deslizante). Así la app corre en local sin cuenta Upstash y queda production-ready al setear las vars. Helper único `lib/rate-limit.ts` que abstrae ambos backends.
- **D-10:** Endpoints protegidos — (a) `POST /api/auth/login` y (b) `POST /api/public/appointments` (reserva). Identificador = IP del request (header `x-forwarded-for` / `request.ip`).
- **D-11:** Límites — login: **5 intentos / 15 min** por IP. Reserva: **10 requests / 10 min** por IP. (Valores razonables para un consultorio; el planner puede ajustar con justificación.)
- **D-12:** Respuesta al exceder — HTTP **429** con `Response.json({ error: ... })` y mensaje claro en español. Sin filtrar detalles internos.

### Claude's Discretion
El planner tiene libertad dentro de los patrones establecidos en:
- Estructura exacta del provider/hook de tema (Context vs script + clase manual).
- Ubicación final y estilo del toggle de tema.
- Implementación interna del limiter in-memory (ventana fija vs deslizante).
- Qué componentes auditar primero en WCAG (priorizar interactivos críticos).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Proyecto y convenciones
- `.planning/PROJECT.md` — stack, convenciones críticas (`await cookies()`, `await params`, `Response.json()`), design system "Modern Clinical Sanctuary", regla No Harsh Borders, credenciales de seed.
- `.planning/ROADMAP.md` — goal y success criteria de Fase 5.

### Design system (donde vive el dark mode)
- `app/globals.css` — tokens CSS en `:root` (canvas, brand teal, text, status, borders ≤40% opacidad, shadows, radios, fuentes) + `@theme inline` map de Tailwind v4. Aquí se agrega el bloque `.dark`.
- `app/layout.tsx` — layout raíz (next/font Outfit+Inter); aquí va el script anti-FOUC y la clase del `<html>`.

### Código existente (leer antes de escribir)
- `lib/utils.ts` — `cn()`, `formatDate`, `formatTime`, `formatDni`, `STATUS_LABELS`, `STATUS_COLORS`.
- `lib/auth.ts` — `verifyToken`, `COOKIE_NAME` (`tm_token`), `JWTPayload`.
- `lib/auth-helpers.ts` — `requireAdmin`, `requireStaff`.
- `lib/prisma.ts` — singleton Prisma.
- `app/api/auth/login/route.ts` — endpoint a proteger con rate limiting.
- `app/api/public/appointments/route.ts` — endpoint a proteger con rate limiting.
- `components/admin/AdminSidebar.tsx` — donde va el toggle de tema (admin).
- `components/admin/Drawer.tsx`, `components/admin/NewAppointmentModal.tsx` — overlays que necesitan focus trap + Escape para WCAG.
- `app/(public)/reservar/` (BookingWizard y steps) — wizard a auditar por teclado + glassmorphism en dark.

### Infra (deploy diferido — documentar, no ejecutar)
- `.env.local` / futuro `.env.example` — `DATABASE_URL`, `JWT_SECRET`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, vars de Supabase Storage.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Tokens CSS en `:root` (`globals.css`) — dark mode se logra redefiniéndolos bajo `.dark`, sin tocar componentes (usan `bg-background`, `text-text-primary`, etc.).
- `cn()` (`lib/utils.ts`) — para clases condicionales del toggle y focus rings.
- `requireStaff`/`requireAdmin` (`lib/auth-helpers.ts`) — el rate limiting se aplica ANTES del auth en login (sin sesión todavía).

### Established Patterns
- **Tailwind v4 sin config JS** — configuración vía `@theme` y variables CSS en `globals.css`. Dark mode class-based encaja con `@custom-variant dark` de Tailwind v4 si hace falta.
- **Route Handlers:** `Response.json()` (no `NextResponse.json()`), `await cookies()`, `await params`.
- **Server Component + Client Component** — el toggle de tema y el provider son client; el script anti-FOUC es inline en el Server layout.
- **Tokens de diseño** — `text-text-primary`, `bg-background`, `bg-surface`, `text-accent`, `border-border`, `border-focus`.

### Integration Points
- `app/globals.css` — agregar bloque `.dark { ... }` con tokens dark.
- `app/layout.tsx` — script anti-FOUC + clase en `<html>`.
- `lib/rate-limit.ts` (NUEVO) — helper único Upstash + fallback in-memory.
- `app/api/auth/login/route.ts` y `app/api/public/appointments/route.ts` — invocar el limiter al inicio del handler.
- Sidebar admin + header público — montar el toggle de tema.

</code_context>

<specifics>
## Specific Ideas

- Dark mode: el glassmorphism del wizard (`/reservar`) debe seguir legible — revisar opacidades de fondo y blur en tema oscuro, no solo invertir colores.
- Toggle: íconos `Sun`/`Moon` de lucide-react, transición suave.
- Rate limit login: mensaje tipo "Demasiados intentos. Esperá unos minutos e intentá de nuevo." sin revelar si el email existe.
- El fallback in-memory hace que `npm run dev` funcione sin ninguna cuenta externa — requisito explícito del usuario ("que quede funcionando en local").

</specifics>

<deferred>
## Deferred Ideas

- **Deploy a Vercel + Supabase prod** — diferido explícitamente por el usuario ("toda la parte de subirla a la web la hacemos luego"). Se hará en una sesión posterior; el código de esta fase queda listo para ello (env vars documentadas, build verificado). Supabase de prod = se reutiliza el proyecto actual (D decidido).
- Email de confirmación automático al confirmar turno — nueva feature, fuera de scope.
- Audit log de cambios de estado — fuera de scope.
- Notificaciones en tiempo real (polling/WebSocket) — fuera de scope.
- Gestión de pacientes (`/admin/pacientes`) — declarado en sidebar pero fuera de scope.

</deferred>

---

*Phase: 5-pulido-y-deploy*
*Context gathered: 2026-05-31*
