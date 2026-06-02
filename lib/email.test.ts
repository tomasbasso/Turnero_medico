import { describe, it, expect } from 'vitest'
import { formatDateES, buildConfirmationHtml, buildReminderHtml } from './email'

describe('formatDateES', () => {
  it('formatea fecha en español usando UTC', () => {
    // Prisma @db.Date returns UTC midnight — use Date.UTC to match
    const date = new Date(Date.UTC(2026, 5, 15)) // 2026-06-15T00:00:00.000Z
    expect(formatDateES(date)).toBe('lunes 15 de junio de 2026')
  })
})

describe('buildConfirmationHtml', () => {
  it('incluye nombre del paciente, médico y hora', () => {
    const html = buildConfirmationHtml({
      patientName: 'Ana García',
      doctorName: 'Dr. López',
      specialty: 'Cardiología',
      date: new Date(Date.UTC(2026, 5, 15)),
      time: '10:30',
      durationMin: 20,
    })
    expect(html).toContain('Ana García')
    expect(html).toContain('Dr. López')
    expect(html).toContain('Cardiología')
    expect(html).toContain('10:30')
    expect(html).toContain('20 minutos')
  })
})

describe('buildReminderHtml', () => {
  it('incluye mañana, nombre del médico y hora', () => {
    const html = buildReminderHtml({
      patientName: 'Ana García',
      doctorName: 'Dr. López',
      specialty: 'Cardiología',
      date: new Date(Date.UTC(2026, 5, 15)),
      time: '10:30',
      durationMin: 20,
    })
    expect(html).toContain('mañana')
    expect(html).toContain('Dr. López')
    expect(html).toContain('10:30')
  })
})
