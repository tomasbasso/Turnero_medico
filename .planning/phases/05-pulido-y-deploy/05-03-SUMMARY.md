---
phase: 05-pulido-y-deploy
plan: "03"
subsystem: accessibility
tags: [wcag-aa, focus-trap, aria, tokens, css]
dependency_graph:
  requires: ["05-02"]
  provides: ["wcag-aa-tokens", "focus-rings", "keyboard-accessible-overlays"]
  affects: ["app/globals.css", "components/admin/Drawer.tsx", "components/admin/NewAppointmentModal.tsx"]
tech_stack:
  added: ["focus-trap-react@12.0.2"]
  patterns: ["FocusTrap wrapper", "useEffect Escape listener", "role=dialog + aria-modal"]
key_files:
  modified:
    - app/globals.css
    - components/admin/Drawer.tsx
    - components/admin/NewAppointmentModal.tsx
    - package.json
    - package-lock.json
decisions:
  - "escapeDeactivates: false en FocusTrap — Escape manejado por useEffect para control explícito del cierre"
  - "allowOutsideClick: true en Drawer — backdrop onClick={onClose} debe seguir funcionando"
  - "aria-label={title} en Drawer (string genérico), aria-labelledby en NewAppointmentModal (id del h2)"
  - "focus ring via :focus-visible — no se elimina outline incondicionalmente para preservar accesibilidad"
metrics:
  duration: "~20 min"
  completed: "2026-06-01"
  tasks_completed: 3
  tasks_total: 4
  files_modified: 5
---

# Phase 5 Plan 03: Accesibilidad WCAG AA — Tokens + Focus Ring + Overlays Summary

Tokens de contraste `--success` y `--error` ajustados a emerald-700 y red-700 (pasan 4.5:1 AA), focus ring teal global agregado via `:focus-visible`, y ambos overlays del proyecto (Drawer y NewAppointmentModal) equipados con focus trap de teclado, cierre por Escape, `role="dialog"`, `aria-modal="true"` y `aria-label` apropiados.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Tokens WCAG + focus ring + instalar focus-trap-react | 92af6a3 | app/globals.css, package.json, package-lock.json |
| 2 | Focus trap + Escape + ARIA en Drawer.tsx | 7360c53 | components/admin/Drawer.tsx |
| 3 | Focus trap + Escape + ARIA en NewAppointmentModal.tsx | a480e42 | components/admin/NewAppointmentModal.tsx |

## Task 4 — Checkpoint Pendiente

Task 4 es un checkpoint `blocking:human-verify` (auditoría WCAG manual A11Y-01/02/03 en browser). No se ejecuta automáticamente. El agente se detuvo aquí según instrucciones del orchestrator.

## Decisions Made

- **`escapeDeactivates: false`**: El focus trap no maneja Escape internamente; cada overlay tiene su propio `useEffect` que llama `onClose()` al detectar la tecla. Esto da control explícito sobre el flujo de cierre.
- **`allowOutsideClick: true`**: El Drawer se cierra al hacer click en el backdrop (`onClick={onClose}`). Sin esta opción, el focus trap bloquearía el click.
- **`initialFocus: false`**: No se roba el foco abruptamente al abrir — el usuario puede continuar su flujo de navegación.
- **`aria-label={title}` en Drawer vs `aria-labelledby` en NewAppointmentModal**: El Drawer recibe el título como prop string, por lo que `aria-label` es directo. El modal tiene un `<h2>` explícito, por lo que `aria-labelledby` ligado al id es el patrón semánticamente correcto.
- **Focus ring solo con `:focus-visible`**: Se preserva el outline del navegador para usuarios de teclado. Solo se elimina cuando el elemento recibió foco por click/touch (`focus:not(:focus-visible)`).

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None — cambios son CSS + atributos HTML + wrapping de componentes existentes. No se introdujeron nuevos endpoints, rutas de auth ni cambios de esquema.

## Self-Check: PASSED

- [x] `app/globals.css` modificado: `--success: #047857`, `--error: #b91c1c`, regla `:focus-visible` presente
- [x] Bloque `.dark` intacto: `--success: #34d399`, `--error: #f87171` sin cambios
- [x] `package.json` contiene `focus-trap-react` en dependencies
- [x] `components/admin/Drawer.tsx`: FocusTrap importado, role="dialog", aria-modal="true", aria-label={title}, useEffect Escape
- [x] `components/admin/NewAppointmentModal.tsx`: FocusTrap importado, role="dialog", aria-modal="true", aria-labelledby, aria-label="Cerrar modal", useEffect Escape
- [x] `npx vitest run` — 7 tests passed (rate-limit suite)
- [x] Commits: 92af6a3, 7360c53, a480e42
