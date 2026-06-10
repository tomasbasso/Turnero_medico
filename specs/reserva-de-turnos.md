# Spec: Reserva de turnos sin errores (pública e interna)

> Fecha: 2026-06-10 · Estado: Borrador · Origen: historia de usuario

## 1. Historia de usuario original

> Tengo un sistema de turnos y la idea es que, al asignar un turno, no haya errores. Como primeramente se elige la especialidad luego se elige el especialista luego, pasamos a seleccionar la fecha y una vez pulsada la fecha, abajo nos aparecen horarios disponibles y las horas. Las horas que ya estén reservadas van a aparecer para no poder ser marcadas. Luego, marcando la hora deseada pasamos a completar los datos:
> - Nombre completo
> - DNI
> - Teléfono
> - Obra social
> - Mail
>
> Obra social y mail son opcionales. Y confirmamos turno.

## 2. Objetivo

Garantizar que la reserva de un turno médico se complete sin errores ni dobles reservas, guiando al usuario por un flujo secuencial que solo ofrece opciones válidas (especialidades activas, especialistas activos, fechas y horas realmente disponibles). El flujo sirve a dos perfiles: el paciente que se autoagenda desde una página pública sin login, y el personal administrativo (admin/recepcionista) que carga turnos desde el panel interno.

## 3. Alcance

### Incluye
- Flujo de reserva paso a paso: especialidad → especialista → fecha → hora → datos del paciente → confirmación.
- Cálculo de horarios disponibles por doctor (disponibilidad semanal, duración de turno propia, descuento de turnos ya tomados y ausencias).
- Visualización de horas reservadas como deshabilitadas (no seleccionables).
- Formulario de datos del paciente con validaciones (nombre, DNI, teléfono obligatorios; obra social y mail opcionales).
- Validación definitiva de disponibilidad server-side al confirmar, con manejo del caso "slot tomado mientras completaba los datos".
- Estado inicial del turno según quién lo crea: PENDIENTE (paciente, página pública) o CONFIRMADO (admin/recepcionista, panel interno).
- Envío del email de confirmación existente cuando el paciente cargó mail.
- Pantalla de éxito con el resumen del turno.

### No incluye (fuera de alcance)
- Reprogramación ni cancelación de turnos (esta spec cubre solo la creación).
- Pagos y validación de obra social contra padrones: obra social es texto libre.
- Registro/login de pacientes: la página pública no requiere cuenta.
- Creación de turnos por el rol DOCTOR desde este flujo.

## 4. Definiciones funcionales

### Contextos de uso
- El flujo existe en dos contextos con la misma mecánica de pasos:
  - **Página pública de reserva**: el paciente se autoagenda sin login; es lo único que el paciente puede ver.
  - **Panel interno**: admin y recepcionista, autenticados, cargan turnos con el mismo flujo y además acceden a la gestión (ver turnos, etc.).
- El estado inicial del turno depende del origen: página pública → **PENDIENTE**; panel interno → **CONFIRMADO**.

### Oferta de opciones
- Solo se muestran **especialidades activas**, y dentro de cada una solo **especialistas activos** de esa especialidad.
- Los horarios disponibles se calculan a partir de la **disponibilidad semanal del doctor** (días y franjas horarias configuradas), divididos en slots según la **duración de turno propia de cada doctor** (default 20 minutos).
- Si el doctor tiene un **período de ausencia** (TimeOff) que cubre la fecha elegida, ese día no ofrece ningún horario.
- **No se ofrecen turnos en el pasado**: fechas anteriores a hoy quedan deshabilitadas; para el día de hoy solo se ofrecen horas futuras.
- Un turno **CANCELADO o NO_SHOW libera el horario**, que vuelve a aparecer como disponible.

### Confirmación
- La "confirmación" del flujo es la creación del turno; no hay paso de aprobación adicional dentro del flujo.
- Al crear el turno se dispara el **email de confirmación existente** si el paciente cargó mail.

## 5. Datos y modelo

No se crean entidades nuevas: se usa el modelo existente en `prisma/schema.prisma`.

