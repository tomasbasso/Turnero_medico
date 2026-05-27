import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { DoctorsList } from '@/components/admin/DoctorsList'

export default async function MedicosPage() {
  const headersList = await headers()
  const role = headersList.get('x-user-role') as 'ADMIN' | 'RECEPTIONIST'

  const [specialties, doctors] = await Promise.all([
    prisma.specialty.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, color: true },
    }),
    prisma.doctor.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: {
        specialty: { select: { id: true, name: true, color: true } },
      },
    }),
  ])

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="font-display text-xl font-semibold text-text-primary">Médicos</h1>
      </div>
      <DoctorsList doctors={doctors} specialties={specialties} role={role} />
    </div>
  )
}
