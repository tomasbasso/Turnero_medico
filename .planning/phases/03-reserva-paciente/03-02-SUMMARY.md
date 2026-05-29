---
plan: 03-02
status: complete
completed_at: "2026-05-28"
---

# Summary: Plan 03-02 — APIs Públicas

## Accomplished

- `app/api/public/specialties/route.ts`: GET sin auth, filtra `isActive: true`, ordena por nombre
- `app/api/public/doctors/route.ts`: GET con `?specialtyId`, valida con parseInt+isNaN, retorna 400 si falta
- `app/api/public/slots/route.ts`: GET con `?doctorId&date`, algoritmo `generateSlots` con aritmética de minutos, ventana de 30 días, Promise.all para queries paralelas, marca slots ocupados con `available: false`

## Key Decisions

- `dayOfWeek` usa `Date.getDay()` directamente (0=Domingo ... 6=Sábado) — coincide con la convención del seed (1=Lunes, 3=Miércoles, 5=Viernes)
- Date query usa rango `{ gte: startOfDay, lt: endOfDay }` en vez de igualdad exacta para robustez con timezone
- Todos usan `Response.json()` (no NextResponse) per convención del proyecto

## Verification

- `npx tsc --noEmit`: sin errores
- Ningún archivo contiene `verifyToken`, `COOKIE_NAME`, ni `cookies()`
- `BOOKING_WINDOW_DAYS = 30` a nivel módulo en slots/route.ts
