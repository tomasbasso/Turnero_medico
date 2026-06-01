# Rediseño estético integral — "Clinical Calm"

**Fecha:** 2026-06-01
**Proyecto:** turnero-consultorio
**Tipo:** Pulido visual / design system (no cambia funcionalidad ni datos)
**Dirección elegida:** A · Clinical Calm (descartadas B · Modern Pro y C · Warm Human)

---

## 1. Objetivo

Llevar la estética de toda la app a nivel "health-SaaS premium" manteniendo la
identidad teal/slate actual. Alcance: **las 3 zonas** (login, wizard público
`/reservar`, panel admin completo) **+ pulir el dark mode**, que hoy tiene deuda
estética.

No-objetivos (YAGNI): no se toca lógica, rutas, API, esquema de datos, ni se agrega
deploy. Es exclusivamente capa visual (CSS/tokens/markup de presentación).

## 2. Causa raíz de la deuda del dark mode

El sistema es **token-driven**: los tokens viven en `app/globals.css` como variables
CSS (`:root` claro, `.dark` oscuro) mapeadas a Tailwind v4 vía `@theme inline`. El
dark mode se activa con la clase `.dark` en `<html>` (script anti-FOUC en
`app/layout.tsx` + `components/ThemeToggle.tsx`).

El problema son los **colores hardcodeados que escapan a los tokens** y por eso no se
adaptan al cambiar de tema:
- `components/ThemeToggle.tsx` → `text-slate-400 hover:bg-slate-800 hover:text-slate-100` (fijo, asume fondo oscuro siempre).
- `app/(auth)/login/page.tsx` → `bg-white`, `bg-white/80`, `bg-red-50` (no usa `bg-surface`).
- `components/admin/StatCard.tsx` → bordes `border-amber-400 / border-teal-500 / ...` y status hardcodeados.
- Probable presencia de `bg-white`, `text-slate-*`, `bg-red-50`, etc. en otros componentes admin y de booking.

**Regla del rediseño:** todo color debe pasar por un token semántico
(`bg-surface`, `text-text-primary`, `border-border`, `text-primary`, status tokens).
Cero `bg-white` / `text-slate-*` / `*-50` hardcodeados en componentes.

## 3. Sistema visual "Clinical Calm" (validado en mockup)

### 3.1 Tokens — modo claro (`:root`)
- **Canvas:** fondo con gradiente teal sutil en vez de plano. Token base
  `--background: #f8fafc`; aplicar gradiente radial suave `radial-gradient(120% 120% at 100% 0%, #eef6f5 0%, #f8fafc 45%)` en el `body`.
- **Surface:** `#ffffff`. **Foreground:** `#0f172a`.
- **Brand:** `--primary #0d9488`, `--primary-hover #0f766e`, `--primary-light #ccfbf1`, `--accent #14b8a6`.
- **Texto:** primary `#0f172a`, secondary `#64748b`, muted `#94a3b8`.
- **Borders:** `#e2e8f0`; focus `rgba(13,148,136,.4)`.
- **Elevación (nuevo, 2 capas):**
  - `--shadow-sm: 0 1px 2px rgba(15,23,42,.04), 0 12px 28px -16px rgba(13,148,136,.28)` (tarjetas que "flotan" suave con tinte teal).
  - `--shadow-md` para modales, más pronunciada.
- **Radius:** sm `10px`, md `14px`, lg `18px`, full `9999px` (un poco más redondeado que hoy).

### 3.2 Tokens — modo oscuro pulido (`.dark`)
Cambio clave: pasar del gris-slate plano a un **teal-oscuro cálido**.
- **Canvas:** `--background` base `#0b1a1a`; gradiente `radial-gradient(120% 120% at 100% 0%, #11302d 0%, #0b1a1a 55%)`.
- **Surface:** `#102826`. **Foreground:** `#e7f4f1`.
- **Brand:** `--primary #2dd4bf`, `--primary-hover #5eead4`, `--primary-light #134e4a`, `--accent #2dd4bf`.
- **Texto:** primary `#e7f4f1`, secondary `#8fb4af`, muted `#5e8b86`.
- **Borders:** `#1e433f` / `#2a5751`; focus `rgba(45,212,191,.4)`.
- **Elevación:** sombras negras profundas (`rgba(0,0,0,.4–.6)`).
- **Contraste:** todos los pares texto/fondo deben cumplir **WCAG AA** (≥4.5:1 texto normal, ≥3:1 texto grande/UI). Verificar primary sobre surface y chips de estado.

