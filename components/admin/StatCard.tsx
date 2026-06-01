import { cn, STATUS_LABELS, STATUS_COLORS } from '@/lib/utils'
import { Clock, CheckCircle2, CheckCheck, XCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react'

const STATUS_BG: Record<string, string> = {
  PENDING:   'bg-status-pending-bg',
  CONFIRMED: 'bg-status-confirmed-bg',
  COMPLETED: 'bg-status-completed-bg',
  CANCELLED: 'bg-status-cancelled-bg',
}

const STATUS_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  PENDING:   Clock,
  CONFIRMED: CheckCircle2,
  COMPLETED: CheckCheck,
  CANCELLED: XCircle,
}

interface StatCardProps {
  status: string
  count: number
  /** Diferencia vs semana anterior (positivo = sube, negativo = baja, undefined = sin datos) */
  trend?: number
}

function TrendBadge({ trend }: { trend: number }) {
  if (trend > 0) {
    return (
      <span className="flex items-center gap-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
        <TrendingUp className="h-3 w-3" />
        +{trend}
      </span>
    )
  }
  if (trend < 0) {
    return (
      <span className="flex items-center gap-0.5 text-xs font-medium text-rose-500 dark:text-rose-400">
        <TrendingDown className="h-3 w-3" />
        {trend}
      </span>
    )
  }
  return (
    <span className="flex items-center gap-0.5 text-xs font-medium text-text-muted">
      <Minus className="h-3 w-3" />
      igual
    </span>
  )
}

export function StatCard({ status, count, trend }: StatCardProps) {
  const Icon = STATUS_ICONS[status] ?? Clock
  return (
    <div className={cn('card-lift bg-surface rounded-xl shadow-card p-5 border border-border overflow-hidden relative')}>
      {/* Tonal background accent */}
      <div className={cn('absolute inset-0 opacity-40', STATUS_BG[status])} />

      <div className="relative z-10">
        {/* Top row: icon + label */}
        <div className="flex items-center justify-between mb-3">
          <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', STATUS_BG[status])}>
            <Icon className={cn('h-4 w-4', STATUS_COLORS[status])} />
          </div>
          {trend !== undefined && <TrendBadge trend={trend} />}
        </div>

        {/* Count */}
        <p className="font-display text-3xl font-bold text-text-primary">{count}</p>

        {/* Label */}
        <p className={cn('text-xs font-semibold mt-0.5', STATUS_COLORS[status])}>
          {STATUS_LABELS[status]}
        </p>

        <p className="text-xs text-text-muted mt-1">esta semana</p>
      </div>
    </div>
  )
}
