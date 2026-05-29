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

export async function GET(request: NextRequest) {
  const doctorIdStr = request.nextUrl.searchParams.get('doctorId')
  const dateStr = request.nextUrl.searchParams.get('date')

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

  // Seed uses dayOfWeek: 1=Monday ... 6=Saturday, 0=Sunday — matches JS Date.getDay()
  const dayOfWeek = targetDate.getDay()

  try {
    const [doctor, existingAppointments] = await Promise.all([
      prisma.doctor.findUnique({
        where: { id: doctorId, isActive: true },
        include: { availabilities: { where: { dayOfWeek } } },
      }),
      prisma.appointment.findMany({
        where: {
          doctorId,
          date: { gte: targetDate, lt: new Date(year, month - 1, day + 1) },
          status: { not: 'CANCELLED' },
        },
        select: { time: true },
      }),
    ])

    if (!doctor) {
      return Response.json({ error: 'Médico no encontrado' }, { status: 404 })
    }

    const bookedTimes = new Set(existingAppointments.map((a) => a.time))
    const slots = doctor.availabilities
      .flatMap((av) => generateSlots(av.startTime, av.endTime, doctor.durationMin))
      .map((time) => ({ time, available: !bookedTimes.has(time) }))
      .sort((a, b) => a.time.localeCompare(b.time))

    return Response.json({ slots })
  } catch {
    return Response.json({ error: 'Error al obtener slots' }, { status: 500 })
  }
}
