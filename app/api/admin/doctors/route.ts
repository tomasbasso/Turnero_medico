import { NextRequest } from 'next/server'
import { verifyToken, COOKIE_NAME } from '@/lib/auth'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value
  const payload = token ? verifyToken(token) : null
  if (!payload) return Response.json({ error: 'No autenticado' }, { status: 401 })

  const doctors = await prisma.doctor.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    include: {
      specialty: { select: { id: true, name: true, color: true } },
    },
  })
  return Response.json({ doctors })
}

export async function POST(request: NextRequest) {
  const authResult = requireAdmin(request)
  if (authResult instanceof Response) return authResult

  const body = await request.json().catch(() => null)
  if (!body?.name || !body?.specialtyId) {
    return Response.json({ error: 'Nombre y especialidad son requeridos' }, { status: 400 })
  }

  const { name, specialtyId, bio, phone, durationMin } = body
  const doctor = await prisma.doctor.create({
    data: {
      name: (name as string).trim(),
      specialtyId: Number(specialtyId),
      bio: bio ?? null,
      phone: phone ?? null,
      durationMin: Number(durationMin ?? 30),
    },
  })
  return Response.json({ doctor }, { status: 201 })
}
