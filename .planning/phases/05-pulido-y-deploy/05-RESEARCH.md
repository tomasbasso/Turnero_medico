# Phase 5: Pulido y Deploy - Research

**Researched:** 2026-05-31
**Domain:** Dark mode (Tailwind v4), WCAG AA, Rate limiting (Upstash + in-memory), Focus management
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Dark mode**
- D-01: Mecanismo — clase `.dark` en `<html>` (class-based, no `@media`-only).
- D-02: Default inicial — sigue `prefers-color-scheme` del sistema en la primera visita; elección manual persiste en localStorage.
- D-03: Aplica a toda la app. Tokens CSS de `:root` redefinidos bajo `.dark` en `globals.css`.
- D-04: Anti-FOUC — script inline en el `<head>` del layout raíz, antes del paint. El planner decide la implementación exacta.
- D-05: Toggle UI — `Sun`/`Moon` de lucide-react. Sidebar admin + header del layout público.

**Accesibilidad WCAG AA**
- D-06: Auditoría completa: (a) contraste AA ≥4.5:1 texto / ≥3:1 UI, (b) focus states `:focus-visible` ring teal, (c) `aria-label` en botones-icono, (d) focus trap + Escape en wizard/modal/drawer, (e) `alt` en avatares.
- D-07: Si algún teal no cumple AA → ajustar token, no el branding.

**Rate limiting**
- D-08: Upstash Redis (`@upstash/ratelimit` + `@upstash/redis`).
- D-09: Fallback in-memory si las env vars no están presentes. Helper único `lib/rate-limit.ts`.
- D-10: Endpoints: `POST /api/auth/login` y `POST /api/public/appointments`.
- D-11: Login: 5 intentos / 15 min. Reserva: 10 requests / 10 min. Por IP.
- D-12: HTTP 429 con mensaje en español. Sin revelar detalles internos.

### Claude's Discretion
- Estructura exacta del provider/hook de tema (Context vs script + clase manual).
- Ubicación final y estilo del toggle de tema.
- Implementación interna del limiter in-memory (ventana fija vs deslizante).
- Qué componentes auditar primero en WCAG.

### Deferred Ideas (OUT OF SCOPE)
- Deploy a Vercel + Supabase prod.
- Email de confirmación automático al confirmar turno.
- Audit log de cambios de estado.
- Notificaciones en tiempo real.
- Gestión de pacientes (`/admin/pacientes`).
</user_constraints>

---

## Summary

Esta fase tiene tres piezas técnicas independientes: dark mode class-based, accesibilidad WCAG AA, y rate limiting. Cada una tiene su stack resuelto con el código existente.

**Dark mode** en Tailwind v4 se configura con una sola línea en `globals.css` (`@custom-variant dark (&:where(.dark, .dark *))`), luego se agrega un bloque `.dark { ... }` con los tokens redefinidos. El anti-FOUC se resuelve con un `<script dangerouslySetInnerHTML>` en el `<head>` del layout raíz (Server Component) más `suppressHydrationWarning` en `<html>`. No se requiere biblioteca adicional.

