import type { Metadata } from 'next'
import { BookingWizard } from '@/components/booking/BookingWizard'

export const metadata: Metadata = {
  title: 'Reservar turno — Consultorio Médico',
  description: 'Reservá tu turno médico en línea, sin registrarte.',
}

export default function ReservarPage() {
  return <BookingWizard />
}
