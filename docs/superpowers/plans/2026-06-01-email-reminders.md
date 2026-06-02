# Email Reminders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enviar un email de confirmación cuando el admin confirma un turno, y un email recordatorio 24h antes via Vercel Cron Job diario.

**Architecture:** Resend SDK entrega los emails. La confirmación se dispara sincrónicamente en el PATCH route existente cuando `status → CONFIRMED`. Los recordatorios los envía un endpoint protegido `/api/cron/reminders` invocado por Vercel Cron cada día a las 12 UTC (9am ARG). Dos campos boolean en `Appointment` evitan duplicados.

**Tech Stack:** Resend (email delivery), Prisma (DB queries), Vercel Cron (scheduling), Next.js 16 App Router, Vitest (tests)

---

## File Map

| File | Acción | Responsabilidad |
|---|---|---|
| `lib/email.ts` | Crear | Cliente Resend, helpers de template (puros), funciones de envío |
| `lib/email.test.ts` | Crear | Tests de `formatDateES`, `buildConfirmationHtml`, `buildReminderHtml` |
| `app/api/cron/reminders/route.ts` | Crear | Endpoint cron — consulta DB y envía recordatorios |
| `app/api/admin/appointments/[id]/route.ts` | Modificar | Dispara email de confirmación al confirmar turno |
| `prisma/schema.prisma` | Modificar | Agrega `emailConfirmationSent` + `emailReminderSent` |
| `vercel.json` | Crear | Define el schedule del cron |
| `.env.local` | Modificar | `RESEND_API_KEY` + `CRON_SECRET` |

---

### Task 1: Instalar Resend y configurar variables de entorno

**Files:**
- Modify: `package.json` (via npm install)
- Modify: `.env.local`

- [ ] **Step 1: Instalar el SDK de Resend**

```bash
npm install resend
```

Resultado esperado: `resend` aparece en `dependencies` de `package.json`.

- [ ] **Step 2: Agregar variables en `.env.local`**

Agregar estas dos líneas al final de `.env.local`:

```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
CRON_SECRET=reemplazar-con-string-largo-aleatorio
```

- `RESEND_API_KEY`: obtenerla en resend.com → API Keys → Create API Key.
- `CRON_SECRET`: cualquier string largo aleatorio (ej. resultado de `openssl rand -hex 32` o inventar uno).

- [ ] **Step 3: Anotar las vars que hay que agregar en Vercel**

En Vercel dashboard → Project → Settings → Environment Variables, antes del próximo deploy agregar:
- `RESEND_API_KEY` (mismo valor)
- `CRON_SECRET` (mismo valor)

(No es necesario para desarrollo local.)

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install resend sdk"
```

---

### Task 2: Migrar schema de Prisma

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Agregar los dos campos al modelo `Appointment`**

En `prisma/schema.prisma`, en el modelo `Appointment`, agregar después de `whatsappSent`:

```prisma
  whatsappSent          Boolean           @default(false)
  emailConfirmationSent Boolean           @default(false)
  emailReminderSent     Boolean           @default(false)
```

- [ ] **Step 2: Sincronizar con la base de datos**

```bash
npx prisma db push
```

Resultado esperado: `Your database is now in sync with your Prisma schema.`

Esto agrega las dos columnas con `DEFAULT false` a la tabla existente sin perder datos.

- [ ] **Step 3: Regenerar el Prisma Client**

```bash
npx prisma generate
```

Resultado esperado: línea con `Generated Prisma Client`.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add email tracking fields to Appointment"
```

---

### Task 3: Crear el módulo de email

**Files:**
- Create: `lib/email.ts`
- Create: `lib/email.test.ts`

El módulo exporta tres funciones puras (testeables sin red) y dos funciones async que llaman a Resend.

- [ ] **Step 1: Escribir los tests que van a fallar**