| Entidad | Rol en el flujo |
|---|---|
| `Specialty` | Paso 1: solo las que tienen `isActive = true`. |
| `Doctor` | Paso 2: solo `isActive = true` de la especialidad elegida; aporta `durationMin`. |
| `Availability` | Define las franjas semanales (dayOfWeek, startTime, endTime) de las que se derivan los slots. |
| `TimeOff` | Bloquea días completos del doctor en el rango startDate–endDate. |
| `Appointment` | Registro creado al confirmar; los datos del paciente van embebidos (sin entidad Paciente separada). |

Campos del formulario → `Appointment`:

| Campo | Columna | Obligatorio | Validación |
|---|---|---|---|
| Nombre completo | `patientName` | Sí | No vacío |
| DNI | `patientDni` | Sí | Numérico, 7 u 8 dígitos |
| Teléfono | `patientPhone` | Sí | No vacío, sin formato estricto |
| Obra social | `patientInsurance` | No | Texto libre |
| Mail | `patientEmail` | No | Formato de email válido solo si se completa |

Restricción de unicidad: índice único **parcial** sobre `(doctorId, date, time)` que ignora filas CANCELLED/NO_SHOW (ya existente en `prisma/sql/partial-unique-slot.sql`). Es la garantía final contra dobles reservas.

## 6. UX / Interfaz

### Vistas
- **Página pública de reserva** (sin login): contiene únicamente el wizard de reserva.
- **Panel interno** (con login): el mismo wizard embebido en la vista de carga de turnos de admin/recepción.

### Flujo (wizard secuencial, una sola pantalla)
1. **Especialidad**: lista de especialidades activas.
2. **Especialista**: doctores activos de la especialidad elegida.
3. **Fecha**: calendario; fechas pasadas y días sin disponibilidad deshabilitados.
4. **Hora**: al pulsar la fecha, debajo aparece la grilla de horarios; las horas ya reservadas se muestran **visibles pero deshabilitadas** (grisadas), no se ocultan.
5. **Datos del paciente**: formulario con los 5 campos; errores de validación inline por campo.
6. **Confirmar turno**: botón final; al éxito se muestra **pantalla/resumen de éxito** con especialista, fecha, hora y paciente.

### Reglas de navegación y estados
- No se puede saltar pasos: cada paso se habilita solo cuando el anterior está resuelto.
- Si el usuario **cambia una selección previa** (ej. otro especialista), los pasos posteriores se **resetean** (fecha, hora y datos descartados).
- **Carga**: la grilla de horarios muestra estado de carga mientras consulta disponibilidad.
- **Vacío**: si una fecha no tiene ningún slot libre, se muestra mensaje "sin horarios disponibles para este día".
- **Error de concurrencia**: si al confirmar el slot ya fue tomado, se muestra un mensaje claro y la grilla de horarios se **refresca automáticamente** para elegir otra hora (los datos del paciente ya cargados se conservan).

## 7. Definiciones técnicas

- Stack existente: Next.js (App Router) + Prisma + PostgreSQL, deploy en Vercel.
- La validación definitiva de disponibilidad es **server-side al crear el turno**: la API vuelve a verificar el slot y, ante colisión, responde con error específico (respaldada por el índice único parcial en base de datos, que cubre la condición de carrera).
- El cliente nunca es fuente de verdad de disponibilidad: la grilla es informativa; el servidor decide.
- Se reutiliza el pipeline de **email de confirmación existente** (incluye guard de idempotencia ya implementado).
- El endpoint público de creación y el interno comparten la lógica de validación/creación; difieren solo en autenticación y en el estado inicial asignado.

## 8. Seguridad y permisos

| Actor | Acceso | Puede |
|---|---|---|
| Paciente (anónimo) | Página pública, sin login | Crear turnos (nacen PENDIENTES). No ve ni gestiona turnos existentes. |
| RECEPCIONISTA | Panel interno, con login | Crear turnos (nacen CONFIRMADOS) y ver la gestión. |
| ADMIN | Panel interno, con login | Igual que recepcionista, más administración. |
| DOCTOR | Panel interno, con login | **No** crea turnos desde este flujo. |

