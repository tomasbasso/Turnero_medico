# Phase 3: Reserva Paciente - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-27
**Phase:** 3-reserva-paciente
**Areas discussed:** Datos del paciente y validación, Generación de slots

---

## Datos del paciente y validación

| Option | Description | Selected |
|--------|-------------|----------|
| Solo números 7-8 dígitos | Strip puntos/espacios, validación simple de DNI argentino | ✓ |
| Texto libre sin validación | Más permisivo, datos sucios posibles | |
| Formato XX.XXX.XXX | Requiere formateo en tiempo real | |

**User's choice:** Solo números, 7-8 dígitos
**Notes:** DNI argentino estándar.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Al menos 8 dígitos | Validación mínima, compatible con móviles y fijos | |
| Texto libre | Sin validación | |
| 10 dígitos numéricos | Formato argentino (ej: 2302587896) | ✓ |

**User's choice:** 10 dígitos numéricos exactos
**Notes:** El usuario especificó el formato como `2302587896` — número argentino sin espacios ni caracteres especiales.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Sí, campo opcional | Menor fricción, schema ya lo permite (String?) | ✓ |
| Requerido pero sin verificación | Solo validar formato (regex) | |

**User's choice:** Email opcional
**Notes:** Consistente con el schema existente (`patientEmail String?`).

---

| Option | Description | Selected |
|--------|-------------|----------|
| Sí, sin restricción por DNI | Única protección es unique [doctorId, date, time] | ✓ |
| Un turno por DNI por día | Query adicional antes de insertar | |

**User's choice:** Sin restricción por DNI

---

| Option | Description | Selected |
|--------|-------------|----------|
| Campo de texto libre en Appointment | patientInsurance String?, sin migración compleja | ✓ |
| Lista fija de opciones (select) | Requiere mantener lista | |
| Solo anotarlo en notes | Sin campo dedicado, menos estructurado | |

**User's choice:** Campo de texto libre en Appointment (agregar `patientInsurance String?`)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Opcional | Menor fricción, pacientes particulares no tienen OS | ✓ |
| Obligatoria | Campo String (no nullable) | |

**User's choice:** Obra social opcional

---

## Generación de slots

| Option | Description | Selected |
|--------|-------------|----------|
| 30 días | Un mes hacia adelante, estándar para consultorios | ✓ |
| 15 días | Dos semanas, menos carga de vista | |
| 60 días | Dos meses, para lista de espera | |

**User's choice:** 30 días

---

| Option | Description | Selected |
|--------|-------------|----------|
| Grilla de días del mes tipo calendario | Vista mensual, días teal/gris según disponibilidad | ✓ |
| Lista de próximas fechas disponibles | Solo días con slots, formato lista | |
| Date picker nativo del browser | Input type=date, sin indicación visual | |

**User's choice:** Grilla de calendario mensual

---

| Option | Description | Selected |
|--------|-------------|----------|
| Chips/botones en grilla | Teal disponible, gris ocupado | ✓ |
| Lista vertical de horarios | Cada slot como fila | |
| Solo mostrar los libres | Sin slots ocupados visibles | |

**User's choice:** Chips/botones en grilla

---

| Option | Description | Selected |
|--------|-------------|----------|
| Mensaje amigable + botón volver al paso 2 | Friendly UX, retrocede a elección de médico | ✓ |
| Deshabilitar médico en paso 2 si no tiene slots | Requiere query previa pesada | |
| Mostrar calendario gris vacío | Menos amigable | |

**User's choice:** Mensaje amigable + botón para volver a elegir médico

---

## Claude's Discretion

- **Estructura del wizard:** Ruta única `/reservar` con estado React — no se discutió, el planner decide.
- **Confirmación final:** Pantalla de resumen sin email al paciente — no se discutió, estándar para esta fase.
- **Race condition:** Unique constraint en DB maneja doble booking — no se discutió, decisión técnica obvia.
- **APIs públicas:** Rutas bajo `app/api/public/` sin JWT — no se discutió.

## Deferred Ideas

- Email de confirmación automático al paciente → Fase 5 o nueva fase.
- Verificación en tiempo real de slots (WebSockets/polling) → fuera de scope.
- Filtrar médicos sin disponibilidad en el paso 2 → descartado en favor de mensaje en paso 3.
