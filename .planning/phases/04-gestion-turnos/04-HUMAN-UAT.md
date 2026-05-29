---
status: partial
phase: 04-gestion-turnos
source: [04-VERIFICATION.md]
started: 2026-05-29T00:00:00Z
updated: 2026-05-29T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Carga inicial de /admin/turnos
expected: La página muestra heading "Turnos", los turnos de hoy pre-renderizados, y la barra de filtros visible
result: [pending]

### 2. Confirmar un turno PENDING
expected: El badge cambia a "Confirmado" de forma inmediata (optimista), aparece el link de WhatsApp en la columna Acciones
result: [pending]

### 3. Cancelar un turno PENDING (inline confirm)
expected: Aparece "¿Cancelar este turno?" con botones "Sí, cancelar" y "No". Al confirmar, el badge cambia a "Cancelado"
result: [pending]

### 4. Enviar WA en un turno CONFIRMED
expected: El ícono cambia a MessageCircleCheck y el label a "WA enviado" de forma instantánea. El link abre wa.me/549... en nueva pestaña
result: [pending]

### 5. Debounce del campo DNI (300ms)
expected: La tabla no actualiza inmediatamente — espera 300ms después del último keystroke antes de disparar el fetch
result: [pending]

### 6. Filtro reactivo por Médico
expected: La tabla actualiza sin recarga de página, mostrando solo los turnos del médico seleccionado
result: [pending]

### 7. Limpiar campo de fecha
expected: La tabla muestra hasta 200 turnos de todas las fechas (safety cap)
result: [pending]

### 8. Empty state
expected: Se muestra ícono Calendar + "Sin turnos para este filtro" cuando el filtro no retorna resultados
result: [pending]

## Summary

total: 8
passed: 0
issues: 0
pending: 8
skipped: 0
blocked: 0

## Gaps
