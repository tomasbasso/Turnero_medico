import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { SpecialtiesList } from '@/components/admin/SpecialtiesList'

export default async function EspecialidadesPage() {
  const headersList = await headers()
  const role = headersList.get('x-user-role') as 'ADMIN' | 'RECEPTIONIST'

  const specialties = await prisma.specialty.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="font-display text-xl font-semibold text-text-primary">Especialidades</h1>
      </div>
      <SpecialtiesList specialties={specialties} role={role} />
    </div>
  )
}
