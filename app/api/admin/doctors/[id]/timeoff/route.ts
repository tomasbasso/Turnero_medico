import { NextRequest } from 'next/server'
import { verifyToken, COOKIE_NAME } from '@/lib/auth'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

// Local-time constructor: avoids the UTC-midnight shift that breaks @db.Date in UTC-3.
function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.cookies.get(COOKIE_NAME)?.value
  const payload = token ? verifyToken(token) : null
  if (!payload) return Response.json({ error: 'No autenticado' }, { status: 401 })

  const { id } = await params
  const doctorId = parseInt(id, 10)
  if (isNaN(doctorId)) return Response.json({ error: 'ID inválido' }, { status: 400 })

  const timeOff = await prisma.timeOff.findMany({
    where: { doctorId },
    orderBy: { startDate: 'asc' },
  })
  return Response.json({ timeOff })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = requireAdmin(request)
  if (authResult instanceof Response) return authResult

  const { id } = await params
  const doctorId = parseInt(id, 10)
  if (isNaN(doctorId)) return Response.json({ error: 'ID inválido' }, { status: 400 })

  const body = await request.json().catch(() => null)
  const startDate = body?.startDate
  const endDate = body?.endDate

  if (typeof startDate !== 'string' || !DATE_RE.test(startDate)) {
    return Response.json({ error: 'Fecha de inicio inválida' }, { status: 400 })
  }
  if (typeof endDate !== 'string' || !DATE_RE.test(endDate)) {
    return Response.json({ error: 'Fecha de fin inválida' }, { status: 400 })
  }
  if (endDate < startDate) {
    return Response.json(
      { error: 'La fecha de fin debe ser igual o posterior a la de inicio' },
      { status: 400 }
    )
  }

  const timeOff = await prisma.timeOff.create({
    data: {
      doctorId,
      startDate: parseLocalDate(startDate),
      endDate: parseLocalDate(endDate),
      reason: typeof body?.reason === 'string' && body.reason.trim() ? body.reason.trim() : null,
    },
  })
  return Response.json({ timeOff }, { status: 201 })
}
