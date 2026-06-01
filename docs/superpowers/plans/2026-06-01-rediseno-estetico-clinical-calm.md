# Rediseño estético "Clinical Calm" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Elevar toda la UI (login + wizard `/reservar` + panel admin) a nivel health-SaaS premium con la dirección "Clinical Calm", dejando modo claro y oscuro impecables y sin colores hardcodeados.

**Architecture:** El sistema es token-driven (variables CSS en `app/globals.css`, mapeadas a Tailwind v4 vía `@theme inline`, dark mode con clase `.dark`). Se reescribe la fundación de tokens (cascadea a todo) y luego se des-hardcodean los componentes reemplazando colores fijos por tokens semánticos, afinando el tratamiento visual por zona.

**Tech Stack:** Next.js 16 (App Router) · React 19 · Tailwind CSS v4 (`@theme inline`) · framer-motion · lucide-react · Outfit + Inter (next/font).

**Verificación:** No hay tests automáticos de estética. Cada tarea verifica con (a) `git grep` de patrones hardcodeados = 0 en el archivo tocado, y (b) inspección visual en `localhost:3000` en **modo claro y oscuro** (toggle en header/sidebar). El screenshot del preview MCP se cuelga en Windows → usar `preview_inspect`/DOM o pedir al usuario una mirada. Correr `npm run lint` y `npm run build` al final.

**Spec de referencia:** `docs/superpowers/specs/2026-06-01-rediseno-estetico-clinical-calm-design.md`

---

## Tabla maestra de mapeo de tokens

Esta tabla aplica en TODAS las tareas de des-hardcodeo. Reemplazar la clase fija por el token semántico:

| Hardcodeado | Token semántico |
|---|---|
| `bg-white`, `bg-white/80` | `bg-surface` (mantener `/80` si es glass: `bg-surface/80`) |
| `bg-slate-50`, `bg-gray-50` | `bg-background` |
| `bg-slate-100`, `bg-gray-100` | `bg-background` o chip: ver status |
| `text-slate-900`, `text-gray-900` | `text-text-primary` |
| `text-slate-700/600/500`, `text-gray-*` | `text-text-secondary` |
| `text-slate-400`, `text-gray-400` | `text-text-muted` |
| `border-slate-200`, `border-gray-200` | `border-border` |
| `hover:bg-slate-800`, `hover:bg-slate-100` | `hover:bg-primary-light` (acciones) o `hover:bg-background` (neutras) |
| `text-teal-*`, `bg-teal-*` (acento) | `text-primary` / `bg-primary` / `bg-primary-light` |
| `bg-red-50`, `text-red-700` (error) | `bg-error/10`, `text-error` |

Estados (Confirmado/Pendiente/etc.) NO usan esta tabla: usan los tokens de estado definidos en la Task 2.

---

## Task 1: Fundación de tokens — reescribir `app/globals.css`

**Files:**
- Modify: `app/globals.css` (reemplazo completo)

- [ ] **Step 1: Reemplazar el contenido completo de `app/globals.css` por:**

