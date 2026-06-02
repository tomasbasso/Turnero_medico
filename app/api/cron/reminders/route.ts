import { type NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendReminderEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET) {
    console.error('[cron/reminders] CRON_SECRET no está configurada')
    return Response.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.RESEND_API_KEY) {
    console.error('[cron/reminders] RESEND_API_KEY no está configurada')
    return Response.json({ error: 'Server misconfigured' }, { status: 500 })
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
  let skipped = 0

  for (const appt of appointments) {
    try {
      if (!appt.patientEmail) {
        skipped++
        continue
      }

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
    } catch (err) {
      console.error(`[cron/reminders] Error inesperado en turno ${appt.id}:`, err)
      errors++
    }
  }

  const statusCode = sent === 0 && errors > 0 ? 500 : 200
  return Response.json({ sent, errors, skipped }, { status: statusCode })
}