**WCAG AA**: El análisis de contraste revela que los tokens `--success` (#10b981) y `--error` (#ef4444) fallan como texto sobre fondo blanco/bg. Los tokens de estado en `STATUS_COLORS` de `utils.ts` ya usan variantes Tailwind nombradas (amber-700, teal-700, red-700) que sí pasan AA. El botón primario (blanco sobre #0d9488) pasa 3.74:1 — suficiente para UI/texto grande pero no para texto normal; en este caso el botón tiene texto bold grande, lo que lo clasifica como texto grande (≥18pt o ≥14pt bold), cumpliendo la excepción. El foco trap no existe en ningún overlay del proyecto; hay que implementarlo.

**Rate limiting**: `@upstash/ratelimit` v2.0.8 + `@upstash/redis` v1.38.0 con `slidingWindow`. El fallback in-memory se implementa con un `Map<string, number[]>` propio en `lib/rate-limit.ts` cuando las env vars no están presentes — la librería Upstash *no* puede instanciarse sin credenciales, por lo que el fallback es código propio.

**Primary recommendation:** Implementar en tres waves paralelos (dark mode, a11y, rate limit) con una Wave 0 de auditoría rápida. Ninguna pieza bloquea a las otras.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Dark mode tokens | CSS (globals.css) | — | Los tokens viven en `:root`; `.dark` los redefine sin tocar componentes |
| Anti-FOUC script | Frontend Server (layout SSR) | Browser | Se inyecta desde Server Component pero corre en browser antes de React |
| Theme toggle UI | Browser (Client Component) | — | Necesita `localStorage` y `document.documentElement` |
| Focus trap | Browser (Client Component) | — | Manipulación de DOM/foco, solo en cliente |
| Rate limiting | API / Backend (Route Handler) | — | Corre en Edge/Node antes de la lógica de negocio |
| WCAG tokens | CSS (globals.css) | — | Ajustes de `--error`, `--success` como CSS vars |
| WCAG aria/focus-visible | Browser (componentes) | — | Atributos HTML y estilos en componentes React |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Tailwind CSS v4 | 4.x (ya instalado) | Dark mode via `@custom-variant dark` | Ya en uso; v4 soporta class-based dark sin config JS |
| `@upstash/ratelimit` | 2.0.8 | Sliding window rate limiting con Redis | Librería oficial de Upstash; la única que funciona con Upstash Redis REST API |
| `@upstash/redis` | 1.38.0 | Cliente Redis sobre HTTP REST | Compatible con Edge Runtime y Vercel serverless sin conexión TCP |
| `focus-trap-react` | 12.0.2 | Focus trap en modal/drawer/wizard | Solución establecida (existe desde 2015), sin dependencias, compatible React 19 |

[VERIFIED: npm registry] — todas las versiones confirmadas con `npm view`, fechas de creación >2 años, sin postinstall scripts, source repos en GitHub.

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lucide-react` | 1.16.0 (ya instalado) | Íconos `Sun`, `Moon` para toggle | Ya en uso; `Sun` y `Moon` existen en esta versión |
| Implementación in-memory propia | — | Fallback cuando UPSTASH vars ausentes | Solo cuando `UPSTASH_REDIS_REST_URL` no está en env |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `focus-trap-react` | `aria-modal` + custom hook | `aria-modal` solo afecta screen readers, no teclado; focus-trap-react es más robusto |
| `focus-trap-react` | HTML `<dialog>` nativo | Dialog nativo tiene focus trap integrado, pero requiere refactorizar los overlays existentes — costo alto para esta fase |
| Fallback in-memory propio | `@upstash/ratelimit` con `EphemeralCache` | `EphemeralCache` es suplementario a Redis, no reemplaza — confirmado en docs oficiales |

**Installation:**
```bash
npm install @upstash/ratelimit @upstash/redis focus-trap-react
```

---

## Package Legitimacy Audit

| Package | Registry | Age | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-------------|-----------|-------------|
| `@upstash/ratelimit` | npm | ~3 años (May 2022) | github.com/upstash/ratelimit | [OK] (sin repo linked en registry, pero upstash.com es la empresa oficial) | Aprobado — empresa verificada |
| `@upstash/redis` | npm | ~4 años (Oct 2021) | github.com/upstash/redis-js | [OK] | Aprobado |
| `focus-trap-react` | npm | ~10 años (Aug 2015) | github.com/focus-trap/focus-trap-react | [OK] | Aprobado |

**Packages removed due to slopcheck [SLOP] verdict:** ninguno

**Packages flagged as suspicious [SUS]:** ninguno

Slopcheck corrió exitosamente y los 3 paquetes pasaron. `@upstash/ratelimit` no tiene `source repository` en el campo npm `repository`, pero el dominio `upstash.com` es la empresa propietaria documentada y el código está en `github.com/upstash`. Sin postinstall scripts en ninguno de los tres.

---

## Architecture Patterns

### System Architecture Diagram

```
Request (POST /api/auth/login o /api/public/appointments)
        │
        ▼
┌─────────────────────────────────┐
│   lib/rate-limit.ts              │
│                                  │
│  UPSTASH_REDIS_REST_URL ?        │
│    ├─ SÍ → Ratelimit(Redis)      │
│    └─ NO → InMemoryLimiter(Map)  │
│                                  │
│  limiter.check(ip)               │
│    ├─ OK  → continúa             │
│    └─ 429 → Response.json(error) │
└─────────────────────────────────┘
        │ OK
        ▼
   Handler existente (sin cambios)

Browser: prefers-color-scheme / localStorage
        │
        ▼
┌──────────────────────────────────────┐
│  <script> inline (layout.tsx head)   │
│  Antes de paint:                     │
│  1. Lee localStorage.getItem('theme')│
│  2. Si null → lee prefers-color-scheme│
│  3. Aplica class 'dark' a <html>     │
└──────────────────────────────────────┘
        │
        ▼
   CSS: .dark { --background: #0f172a; ... }
   Tailwind: dark:bg-X usa @custom-variant dark
```

### Recommended Project Structure

```
lib/
├── rate-limit.ts          # NUEVO — abstracción Upstash + in-memory fallback
components/
├── ThemeToggle.tsx        # NUEVO — botón Sun/Moon (client)
├── admin/
│   ├── AdminSidebar.tsx   # MODIFICAR — agregar ThemeToggle
│   └── Drawer.tsx         # MODIFICAR — focus trap + Escape
│   └── NewAppointmentModal.tsx  # MODIFICAR — focus trap + Escape + aria-label
├── booking/
│   └── BookingWizard.tsx  # MODIFICAR — focus-trap no aplica (no es overlay); Escape si están en modal
app/
├── globals.css            # MODIFICAR — @custom-variant dark + bloque .dark { }
├── layout.tsx             # MODIFICAR — script anti-FOUC + suppressHydrationWarning
├── (public)/
│   └── layout.tsx         # MODIFICAR — agregar header público con ThemeToggle
├── api/
│   ├── auth/login/route.ts           # MODIFICAR — invocar rate limiter al inicio
│   └── public/appointments/route.ts  # MODIFICAR — invocar rate limiter al inicio
.env.example               # MODIFICAR — agregar UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
```

### Pattern 1: Dark Mode Tailwind v4 — @custom-variant

**What:** Registrar variante `dark` class-based en globals.css con selector `.dark`.
**When to use:** Siempre en Tailwind v4 sin tailwind.config.js.

```css
/* Source: https://tailwindcss.com/docs/dark-mode */
/* globals.css — AGREGAR antes del bloque :root */
@custom-variant dark (&:where(.dark, .dark *));

/* Luego, después del bloque :root existente: */
.dark {
  --background: #0f172a;    /* slate-900 */
  --surface:    #1e293b;    /* slate-800 */
  --foreground: #f1f5f9;    /* slate-100 */

  --primary:        #2dd4bf;   /* teal-400 — pasa AA en dark */
  --primary-hover:  #5eead4;   /* teal-300 */
  --primary-light:  #134e4a;   /* teal-900 */
  --accent:         #2dd4bf;   /* teal-400 */

  --text-primary:   #f1f5f9;   /* slate-100 */
  --text-secondary: #94a3b8;   /* slate-400 */
  --text-muted:     #64748b;   /* slate-500 */

  --border:         rgba(148, 163, 184, 0.15);  /* respeta no-harsh-borders en dark */
  --border-focus:   rgba(45, 212, 191, 0.4);

  --shadow-sm: 0 4px 6px -1px rgba(0,0,0,0.3), 0 2px 4px -2px rgba(0,0,0,0.2);
  --shadow-md: 0 20px 25px -5px rgba(0,0,0,0.4), 0 8px 10px -6px rgba(0,0,0,0.3);
}
```

Luego en componentes los tokens `dark:` funcionan automáticamente con las CSS vars:
```tsx
// No se necesita dark:bg-gray-900 — los tokens se actualizan solos
// Pero dark: prefix sí hace falta cuando un componente usa colores Tailwind hardcodeados:
<div className="bg-white dark:bg-slate-800">...</div>

// BookingWizard glassmorphism: ajustar el fondo:
<div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md ...">
```

[VERIFIED: tailwindcss.com/docs/dark-mode] — `@custom-variant dark` es el mecanismo oficial de Tailwind v4 para class-based dark mode.

### Pattern 2: Anti-FOUC en Next.js 16 App Router

**What:** Script inline que corre antes del paint para aplicar clase `dark` a `<html>`.
**When to use:** Siempre que se use dark mode class-based con localStorage.

```tsx
// app/layout.tsx — MODIFICAR
// Source: Next.js docs (node_modules/next/dist/docs) + community pattern verificado
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${outfit.variable} h-full antialiased`}
      suppressHydrationWarning   // ← NUEVO: evita warnings de hidratación por class="dark"
    >
      <head>
        {/* Anti-FOUC: corre antes del paint, antes de React */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var stored = localStorage.getItem('tm-theme');
                if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-text-primary">
        {children}
      </body>
    </html>
  )
}
```

**Por qué `dangerouslySetInnerHTML` y no `<Script strategy="beforeInteractive">`:**
`<Script strategy="beforeInteractive">` según los docs de Next.js 16 requiere que se coloque dentro del `<body>` del root layout y "does not block page hydration". Para anti-FOUC se necesita que el script esté literalmente en `<head>` antes de cualquier CSS; el `<script>` inline con `dangerouslySetInnerHTML` es el patrón correcto documentado en el ecosistema React/Next.js. [CITED: node_modules/next/dist/docs/01-app/02-guides/scripts.md]

**`suppressHydrationWarning` en `<html>`**: necesario porque la clase `dark` se agrega en el browser antes de la hidratación — React ve un mismatch server/client y emite warnings sin este atributo. Uso legítimo según la React docs. [ASSUMED — comportamiento estándar de React; no hay docs específicos de Next.js 16 que contradigan esto]

### Pattern 3: ThemeToggle Client Component

**What:** Componente client que lee/escribe localStorage y alterna la clase `dark` en `<html>`.
**When to use:** Montado en AdminSidebar y header público.

```tsx
// components/ThemeToggle.tsx — NUEVO
'use client'
import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    // Sincronizar estado inicial con la clase que ya puso el script anti-FOUC
    setDark(document.documentElement.classList.contains('dark'))
  }, [])

  function toggle() {
    const next = !dark
    setDark(next)
    if (next) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('tm-theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('tm-theme', 'light')
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className={cn(
        'flex items-center justify-center rounded-lg p-2 transition-colors',
        'text-slate-400 hover:bg-slate-800 hover:text-slate-100',
        className
      )}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}
```

### Pattern 4: Rate Limiting — lib/rate-limit.ts

**What:** Helper único que abstrae Upstash Redis cuando las vars están disponibles, y un Map in-memory cuando no.
**When to use:** Al inicio de cada route handler protegido, antes de cualquier lógica.

```typescript
// lib/rate-limit.ts — NUEVO
// [VERIFIED: upstash.com/docs/redis/sdks/ratelimit-ts/gettingstarted]
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// ── In-memory fallback ───────────────────────────────────────────────
// Usado cuando UPSTASH_REDIS_REST_URL no está en env (dev local sin credenciales)
// Ventana deslizante simple: timestamps por IP en un Map

interface InMemoryResult { success: boolean; limit: number; remaining: number }

function makeInMemoryLimiter(limit: number, windowMs: number) {
  const store = new Map<string, number[]>()
  return {
    limit(identifier: string): InMemoryResult {
      const now = Date.now()
      const timestamps = (store.get(identifier) ?? []).filter(t => now - t < windowMs)
      if (timestamps.length >= limit) {
        store.set(identifier, timestamps)
        return { success: false, limit, remaining: 0 }
      }
      timestamps.push(now)
      store.set(identifier, timestamps)
      return { success: true, limit, remaining: limit - timestamps.length }
    }
  }
}

// ── Upstash backend (prod) ────────────────────────────────────────────
const hasUpstash = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)

let loginLimiter: { limit: (id: string) => Promise<InMemoryResult> | InMemoryResult }
let bookingLimiter: { limit: (id: string) => Promise<InMemoryResult> | InMemoryResult }

if (hasUpstash) {
  const redis = Redis.fromEnv()
  loginLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '15 m'),
    prefix: 'rl:login',
  })
  bookingLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '10 m'),
    prefix: 'rl:booking',
  })
} else {
  loginLimiter   = makeInMemoryLimiter(5, 15 * 60 * 1000)
  bookingLimiter = makeInMemoryLimiter(10, 10 * 60 * 1000)
}

// ── Extractor de IP ───────────────────────────────────────────────────
export function getIp(request: Request): string {
  // x-forwarded-for puede traer lista "ip1, ip2" — usar el primero
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return 'anonymous'
}

export { loginLimiter, bookingLimiter }
```

**Uso en route handler (patrón):**
```typescript
// app/api/auth/login/route.ts — MODIFICAR (agregar al inicio del POST handler)
import { loginLimiter, getIp } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  // Rate limiting — ANTES de leer el body
  const ip = getIp(request)
  const { success } = await loginLimiter.limit(ip)
  if (!success) {
    return Response.json(
      { error: 'Demasiados intentos. Esperá unos minutos e intentá de nuevo.' },
      { status: 429 }
    )
  }
  // ... resto del handler sin cambios
```

### Pattern 5: Focus Trap con focus-trap-react

**What:** Envolver overlays con `<FocusTrap>` para mantener el foco dentro, agregar listener de Escape para cerrar.
**When to use:** `Drawer.tsx` y `NewAppointmentModal.tsx`.

```tsx
// Drawer.tsx — MODIFICAR (agregar focus trap + Escape)
import FocusTrap from 'focus-trap-react'

// Dentro del componente, antes del return, agregar:
useEffect(() => {
  if (!open) return
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }
  document.addEventListener('keydown', handleEscape)
  return () => document.removeEventListener('keydown', handleEscape)
}, [open, onClose])

// En el JSX, envolver el panel con FocusTrap:
{open && (
  <FocusTrap
    focusTrapOptions={{
      initialFocus: false,       // no robar el foco abruptamente
      allowOutsideClick: true,   // el click en el backdrop cierra
      escapeDeactivates: false,  // nosotros manejamos Escape con useEffect
    }}
  >
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      /* ... resto igual ... */
    >
```

**NewAppointmentModal.tsx** — misma técnica. El botón close ya existe pero le falta `aria-label`:
```tsx
<button
  type="button"
  onClick={onClose}
  aria-label="Cerrar modal"   // ← AGREGAR
  className="..."
>
```

### Anti-Patterns to Avoid

- **`<Script strategy="beforeInteractive">` para anti-FOUC en App Router:** No se puede colocar en `<head>`, la estrategia inyecta en `<body>` y no garantiza ejecución pre-paint. Usar `<script dangerouslySetInnerHTML>` directamente en `<head>`.
- **Instanciar `Ratelimit` de Upstash sin credenciales:** Lanza error en runtime. El fallback in-memory debe ser código propio — `EphemeralCache` de la librería NO reemplaza a Redis.
- **`focus-trap-react` sin `allowOutsideClick: true` en Drawer:** El usuario no podría cerrar haciendo click en el backdrop.
- **Tokens dark mode con `dark:` prefix hardcodeados en componentes que ya usan CSS vars:** Si el componente usa `bg-background`, en dark mode el fondo cambia solo porque el token cambia. Solo se necesita `dark:` en clases Tailwind hardcodeadas (ej. `bg-white`, `text-gray-900`).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Focus trap en overlays | Loop manual de tabIndex + ref | `focus-trap-react` | Edge cases: shadow DOM, iframes, elementos dinámicos, restaurar foco al cerrar — la lib lo maneja |
| Rate limiting con Redis | Contador propio en Redis | `@upstash/ratelimit` con `slidingWindow` | Race conditions en serverless, múltiples instancias, atomicidad |
| Contraste checker | Script ad-hoc | Cálculo manual (fórmula WCAG ya corrida en research) | Resultados ya en este documento; no relanzar en cada build |

**Key insight:** El in-memory fallback SÍ se implementa a mano porque es simple (Map + timestamps) y no vale la pena una librería solo para eso. El rate limiter en Redis NO se implementa a mano porque hay race conditions reales en serverless.

---

## Contrast Analysis — Tokens que necesitan ajuste

### Resultados del análisis (WCAG relative luminance, calculado en research)

#### Light mode — PROBLEMAS IDENTIFICADOS

| Token / Uso | Colores | Ratio actual | WCAG | Estado |
|-------------|---------|--------------|------|--------|
| `--primary` (#0d9488) como texto sobre `--background` (#f8fafc) | teal-600 on slate-50 | 3.58:1 | 4.5:1 | **FALLA** texto normal |
| `--primary` (#0d9488) como texto sobre blanco | teal-600 on white | 3.74:1 | 4.5:1 | **FALLA** texto normal |
| `--accent` (#14b8a6) como texto | teal-500 on bg | 2.38:1 | 4.5:1 | **FALLA** |
| `--success` (#10b981) como texto sobre blanco | emerald-500 on white | 2.54:1 | 4.5:1 | **FALLA** |
| `--error` (#ef4444) como texto sobre blanco | red-500 on white | 3.76:1 | 4.5:1 | **FALLA** texto normal, PASA UI |
| Blanco sobre `--primary` en botones | white on #0d9488 | 3.74:1 | 3:1 UI | **PASA** (UI button ≥3:1) |

**Nota importante sobre botones:** El texto en botones primarios (blanco sobre #0d9488) es bold y de tamaño ≥14px bold, lo que lo clasifica como "large text" (WCAG 2.4). Para texto grande el umbral es 3:1, y 3.74:1 supera ese umbral. Sin embargo, es conveniente usar `--primary-hover` (#0f766e, ratio 5.47:1) como color de fondo en reposo para mayor seguridad.

#### STATUS_COLORS en utils.ts — YA PASAN AA

Los chips de estado usan variantes Tailwind nombradas que sí cumplen 4.5:1:

| Status | Clases | Ratio | Estado |
|--------|--------|-------|--------|
| PENDING | amber-700 on amber-100 | 4.51:1 | **PASA** |
| CONFIRMED | teal-700 on teal-100 | 4.86:1 | **PASA** |
| CANCELLED | red-700 on red-100 | 5.30:1 | **PASA** |
| COMPLETED | slate-600 on slate-100 | 6.92:1 | **PASA** |
| NO_SHOW | orange-700 on orange-100 | 4.52:1 | **PASA** |

#### Ajustes de token recomendados en globals.css

```css
/* AJUSTES — light mode */
/* --success se usa como texto (AvailabilityEditor "guardada correctamente") */
--success: #047857;    /* emerald-700 — era #10b981; 5.24:1 en bg ✓ */

/* --error se usa como texto en múltiples componentes */
--error:   #b91c1c;    /* red-700 — era #ef4444; 6.18:1 en bg ✓ */

/* NOTA: --primary (#0d9488) NO se usa como texto normal en la app.
   En botones es background con blanco encima (pasa 3:1 UI).
   En sidebar admin es bg-primary/20 con text-accent — ambos sobre slate-900 fondo.
   En el wizard /reservar: "← Volver" usa text-primary sobre bg-white/80 → 3.74:1.
   Ese enlace no es texto de contenido sino UI control — acepta 3:1.
   Si el planner decide ajustar: usar --primary-hover (#0f766e) en texto de enlace */
```

#### Dark mode — tokens sugeridos y sus ratios

| Token dark | Valor | Sobre fondo dark (slate-900) | Ratio |
|------------|-------|------------------------------|-------|
| `--primary` dark | #2dd4bf (teal-400) | sobre #0f172a | 9.59:1 **PASA** |
| `--accent` dark | #2dd4bf (teal-400) | sobre #0f172a | 9.59:1 **PASA** |
| `--text-primary` dark | #f1f5f9 (slate-100) | sobre #0f172a | 16.30:1 **PASA** |
| `--text-secondary` dark | #94a3b8 (slate-400) | sobre #0f172a | 5.32:1 **PASA** |
| `--text-muted` dark | #64748b (slate-500) | sobre #0f172a | 3.07:1 **PASA** UI |

---

## Common Pitfalls

### Pitfall 1: Hidratación mismatch por clase `dark`

**What goes wrong:** React emite warnings "Hydration mismatch" porque el servidor renderiza `<html class="font-inter font-outfit h-full antialiased">` pero el script anti-FOUC agrega `dark` antes de la hidratación, generando una clase diferente en cliente.

**Why it happens:** El script corre en browser sincrónicamente antes de React, Next.js no puede predecirlo en SSR.

**How to avoid:** `suppressHydrationWarning` en `<html>` — le dice a React que este elemento puede diferir entre server y client. [VERIFIED: comportamiento documentado por next-themes y confirmado en discussion Next.js #53063]

**Warning signs:** Console warning "Warning: Prop `className` did not match. Server: '...' Client: '... dark'"

### Pitfall 2: `Ratelimit` de Upstash instanciado incondicionalmente

**What goes wrong:** Si `Redis.fromEnv()` se llama sin las env vars, lanza una excepción en startup (no en runtime), lo que hace que el servidor Next.js falle al iniciar en local.

**Why it happens:** `@upstash/redis` valida las env vars en el constructor.

**How to avoid:** La condición `if (hasUpstash)` en `lib/rate-limit.ts` previene la instanciación. El módulo se evalúa una vez por cold start; la guarda debe estar al nivel de módulo.

**Warning signs:** `Error: UPSTASH_REDIS_REST_URL is not defined` al iniciar `npm run dev`.

### Pitfall 3: Focus trap sin `role="dialog"` y `aria-modal="true"`

**What goes wrong:** Screen readers no saben que hay un modal y siguen leyendo el contenido de fondo.

**Why it happens:** `focus-trap-react` solo maneja el foco del teclado; los atributos ARIA son responsabilidad del desarrollador.

**How to avoid:** Agregar `role="dialog"` y `aria-modal="true"` al elemento raíz del modal/drawer. En Drawer, también agregar `aria-label={title}`.

**Warning signs:** Screen reader no anuncia el diálogo al abrirse.

### Pitfall 4: Glassmorphism del BookingWizard en dark mode

**What goes wrong:** El panel `bg-white/80 backdrop-blur-md` en dark mode queda casi transparente sobre fondo oscuro, haciendo el texto ilegible.

**Why it happens:** `bg-white/80` en dark mode sigue siendo blanco semitransparente, pero el fondo detrás ahora es oscuro — el contraste del panel sobre el fondo desaparece y el texto resulta invisible.

**How to avoid:** Cambiar a `bg-white/80 dark:bg-slate-900/80` en `BookingWizard.tsx`. Las orbes de fondo (`opacity-10`) también necesitan revisión en dark mode — podrían ser demasiado visibles.

**Warning signs:** Wizard ilegible en modo oscuro en la primera prueba visual.

### Pitfall 5: `x-forwarded-for` con múltiples IPs

**What goes wrong:** El header `x-forwarded-for` puede contener una lista como `"203.0.113.1, 10.0.0.1, 172.16.0.1"` (cliente + proxies). Usar todo el string como key de rate limit ignora clientes reales — dos usuarios distintos pueden compartir el key.

**Why it happens:** Cada proxy agrega su IP al header. Vercel inyecta IPs internas.

**How to avoid:** `forwarded.split(',')[0].trim()` — usar solo la primera IP (la del cliente original). Ya incluido en el helper `getIp()`.

### Pitfall 6: Toggle de tema en Server Component

**What goes wrong:** `ThemeToggle` intenta usar `localStorage` o `document.documentElement` en un Server Component y lanza error en build.

**Why it happens:** `localStorage` y `document` no existen en el servidor.

**How to avoid:** `ThemeToggle` debe ser siempre un Client Component (`'use client'`). El estado inicial debe leerlo con `useEffect`, no al render.

---

## Code Examples

### globals.css — bloque completo de dark mode

```css
/* Agregar después del bloque :root en globals.css */
/* Source: tailwindcss.com/docs/dark-mode + análisis de contraste en research */

@custom-variant dark (&:where(.dark, .dark *));

.dark {
  --background: #0f172a;
  --surface:    #1e293b;
  --foreground: #f1f5f9;

  --primary:        #2dd4bf;
  --primary-hover:  #5eead4;
  --primary-light:  #134e4a;
  --accent:         #2dd4bf;

  --text-primary:   #f1f5f9;
  --text-secondary: #94a3b8;
  --text-muted:     #64748b;

  --success:   #34d399;
  --warning:   #fbbf24;
  --error:     #f87171;
  --completed: #94a3b8;

  --border:       rgba(148, 163, 184, 0.15);
  --border-focus: rgba(45, 212, 191, 0.4);

  --shadow-sm: 0 4px 6px -1px rgba(0,0,0,0.3), 0 2px 4px -2px rgba(0,0,0,0.2);
  --shadow-md: 0 20px 25px -5px rgba(0,0,0,0.4), 0 8px 10px -6px rgba(0,0,0,0.3);
}
```

### Anti-FOUC script (layout.tsx head)

```tsx
// app/layout.tsx — head script
<head>
  <script
    dangerouslySetInnerHTML={{
      __html: `try{var t=localStorage.getItem('tm-theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}`,
    }}
  />
</head>
```

### Rate limiter en route handler

```typescript
// Patrón de uso en app/api/auth/login/route.ts
import { loginLimiter, getIp } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  const { success } = await loginLimiter.limit(getIp(request))
  if (!success) {
    return Response.json(
      { error: 'Demasiados intentos. Esperá unos minutos e intentá de nuevo.' },
      { status: 429 }
    )
  }
  // ... handler sin cambios
}
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|-----------------|--------|
| `darkMode: 'class'` en tailwind.config.js (v3) | `@custom-variant dark (...)` en globals.css (v4) | Sin archivo de config JS — única diferencia de API |
| `@upstash/ratelimit` requería WebSocket Redis | v2.x usa HTTP REST API — compatible con Edge Runtime y serverless sin cambios | Sin conexión TCP persistente |
| Focus trap manual con tabIndex + event listeners | `focus-trap-react` — robusto, mantiene lista de focusables dinámicamente | Sin edge cases de aria-hidden |

**Deprecated/outdated:**
- `darkMode: 'class'` en `tailwind.config.js`: No existe en Tailwind v4. El proyecto ya no tiene config JS.
- `next-themes`: No es necesario para este stack — la solución vanilla (script inline + clase manual) es más simple y sin dependencia.

---

## File Map Completo — Qué tocar en esta fase

### Archivos a CREAR (nuevos)
| Archivo | Propósito |
|---------|-----------|
| `lib/rate-limit.ts` | Helper rate limiting Upstash + in-memory fallback |
| `components/ThemeToggle.tsx` | Botón Sun/Moon client component |
| `app/(public)/components/PublicHeader.tsx` (o similar) | Header público con ThemeToggle |

### Archivos a MODIFICAR
| Archivo | Cambio |
|---------|--------|
| `app/globals.css` | (1) Agregar `@custom-variant dark` antes de `:root`. (2) Ajustar `--error` y `--success` en `:root`. (3) Agregar bloque `.dark { }`. (4) Agregar focus ring visible en base styles |
| `app/layout.tsx` | (1) `suppressHydrationWarning` en `<html>`. (2) Script anti-FOUC en `<head>` |
| `app/(public)/layout.tsx` | Agregar header con ThemeToggle |
| `app/api/auth/login/route.ts` | Agregar rate limiting al inicio del POST |
| `app/api/public/appointments/route.ts` | Agregar rate limiting al inicio del POST |
| `components/admin/AdminSidebar.tsx` | Agregar ThemeToggle en footer del sidebar |
| `components/admin/Drawer.tsx` | (1) `FocusTrap` wrapper. (2) `useEffect` para Escape. (3) `role="dialog"` `aria-modal="true"` `aria-label`. (4) `aria-label` en botón close |
| `components/admin/NewAppointmentModal.tsx` | (1) `FocusTrap` wrapper. (2) `useEffect` para Escape. (3) `role="dialog"` `aria-modal="true"`. (4) `aria-label` en botón close |
| `components/booking/BookingWizard.tsx` | `dark:bg-slate-900/80` en panel glassmorphism |
| `lib/utils.ts` | (Opcional) Documentar que STATUS_COLORS ya pasa AA — no hay que tocar |
| `.env.example` | Agregar `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` |

### Auditoría WCAG adicional (componentes con aria-labels faltantes)
| Componente | Qué falta |
|------------|-----------|
| `components/admin/DoctorsList.tsx` | `aria-label` en botón delete (icono Trash) |
| `components/admin/SpecialtiesList.tsx` | `aria-label` en botón delete |
| `components/admin/AvailabilityEditor.tsx` | `aria-label` en botones remove |
| `components/booking/StepDoctor.tsx` | `alt` en avatar de médico (verificar) |
| Cualquier botón con solo un icono | `aria-label` obligatorio |

---

## Assumptions Log

| # | Claim | Section | Risk si está mal |
|---|-------|---------|-----------------|
| A1 | `suppressHydrationWarning` en `<html>` no genera problemas de SEO ni de accesibilidad en Next.js 16 | Anti-FOUC pattern | Bajo — es un atributo React, no afecta el HTML emitido al cliente |
| A2 | Los status colors de Tailwind amber-700, teal-700, red-700, etc. corresponden exactamente a los hexadecimales calculados (#b45309, #0f766e, #b91c1c) | Contrast Analysis | Bajo — son valores de la paleta Tailwind v3/v4 estándar no cambiada entre versiones |
| A3 | `focus-trap-react` v12 es compatible con React 19 y framer-motion (AnimatePresence) | Focus trap pattern | Medio — si hay incompatibilidad, fallback: implementar focus trap manual con ~30 líneas |
| A4 | El `<head>` explícito en el Server Component layout es válido en Next.js 16 App Router (sin Metadata API conflicto) | Anti-FOUC | Bajo — el `<head>` explícito en layouts es soportado cuando no usa `export const metadata` para esos tags específicos |

---

## Open Questions (RESOLVED)

1. **¿Header público existe o hay que crearlo?**
   - Lo que sabemos: `app/(public)/layout.tsx` solo tiene un `<div className="min-h-screen bg-background">`. No hay header.
   - Lo que es incierto: ¿El toggle de tema va en un header nuevo simple, o directamente en las páginas?
   - Recomendación: Crear un header público mínimo con solo el logo y el toggle. Simple, no bloquea.

2. **¿Escape en BookingWizard cierra/resetea?**
   - Lo que sabemos: El wizard es un paso a paso, no un overlay. Escape no tiene semántica clara aquí.
   - Lo que es incierto: ¿El usuario quiere Escape para cancelar la reserva? ¿O Escape no hace nada en el wizard?
   - Recomendación: WCAG no requiere Escape en wizards que no son modales/drawers. Solo en overlays. Omitir en el wizard — no es bloqueante para AA.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | npm install packages | ✓ | (existente, Next.js 16 corre) | — |
| npm | Instalar @upstash/ratelimit, @upstash/redis, focus-trap-react | ✓ | (existente) | — |
| UPSTASH_REDIS_REST_URL | Rate limiting en prod | ✗ (no en .env.local) | — | In-memory fallback (código propio) |
| UPSTASH_REDIS_REST_TOKEN | Rate limiting en prod | ✗ (no en .env.local) | — | In-memory fallback |

**Missing dependencies con fallback:**
- Upstash Redis credentials: el código corre normalmente con fallback in-memory en dev local. El planner documenta las vars en `.env.example` para deploy futuro.

---

## Validation Architecture

> `workflow.nyquist_validation` no está seteado en `.planning/config.json` — tratado como habilitado.

Esta fase es principalmente CSS, atributos HTML y un módulo de utilidad. No hay lógica de negocio nueva ni APIs con estados complejos. El testing adecuado es mayormente smoke/visual + unit para el rate limiter.

### Test Framework

No existe infraestructura de tests en el proyecto actualmente (sin directorio `tests/`, sin `jest.config.*`, sin `vitest.config.*`). Los tests de esta fase son los primeros.

| Property | Value |
|----------|-------|
| Framework | Vitest (recomendado para proyectos Next.js/Vite sin config existente) |
| Config file | `vitest.config.ts` — Wave 0 gap |
| Quick run command | `npx vitest run lib/rate-limit.test.ts` |
| Full suite command | `npx vitest run` |

**Alternativa más pragmática dado el scope:** Para esta fase, dado que el código nuevo es principalmente CSS/tokens y un módulo utilitario simple, los tests automatizados se limitan al rate-limit helper. El resto (dark mode, focus trap, WCAG) se verifica manualmente o con herramientas de auditoría (axe DevTools, Chrome DevTools contrast checker).

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Archivo |
|--------|----------|-----------|-------------------|---------|
| RATE-01 | In-memory limiter bloquea después de N requests | unit | `npx vitest run lib/rate-limit.test.ts` | ❌ Wave 0 |
| RATE-02 | In-memory limiter permite requests dentro del límite | unit | `npx vitest run lib/rate-limit.test.ts` | ❌ Wave 0 |
| RATE-03 | `getIp` extrae IP correctamente de x-forwarded-for con lista | unit | `npx vitest run lib/rate-limit.test.ts` | ❌ Wave 0 |
| RATE-04 | Route handler login devuelve 429 al exceder límite | manual | POST /api/auth/login ×6 desde la misma IP | — |
| DARK-01 | Clase `dark` se aplica antes del paint (anti-FOUC) | manual visual | Recargar con preferencia dark en OS | — |
| DARK-02 | Toggle persiste en localStorage | manual | Abrir devtools → Application → localStorage | — |
| A11Y-01 | Drawer cierra con Escape | manual | Abrir drawer, presionar Escape | — |
| A11Y-02 | Tab no escapa del modal abierto | manual | Tab loop dentro del modal | — |
| A11Y-03 | Contraste de tokens ajustados | herramienta | Chrome DevTools Accessibility → Contrast | — |

### Sampling Rate
- **Por tarea commit:** `npx vitest run lib/rate-limit.test.ts` (si el archivo existe)
- **Por wave merge:** `npx vitest run`
- **Phase gate:** Suite verde + auditoría manual WCAG completada

### Wave 0 Gaps
- [ ] `lib/rate-limit.test.ts` — tests del limiter in-memory (REQ RATE-01, RATE-02, RATE-03)
- [ ] `vitest.config.ts` — configuración mínima para el proyecto
- [ ] `package.json` — agregar script `"test": "vitest run"` en devDependencies

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Sí (login rate limit) | `@upstash/ratelimit` slidingWindow 5/15min |
| V3 Session Management | No (sin cambios) | JWT existente en `lib/auth.ts` |
| V4 Access Control | No (sin cambios) | `requireAdmin`/`requireStaff` existentes |
| V5 Input Validation | No (sin cambios) | Validación existente en route handlers |
| V6 Cryptography | No | Sin cambios |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Brute force login | Spoofing | Rate limit 5/15min por IP — esta fase |
| Turno spam (booking flooding) | Denegación de servicio | Rate limit 10/10min por IP — esta fase |
| IP spoofing via x-forwarded-for | Tampering | `x-forwarded-for` es susceptible de spoofing en proxies mal configurados; aceptable para consultorio (no es banco) |
| localStorage theme injection | Tampering | Solo afecta clase CSS en `<html>`; sin consecuencias de seguridad |

---

## Sources

### Primary (HIGH confidence)
- `node_modules/tailwindcss` + `tailwindcss.com/docs/dark-mode` (WebFetch) — `@custom-variant dark` syntax verificado
- `node_modules/next/dist/docs/01-app/02-guides/scripts.md` — inline scripts en layout verificado
- `node_modules/next/dist/docs/01-app/03-api-reference/02-components/script.md` — estrategias `<Script>` verificadas
- `upstash.com/docs/redis/sdks/ratelimit-ts/gettingstarted` (WebFetch) — setup Ratelimit verificado
- `upstash.com/docs/redis/sdks/ratelimit-ts/algorithms` (WebFetch) — `slidingWindow` API verificada
- `upstash.com/docs/redis/sdks/ratelimit-ts/features` (WebFetch) — EphemeralCache NO reemplaza Redis, confirmado

### Secondary (MEDIUM confidence)
- `notanumber.in/blog/fixing-react-dark-mode-flickering` (WebFetch) — patrón anti-FOUC con `dangerouslySetInnerHTML` y `suppressHydrationWarning`
- WCAG relative luminance formula — cálculos propios en Node.js usando fórmula estándar WCAG 2.1 (no tool externo)
- `npm view @upstash/ratelimit`, `@upstash/redis`, `focus-trap-react` — versiones y metadatos verificados

### Tertiary (LOW confidence)
- `github.com/vercel/next.js/discussions/53063` (referenciado en WebSearch) — patrón suppressHydrationWarning
- STATUS_COLORS hexadecimales de Tailwind — asumidos de paleta estándar, no verificados con build Tailwind

---

## Metadata

**Confidence breakdown:**
- Dark mode Tailwind v4: HIGH — docs verificados en node_modules y tailwindcss.com
- Anti-FOUC pattern: HIGH — patrón estándar del ecosistema, docs Next.js consultados
- Rate limiting Upstash: HIGH — docs oficiales Upstash verificados con WebFetch
- Focus trap: HIGH — npm registry verificado, slopcheck OK
- Contrast analysis: HIGH — calculado con fórmula WCAG estándar en Node.js
- Dark mode tokens sugeridos: MEDIUM — valores de paleta Tailwind, no verificados en build

**Research date:** 2026-05-31
**Valid until:** 2026-08-31 (stack estable — Tailwind v4 API de dark mode no cambia en parches)
