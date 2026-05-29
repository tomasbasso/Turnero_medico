---
plan: 03-04
status: complete
completed_at: "2026-05-28"
---

# Summary: Plan 03-04 — BookingWizard + Steps 1 y 2

## Accomplished

- `components/booking/StepProgress.tsx`: barra de 5 dots con conectores, tres tamaños (w-2/w-3), aria-label, label del paso actual
- `components/booking/StepSpecialty.tsx`: Step 1, fetch on mount, 6 skeleton cards, empty state con Stethoscope, auto-advance al seleccionar, accesibilidad role="button"/tabIndex
- `components/booking/StepDoctor.tsx`: Step 2, fetch por specialtyId, avatar/initials fallback con getInitials(), empty state con UserX y botón volver
- `components/booking/BookingWizard.tsx`: 12 campos de estado, AnimatePresence mode="wait" con direction-aware x offset, goTo/resetWizard, steps 3-5 con placeholders temporales

## Key Decisions

- Estado individual con useState (no useReducer, no Context) per CONTEXT.md
- Steps 3-5 usan placeholders `"Step N — próximamente"` — resueltos en 03-05
- Blobs de fondo con `fixed` positioning dentro del layout público

## Verification

- `npx tsc --noEmit`: sin errores (incluyendo que el error de BookingWizard missing de 03-01 quedó resuelto)
