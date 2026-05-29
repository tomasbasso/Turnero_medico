import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

const VALID_STATUSES = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'] as const
type ValidStatus = (typeof VALID_STATUSES)[number]

export async function GET(request: NextRequest) {
  const authResult = requireAdmin(request)
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
