'use client'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, CalendarX } from 'lucide-react'
import { cn } from '@/lib/utils'

const BOOKING_WINDOW_DAYS = 30

type Slot = { time: string; available: boolean }

export function StepDateTime({
  doctorId,
  doctorName,
  selectedDate,
  selectedTime,
  onDaySelect,
  onTimeSelect,
  onConfirm,
  onBack,
}: {
  doctorId: number
  doctorName: string
  selectedDate: string | null
  selectedTime: string | null
  onDaySelect: (date: string) => void
  onTimeSelect: (time: string) => void
  onConfirm: () => void
  onBack: () => void
}) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [currentMonth, setCurrentMonth] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  })
  const [slots, setSlots] = useState<Slot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [noAvailability, setNoAvailability] = useState(false)

  const maxDate = new Date(today)
  maxDate.setDate(today.getDate() + BOOKING_WINDOW_DAYS)

  const firstDayOfWeek = new Date(currentMonth.year, currentMonth.month, 1).getDay()
  // Week starts Monday: Sunday(0) → 6 spaces, otherwise firstDayOfWeek - 1
  const leadingEmpty = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1
  const daysInMonth = new Date(currentMonth.year, currentMonth.month + 1, 0).getDate()

  const canGoPrev = !(
    currentMonth.year === today.getFullYear() && currentMonth.month === today.getMonth()
  )
  const canGoNext = new Date(currentMonth.year, currentMonth.month + 1, 1) <= maxDate

  function handlePrevMonth() {
    if (!canGoPrev) return
    setCurrentMonth((prev) => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 }
      return { year: prev.year, month: prev.month - 1 }
    })
  }

  function handleNextMonth() {
    if (!canGoNext) return
    setCurrentMonth((prev) => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 }
      return { year: prev.year, month: prev.month + 1 }
    })
  }

  function isDayAvailable(d: number) {
    const cellDate = new Date(currentMonth.year, currentMonth.month, d)
    return cellDate >= today && cellDate <= maxDate
  }

  function isToday(d: number) {
    const cellDate = new Date(currentMonth.year, currentMonth.month, d)
    return cellDate.toDateString() === today.toDateString()
  }

  function dateStr(d: number) {
    const y = currentMonth.year
    const m = String(currentMonth.month + 1).padStart(2, '0')
    const day = String(d).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  function handleDayClick(ds: string) {
    onDaySelect(ds)
    setSlots([])
    setLoadingSlots(true)
    setNoAvailability(false)
    fetch(`/api/public/slots?doctorId=${doctorId}&date=${ds}`)
      .then((r) => r.json())
      .then((data) => {
        const fetchedSlots: Slot[] = data.slots ?? []
        setSlots(fetchedSlots)
        if (fetchedSlots.length === 0 || fetchedSlots.every((s) => !s.available)) {
          setNoAvailability(true)
        }
      })
      .catch(() => {
        setSlots([])
        setNoAvailability(true)
      })
      .finally(() => setLoadingSlots(false))
  }

  const monthLabel = new Intl.DateTimeFormat('es-AR', {
    month: 'long',
    year: 'numeric',
  })
    .format(new Date(currentMonth.year, currentMonth.month))
    .replace(/^\w/, (c) => c.toUpperCase())

  return (
    <div>
      <h2 className="text-xl font-semibold font-display text-text-primary mb-1">
        Elegí la fecha y hora
      </h2>
      <p className="text-sm text-text-secondary mb-4">Dr./Dra. {doctorName}</p>

      <div className="bg-surface/60 backdrop-blur-sm rounded-xl border border-border p-4 mb-4">
        <div className="flex justify-between items-center mb-3">
          <button
            onClick={handlePrevMonth}
            disabled={!canGoPrev}
            aria-label="Mes anterior"
            className={cn('transition-opacity', !canGoPrev && 'opacity-30 cursor-not-allowed')}
          >
            <ChevronLeft className="h-5 w-5 text-text-secondary" />
          </button>
          <p className="text-base font-semibold font-display">{monthLabel}</p>
          <button
            onClick={handleNextMonth}
            disabled={!canGoNext}
            aria-label="Mes siguiente"
            className={cn('transition-opacity', !canGoNext && 'opacity-30 cursor-not-allowed')}
          >
            <ChevronRight className="h-5 w-5 text-text-secondary" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => (
            <div
              key={d}
              className="text-xs font-semibold uppercase text-text-muted text-center w-10 h-6 flex items-center justify-center"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: leadingEmpty }).map((_, i) => (
            <div key={`e${i}`} className="w-10 h-10 invisible" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const d = i + 1
            const ds = dateStr(d)
            const available = isDayAvailable(d)
            const selected = selectedDate === ds
            const todayMark = isToday(d)
            const monthName = new Intl.DateTimeFormat('es-AR', { month: 'long' }).format(
              new Date(currentMonth.year, currentMonth.month)
            )
            return (
              <div
                key={d}
                className={cn(
                  'w-10 h-10 flex items-center justify-center rounded-lg text-sm relative',
                  selected && 'btn-primary font-semibold',
                  !selected && available && 'bg-primary/10 text-primary font-semibold cursor-pointer hover:bg-primary/20',
                  !available && 'text-text-muted cursor-not-allowed'
                )}
                onClick={available ? () => handleDayClick(ds) : undefined}
                role={available ? 'button' : undefined}
                tabIndex={available ? 0 : -1}
                onKeyDown={
                  available
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          handleDayClick(ds)
                        }
                      }
                    : undefined
                }
                aria-label={`${d} de ${monthName}${selected ? ', seleccionado' : available ? ', disponible' : ', no disponible'}`}
              >
                {d}
                {todayMark && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent" />
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-text-secondary mb-2">
          Horarios disponibles
        </p>

        {!selectedDate && (
          <p className="text-sm text-text-muted text-center py-8">
            Seleccioná un día para ver los horarios
          </p>
        )}

        {selectedDate && loadingSlots && (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-border animate-pulse rounded-full h-10 w-20" />
            ))}
          </div>
        )}

        {selectedDate && noAvailability && !loadingSlots && (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
            <CalendarX className="h-10 w-10 text-text-muted" />
            <h3 className="text-base font-semibold font-display text-text-primary">
              Este médico no tiene turnos disponibles
            </h3>
            <p className="text-sm text-text-secondary">
              No hay horarios disponibles en los próximos 30 días. Podés elegir otro médico.
            </p>
            <button
              onClick={onBack}
              className="mt-2 px-4 py-2 rounded-lg border border-[rgba(13,148,136,0.3)] text-primary text-sm font-semibold transition-all hover:bg-primary/5"
            >
              ← Elegir otro médico
            </button>
          </div>
        )}

        {selectedDate && slots.length > 0 && !loadingSlots && (
          <AnimatePresence mode="wait">
            <div key={selectedDate} className="grid grid-cols-4 gap-2 sm:grid-cols-5">
              {slots.map((slot, i) => (
                <motion.button
                  key={slot.time}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut', delay: i * 0.03 }}
                  disabled={!slot.available}
                  onClick={slot.available ? () => onTimeSelect(slot.time) : undefined}
                  aria-label={`${slot.time}${selectedTime === slot.time ? ', seleccionado' : slot.available ? ', disponible' : ', ocupado'}`}
                  className={cn(
                    'rounded-full px-3 py-2 text-sm font-semibold min-h-[44px] flex items-center justify-center transition-all duration-150',
                    selectedTime === slot.time
                      ? 'btn-primary'
                      : slot.available
                        ? 'border border-accent/40 text-primary bg-primary/10 cursor-pointer hover:bg-primary/20'
                        : 'bg-background text-text-muted border border-border cursor-not-allowed opacity-60'
                  )}
                >
                  {slot.time}
                </motion.button>
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>

      <button
        onClick={selectedDate && selectedTime ? onConfirm : undefined}
        disabled={!selectedDate || !selectedTime}
        className={cn(
          'w-full rounded-lg py-3 text-sm font-semibold transition-all mt-6',
          selectedDate && selectedTime
            ? 'btn-primary'
            : 'opacity-50 cursor-not-allowed bg-border text-text-muted'
        )}
      >
        Confirmar horario
      </button>
    </div>
  )
}