```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

/* ─── Design Tokens — modo claro ────────────────────────────────── */
:root {
  /* Canvas */
  --background: #f8fafc;
  --surface:    #ffffff;
  --foreground: #0f172a;

  /* Brand */
  --primary:        #0d9488;
  --primary-hover:  #0f766e;
  --primary-light:  #ccfbf1;
  --accent:         #14b8a6;

  /* Text */
  --text-primary:   #0f172a;
  --text-secondary: #64748b;
  --text-muted:     #94a3b8;

  /* Status (fg = texto/borde, bg = fondo tonal del chip) */
  --status-confirmed:    #0f766e;
  --status-confirmed-bg: #ccfbf1;
  --status-pending:      #b45309;
  --status-pending-bg:   #fef3c7;
  --status-completed:    #475569;
  --status-completed-bg: #f1f5f9;
  --status-cancelled:    #b91c1c;
  --status-cancelled-bg: #fee2e2;
  --status-noshow:       #c2410c;
  --status-noshow-bg:    #ffedd5;

  /* Semantic */
  --success: #047857;
  --warning: #b45309;
  --error:   #b91c1c;

  /* Borders (ghost rule — max 40% opacity) */
  --border:       #e2e8f0;
  --border-focus: rgba(13, 148, 136, 0.4);

  /* Elevation — 2 capas con tinte teal */
  --shadow-sm: 0 1px 2px rgba(15,23,42,0.04), 0 12px 28px -16px rgba(13,148,136,0.28);
  --shadow-md: 0 1px 2px rgba(15,23,42,0.05), 0 24px 48px -16px rgba(13,148,136,0.30);

  /* Radius */
  --radius-sm:   10px;
  --radius-md:   14px;
  --radius-lg:   18px;
  --radius-full: 9999px;

  /* Canvas gradient */
  --canvas-gradient: radial-gradient(120% 120% at 100% 0%, #eef6f5 0%, #f8fafc 45%);

  /* Fonts */
  --font-display: var(--font-outfit);
  --font-body:    var(--font-inter);
}

/* ─── Design Tokens — modo oscuro pulido (teal-oscuro cálido) ────── */
.dark {
  --background: #0b1a1a;
  --surface:    #102826;
  --foreground: #e7f4f1;

  --primary:        #2dd4bf;
  --primary-hover:  #5eead4;
  --primary-light:  #134e4a;
  --accent:         #2dd4bf;

  --text-primary:   #e7f4f1;
  --text-secondary: #8fb4af;
  --text-muted:     #5e8b86;

  --status-confirmed:    #5eead4;
  --status-confirmed-bg: rgba(45,212,191,0.16);
  --status-pending:      #fbbf24;
  --status-pending-bg:   rgba(251,191,36,0.15);
  --status-completed:    #8fb4af;
  --status-completed-bg: rgba(143,180,175,0.14);
  --status-cancelled:    #f87171;
  --status-cancelled-bg: rgba(248,113,113,0.15);
  --status-noshow:       #fb923c;
  --status-noshow-bg:    rgba(251,146,60,0.15);

  --success: #34d399;
  --warning: #fbbf24;
  --error:   #f87171;

  --border:       #1e433f;
  --border-focus: rgba(45, 212, 191, 0.4);

  --shadow-sm: 0 1px 2px rgba(0,0,0,0.4), 0 14px 30px -18px rgba(0,0,0,0.6);
  --shadow-md: 0 1px 2px rgba(0,0,0,0.5), 0 28px 56px -18px rgba(0,0,0,0.7);

  --canvas-gradient: radial-gradient(120% 120% at 100% 0%, #11302d 0%, #0b1a1a 55%);
}

/* ─── Tailwind v4 theme map ─────────────────────────────────────── */
@theme inline {
  --color-background:     var(--background);
  --color-surface:        var(--surface);
  --color-foreground:     var(--foreground);
  --color-primary:        var(--primary);
  --color-primary-hover:  var(--primary-hover);
  --color-primary-light:  var(--primary-light);
  --color-accent:         var(--accent);
  --color-text-primary:   var(--text-primary);
  --color-text-secondary: var(--text-secondary);
  --color-text-muted:     var(--text-muted);
  --color-success:        var(--success);
  --color-warning:        var(--warning);
  --color-error:          var(--error);
  --color-border:         var(--border);

  --color-status-confirmed:    var(--status-confirmed);
  --color-status-confirmed-bg: var(--status-confirmed-bg);
  --color-status-pending:      var(--status-pending);
  --color-status-pending-bg:   var(--status-pending-bg);
  --color-status-completed:    var(--status-completed);
  --color-status-completed-bg: var(--status-completed-bg);
  --color-status-cancelled:    var(--status-cancelled);
  --color-status-cancelled-bg: var(--status-cancelled-bg);
  --color-status-noshow:       var(--status-noshow);
  --color-status-noshow-bg:    var(--status-noshow-bg);

  --shadow-card:  var(--shadow-sm);
  --shadow-modal: var(--shadow-md);

  --radius-sm:   var(--radius-sm);
  --radius-md:   var(--radius-md);
  --radius-lg:   var(--radius-lg);
  --radius-full: var(--radius-full);

  --font-display: var(--font-display);
  --font-body:    var(--font-body);
  --font-sans:    var(--font-inter);
}

/* ─── Base ──────────────────────────────────────────────────────── */
body {
  background-color: var(--background);
  background-image: var(--canvas-gradient);
  background-attachment: fixed;
  color: var(--text-primary);
  font-family: var(--font-body), system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-display), system-ui, sans-serif;
  letter-spacing: -0.02em;
}

/* ─── Focus ring global (WCAG AA — teclado visible) ────────────── */
a:focus-visible,
button:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible,
[tabindex]:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: 2px;
}

a:focus:not(:focus-visible),
button:focus:not(:focus-visible),
input:focus:not(:focus-visible),
select:focus:not(:focus-visible),
textarea:focus:not(:focus-visible),
[tabindex]:focus:not(:focus-visible) {
  outline: none;
}

/* ─── Utilidades de marca ───────────────────────────────────────── */
@layer utilities {
  /* Botón primario: degradé vertical + sombra de color */
  .btn-primary {
    background-image: linear-gradient(180deg, var(--accent), var(--primary));
    color: #ffffff;
    box-shadow: 0 6px 16px -6px color-mix(in srgb, var(--primary) 55%, transparent);
  }
  .dark .btn-primary { color: #04211e; }
  .btn-primary:hover { filter: brightness(1.05); }
  .btn-primary:active { filter: brightness(0.97); }
  .btn-primary:disabled { opacity: 0.6; box-shadow: none; cursor: not-allowed; }

  /* Halo de foco para inputs (complementa el focus-visible global) */
  .input-focus:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 22%, transparent);
  }

  /* Hover lift para tarjetas interactivas */
  .card-lift { transition: transform .15s ease, box-shadow .15s ease; }
  .card-lift:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
}

@media (prefers-reduced-motion: reduce) {
  .card-lift { transition: none; }
  .card-lift:hover { transform: none; }
}

/* ─── Scrollbar (thin, branded) ─────────────────────────────────── */
* {
  scrollbar-width: thin;
  scrollbar-color: var(--border) transparent;
}
```

