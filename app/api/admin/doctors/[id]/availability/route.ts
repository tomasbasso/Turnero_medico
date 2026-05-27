import { NextRequest } from 'next/server'
import { verifyToken, COOKIE_NAME } from '@/lib/auth'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.cookies.get(COOKIE_NAME)?.value
  const payload = token ? verifyToken(token) : null
  if (!payload) return Response.json({ error: 'No autenticado' }, { status: 401 })

  const { id } = await params
  const doctorId = parseInt(id, 10)

  const availabilities = await prisma.availability.findMany({
    where: { doctorId },
    orderBy: { dayOfWeek: 'asc' },
  })
  return Response.json({ availabilities })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = requireAdmin(request)
  if (authResult instanceof Response) return authResult

  const { id } = await params
  const doctorId = parseInt(id, 10)
  if (isNaN(doctorId)) return Response.json({ error: 'ID inválido' }, { status: 400 })

  const body = await request.json().catch(() => null)
  if (!Array.isArray(body?.availabilities)) {
    return Response.json({ error: 'availabilities debe ser un array' }, { status: 400 })
  }

  for (const item of body.availabilities) {
    if (item.endTime <= item.startTime) {
      return Response.json(
        { error: 'La hora de fin debe ser posterior a la hora de inicio' },
        { status: 400 }
      )
    }
  }

  await prisma.$transaction([
    prisma.availability.deleteMany({ where: { doctorId } }),
    prisma.availability.createMany({
      data: body.availabilities.map((a: { dayOfWeek: number; startTime: string; endTime: string }) => ({
        doctorId,
        dayOfWeek: a.dayOfWeek,
        startTime: a.startTime,
        endTime: a.endTime,
      })),
    }),
  ])

  return Response.json({ ok: true })
}