- La página pública no expone datos de otros pacientes: la grilla solo indica qué horas están ocupadas, nunca quién las ocupa.
- El endpoint público debe estar protegido contra abuso básico (validación estricta de inputs; rate limiting queda como pregunta abierta).

## 9. Criterios de aceptación

- [ ] Dado que hay especialidades inactivas, cuando se abre el paso 1, entonces solo se listan las activas.
- [ ] Dado un especialista con duración de turno de 20 minutos y disponibilidad 09:00–12:00, cuando se elige una fecha de ese día de semana, entonces se ofrecen los slots 09:00, 09:20, …, 11:40.
- [ ] Dado un slot ya reservado (PENDING/CONFIRMED/COMPLETED), cuando se muestra la grilla, entonces esa hora aparece grisada y no puede seleccionarse.
- [ ] Dado un turno CANCELADO o NO_SHOW en un slot, cuando se muestra la grilla, entonces esa hora aparece disponible.
- [ ] Dado que el doctor tiene TimeOff que cubre la fecha, cuando se elige esa fecha, entonces no se ofrece ningún horario.
- [ ] Dado que hoy son las 15:00, cuando se elige la fecha de hoy, entonces solo se ofrecen horas posteriores a las 15:00; y las fechas pasadas están deshabilitadas en el calendario.
- [ ] Dado que el usuario cambia el especialista tras elegir fecha y hora, cuando vuelve al paso 2, entonces fecha, hora y datos se resetean.
- [ ] Dado un DNI con letras o con 5 dígitos, cuando se intenta avanzar, entonces se muestra error inline y no se permite confirmar.
- [ ] Dado mail vacío y obra social vacía, cuando se confirma con el resto de los datos válidos, entonces el turno se crea correctamente.
- [ ] Dado un mail con formato inválido, cuando se intenta confirmar, entonces se muestra error inline.
- [ ] Dado que un paciente confirma desde la página pública, cuando se crea el turno, entonces su estado es PENDIENTE.
- [ ] Dado que un admin o recepcionista confirma desde el panel, cuando se crea el turno, entonces su estado es CONFIRMADO.
- [ ] Dado que dos personas eligen el mismo slot y la primera confirma, cuando la segunda confirma, entonces recibe un mensaje claro de "horario ya tomado", la grilla se refresca y sus datos de paciente se conservan.
- [ ] Dado un turno creado con mail cargado, cuando se completa la creación, entonces se envía el email de confirmación (una sola vez).
- [ ] Dado un turno confirmado con éxito, cuando termina el flujo, entonces se muestra el resumen con especialista, fecha, hora y paciente.
- [ ] Dado un visitante anónimo en la página pública, cuando consulta la grilla de horarios, entonces no puede ver ningún dato personal de otros pacientes.

## 10. Casos borde y manejo de errores

- **Colisión de slot (carrera)**: dos usuarios confirman el mismo horario casi a la vez; el índice único parcial garantiza que solo uno gana; el perdedor recibe error específico y la grilla se refresca conservando sus datos.
- **Especialidad sin doctores activos**: el paso 2 muestra mensaje de "no hay especialistas disponibles" en lugar de lista vacía sin explicación.
- **Doctor sin disponibilidad configurada**: el calendario no ofrece ningún día; mostrar mensaje informativo.
- **Día con todos los slots tomados**: la grilla muestra todas las horas grisadas más el mensaje de "sin horarios disponibles".
- **El doctor o la especialidad se desactivan a mitad del flujo**: la validación server-side al confirmar rechaza la creación con mensaje claro.
- **Doble click / doble submit en "Confirmar turno"**: el botón se deshabilita al primer click; el backend es idempotente ante el reintento (el índice único bloquea el duplicado).
- **Fallo del envío de email**: el turno se crea igual; el error de email no revierte la reserva (se registra para reintento, comportamiento existente).
- **Datos con espacios extra**: nombre, DNI y teléfono se normalizan (trim) antes de validar y guardar.

## 11. Preguntas abiertas

- ¿Se aplica rate limiting / protección anti-bots (p. ej. límite por IP o captcha) al endpoint público de creación de turnos?
- ¿Debe la página pública impedir que un mismo DNI acumule múltiples turnos PENDIENTES futuros con el mismo doctor?
