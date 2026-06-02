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

  // Next.js 16: params is a Promise — must be awaited before destructuring
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

    if (body.status === 'CONFIRMED' && appointment.patientEmail && !appointment.emailConfirmationSent) {
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
