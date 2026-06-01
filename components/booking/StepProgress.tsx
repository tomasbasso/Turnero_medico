'use client'
import { cn } from '@/lib/utils'

const LABELS = ['Especialidad', 'Médico', 'Fecha y hora', 'Tus datos', 'Confirmación']

export function StepProgress({ currentStep }: { currentStep: 1 | 2 | 3 | 4 | 5 }) {
  return (
    <div
      className="flex flex-col items-center gap-2 mb-6"
      aria-label={`Paso ${currentStep} de 5: ${LABELS[currentStep - 1]}`}
    >
      <div className="flex items-center w-full max-w-sm mx-auto">
        {LABELS.map((_, i) => (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            {i > 0 && (
              <div
                className={cn(
                  'flex-1 h-0.5 transition-all',
                  i < currentStep ? 'bg-primary' : 'bg-border'
                )}
              />
            )}
            <div
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-all',
                i + 1 <= currentStep
                  ? 'bg-primary text-white dark:text-[#04211e]'
                  : 'bg-surface text-text-muted ring-1 ring-border'
              )}
            >
              {i + 1}
            </div>
          </div>
        ))}
      </div>
      <p className="text-sm text-text-secondary text-center">{LABELS[currentStep - 1]}</p>
    </div>
  )
}
