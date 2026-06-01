---
phase: 05-pulido-y-deploy
plan: "02"
subsystem: dark-mode
status: checkpoint-pending
checkpoint_task: 4
tags: [dark-mode, tailwind-v4, anti-fouc, theme-toggle, accessibility]
dependency_graph:
  requires: []
  provides: [dark-mode-tokens, theme-toggle, anti-fouc, public-header]
  affects: [app/globals.css, app/layout.tsx, components/ThemeToggle.tsx, components/PublicHeader.tsx, components/admin/AdminSidebar.tsx, app/(public)/layout.tsx, components/booking/BookingWizard.tsx]
tech_stack:
  added: []
  patterns: [class-based-dark-mode, anti-fouc-inline-script, client-component-toggle]
key_files:
  created:
    - components/ThemeToggle.tsx
    - components/PublicHeader.tsx
  modified:
    - app/globals.css
    - app/layout.tsx
    - components/admin/AdminSidebar.tsx
    - app/(public)/layout.tsx
    - components/booking/BookingWizard.tsx
decisions:
  - "Usar @custom-variant dark de Tailwind v4 (sin tailwind.config.js)"
  - "Script anti-FOUC con dangerouslySetInnerHTML en <head> (no <Script> de next/script)"
  - "ThemeToggle como Client Component — lee clase dark en useEffect, no en render"
  - "PublicHeader como Server Component que importa ThemeToggle client"
  - "Reducir opacidad de orbes de fondo a dark:opacity-5 para wizard legible"
metrics:
  duration: "~10 min"
  completed_date: "2026-06-01"
  tasks_total: 4
  tasks_completed: 3
  tasks_pending_checkpoint: 1
---

# Phase 05 Plan 02: Dark Mode — Summary (checkpoint-pending)

**One-liner:** Dark mode class-based completo con @custom-variant Tailwind v4, tokens CSS redefinidos bajo .dark, script anti-FOUC en head y toggle Sun/Moon en admin + publico.

## Status

Tasks 1-3 completados y commiteados. Task 4 es un checkpoint de verificacion visual que requiere intervencion humana.

## Tasks Completados

| Task | Nombre | Commit | Archivos |
|------|--------|--------|----------|
| 1 | @custom-variant dark + bloque .dark en globals.css | 52bafc8 | app/globals.css |
| 2 | Script anti-FOUC + suppressHydrationWarning en layout.tsx | 1c64933 | app/layout.tsx |
| 3 | ThemeToggle + PublicHeader + admin sidebar + wizard dark | 5c335cc | components/ThemeToggle.tsx, components/PublicHeader.tsx, components/admin/AdminSidebar.tsx, app/(public)/layout.tsx, components/booking/BookingWizard.tsx |

## Task Pendiente (Checkpoint)

| Task | Tipo | Descripcion |
|------|------|-------------|
| 4 | checkpoint:human-verify | Verificacion visual del dark mode (DARK-01, DARK-02) |

## Lo que se construyo

### Task 1 — globals.css
- Directiva `@custom-variant dark (&:where(.dark, .dark *))` posicionada antes de `:root`
- Bloque `.dark { }` con todos los tokens redefinidos: background (#0f172a), surface (#1e293b), primary (#2dd4bf), text-primary (#f1f5f9), etc.
- Shadows redefinidos para dark (mayor opacidad negra)
- No se modifico el bloque `:root` ni el `@theme inline`

### Task 2 — layout.tsx
- `suppressHydrationWarning` en `<html>` para evitar warnings de React por la clase dark
- Script inline `dangerouslySetInnerHTML` en `<head>` que antes del paint:
  1. Lee `localStorage.getItem('tm-theme')`
  2. Si es `'dark'` O (no hay valor y `prefers-color-scheme: dark`), agrega clase `dark` a `document.documentElement`
  3. Envuelto en `try/catch` para silenciar errores de navegadores sin localStorage

### Task 3 — Componentes
- **ThemeToggle.tsx**: Client Component, estado inicializado en false y sincronizado via useEffect con la clase actual de `<html>`. Toggle alterna la clase y persiste en `localStorage` con clave `'tm-theme'`. Muestra Sun cuando esta en dark, Moon cuando en light. aria-label dinamico.
- **PublicHeader.tsx**: Server Component con logo y `<ThemeToggle />`. Sticky top, border-b con tokens CSS.
- **AdminSidebar.tsx**: ThemeToggle agregado en el footer entre el estado del sistema y el boton de logout.
- **app/(public)/layout.tsx**: `<PublicHeader />` renderizado antes de `{children}`.
- **BookingWizard.tsx**: Panel glassmorphism con `dark:bg-slate-900/80`; orbes de fondo con `dark:opacity-5`.

## Checkpoint Pendiente — Task 4

El usuario debe verificar visualmente:

1. Iniciar `npm run dev`. En OS/DevTools, setear `prefers-color-scheme: dark`. Recargar `/admin` y `/reservar` — NO debe haber flash de tema claro (DARK-01).
2. Click en toggle Sun/Moon del sidebar admin → la app cambia de tema. Recargar → el tema elegido se mantiene (DARK-02). Verificar en DevTools > Application > localStorage que existe `tm-theme`.
3. Ir a `/reservar` en modo oscuro → el panel del wizard y su texto son legibles; las orbes de fondo no saturan.
4. Confirmar que el toggle tambien aparece y funciona en el header publico de `/reservar`.

**Resume signal:** Escribir "approved" o describir los problemas visuales encontrados.

## Deviations from Plan

None - plan ejecutado exactamente como estaba escrito (Tasks 1-3).

## Known Stubs

None.

## Threat Flags

None — no se agregan nuevos endpoints de red ni rutas de autenticacion. El toggle de tema opera exclusivamente sobre localStorage y la clase CSS de `<html>`, sin consecuencias de seguridad.
