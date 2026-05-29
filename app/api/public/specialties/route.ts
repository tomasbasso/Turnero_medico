import { type NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_request: NextRequest) {
  try {
    const specialties = await prisma.specialty.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, color: true },
    })
    return Response.json({ specialties })
  } catch {
    return Response.json({ error: 'Error al cargar especialidades' }, { status: 500 })
  }
}
