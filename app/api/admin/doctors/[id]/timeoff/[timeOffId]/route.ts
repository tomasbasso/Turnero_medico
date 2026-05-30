import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; timeOffId: string }> }
) {
  const authResult = requireAdmin(request)
  if (authResult instanceof Response) return authResult

  const { id, timeOffId } = await params
  const doctorId = parseInt(id, 10)
  const numericId = parseInt(timeOffId, 10)
  if (isNaN(doctorId) || isNaN(numericId)) {
    return Response.json({ error: 'ID inválido' }, { status: 400 })
  }

  try {
    // Scope delete to the doctor so a stray timeOffId can't touch another doctor's row.
    const result = await prisma.timeOff.deleteMany({
      where: { id: numericId, doctorId },
    })
    if (result.count === 0) {
      return Response.json({ error: 'Bloqueo no encontrado' }, { status: 404 })
    }
    return Response.json({ ok: true })
  } catch {
    return Response.json({ error: 'No se pudo eliminar el bloqueo' }, { status: 500 })
  }
}
