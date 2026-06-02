import { Resend } from 'resend'

// Lazy-initialize so the module can be imported in tests without RESEND_API_KEY set.
// The client is only constructed when sendConfirmationEmail / sendReminderEmail is called.
let _resend: Resend | null = null
function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY)
  }
  return _resend
}

// Cambiar por el dominio verificado en Resend. Para desarrollo usar: onboarding@resend.dev
const FROM_ADDRESS = 'Consultorio <turnos@tudominio.com>'

type EmailParams = {
  patientName: string
  doctorName: string
  specialty: string
  date: Date
  time: string
  durationMin: number
}

// Prisma @db.Date devuelve UTC midnight. Se usa timeZone: 'UTC' para
// que "2026-06-15T00:00:00Z" se muestre como 15 de junio (no 14).
//
// Se construye la cadena parte a parte porque distintas versiones de Node
// producen formatos distintos con la opción combinada (e.g. con o sin coma
// después del weekday). El resultado siempre es "lunes 15 de junio de 2026".
export function formatDateES(date: Date): string {
  const tz = { timeZone: 'UTC' } as const
  const weekday = date.toLocaleDateString('es-AR', { weekday: 'long', ...tz })
  const day = date.toLocaleDateString('es-AR', { day: 'numeric', ...tz })
  const month = date.toLocaleDateString('es-AR', { month: 'long', ...tz })
  const year = date.toLocaleDateString('es-AR', { year: 'numeric', ...tz })
  return `${weekday} ${day} de ${month} de ${year}`
}

export function buildConfirmationHtml(p: EmailParams): string {
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
      <h2 style="color:#0d9488">Tu turno está confirmado</h2>
      <p>Hola <strong>${p.patientName}</strong>,</p>
      <p>Tu turno fue confirmado con los siguientes datos:</p>
      <table style="border-collapse:collapse;width:100%">
        <tr><td style="padding:8px 0;color:#555;width:110px">Médico</td><td><strong>${p.doctorName}</strong></td></tr>
        <tr><td style="padding:8px 0;color:#555">Especialidad</td><td>${p.specialty}</td></tr>
        <tr><td style="padding:8px 0;color:#555">Fecha</td><td>${formatDateES(p.date)}</td></tr>
        <tr><td style="padding:8px 0;color:#555">Hora</td><td>${p.time}</td></tr>
        <tr><td style="padding:8px 0;color:#555">Duración</td><td>${p.durationMin} minutos</td></tr>
      </table>
      <p style="margin-top:24px;color:#555;font-size:14px">
        Si necesitás cancelar o reprogramar tu turno, comunicate con el consultorio con anticipación.
      </p>
    </div>
  `
}

export function buildReminderHtml(p: EmailParams): string {
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
      <h2 style="color:#0d9488">Recordatorio: tu turno es mañana</h2>
      <p>Hola <strong>${p.patientName}</strong>,</p>
      <p>Te recordamos que mañana tenés turno:</p>
      <table style="border-collapse:collapse;width:100%">
        <tr><td style="padding:8px 0;color:#555;width:110px">Médico</td><td><strong>${p.doctorName}</strong></td></tr>
        <tr><td style="padding:8px 0;color:#555">Especialidad</td><td>${p.specialty}</td></tr>
        <tr><td style="padding:8px 0;color:#555">Fecha</td><td>${formatDateES(p.date)}</td></tr>
        <tr><td style="padding:8px 0;color:#555">Hora</td><td>${p.time}</td></tr>
        <tr><td style="padding:8px 0;color:#555">Duración</td><td>${p.durationMin} minutos</td></tr>
      </table>
      <p style="margin-top:24px;color:#555;font-size:14px">
        Si necesitás cancelar, comunicate con el consultorio lo antes posible.
      </p>
    </div>
  `
}

type SendResult = { success: true } | { success: false; error: string }

export async function sendConfirmationEmail(params: {
  to: string
  patientName: string
  doctorName: string
  specialty: string
  date: Date
  time: string
  durationMin: number
}): Promise<SendResult> {
  try {
    await getResend().emails.send({
      from: FROM_ADDRESS,
      to: params.to,
      subject: `Tu turno está confirmado — ${params.doctorName} el ${formatDateES(params.date)} a las ${params.time}`,
      html: buildConfirmationHtml(params),
    })
    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function sendReminderEmail(params: {
  to: string
  patientName: string
  doctorName: string
  specialty: string
  date: Date
  time: string
  durationMin: number
}): Promise<SendResult> {
  try {
    await getResend().emails.send({
      from: FROM_ADDRESS,
      to: params.to,
      subject: `Recordatorio: tu turno es mañana — ${params.doctorName} a las ${params.time}`,
      html: buildReminderHtml(params),
    })
    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
