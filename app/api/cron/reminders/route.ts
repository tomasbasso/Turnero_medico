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
