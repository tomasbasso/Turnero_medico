---
plan: 03-03
status: complete
completed_at: "2026-05-28"
---

# Summary: Plan 03-03 — POST /api/public/appointments

## Accomplished

- `app/api/public/appointments/route.ts`: POST handler con validación completa
  - D-01: DNI 7-8 dígitos con strip de puntos/espacios
  - D-02: Teléfono exactamente 10 dígitos
  - D-03: Email opcional con regex básico
  - D-04: catch de `PrismaClientKnownRequestError` code `P2002` → 409
  - D-05: `patientInsurance` opcional, null si vacío
  - Status siempre `PENDING` hardcodeado
  - Respuesta exitosa: 201

## Key Decisions

- Import de `PrismaClientKnownRequestError` desde `@prisma/client/runtime/library` (verificado path correcto)
- Mensaje 409 exacto: `'Este turno ya fue reservado. Elegí otro horario.'`
- `notes` no se lee del body (no expuesto en wizard público)

## Verification

- `npx tsc --noEmit`: sin errores
- Contiene `P2002`, `status: 'PENDING'` hardcodeado, regex DNI, validación phone length 10
