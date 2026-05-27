import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ── Especialidades ──────────────────────────────────────────────
  const especialidades = await Promise.all([
    prisma.specialty.upsert({
      where: { name: 'Cardiología' },
      update: {},
      create: { name: 'Cardiología', description: 'Enfermedades del corazón y sistema circulatorio', color: '#ef4444' },
    }),
    prisma.specialty.upsert({
      where: { name: 'Pediatría' },
      update: {},
      create: { name: 'Pediatría', description: 'Medicina para niños y adolescentes', color: '#3b82f6' },
    }),
    prisma.specialty.upsert({
      where: { name: 'Traumatología' },
      update: {},
      create: { name: 'Traumatología', description: 'Lesiones del sistema músculo-esquelético', color: '#f59e0b' },
    }),
    prisma.specialty.upsert({
      where: { name: 'Clínica General' },
      update: {},
      create: { name: 'Clínica General', description: 'Atención médica general y preventiva', color: '#0d9488' },
    }),
    prisma.specialty.upsert({
      where: { name: 'Urgencias' },
      update: {},
      create: { name: 'Urgencias', description: 'Atención de urgencias y emergencias', color: '#8b5cf6' },
    }),
  ])

  console.log(`✅ ${especialidades.length} especialidades creadas`)

  // ── Médicos ─────────────────────────────────────────────────────
  const [cardio, pediatria, trauma, clinica] = especialidades

  const medicos = await Promise.all([
    prisma.doctor.upsert({
      where: { id: 1 },
      update: {},
      create: {
        name: 'Dr. Carlos Mendoza',
        specialtyId: cardio.id,
        bio: 'Cardiólogo con 15 años de experiencia.',
        phone: '11-4567-8901',
        durationMin: 20,
        availabilities: {
          create: [
            { dayOfWeek: 1, startTime: '09:00', endTime: '13:00' },
            { dayOfWeek: 3, startTime: '09:00', endTime: '13:00' },
            { dayOfWeek: 5, startTime: '09:00', endTime: '12:00' },
          ],
        },
      },
    }),
    prisma.doctor.upsert({
      where: { id: 2 },
      update: {},
      create: {
        name: 'Dra. Lucía Paz',
        specialtyId: pediatria.id,
        bio: 'Pediatra especializada en neonatología.',
        phone: '11-8930-1092',
        durationMin: 30,
        availabilities: {
          create: [
            { dayOfWeek: 2, startTime: '10:00', endTime: '14:00' },
            { dayOfWeek: 4, startTime: '10:00', endTime: '14:00' },
          ],
        },
      },
    }),
    prisma.doctor.upsert({
      where: { id: 3 },
      update: {},
      create: {
        name: 'Dr. Diego Perea',
        specialtyId: trauma.id,
        bio: 'Traumatólogo con especialización en cirugía de columna.',
        phone: '11-2341-5678',
        durationMin: 25,
        availabilities: {
          create: [
            { dayOfWeek: 1, startTime: '14:00', endTime: '18:00' },
            { dayOfWeek: 3, startTime: '14:00', endTime: '18:00' },
          ],
        },
      },
    }),
    prisma.doctor.upsert({
      where: { id: 4 },
      update: {},
      create: {
        name: 'Dra. Elena Blanco',
        specialtyId: cardio.id,
        bio: 'Cardióloga clínica e intervencionista.',
        phone: '11-3456-7890',
        durationMin: 20,
        availabilities: {
          create: [
            { dayOfWeek: 2, startTime: '09:00', endTime: '13:00' },
            { dayOfWeek: 5, startTime: '14:00', endTime: '18:00' },
          ],
        },
      },
    }),
    prisma.doctor.upsert({
      where: { id: 5 },
      update: {},
      create: {
        name: 'Dr. Marcos Sanz',
        specialtyId: clinica.id,
        bio: 'Clínico generalista, consultas de rutina y chequeos.',
        phone: '11-4567-8902',
        durationMin: 20,
        availabilities: {
          create: [
            { dayOfWeek: 1, startTime: '08:00', endTime: '12:00' },
            { dayOfWeek: 2, startTime: '08:00', endTime: '12:00' },
            { dayOfWeek: 3, startTime: '08:00', endTime: '12:00' },
            { dayOfWeek: 4, startTime: '08:00', endTime: '12:00' },
            { dayOfWeek: 5, startTime: '08:00', endTime: '12:00' },
          ],
        },
      },
    }),
  ])

  console.log(`✅ ${medicos.length} médicos creados`)

  // ── Usuarios ─────────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash('admin123', 12)
  const receptionPassword = await bcrypt.hash('recep123', 12)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@clinica.com' },
    update: {},
    create: {
      email: 'admin@clinica.com',
      password: adminPassword,
      name: 'Admin Clínica',
      role: 'ADMIN',
    },
  })

  const receptionist = await prisma.user.upsert({
    where: { email: 'recepcion@clinica.com' },
    update: {},
    create: {
      email: 'recepcion@clinica.com',
      password: receptionPassword,
      name: 'Recepción Central',
      role: 'RECEPTIONIST',
    },
  })

  console.log(`✅ Usuarios creados: ${admin.email}, ${receptionist.email}`)
  console.log('')
  console.log('🔑 Credenciales de acceso:')
  console.log('   Admin:      admin@clinica.com     / admin123')
  console.log('   Recepción:  recepcion@clinica.com / recep123')
  console.log('')
  console.log('✨ Seed completado!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
