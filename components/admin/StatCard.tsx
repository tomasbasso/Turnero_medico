import { cn, STATUS_LABELS, STATUS_COLORS } from '@/lib/utils'
import { Clock, CheckCircle2, CheckCheck, XCircle } from 'lucide-react'

const STATUS_BORDER: Record<string, string> = {
  PENDING: 'border-status-pending',
  CONFIRMED: 'border-status-confirmed',
  COMPLETED: 'border-status-completed',
  CANCELLED: 'border-status-cancelled',
}

const STATUS_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  PENDING: Clock,
  CONFIRMED: CheckCircle2,
  COMPLETED: CheckCheck,
  CANCELLED: XCircle,
}

interface StatCardProps {
  status: string
  count: number
}

export function StatCard({ status, count }: StatCardProps) {
  const Icon = STATUS_ICONS[status] ?? Clock
  return (
    <div className={cn('card-lift bg-surface rounded-xl shadow-card p-6 border-l-4', STATUS_BORDER[status])}>
      <div className="flex items-center justify-between mb-2">
        <span className={cn('text-xs', STATUS_COLORS[status])}>{STATUS_LABELS[status]}</span>
        <Icon className={cn('h-4 w-4', STATUS_COLORS[status])} />
      </div>
      <p className="font-display text-3xl font-semibold text-text-primary">{count}</p>
      <p className="text-xs text-text-secondary mt-1">turnos esta semana</p>
    </div>
  )
}