Crear `lib/email.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { formatDateES, buildConfirmationHtml, buildReminderHtml } from './email'

describe('formatDateES', () => {
  it('formatea fecha en español usando UTC', () => {
    // Prisma @db.Date returns UTC midnight — use Date.UTC to match
    const date = new Date(Date.UTC(2026, 5, 15)) // 2026-06-15T00:00:00.000Z
    expect(formatDateES(date)).toBe('lunes 15 de junio de 2026')
  })
})

describe('buildConfirmationHtml', () => {
  it('incluye nombre del paciente, médico y hora', () => {
    const html = buildConfirmationHtml({
      patientName: 'Ana García',
      doctorName: 'Dr. López',
      specialty: 'Cardiología',
      date: new Date(Date.UTC(2026, 5, 15)),
      time: '10:30',
      durationMin: 20,
    })
    expect(html).toContain('Ana García')
    expect(html).toContain('Dr. López')
    expect(html).toContain('Cardiología')
    expect(html).toContain('10:30')
    expect(html).toContain('20 minutos')
  })
})

describe('buildReminderHtml', () => {
  it('incluye mañana, nombre del médico y hora', () => {
    const html = buildReminderHtml({
      patientName: 'Ana García',
      doctorName: 'Dr. López',
      specialty: 'Cardiología',
      date: new Date(Date.UTC(2026, 5, 15)),
      time: '10:30',
      durationMin: 20,
    })
    expect(html).toContain('mañana')
    expect(html).toContain('Dr. López')
    expect(html).toContain('10:30')
  })
})
```

- [ ] **Step 2: Correr tests para confirmar que fallan**

```bash
npm test
```

Resultado esperado: FAIL — `formatDateES`, `buildConfirmationHtml`, `buildReminderHtml` no encontrados.

- [ ] **Step 3: Crear `lib/email.ts`**

```typescript
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// Cambiar por el dominio verificado en Resend. Para desarrollo usar: onboarding@resend.dev
const FROM_ADDRESS = 'Consultorio <turnos@tudominio.com>'

type EmailParams = {
  patientName: string
  doctorName: string
  specialty: string
  date: Date
  time: string
  durationMin: number
}

// Prisma @db.Date devuelve UTC midnight. Se usa timeZone: 'UTC' para
// que "2026-06-15T00:00:00Z" se muestre como 15 de junio (no 14).
export function formatDateES(date: Date): string {
  return date.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function buildConfirmationHtml(p: EmailParams): string {
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
      <h2 style="color:#0d9488">Tu turno está confirmado</h2>
      <p>Hola <strong>${p.patientName}</strong>,</p>
      <p>Tu turno fue confirmado con los siguientes datos:</p>
      <table style="border-collapse:collapse;width:100%">
        <tr><td style="padding:8px 0;color:#555;width:110px">Médico</td><td><strong>${p.doctorName}</strong></td></tr>
        <tr><td style="padding:8px 0;color:#555">Especialidad</td><td>${p.specialty}</td></tr>
        <tr><td style="padding:8px 0;color:#555">Fecha</td><td>${formatDateES(p.date)}</td></tr>
        <tr><td style="padding:8px 0;color:#555">Hora</td><td>${p.time}</td></tr>
        <tr><td style="padding:8px 0;color:#555">Duración</td><td>${p.durationMin} minutos</td></tr>
      </table>
      <p style="margin-top:24px;color:#555;font-size:14px">
        Si necesitás cancelar o reprogramar tu turno, comunicate con el consultorio con anticipación.
      </p>
    </div>
  `
}

