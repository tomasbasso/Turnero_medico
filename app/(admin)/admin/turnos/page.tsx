import { prisma } from '@/lib/prisma'
import { AppointmentsList } from '@/components/admin/AppointmentsList'

export default async function TurnosPage() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [rawAppointments, doctors] = await Promise.all([
    prisma.appointment.findMany({
      where: { date: today },
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
      include: {
        doctor: { select: { id: true, name: true, durationMin: true } },
      },
    }),
    prisma.doctor.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, durationMin: true },
    }),
  ])

  // Serialize Date → string for the client component (matches JSON shape from API)
  const appointments = rawAppointments.map((a) => ({
    ...a,
    date: a.date.toISOString().split('T')[0],
  }))

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="font-display text-xl font-semibold text-text-primary">Turnos</h1>
      </div>
      <AppointmentsList initialData={appointments} doctors={doctors} />
    </div>
  )
}
