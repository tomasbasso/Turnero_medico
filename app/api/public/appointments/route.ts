import { type NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!body) return Response.json({ error: 'Cuerpo requerido' }, { status: 400 })

  const { doctorId, date, time, patientName, patientDni, patientPhone, patientEmail, patientInsurance } = body

  if (!patientName || !String(patientName).trim()) {
    return Response.json({ error: 'El nombre es requerido' }, { status: 400 })
  }
  if (!doctorId || isNaN(Number(doctorId))) {
    return Response.json({ error: 'doctorId inválido' }, { status: 400 })
  }
  if (!date || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: 'Fecha inválida' }, { status: 400 })
  }
  if (!time || typeof time !== 'string') {
    return Response.json({ error: 'Hora inválida' }, { status: 400 })
  }

  const dniClean = String(patientDni ?? '').replace(/[\s.]/g, '')
  if (!/^\d{7,8}$/.test(dniClean)) {
    return Response.json({ error: 'El DNI debe tener 7 u 8 dígitos numéricos.' }, { status: 400 })
  }

  const phoneClean = String(patientPhone ?? '').replace(/\D/g, '')
  if (phoneClean.length !== 10) {
    return Response.json({ error: 'El teléfono debe tener exactamente 10 dígitos.' }, { status: 400 })
  }

  if (patientEmail && typeof patientEmail === 'string' && patientEmail.trim() !== '') {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patientEmail.trim())) {
      return Response.json({ error: 'Ingresá un email válido.' }, { status: 400 })
    }
  }

  const [year, month, day] = date.split('-').map(Number)
  const appointmentDate = new Date(year, month - 1, day)

  try {
    const appointment = await prisma.appointment.create({
      data: {
        doctorId: Number(doctorId),
        date: appointmentDate,
        time: String(time),
        patientName: String(patientName).trim(),
        patientDni: dniClean,
        patientPhone: phoneClean,
        patientEmail: patientEmail?.trim() || null,
        patientInsurance: patientInsurance?.trim() || null,
        status: 'PENDING',
      },
    })
    return Response.json({ appointment }, { status: 201 })
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
      return Response.json(
        { error: 'Este turno ya fue reservado. Elegí otro horario.' },
        { status: 409 }
      )
    }
    console.error('[POST /api/public/appointments]', error)
    return Response.json({ error: 'Error al crear el turno' }, { status: 500 })
  }
}
