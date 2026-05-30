import { type NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

const BOOKING_WINDOW_DAYS = 30

function generateSlots(startTime: string, endTime: string, durationMin: number): string[] {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  let cur = sh * 60 + sm
  const end = eh * 60 + em
  const slots: string[] = []
  while (cur + durationMin <= end) {
    const h = String(Math.floor(cur / 60)).padStart(2, '0')
    const m = String(cur % 60).padStart(2, '0')
    slots.push(`${h}:${m}`)
    cur += durationMin
  }
  return slots
}

function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export async function GET(request: NextRequest) {
  const doctorIdStr = request.nextUrl.searchParams.get('doctorId')
  const dateStr = request.nextUrl.searchParams.get('date')
  const durationMinStr = request.nextUrl.searchParams.get('durationMin')

  if (!doctorIdStr || !dateStr) {
    return Response.json({ error: 'doctorId y date son requeridos' }, { status: 400 })
  }

  const doctorId = parseInt(doctorIdStr, 10)
  if (isNaN(doctorId)) {
    return Response.json({ error: 'doctorId inválido' }, { status: 400 })
  }

  const [year, month, day] = dateStr.split('-').map(Number)
  const targetDate = new Date(year, month - 1, day)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const maxDate = new Date(today)
  maxDate.setDate(today.getDate() + BOOKING_WINDOW_DAYS)

  if (targetDate < today || targetDate > maxDate) {
    return Response.json({ slots: [] })
  }

  const dayOfWeek = targetDate.getDay()

  try {
    const [doctor, existingAppointments, timeOff] = await Promise.all([
      prisma.doctor.findUnique({
        where: { id: doctorId, isActive: true },
        include: { availabilities: { where: { dayOfWeek } } },
      }),
      prisma.appointment.findMany({
        where: {
          doctorId,
          date: { gte: targetDate, lt: new Date(year, month - 1, day + 1) },
          status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        },
        select: { time: true, durationMin: true },
      }),
      prisma.timeOff.findFirst({
        where: {
          doctorId,
          startDate: { lte: targetDate },
          endDate: { gte: targetDate },
        },
        select: { id: true },
      }),
    ])

    if (!doctor) {
      return Response.json({ error: 'Médico no encontrado' }, { status: 404 })
    }

    if (timeOff) {
      return Response.json({ slots: [] })
    }

    // Use query param duration if provided and valid; otherwise fall back to doctor default
    const parsedDur = durationMinStr ? parseInt(durationMinStr, 10) : NaN
    const requestedDur = !isNaN(parsedDur) && parsedDur > 0 ? parsedDur : doctor.durationMin

    const slots = doctor.availabilities
      .flatMap((av) => generateSlots(av.startTime, av.endTime, doctor.durationMin))
      .map((slotTime) => {
        const tMin = timeToMin(slotTime)
        const available = !existingAppointments.some((a) => {
          const aMin = timeToMin(a.time)
          // Overlap: existing appointment range [aMin, aMin+aDur) overlaps with [tMin, tMin+requestedDur)
          return aMin < tMin + requestedDur && aMin + a.durationMin > tMin
        })
        return { time: slotTime, available }
      })
      .sort((a, b) => a.time.localeCompare(b.time))

    return Response.json({ slots })
  } catch {
    return Response.json({ error: 'Error al obtener slots' }, { status: 500 })
  }
}