### 3.3 Tipografía
Mantener **Outfit** (display/títulos) + **Inter** (body) ya cableadas en
`app/layout.tsx`. Refinar la escala: títulos con `letter-spacing:-.02em`,
jerarquía consistente (h1 ~24–28px, h2 ~20px, body 13–14px, labels 12px uppercase
con tracking).

### 3.4 Componentes (tratamiento)
- **Botón primario:** degradé vertical `linear-gradient(180deg, accent, primary)` + sombra de color; radius md; estados hover/active/disabled/loading.
- **Botón ghost/secundario:** surface + borde teal tenue + texto primary.
- **Inputs:** surface, borde border, foco con halo `0 0 0 3px rgba(primary,.18)` + borde primary.
- **Tarjetas:** surface + `--shadow-sm` de 2 capas + borde sutil; radius lg.
- **Chips/badges de estado:** fondo tonal translúcido del color de estado + texto del mismo tono (no bordes duros). Estados: Confirmado (teal), Pendiente (amber), Completado (slate), Cancelado (red), legibles en ambos temas.
- **Pasos del wizard (`StepProgress`):** dots con número, barra de progreso teal entre pasos completados, dot activo relleno, futuros con borde tenue.
- **Sidebar admin:** tokenizar (hoy slate fijo); item activo con fondo `primary-light` + texto primary.
- **ThemeToggle:** tokenizar para que funcione en ambos temas (quitar slate hardcodeado).

### 3.5 Movimiento
`framer-motion` ya está instalado. Microinteracciones sobrias: hover lift en
tarjetas (translateY 2–3px + sombra), transición de tema suave, entrada de
modales/drawer (ya tienen FocusTrap). Respetar `prefers-reduced-motion`.

## 4. Aplicación por zona

### 4.1 Login (`app/(auth)/login/page.tsx`)
Tokenizar (`bg-white`→`bg-surface`, `bg-red-50`→token error). Card glassmorphism
sobre canvas con gradiente y blobs teal/accent (ya existen) afinados. Botón con el
nuevo tratamiento. Que se vea impecable también en dark.

### 4.2 Wizard público (`/reservar`)
Componentes `components/booking/*`: `BookingWizard`, `StepProgress`,
`StepSpecialty`, `StepDoctor`, `StepDateTime`, `StepPatientForm`,
`StepConfirmation`, y `PublicHeader`. Es la cara para pacientes → máxima prolijidad:
tarjetas seleccionables con estado claro, grilla de horarios legible, progreso
visible, confirmación con jerarquía. Mobile-first.

### 4.3 Panel admin
`app/(admin)/layout.tsx`, `AdminSidebar`, `StatCard`, `AppointmentsList`,
`DoctorsList`/`DoctorForm`, `SpecialtiesList`/`SpecialtyForm`,
`AvailabilityEditor`, `TimeOffEditor`, `Drawer`, `NewAppointmentModal`. Consistencia
de tarjetas, tablas/listas, botones de acción, modales y drawer. Dashboard con
`StatCard` tokenizadas.

## 5. Estrategia de implementación (alto nivel — el detalle va en el plan)
1. **Fundación de tokens:** reescribir `app/globals.css` con el sistema pulido (claro + dark + gradientes + elevación + radius). Esto solo ya cascadea a todo lo token-driven.
2. **Des-hardcodear:** barrer componentes y reemplazar colores fijos por tokens semánticos (prioridad: ThemeToggle, login, StatCard, sidebar).
3. **Componentes base:** afinar botones, inputs, tarjetas, chips, StepProgress.
4. **Zona por zona:** login → wizard → admin, verificando claro y oscuro.

## 6. Verificación / criterios de éxito
- Las 3 zonas se ven cohesivas y "premium" en **modo claro y oscuro**.
- Cero colores hardcodeados que rompan el cambio de tema.
- Contraste **WCAG AA** en ambos temas (sin regresión del trabajo de Fase 5).
- Focus ring visible se mantiene (no romper accesibilidad de teclado).
- Sin cambios de funcionalidad: rutas, formularios, flujos y API intactos.
- Verificación visual con el dev server (modo claro y oscuro) en cada zona.

## 7. Riesgos / notas
- El screenshot del preview MCP se cuelga en este entorno Windows; verificación
  visual puede requerir inspección por `preview_inspect`/DOM o revisión manual del
  usuario en `localhost:3000`.
- Algunos componentes pueden tener más hardcodeo del detectado; el barrido del
  paso 2 debe ser exhaustivo (grep de `bg-white`, `text-slate-`, `bg-*-50`, `border-*-400`).
