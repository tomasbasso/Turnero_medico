import { prisma } from '@/lib/prisma'
import { StatCard } from '@/components/admin/StatCard'
import { getWeekRange, formatDate } from '@/lib/utils'

export default async function AdminDashboardPage() {
  const { monday, sunday } = getWeekRange()

  const counts = await prisma.appointment.groupBy({
    by: ['status'],
    where: {
      date: { gte: monday, lte: sunday },
    },
    _count: { _all: true },
  })

  const stats = { PENDING: 0, CONFIRMED: 0, COMPLETED: 0, CANCELLED: 0 }
  for (const row of counts) {
    stats[row.status as keyof typeof stats] = row._count._all
  }

  const subtitle = `Semana del ${formatDate(monday)} al ${formatDate(sunday)}`

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="font-display text-xl font-semibold text-text-primary">Dashboard</h1>
        <p className="text-sm text-text-secondary mt-1">{subtitle}</p>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard status="PENDING" count={stats.PENDING} />
        <StatCard status="CONFIRMED" count={stats.CONFIRMED} />
        <StatCard status="COMPLETED" count={stats.COMPLETED} />
        <StatCard status="CANCELLED" count={stats.CANCELLED} />
      </div>
    </div>
  )
}
