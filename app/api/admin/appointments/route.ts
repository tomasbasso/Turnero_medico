import { NextRequest } from 'next/server'
import { requireStaff } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { sendConfirmationEmail } from '@/lib/email'

const VALID_STATUSES = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'] as const
type ValidStatus = (typeof VALID_STATUSES)[number]

function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export async function GET(request: NextRequest) {
  const authResult = requireStaff(request)
  if (authResult instanceof Response) return authResult

  const { searchParams } = request.nextUrl
  const date     = searchParams.get('date')     // "YYYY-MM-DD" or null
  const doctorId = searchParams.get('doctorId') // numeric string or null
  const status   = searchParams.get('status')   // enum string or null
  const dni      = searchParams.get('dni')      // partial string or null

  // Build conditional where object
  const where: Record<string, unknown> = {}

  if (date) {
    // D-04 / TURNO-05: Use local-time constructor to avoid UTC timezone mismatch.
    // new Date("YYYY-MM-DD") parses as UTC midnight — wrong in UTC-3 (Argentina).
    // new Date(year, month-1, day) uses local time — matches @db.Date stored value.
    const [year, month, day] = date.split('-').map(Number)
    where.date = new Date(year, month - 1, day)
  }

  if (doctorId && !isNaN(Number(doctorId))) {
    where.doctorId = Number(doctorId)
  }

  if (status) {
    if (!VALID_STATUSES.includes(status as ValidStatus)) {
      return Response.json({ error: 'Estado inválido' }, { status: 400 })
    }
    where.status = status
  }

  if (dni) {
    where.patientDni = { contains: dni }
  }

  const appointments = await prisma.appointment.findMany({
    where,
    orderBy: [{ date: 'asc' }, { time: 'asc' }],
    include: {
      doctor: {
        select: { id: true, name: true },
      },
    },
    // Safety cap: prevent unbounded queries when no date filter is applied
    take: 200,
  })

  return Response.json({ appointments })
}

export async function POST(request: NextRequest) {
  const authResult = requireStaff(request)
  if (authResult instanceof Response) return authResult

  const body = await request.json().catch(() => null)
  if (!body) return Response.json({ error: 'Cuerpo requerido' }, { status: 400 })

  const {
    doctorId,
    date,
    time,
    durationMin,
    patientName,
    patientDni,
    patientPhone,
    patientEmail,
    patientInsurance,
    notes,
  } = body

  if (!doctorId || isNaN(Number(doctorId))) {
    return Response.json({ error: 'doctorId inválido' }, { status: 400 })
  }
  if (!date || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: 'Fecha inválida' }, { status: 400 })
  }
  if (!time || typeof time !== 'string' || !/^\d{2}:\d{2}$/.test(time)) {
    return Response.json({ error: 'Hora inválida' }, { status: 400 })
  }
  const reqDurRaw = Number(durationMin)
  if (!Number.isInteger(reqDurRaw) || reqDurRaw <= 0) {
    return Response.json({ error: 'Duración inválida.' }, { status: 400 })
  }
  if (!patientName || !String(patientName).trim()) {
    return Response.json({ error: 'El nombre es requerido' }, { status: 400 })
  }
  const dniClean = String(patientDni ?? '').replace(/[\s.]/g, '')
  if (!/^\d{7,8}$/.test(dniClean)) {
    return Response.json({ error: 'El DNI debe tener 7 u 8 dígitos numéricos.' }, { status: 400 })
  }
  const phoneClean = String(patientPhone ?? '').trim()
  if (!phoneClean) {
    return Response.json({ error: 'El teléfono es requerido.' }, { status: 400 })
  }

  const [year, month, day] = date.split('-').map(Number)
  const appointmentDate = new Date(year, month - 1, day)

  const doctor = await prisma.doctor.findUnique({
    where: { id: Number(doctorId), isActive: true },
    include: { specialty: { select: { name: true } } },
  })
  if (!doctor) {
    return Response.json({ error: 'Doctor no encontrado' }, { status: 404 })
  }

  if (reqDurRaw % doctor.durationMin !== 0) {
    return Response.json(
      { error: `La duración debe ser múltiplo de ${doctor.durationMin} min.` },
      { status: 400 }
    )
  }
  const reqDur = reqDurRaw

  const existing = await prisma.appointment.findMany({
    where: {
      doctorId: Number(doctorId),
      date: { gte: appointmentDate, lt: new Date(year, month - 1, day + 1) },
      status: { notIn: ['CANCELLED', 'NO_SHOW'] },
    },
    select: { time: true, durationMin: true },
  })

  const reqMin = timeToMin(time)
  const hasConflict = existing.some((a) => {
    const aMin = timeToMin(a.time)
    return aMin < reqMin + reqDur && aMin + a.durationMin > reqMin
  })

  if (hasConflict) {
    return Response.json(
      { error: 'El horario ya no está disponible, elegí otro slot.' },
      { status: 409 }
    )
  }

  const appointment = await prisma.appointment.create({
    data: {
      doctorId: Number(doctorId),
      date: appointmentDate,
      time: String(time),
      durationMin: reqDur,
      patientName: String(patientName).trim(),
      patientDni: dniClean,
      patientPhone: phoneClean,
      patientEmail: patientEmail?.trim() || null,
      patientInsurance: patientInsurance?.trim() || null,
      notes: notes?.trim() || null,
      status: 'CONFIRMED',
    },
  })

  if (appointment.patientEmail) {
    const claimed = await prisma.appointment.updateMany({
      where: { id: appointment.id, emailConfirmationSent: false },
      data: { emailConfirmationSent: true },
    })
    if (claimed.count === 1) {
      const result = await sendConfirmationEmail({
        to: appointment.patientEmail,
        patientName: appointment.patientName,
        doctorName: doctor.name,
        specialty: doctor.specialty.name,
        date: appointment.date,
        time: appointment.time,
        durationMin: appointment.durationMin,
      })
      if (!result.success) {
        console.error('[POST /api/admin/appointments] Email falló:', result.error)
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: { emailConfirmationSent: false },
        })
      }
    }
  }

  return Response.json({ appointment }, { status: 201 })
}
