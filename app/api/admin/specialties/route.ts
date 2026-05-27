import { NextRequest } from 'next/server'
import { verifyToken, COOKIE_NAME } from '@/lib/auth'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value
  const payload = token ? verifyToken(token) : null
  if (!payload) return Response.json({ error: 'No autenticado' }, { status: 401 })

  const specialties = await prisma.specialty.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  })
  return Response.json({ specialties })
}

export async function POST(request: NextRequest) {
  const authResult = requireAdmin(request)
  if (authResult instanceof Response) return authResult

  const body = await request.json().catch(() => null)
  if (!body?.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    return Response.json({ error: 'El nombre es requerido' }, { status: 400 })
  }

  const { name, description, color } = body
  const specialty = await prisma.specialty.create({
    data: {
      name: name.trim(),
      description: description ?? null,
      color: color ?? '#0d9488',
    },
  })
  return Response.json({ specialty }, { status: 201 })
}
