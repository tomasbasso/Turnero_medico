# Phase 4: Gestión de Turnos - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-28
**Phase:** 4-gestion-turnos
**Areas discussed:** Layout de lista, WhatsApp

---

## Layout de lista

### Vista principal

| Option | Description | Selected |
|--------|-------------|----------|
| Tabla con columnas | thead + tbody: Paciente, DNI, Médico, Fecha/Hora, Estado, Acciones. Densa, scaneable, igual que la lista de médicos/especialidades. | ✓ |
| Cards por turno | Cada turno es una card con toda la info. Más visual pero ocupa más espacio vertical. Nuevo patrón en el proyecto. | |
| Lista compacta (filas sin tabla) | Filas div con flex, sin thead. Más flexible pero inconsistente con el resto del admin. | |

**User's choice:** Tabla con columnas
**Notes:** Consistente con el patrón ya establecido en médicos y especialidades.

---

### Columnas

| Option | Description | Selected |
|--------|-------------|----------|
| Compacto: Paciente+DNI, Médico, Fecha+Hora, Estado, Acciones | 5 columnas. Combina datos relacionados para no fragmentar. | ✓ |
| Expandido: Paciente, DNI, Médico, Especialidad, Fecha, Hora, Estado, Acciones | 8 columnas. Más granular pero apretado en pantallas medianas. | |
| Mínimo: Fecha+Hora, Paciente, Médico, Estado, Acciones | 5 columnas sin DNI ni especialidad visible directo. | |

**User's choice:** Compacto (5 columnas)
**Notes:** Nombre+DNI juntos, fecha+hora juntos.

---

### Filtros

| Option | Description | Selected |
|--------|-------------|----------|
| Barra client-side + fetch | Filtros en toolbar, fetch con parámetros sin recargar. Patrón ya establecido. | ✓ |
| URL query params, Server Component re-render | Filtros en URL. SEO-friendly pero con latencia visible. | |
| Sin filtros en esta fase | Solo listado plano. | |

**User's choice:** Barra de filtros client-side
**Notes:** Filtros: fecha (date input), médico (select), estado (select), DNI (text input).

---

### Período por defecto

| Option | Description | Selected |
|--------|-------------|----------|
| Hoy | Turnos de la fecha actual. Más útil para operatoria diaria. | ✓ |
| Esta semana | Lunes a domingo. Consistente con el Dashboard. | |

**User's choice:** Hoy
**Notes:** La recepcionista ve exactamente lo que tiene en el día.

---

## WhatsApp

### Cuándo aparece el link

| Option | Description | Selected |
|--------|-------------|----------|
| Solo al confirmar (estado → CONFIRMED) | Link contextual al confirmar. Lógica clara. | ✓ |
| Botón siempre visible en cada fila | Independiente del estado. | |
| Ambos: al confirmar + botón permanente | Al confirmar se ofrece el link, y siempre hay un ícono para reintentar. | |

**User's choice:** Solo cuando se cambia estado a CONFIRMED
**Notes:** Acción clara y contextual.

---

### Mensaje pre-llenado

| Option | Description | Selected |
|--------|-------------|----------|
| "Hola [nombre], tu turno con [médico] el [fecha] a las [hora] ha sido CONFIRMADO." | Simple, claro, con datos esenciales. | ✓ |
| Solo apertura sin mensaje | wa.me/{teléfono} sin texto. La recepcionista escribe a mano. | |
| Personalizable en la app | Campo editable antes de abrir el link. Agrega UI no prevista. | |

**User's choice:** Mensaje pre-llenado con datos del turno
**Notes:** Usar formatDate y formatTime de utils. URL: `https://wa.me/549${phone}?text=...`

---

### whatsappSent tracking

| Option | Description | Selected |
|--------|-------------|----------|
| PATCH automático al hacer click | Llama API para marcar whatsappSent=true. Indicador visual en fila. | ✓ |
| Sin tracking en esta fase | Campo existe pero no se actualiza. | |
| Checkbox manual | La recepcionista marca "Enviado" manualmente. | |

**User's choice:** PATCH automático
**Notes:** Endpoint `PATCH /api/admin/appointments/[id]/whatsapp`. Indicador: ícono MessageCircleCheck teal.

---

## Claude's Discretion

- **Cambio de estado:** Inline en la tabla. El planner decide entre dropdown o botones contextuales por estado.
- **Drawer de detalle:** Opcional. Si el planner lo considera valioso para ver teléfono/email/obra social.
- **Paginación:** El planner decide si es necesaria dado el volumen bajo de un consultorio.
- **Estado vacío:** Mensaje amigable cuando no hay turnos para los filtros.

## Deferred Ideas

- Historial de cambios de estado (audit log).
- Email de confirmación automático.
- Exportar lista a CSV/Excel.
- Gestión de pacientes (`/admin/pacientes`).
- Notificaciones en tiempo real.