- [ ] **Step 2: Verificar que el dev server compila sin error**

Run: `npm run lint`
Expected: sin errores (warnings de Next sobre middleware son preexistentes, ignorar).

- [ ] **Step 3: Verificación visual rápida**

Abrir `localhost:3000/login`. El fondo debe tener gradiente teal sutil. Alternar dark (no hay toggle en login → setear `localStorage.tm-theme='dark'` y recargar, o probar en `/reservar` que sí tiene toggle): el fondo debe ser teal-oscuro cálido, no gris plano.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "feat(diseño): fundación de tokens Clinical Calm (claro+oscuro, elevación, utilidades)"
```

---

## Task 2: Tokens de estado en `lib/utils.ts`

Hoy `STATUS_COLORS` usa clases fijas (`bg-amber-100 text-amber-700`) que no adaptan al dark. Reemplazar por clases de token de estado.

**Files:**
- Modify: `lib/utils.ts` (constante `STATUS_COLORS`)

- [ ] **Step 1: Reemplazar `STATUS_COLORS` por:**

```ts
export const STATUS_COLORS: Record<string, string> = {
  PENDING:   'bg-status-pending-bg text-status-pending',
  CONFIRMED: 'bg-status-confirmed-bg text-status-confirmed',
  CANCELLED: 'bg-status-cancelled-bg text-status-cancelled',
  COMPLETED: 'bg-status-completed-bg text-status-completed',
  NO_SHOW:   'bg-status-noshow-bg text-status-noshow',
}
```

- [ ] **Step 2: Verificar**

Run: `git grep -n "amber-100\|teal-100\|red-100\|slate-100\|orange-100" lib/utils.ts`
Expected: sin resultados.

- [ ] **Step 3: Commit**

```bash
git add lib/utils.ts
git commit -m "feat(diseño): chips de estado vía tokens (adaptan a dark)"
```

---

## Task 3: ThemeToggle theme-aware

`components/ThemeToggle.tsx` asume fondo oscuro (`text-slate-400 hover:bg-slate-800`). Tokenizar.

**Files:**
- Modify: `components/ThemeToggle.tsx:30-34`

- [ ] **Step 1: Reemplazar el `className` del botón (las 3 líneas slate) por:**

```tsx
        'flex items-center justify-center rounded-lg p-2 transition-colors',
        'text-text-muted hover:bg-primary-light hover:text-primary',
        className
