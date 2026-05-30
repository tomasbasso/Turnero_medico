# Carga Manual de Turnos por Staff

**Fecha:** 2026-05-30  
**Estado:** Aprobado  
**Roles habilitados:** ADMIN, DOCTOR, RECEPTIONIST

---

## Problema

Los pacientes a veces llaman por teléfono o se presentan en persona para pedir turno. El staff no tiene forma de registrar esos turnos desde el panel de administración — solo existe el wizard público `/reservar`. Además, algunos casos clínicos requieren más tiempo que el slot estándar del doctor.

---

## Solución

Un modal "Nuevo turno" en `/admin/turnos` que permite al staff crear turnos manualmente. El turno queda en estado **CONFIRMED** (ya está acordado) y soporta duración variable (20/40/60 min) que bloquea los slots intermedios del calendario.

---

## Schema

Agregar campo a `Appointment`:

```prisma
durationMin Int @default(20)
```

- Los turnos creados por el wizard público almacenan el `durationMin` del doctor al momento de la reserva.
- Los turnos creados por el staff almacenan la duración elegida (20/40/60).
- El default 20 garantiza compatibilidad con registros existentes.

Aplicar con `db push` (no `migrate dev`).

---

## Lógica de bloqueo de slots

### Problema actual

`/api/public/slots` marca un slot como ocupado por coincidencia exacta de horario (`bookedTimes.has(time)`). Eso no contempla turnos de duración extendida: un turno de 60 min a las 10:00 no bloquea 10:20 ni 10:40.

### Nueva lógica

Un slot `T` con duración `D` está **disponible** si ningún turno activo `A` en ese doctor/día se solapa con el rango `[T, T+D)`.

Condición de solapamiento (en minutos):
```
A.time_min < T_min + D  AND  A.time_min + A.durationMin > T_min
```

El endpoint acepta un parámetro opcional `?durationMin=N`. Si está presente, filtra los slots según la duración solicitada. Si está ausente, usa el `durationMin` del doctor (comportamiento actual del wizard público).

La query existente que busca turnos activos debe seleccionar también `durationMin` para hacer el cálculo.

---

## Endpoint POST /api/admin/appointments

Nuevo handler en `app/api/admin/appointments/route.ts` (junto al GET existente).

**Auth:** `requireStaff`

**Body:**
```ts
{
  doctorId: number
  date: string          // "YYYY-MM-DD"
  time: string          // "HH:MM"
  durationMin: 20 | 40 | 60
  patientName: string
  patientDni: string
  patientPhone: string
  patientEmail?: string
  patientInsurance?: string
  notes?: string
}
```

**Validaciones:**
- Todos los campos requeridos presentes y no vacíos.
- `durationMin` en `[20, 40, 60]`.
- El doctor existe y está activo.
- El slot no tiene conflicto con turnos existentes (misma lógica de solapamiento que el slots endpoint). Si hay conflicto, devolver 409 con mensaje claro.

**Response 201:**
```ts
{ appointment: { id, status, ... } }
```

**Status:** el turno se crea como `CONFIRMED`.

---

## Componente NewAppointmentModal

**Archivo:** `components/admin/NewAppointmentModal.tsx`  
**Tipo:** Client component (`'use client'`)

### Estado interno

```ts
doctorId: number | null
date: string            // "YYYY-MM-DD"
durationMin: 20 | 40 | 60
time: string | null
patientName, patientDni, patientPhone: string
patientEmail, patientInsurance, notes: string
loading: boolean
error: string | null
slots: { time: string; available: boolean }[]
slotsLoading: boolean
```

### Flujo

1. Se abre desde botón "Nuevo turno" en cabecera de `AppointmentsList`.
2. Staff selecciona doctor (dropdown con doctores activos, pasados como prop).
3. Staff elige fecha (date input, sin límite de 30 días — el staff puede agendar a futuro sin restricción).
4. Staff elige duración: chips **20 / 40 / 60 min**. Default = `durationMin` del doctor seleccionado.
5. Al cambiar doctor, fecha o duración: fetch automático a `/api/public/slots?doctorId=X&date=Y&durationMin=Z`. Los slots indisponibles se muestran deshabilitados (no se ocultan).
6. Staff selecciona un slot disponible.
7. Staff completa datos del paciente: Nombre*, DNI*, Teléfono*, Email, Obra social, Notas.
8. "Guardar" → `POST /api/admin/appointments`.
9. En éxito: cerrar modal, llamar `onCreated()` callback para refrescar la lista.
10. En error: mostrar mensaje inline sin cerrar el modal.

### Props

```ts
interface NewAppointmentModalProps {
  doctors: { id: number; name: string; durationMin: number }[]
  onCreated: () => void
  onClose: () => void
}
```

### Integración en AppointmentsList

- Agregar `durationMin` al tipo `Doctor` en `AppointmentsList`.
- Botón "Nuevo turno" en la cabecera (junto a los tabs), visible para todo el staff.
- Estado `showNewModal: boolean` en `AppointmentsList`.
- Al `onCreated`: refrescar la lista llamando el mismo fetch que ya usa el componente para recargar.
- La lista de doctors ya viene como prop — pasarla al modal.

---

## Wizard público (/reservar)

El wizard público consume `/api/public/slots` sin `?durationMin` — sigue funcionando igual. El único cambio es que la respuesta ya considera solapamientos correctamente. Al crear el turno vía `POST /api/public/appointments`, se agrega `durationMin: doctor.durationMin` al payload para que el nuevo campo quede almacenado.

---

## Casos borde

| Caso | Comportamiento |
|---|---|
| Staff intenta guardar un slot que otro usuario acaba de tomar | API devuelve 409; modal muestra "El horario ya no está disponible, elegí otro slot" |
| Doctor sin disponibilidad en la fecha elegida | Slots vacíos, mensaje "Sin turnos disponibles para esta fecha" |
| Doctor en TimeOff en la fecha elegida | Slots vacíos, mismo mensaje |
| Staff selecciona 60 min y el rango alcanza el fin de la disponibilidad del doctor | Solo aparecen los slots donde caben 60 min completos dentro del horario |

---

## Archivos a crear / modificar

| Archivo | Acción |
|---|---|
| `prisma/schema.prisma` | Agregar `durationMin Int @default(20)` a `Appointment` |
| `app/api/public/slots/route.ts` | Aceptar `?durationMin`, lógica de solapamiento |
| `app/api/public/appointments/route.ts` | Pasar `durationMin` al crear turno público |
| `app/api/admin/appointments/route.ts` | Agregar handler POST |
| `components/admin/NewAppointmentModal.tsx` | Crear componente |
| `components/admin/AppointmentsList.tsx` | Botón + estado modal + tipo Doctor actualizado |
