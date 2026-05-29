---
plan: 03-05
status: complete
completed_at: "2026-05-28"
---

# Summary: Plan 03-05 — Steps 3-5 + BookingWizard final wiring

## Accomplished

- `components/booking/StepDateTime.tsx`: calendario mensual con navegación, 30-day window, estados visuales per UI-SPEC, fetch de slots por día con stagger animation, no-availability state con CalendarX, botón "Confirmar horario" habilitado solo cuando hay fecha y hora
- `components/booking/StepPatientForm.tsx`: formulario con validación D-01/D-02/D-03/D-05, POST a /api/public/appointments, error 409 con link "← Elegir otro horario", loading button con Loader2, todos los inputs con text-base (previene iOS zoom)
- `components/booking/StepConfirmation.tsx`: resumen completo con formatDate/formatTime, chip PENDIENTE en amber, botón "Reservar otro turno", entrance animation con scale 0→1 backOut
- `components/booking/BookingWizard.tsx`: reemplazados placeholders de steps 3-5 con componentes reales, wiring completo de props y callbacks
- `app/(auth)/login/page.tsx`: fix pre-existente — `useSearchParams()` envuelto en Suspense para cumplir Next.js 16 build requirements

## Verification

- `npx tsc --noEmit`: sin errores
- `npm run build`: exitoso — 18 rutas compiladas incluyendo /reservar y todas las APIs públicas

## Build Output Routes

- `○ /reservar` — estática (pre-rendered)
- `ƒ /api/public/appointments` — dinámica
- `ƒ /api/public/doctors` — dinámica
- `ƒ /api/public/slots` — dinámica
- `ƒ /api/public/specialties` — dinámica
