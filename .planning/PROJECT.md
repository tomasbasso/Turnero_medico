# Turnero Médico

## Project Summary

Sistema de gestión de turnos para consultorio médico. Single-doctor o multi-doctor. Pacientes reservan online; staff administra desde panel protegido.

## Stack

- **Frontend/Backend**: Next.js 16.2.6, App Router, React 19, TypeScript
- **Styles**: Tailwind CSS v4, design tokens en globals.css
- **DB/ORM**: PostgreSQL via Supabase + Prisma 6
- **Auth**: JWT (jsonwebtoken 9) en cookie `tm_token` (8h), bcryptjs
- **Storage**: Supabase Storage (avatares)
- **Animations**: framer-motion
- **Icons**: lucide-react

## Design System

- **Paleta**: Teal — primary #0d9488 / accent #14b8a6 sobre fondos slate
- **Fuentes**: Outfit (headings) + Inter (UI/forms) vía next/font/google
- **Estilo**: "Modern Clinical Sanctuary" — glassmorphism en Booking Wizard
- **Radios**: 12px cards, 8px inputs, 999px chips
- **Regla**: No Harsh Borders — sin bordes sólidos oscuros

## Schema Prisma

- `User` — roles: ADMIN, DOCTOR, RECEPTIONIST
- `Specialty` — name, color (default #0d9488)
- `Doctor` — name, specialtyId, bio, avatarUrl, durationMin, availabilities[]
- `Availability` — doctorId, dayOfWeek (0-6), startTime, endTime
- `Appointment` — patientName/Dni/Phone/Email, doctorId, date, time, status (PENDING/CONFIRMED/CANCELLED/COMPLETED), whatsappSent

## Key Conventions

- `cookies()` es async en Next.js 16 → siempre `await cookies()`
- `params` en Route Handlers es `Promise<{...}>` → siempre `await params`
- Route Handlers usan `Response.json()`, NO `NextResponse.json()`
- Cookie: `tm_token` (HttpOnly, SameSite=lax, Secure en prod)
- Headers inyectados por middleware: `x-user-id`, `x-user-role`, `x-user-email`

## Seed

`npm run db:seed` — 5 especialidades, 5 médicos con disponibilidades, 2 users (admin@consultorio.com / receptionist@consultorio.com, password: `admin123`)
