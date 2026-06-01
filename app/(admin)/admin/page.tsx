import Link from 'next/link'
import { CalendarPlus } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { StatCard } from '@/components/admin/StatCard'
import { getWeekRange, formatDate } from '@/lib/utils'

// ─── Helper: group by status ──────────────────────────────────────────────────
function buildStats(rows: { status: string; _count: { _all: number } }[]) {
  const stats: Record<string, number> = { PENDING: 0, CONFIRMED: 0, COMPLETED: 0, CANCELLED: 0 }
  for (const row of rows) {
    if (row.status in stats) stats[row.status] = row._count._all
  }
  return stats
}

export default async function AdminDashboardPage() {
  const { monday, sunday } = getWeekRange()

  // Previous week range
  const prevMonday = new Date(monday); prevMonday.setDate(monday.getDate() - 7)
  const prevSunday = new Date(sunday);  prevSunday.setDate(sunday.getDate() - 7)

  // Parallel queries: this week + previous week
  const [thisWeek, prevWeek] = await Promise.all([
    prisma.appointment.groupBy({
      by: ['status'],
      where: { date: { gte: monday, lte: sunday } },
      _count: { _all: true },
    }),
    prisma.appointment.groupBy({
      by: ['status'],
      where: { date: { gte: prevMonday, lte: prevSunday } },
      _count: { _all: true },
    }),
  ])

  const stats     = buildStats(thisWeek)
  const prevStats = buildStats(prevWeek)

  // Trend = this - prev
  function trend(status: string) {
    return stats[status] - prevStats[status]
  }

  const subtitle = `Semana del ${formatDate(monday)} al ${formatDate(sunday)}`

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold text-text-primary">Dashboard</h1>
          <p className="text-sm text-text-secondary mt-1">{subtitle}</p>
        </div>
        <Link
          href="/reservar"
          className="btn-primary flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold"
        >
          <CalendarPlus className="h-4 w-4" />
          Agendar turno
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard status="PENDING"   count={stats.PENDING}   trend={trend('PENDING')} />
        <StatCard status="CONFIRMED" count={stats.CONFIRMED} trend={trend('CONFIRMED')} />
        <StatCard status="COMPLETED" count={stats.COMPLETED} trend={trend('COMPLETED')} />
        <StatCard status="CANCELLED" count={stats.CANCELLED} trend={trend('CANCELLED')} />
      </div>
    </div>
  )
}