```

- [ ] **Step 2: Verificar**

Run: `git grep -n "slate-" components/ThemeToggle.tsx`
Expected: sin resultados.

- [ ] **Step 3: Verificación visual** — el toggle se ve bien en header claro y en sidebar; hover teal en ambos temas.

- [ ] **Step 4: Commit**

```bash
git add components/ThemeToggle.tsx
git commit -m "feat(diseño): ThemeToggle theme-aware (tokens)"
```

---

## Task 4: Login premium (`app/(auth)/login/page.tsx`)

**Files:**
- Modify: `app/(auth)/login/page.tsx`

- [ ] **Step 1: Aplicar la tabla maestra + tratamiento.** Cambios concretos:
  - Card (línea ~58): `bg-white/80` → `bg-surface/80`. Mantener `backdrop-blur-xl shadow-modal`.
  - Inputs (líneas ~106 y ~126): `bg-white` → `bg-surface`; quitar `focus:ring-2 focus:ring-primary/20` y agregar clase `input-focus` (definida en globals). Texto/placeholder ya usan tokens.
  - Error (línea ~132): `bg-red-50 text-error` → `bg-error/10 text-error`.
  - Botón submit (línea ~141): reemplazar `bg-gradient-to-r from-primary to-accent ... hover:shadow-[...] hover:opacity-90` por la clase `btn-primary` + `w-full rounded-lg py-3 text-sm font-semibold transition-all`.
  - Logo: mantener degradé `from-primary to-accent`.

- [ ] **Step 2: Verificar**

Run: `git grep -n "bg-white\|bg-red-50" "app/(auth)/login/page.tsx"`
Expected: sin resultados.

- [ ] **Step 3: Verificación visual** — `localhost:3000/login` en claro y dark (vía `localStorage.tm-theme`). Card glass legible, inputs con halo teal al focus, botón con degradé y sombra.

- [ ] **Step 4: Commit**

```bash
git add "app/(auth)/login/page.tsx"
git commit -m "feat(diseño): login premium tokenizado (claro+oscuro)"
```

---

## Task 5: Wizard público — header + progreso

**Files:**
- Modify: `components/PublicHeader.tsx`
- Modify: `components/booking/StepProgress.tsx`
- Modify: `components/booking/BookingWizard.tsx`

- [ ] **Step 1: Leer los 3 archivos** (`Read`) para conocer el markup actual antes de editar.

- [ ] **Step 2: PublicHeader** — ya usa tokens (`bg-surface`, `border-border`, `text-text-primary`). Mejora: agregar el ícono de marca (mismo SVG/logo del login en chico) a la izquierda del nombre, dentro de un círculo `bg-gradient-to-br from-primary to-accent` de `h-7 w-7`. Mantener el `ThemeToggle` a la derecha.

- [ ] **Step 3: StepProgress** — aplicar tabla maestra a cualquier `bg-slate-*`/`text-slate-*`. Tratamiento objetivo (según spec §3.4): dots `rounded-full` con número; paso completado/activo `bg-primary text-white` (dark: `text-[#04211e]`); paso futuro `bg-surface text-text-muted` con `ring-1 ring-border`; barra entre dots `bg-primary` (completado) o `bg-border` (pendiente). Animar el avance con framer-motion si ya se usa allí.

- [ ] **Step 4: BookingWizard** — des-hardcodear el único hit (tabla maestra). Asegurar que el contenedor use `bg-surface`/`bg-background` y `rounded-lg`/`shadow-card` coherentes.

- [ ] **Step 5: Verificar**

Run: `git grep -n "bg-white\|slate-\|gray-" components/PublicHeader.tsx components/booking/StepProgress.tsx components/booking/BookingWizard.tsx`
Expected: sin resultados.

- [ ] **Step 6: Verificación visual** — `localhost:3000/reservar` en claro y dark: header con logo, barra de pasos clara y con buen contraste.

- [ ] **Step 7: Commit**

```bash
git add components/PublicHeader.tsx components/booking/StepProgress.tsx components/booking/BookingWizard.tsx
git commit -m "feat(diseño): header con marca + progreso del wizard pulido"
```

---

## Task 6: Wizard público — pasos de selección y formulario

**Files:**
- Modify: `components/booking/StepSpecialty.tsx`
- Modify: `components/booking/StepDoctor.tsx`
- Modify: `components/booking/StepDateTime.tsx`
- Modify: `components/booking/StepPatientForm.tsx`
- Modify: `components/booking/StepConfirmation.tsx`

- [ ] **Step 1: Leer los 5 archivos** para conocer el markup.

- [ ] **Step 2: Aplicar tabla maestra** a los hits de cada archivo (StepSpecialty 2, StepDoctor 2, StepDateTime 4, StepPatientForm 2, StepConfirmation 1).

- [ ] **Step 3: Tratamiento por paso (spec §4.2):**
  - **StepSpecialty / StepDoctor:** tarjetas seleccionables → `bg-surface border border-border rounded-lg p-4 card-lift cursor-pointer`; estado seleccionado → `border-primary ring-2 ring-primary/30 bg-primary-light/40`. Usar el `color` de especialidad solo como punto/acento, no como fondo de toda la tarjeta.
  - **StepDateTime:** grilla de horarios → botones `rounded-md border border-border bg-surface text-text-primary`; seleccionado → `btn-primary`; deshabilitado → `opacity-40`. Buen tamaño táctil (mín. 40px alto).
  - **StepPatientForm:** inputs con `bg-surface border-border` + clase `input-focus`; labels `text-text-secondary text-sm`.
  - **StepConfirmation:** resumen en tarjeta `bg-surface shadow-card rounded-lg`; jerarquía con `font-display` para el título; chip de estado vía `STATUS_COLORS`.

- [ ] **Step 4: Verificar**

Run: `git grep -n "bg-white\|slate-\|gray-\|bg-red-50\|text-teal-\|bg-teal-" components/booking/Step*.tsx`
Expected: sin resultados (los `color` dinámicos de especialidad por `style={{}}` están permitidos).

- [ ] **Step 5: Verificación visual** — recorrer el wizard completo en `/reservar`, claro y dark, en viewport mobile (preview_resize 390px) y desktop.

- [ ] **Step 6: Commit**

```bash
git add components/booking/Step*.tsx
git commit -m "feat(diseño): pasos del wizard (selección, horarios, form, confirmación)"
```

---

## Task 7: Admin — layout, sidebar y dashboard

**Files:**
- Modify: `components/admin/AdminSidebar.tsx` (8 hits)
- Modify: `components/admin/StatCard.tsx` (4 hits)
- Modify: `app/(admin)/layout.tsx` (revisar)
- Modify: `app/(admin)/admin/page.tsx` (revisar)

- [ ] **Step 1: Leer los 4 archivos.**

- [ ] **Step 2: AdminSidebar** — tokenizar los 8 hits con la tabla maestra. Tratamiento: sidebar `bg-surface border-r border-border`; item normal `text-text-secondary hover:bg-primary-light hover:text-primary`; item activo `bg-primary-light text-primary font-medium`. El botón "Cerrar sesión" en rojo de estado (`text-error hover:bg-error/10`). Conservar la lógica del logout (no tocar el `fetch`).

- [ ] **Step 3: StatCard** — reemplazar `STATUS_BORDER` por tokens:

```tsx
const STATUS_BORDER: Record<string, string> = {
  PENDING:   'border-status-pending',
  CONFIRMED: 'border-status-confirmed',
  COMPLETED: 'border-status-completed',
  CANCELLED: 'border-status-cancelled',
}
```

  Y la tarjeta: `bg-surface rounded-lg shadow-card p-6 border-l-4 card-lift`.

- [ ] **Step 4: layout + dashboard page** — aplicar tabla maestra a cualquier `bg-white`/`slate-*`. Grilla de StatCards con `gap` consistente.

- [ ] **Step 5: Verificar**

Run: `git grep -n "bg-white\|slate-\|gray-\|border-teal-\|border-amber-\|border-red-" components/admin/AdminSidebar.tsx components/admin/StatCard.tsx "app/(admin)/layout.tsx" "app/(admin)/admin/page.tsx"`
Expected: sin resultados.

- [ ] **Step 6: Verificación visual** — `localhost:3000/admin` (requiere login: `admin@clinica.com` / `admin123`) en claro y dark. Sidebar con item activo teal, StatCards flotando, toggle funcionando.

- [ ] **Step 7: Commit**

```bash
git add components/admin/AdminSidebar.tsx components/admin/StatCard.tsx "app/(admin)/layout.tsx" "app/(admin)/admin/page.tsx"
git commit -m "feat(diseño): admin layout, sidebar y dashboard tokenizados"
```

---

## Task 8: Admin — listas, formularios, drawer y modal

**Files:**
- Modify: `components/admin/AppointmentsList.tsx` (3 hits)
- Modify: `components/admin/DoctorsList.tsx` (1 hit)
- Modify: `components/admin/DoctorForm.tsx` (2 hits)
- Modify: `components/admin/SpecialtiesList.tsx`
- Modify: `components/admin/SpecialtyForm.tsx` (2 hits)
- Modify: `components/admin/AvailabilityEditor.tsx`
- Modify: `components/admin/TimeOffEditor.tsx`
- Modify: `components/admin/Drawer.tsx`
- Modify: `components/admin/NewAppointmentModal.tsx` (2 hits)

- [ ] **Step 1: Leer los archivos** (se pueden agrupar de a 3-4 lecturas).

- [ ] **Step 2: Aplicar tabla maestra** a todos los hits. Tratamiento transversal:
  - Listas/tablas: filas sobre `bg-surface`, separadores `border-border`, hover `hover:bg-background`.
  - Botones de acción primarios → `btn-primary`; secundarios → `bg-surface border border-border text-text-primary hover:bg-background`; destructivos → `text-error hover:bg-error/10`.
  - Inputs/selects → `bg-surface border-border` + `input-focus`.
  - Chips de estado → `STATUS_COLORS`.
  - **Drawer / NewAppointmentModal:** panel `bg-surface shadow-modal rounded-lg`, overlay `bg-foreground/40 backdrop-blur-sm`. **No tocar** el FocusTrap, Escape, ARIA ni `aria-label` (trabajo de Fase 5 — preservar).

- [ ] **Step 3: Verificar (barrido global de todo admin)**

Run: `git grep -n "bg-white\|slate-\|gray-\|bg-red-50\|bg-amber-1\|bg-teal-1\|border-teal-\|border-amber-\|border-red-4" components/admin/`
Expected: sin resultados.

- [ ] **Step 4: Verificación visual** — recorrer médicos, especialidades, turnos; abrir Drawer y NewAppointmentModal; verificar foco/Escape siguen funcionando; claro y dark.

- [ ] **Step 5: Commit**

```bash
git add components/admin/
git commit -m "feat(diseño): admin listas, formularios, drawer y modal tokenizados"
```

---

## Task 9: Barrido final, build y verificación integral

**Files:** ninguno nuevo (correcciones si aparecen hits).

- [ ] **Step 1: Barrido global de hardcodeo**

Run: `git grep -n "bg-white\|text-slate-\|bg-slate-\|text-gray-\|bg-gray-\|bg-red-50\|bg-amber-100\|bg-teal-100\|border-teal-\|border-amber-\|border-slate-2" -- "*.tsx"`
Expected: sin resultados. Si aparece alguno, corregir con la tabla maestra y commitear.

- [ ] **Step 2: Lint + build**

Run: `npm run lint`
Run: `npm run build`
Expected: build OK, sin errores de tipo/CSS.

- [ ] **Step 3: Verificación visual integral** — las 3 zonas (login, `/reservar` completo, `/admin` completo) en **modo claro y oscuro**, mobile y desktop. Confirmar: cohesión visual, contraste AA, focus ring visible, sin funcionalidad rota.

- [ ] **Step 4: Commit final si hubo correcciones**

```bash
git add -A
git commit -m "fix(diseño): barrido final de hardcodeo + verificación build"
```

---

## Self-Review (completado por el autor del plan)

- **Cobertura del spec:** §2 deuda dark → Tasks 1-9 (des-hardcodeo). §3.1/3.2 tokens → Task 1. §3.3 tipografía → Task 1 (h1-h6). §3.4 componentes → Tasks 1 (utilidades), 5-8. §3.5 movimiento → Task 1 (`card-lift`, reduced-motion). §4.1 login → Task 4. §4.2 wizard → Tasks 5-6. §4.3 admin → Tasks 7-8. §6 verificación → Task 9. ✔ sin huecos.
- **Placeholders:** globals.css y mapeos de estado completos; componentes con mapeos explícitos + tratamiento concreto + grep de verificación (no genéricos). ✔
- **Consistencia de tipos/nombres:** tokens de estado (`status-confirmed`, etc.) definidos en Task 1, consumidos idénticos en Task 2 (`STATUS_COLORS`) y Task 7 (`STATUS_BORDER`). Clases utilitarias (`btn-primary`, `input-focus`, `card-lift`) definidas en Task 1, usadas en Tasks 4-8. ✔
