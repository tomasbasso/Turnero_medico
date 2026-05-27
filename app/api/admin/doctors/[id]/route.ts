import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = requireAdmin(request)
  if (authResult instanceof Response) return authResult

  const { id } = await params
  const numericId = parseInt(id, 10)
  if (isNaN(numericId)) return Response.json({ error: 'ID inválido' }, { status: 400 })

  const body = await request.json().catch(() => null)
  if (!body) return Response.json({ error: 'Cuerpo requerido' }, { status: 400 })

  const { name, specialtyId, bio, phone, durationMin, avatar } = body
  const updateData: Record<string, unknown> = {}
  if (name !== undefined) updateData.name = (name as string).trim()
  if (specialtyId !== undefined) updateData.specialtyId = Number(specialtyId)
  if (bio !== undefined) updateData.bio = bio
  if (phone !== undefined) updateData.phone = phone
  if (durationMin !== undefined) updateData.durationMin = Number(durationMin)
  if (avatar !== undefined) updateData.avatar = avatar

  const doctor = await prisma.doctor.update({
    where: { id: numericId },
    data: updateData,
  })
  return Response.json({ doctor })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = requireAdmin(request)
  if (authResult instanceof Response) return authResult

  const { id } = await params
  const numericId = parseInt(id, 10)
  if (isNaN(numericId)) return Response.json({ error: 'ID inválido' }, { status: 400 })

  await prisma.doctor.update({
    where: { id: numericId },
    data: { isActive: false },
  })
  return Response.json({ ok: true })
}
