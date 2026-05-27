import { headers } from 'next/headers'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { AvailabilityEditor } from '@/components/admin/AvailabilityEditor'

export default async function DisponibilidadPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const doctorId = parseInt(id, 10)

  const headersList = await headers()
  const role = headersList.get('x-user-role') as 'ADMIN' | 'RECEPTIONIST'

  const [doctor, availabilities] = await Promise.all([
    prisma.doctor.findUnique({
      where: { id: doctorId },
      select: { id: true, name: true },
    }),
    prisma.availability.findMany({
      where: { doctorId },
      orderBy: { dayOfWeek: 'asc' },
    }),
  ])

  if (!doctor) {
    return (
      <div className="p-6">
        <p className="text-text-secondary">Médico no encontrado.</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <Link
        href="/admin/medicos"
        className="text-sm text-accent hover:text-primary transition-colors mb-6 inline-block"
      >
        ← Volver a Médicos
      </Link>
      <h1 className="font-display text-xl font-semibold text-text-primary mb-6">
        Disponibilidad — {doctor.name}
      </h1>
      <AvailabilityEditor
        doctorId={doctorId}
        initialAvailabilities={availabilities}
        role={role}
      />
    </div>
  )
}
