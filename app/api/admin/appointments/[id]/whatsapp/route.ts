import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = requireAdmin(request)
  if (authResult instanceof Response) return authResult

  // Next.js 16: params is a Promise — must be awaited before destructuring
  const { id } = await params
  const numericId = parseInt(id, 10)
  if (isNaN(numericId)) {
    return Response.json({ error: 'ID inválido' }, { status: 400 })
  }

  try {
    // Always sets whatsappSent: true — no body validation needed
    await prisma.appointment.update({
      where: { id: numericId },
      data: { whatsappSent: true },
    })
    return Response.json({ ok: true })
  } catch (error) {
    // P2025: Record not found
    if ((error as { code?: string }).code === 'P2025') {
      return Response.json({ error: 'Turno no encontrado' }, { status: 404 })
    }
    throw error
  }
}
