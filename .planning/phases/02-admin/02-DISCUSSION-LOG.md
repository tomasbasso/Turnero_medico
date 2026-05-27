# Phase 2: Admin - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-27
**Phase:** 02-admin
**Areas discussed:** Dashboard — métricas

---

## Dashboard — métricas

### ¿Qué período de tiempo deben reflejar las métricas principales?

| Opción | Descripción | Seleccionada |
|--------|-------------|--------------|
| Solo el día de hoy | Turnos de hoy: pendientes, confirmados, completados, cancelados | |
| La semana en curso | Vista semanal — útil para planificación | ✓ |
| Métricas mixtas | Hoy operativo + total histórico para resumen general | |

**Elección:** La semana en curso

---

### ¿Qué tarjetas/KPIs mostrás en el dashboard?

| Opción | Descripción | Seleccionada |
|--------|-------------|--------------|
| 4 cards de estado | Pendientes / Confirmados / Completados / Cancelados de la semana | ✓ |
| 4 cards + próximos turnos | Cards de estado + lista con los próximos 5–8 turnos | |
| Cards + por médico | Cards de estado + desglose por médico | |

**Elección:** 4 cards de estado

---

### ¿Cómo se ve visualmente el dashboard?

| Opción | Descripción | Seleccionada |
|--------|-------------|--------------|
| Solo cards | 4 cards con número grande e ícono. Limpio, rápido de construir | ✓ |
| Cards + gráfico de barras | Cards arriba + gráfico por día de la semana. Requiere Recharts | |
| Cards + lista de próximos turnos | Cards arriba + tabla de turnos de hoy | |

**Elección:** Solo cards

---

### ¿Cómo se cargan los datos del dashboard?

| Opción | Descripción | Seleccionada |
|--------|-------------|--------------|
| Server Component con datos reales | Consulta Prisma directamente — sin fetch extra, sin loading state | ✓ |
| Client fetch al montar | Componente client que llama a /api/admin/dashboard al montar | |
| Server Component + botón refrescar | Datos del servidor + botón manual para revalidar | |

**Elección:** Server Component con datos reales

---

## Claude's Discretion

Las siguientes áreas no se discutieron — el planner tiene libertad dentro de los patrones establecidos:

- **Patrón ABM** (crear/editar especialidades y médicos): drawer/sheet lateral sobre list page
- **Editor de disponibilidad**: lista de franjas horarias por día (coherente con schema Availability)
- **Permisos por rol**: ADMIN → CRUD completo; RECEPTIONIST → solo lectura

## Deferred Ideas

- Gráfico de barras por día en dashboard — posible en Fase 5 (pulido)
- Quick actions de turnos desde dashboard — pertenece a Fase 4
- Gestión de cuentas de usuario (RECEPTIONIST/DOCTOR) — posible nueva fase
