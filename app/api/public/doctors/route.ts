import { type NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const specialtyIdStr = request.nextUrl.searchParams.get('specialtyId')
  if (!specialtyIdStr || isNaN(parseInt(specialtyIdStr, 10))) {
    return Response.json({ error: 'specialtyId es requerido' }, { status: 400 })
  }
  try {
    const doctors = await prisma.doctor.findMany({
      where: { isActive: true, specialtyId: parseInt(specialtyIdStr, 10) },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, bio: true, avatar: true, durationMin: true },
    })
    return Response.json({ doctors })
  } catch {
    return Response.json({ error: 'Error al cargar médicos' }, { status: 500 })
  }
}