export function buildReminderHtml(p: EmailParams): string {
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
      <h2 style="color:#0d9488">Recordatorio: tu turno es mañana</h2>
      <p>Hola <strong>${p.patientName}</strong>,</p>
      <p>Te recordamos que mañana tenés turno:</p>
      <table style="border-collapse:collapse;width:100%">
        <tr><td style="padding:8px 0;color:#555;width:110px">Médico</td><td><strong>${p.doctorName}</strong></td></tr>
        <tr><td style="padding:8px 0;color:#555">Especialidad</td><td>${p.specialty}</td></tr>
        <tr><td style="padding:8px 0;color:#555">Fecha</td><td>${formatDateES(p.date)}</td></tr>
        <tr><td style="padding:8px 0;color:#555">Hora</td><td>${p.time}</td></tr>
        <tr><td style="padding:8px 0;color:#555">Duración</td><td>${p.durationMin} minutos</td></tr>
      </table>
      <p style="margin-top:24px;color:#555;font-size:14px">
        Si necesitás cancelar, comunicate con el consultorio lo antes posible.
      </p>
    </div>
  `
}

type SendResult = { success: true } | { success: false; error: string }

export async function sendConfirmationEmail(params: {
  to: string
  patientName: string
  doctorName: string
  specialty: string
  date: Date
  time: string
  durationMin: number
}): Promise<SendResult> {
  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: params.to,
      subject: `Tu turno está confirmado — ${params.doctorName} el ${formatDateES(params.date)} a las ${params.time}`,
      html: buildConfirmationHtml(params),
    })
    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function sendReminderEmail(params: {
  to: string
  patientName: string
  doctorName: string
  specialty: string
  date: Date
  time: string
  durationMin: number
}): Promise<SendResult> {
  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: params.to,
      subject: `Recordatorio: tu turno es mañana — ${params.doctorName} a las ${params.time}`,
      html: buildReminderHtml(params),
    })
    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
```

- [ ] **Step 4: Correr tests para confirmar que pasan**

```bash
npm test
```

Resultado esperado: 4 tests pasando en `lib/email.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add lib/email.ts lib/email.test.ts
git commit -m "feat: add email module with Resend templates and send functions"
```

---

### Task 4: Crear el endpoint del cron

**Files:**
- Create: `app/api/cron/reminders/route.ts`

- [ ] **Step 1: Crear el directorio y el archivo**

Crear `app/api/cron/reminders/route.ts`:

```typescript
import { type NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendReminderEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // El cron corre a las 12:00 UTC = 09:00 ARG (mismo día de calendario).
  // "Mañana ARG" = fecha UTC + 1 día.
  const now = new Date()
  const tomorrowStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  )
  const dayAfterStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 2)
  )

  const appointments = await prisma.appointment.findMany({
    where: {
      status: 'CONFIRMED',
      emailReminderSent: false,
      date: {
        gte: tomorrowStart,
        lt: dayAfterStart,
      },
    },
    include: {
      doctor: {
        select: {
          name: true,
          specialty: { select: { name: true } },
        },
      },
    },
  })

  let sent = 0
  let errors = 0

  for (const appt of appointments) {
    if (!appt.patientEmail) continue

    const result = await sendReminderEmail({
      to: appt.patientEmail,
      patientName: appt.patientName,
      doctorName: appt.doctor.name,
      specialty: appt.doctor.specialty.name,
      date: appt.date,
      time: appt.time,
      durationMin: appt.durationMin,
    })

    if (result.success) {
      await prisma.appointment.update({
        where: { id: appt.id },
        data: { emailReminderSent: true },
      })
      sent++
    } else {
      console.error(`[cron/reminders] Fallo en turno ${appt.id}:`, result.error)
      errors++
    }
  }

  return Response.json({ sent, errors })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/cron/reminders/route.ts
git commit -m "feat: add cron endpoint for daily reminder emails"
```

---

### Task 5: Disparar email de confirmación en el PATCH route

**Files:**
- Modify: `app/api/admin/appointments/[id]/route.ts`

- [ ] **Step 1: Reemplazar el contenido completo del archivo**

```typescript
import { NextRequest } from 'next/server'
import { requireStaff } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { sendConfirmationEmail } from '@/lib/email'

const VALID_STATUSES = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'] as const
type ValidStatus = (typeof VALID_STATUSES)[number]

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = requireStaff(request)
  if (authResult instanceof Response) return authResult

  const { id } = await params
  const numericId = parseInt(id, 10)
  if (isNaN(numericId)) {
    return Response.json({ error: 'ID inválido' }, { status: 400 })
  }

  const body = await request.json().catch(() => null)
  if (!body?.status || !VALID_STATUSES.includes(body.status as ValidStatus)) {
    return Response.json({ error: 'Estado inválido' }, { status: 400 })
  }

  try {
    const appointment = await prisma.appointment.update({
      where: { id: numericId },
      data: { status: body.status as ValidStatus },
      include: {
        doctor: {
          select: {
            id: true,
            name: true,
            specialty: { select: { name: true } },
          },
        },
      },
    })

    if (body.status === 'CONFIRMED' && appointment.patientEmail) {
      const result = await sendConfirmationEmail({
        to: appointment.patientEmail,
        patientName: appointment.patientName,
        doctorName: appointment.doctor.name,
        specialty: appointment.doctor.specialty.name,
        date: appointment.date,
        time: appointment.time,
        durationMin: appointment.durationMin,
      })

      if (result.success) {
        await prisma.appointment.update({
          where: { id: numericId },
          data: { emailConfirmationSent: true },
        })
      } else {
        console.error(`[PATCH appointments/${numericId}] Email falló:`, result.error)
      }
    }

    return Response.json({ appointment })
  } catch (error) {
    if ((error as { code?: string }).code === 'P2025') {
      return Response.json({ error: 'Turno no encontrado' }, { status: 404 })
    }
    throw error
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/api/admin/appointments/[id]/route.ts"
git commit -m "feat: send confirmation email when appointment is confirmed"
```

---

### Task 6: Configurar Vercel Cron

**Files:**
- Create: `vercel.json`

- [ ] **Step 1: Crear `vercel.json` en la raíz del proyecto**

```json
{
  "crons": [
    {
      "path": "/api/cron/reminders",
      "schedule": "0 12 * * *"
    }
  ]
}
```

`0 12 * * *` = todos los días a las 12:00 UTC = 09:00 Argentina (UTC-3, sin DST).

- [ ] **Step 2: Commit**

```bash
git add vercel.json
git commit -m "feat: configure Vercel cron for daily reminder emails at 9am ARG"
```

---

### Task 7: Verificación manual

- [ ] **Step 1: Correr todos los tests**

```bash
npm test
```

Resultado esperado: todos pasan, incluyendo los 4 de `lib/email.test.ts`.

- [ ] **Step 2: Levantar el servidor de desarrollo**

```bash
npm run dev
```

- [ ] **Step 3: Probar el endpoint del cron localmente**

```bash
curl "http://localhost:3000/api/cron/reminders" \
  -H "Authorization: Bearer reemplazar-con-string-largo-aleatorio"
```

Resultado esperado: `{"sent":N,"errors":0}` (N puede ser 0 si no hay turnos para mañana).

- [ ] **Step 4: Probar el email de confirmación**

Confirmar un turno de prueba desde el panel admin (cambiar estado a "Confirmado") y verificar:
1. El email llega a la dirección del paciente (o verificar en Resend dashboard → Logs).
2. El campo `emailConfirmationSent` en DB queda en `true` (visible en `npx prisma studio`).

- [ ] **Step 5: Verificar el dominio del remitente**

Si el email viene de `onboarding@resend.dev` (modo desarrollo), está bien para testing. Para producción:
1. En Resend dashboard → Domains → Add Domain → verificar con registros DNS.
2. Actualizar `FROM_ADDRESS` en `lib/email.ts` con el dominio verificado.

- [ ] **Step 6: Agregar env vars en Vercel y deployar**

```bash
# Agregar las vars en Vercel dashboard → Project → Settings → Environment Variables:
# RESEND_API_KEY = <tu key>
# CRON_SECRET = <el mismo string de .env.local>

vercel deploy
```

- [ ] **Step 7: Confirmar que el cron está registrado en Vercel**

Ir a Vercel dashboard → Project → Settings → Crons. Debe aparecer `/api/cron/reminders` con el schedule `0 12 * * *`.
