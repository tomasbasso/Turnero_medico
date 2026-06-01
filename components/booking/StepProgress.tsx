'use client'
import { cn } from '@/lib/utils'
import { Stethoscope, UserRound, CalendarDays, ClipboardList, CheckCircle2 } from 'lucide-react'

const STEPS = [
  { label: 'Especialidad', icon: Stethoscope },
  { label: 'Médico',       icon: UserRound },
  { label: 'Fecha y hora', icon: CalendarDays },
  { label: 'Tus datos',    icon: ClipboardList },
  { label: 'Confirmación', icon: CheckCircle2 },
]

export function StepProgress({ currentStep }: { currentStep: 1 | 2 | 3 | 4 | 5 }) {
  return (
    <div
      className="flex flex-col gap-3 mb-7"
      aria-label={`Paso ${currentStep} de 5: ${STEPS[currentStep - 1].label}`}
    >
      {/* Step circles + connectors */}
      <div className="flex items-center w-full">
        {STEPS.map(({ icon: Icon }, i) => {
          const done    = i + 1 < currentStep
          const current = i + 1 === currentStep

          return (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              {/* Connector */}
              {i > 0 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 transition-all duration-300',
                    i < currentStep ? 'bg-primary' : 'bg-border'
                  )}
                />
              )}

              {/* Circle */}
              <div
                className={cn(
                  'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-all duration-300',
                  done    && 'bg-primary text-white dark:text-[#04211e]',
                  current && 'bg-primary text-white dark:text-[#04211e] ring-4 ring-primary/20',
                  !done && !current && 'bg-surface text-text-muted ring-1 ring-border',
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
            </div>
          )
        })}
      </div>

      {/* Step labels */}
      <div className="flex items-start w-full">
        {STEPS.map(({ label }, i) => {
          const done    = i + 1 < currentStep
          const current = i + 1 === currentStep
          return (
            <div
              key={i}
              className={cn(
                'flex-1 text-center text-[10px] font-medium leading-tight transition-colors',
                current  ? 'text-primary' : done ? 'text-text-secondary' : 'text-text-muted',
                i === 0 && 'text-left',
                i === STEPS.length - 1 && 'text-right flex-none',
              )}
            >
              {label}
            </div>
          )
        })}
      </div>
    </div>
  )
}
