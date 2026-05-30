import { NextRequest } from 'next/server'
import { requireStaff } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

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
          select: { id: true, name: true },
        },
      },
    })
    return Response.json({ appointment })
  } catch (error) {
    // P2025: Record not found
    if ((error as { code?: string }).code === 'P2025') {
      return Response.json({ error: 'Turno no encontrado' }, { status: 404 })
    }
    throw error
  }
}
