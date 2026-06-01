import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { comparePassword, signToken, cookieOptions } from '@/lib/auth'
import type { JWTPayload } from '@/lib/auth'
import { loginLimiter, getIp } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  // Rate limiting — corre ANTES de leer el body (D-10, D-11, D-12)
  const ip = getIp(request)
  const { success } = await loginLimiter.limit(ip)
  if (!success) {
    return Response.json(
      { error: 'Demasiados intentos. Esperá unos minutos e intentá de nuevo.' },
      { status: 429 },
    )
  }

  const body = await request.json().catch(() => null)

  if (!body?.email || !body?.password) {
    return Response.json(
      { error: 'Email y contraseña son requeridos' },
      { status: 400 },
    )
  }

  const user = await prisma.user.findUnique({
    where: { email: body.email.toLowerCase().trim() },
  })

  if (!user || !user.isActive) {
    return Response.json({ error: 'Credenciales inválidas' }, { status: 401 })
  }

  const valid = await comparePassword(body.password, user.password)
  if (!valid) {
    return Response.json({ error: 'Credenciales inválidas' }, { status: 401 })
  }

  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  }

  const token = signToken(payload)

  const response = NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  })

  response.cookies.set({
    name: cookieOptions.name,
    value: token,
    maxAge: cookieOptions.maxAge,
    httpOnly: cookieOptions.httpOnly,
    secure: cookieOptions.secure,
    sameSite: cookieOptions.sameSite,
    path: cookieOptions.path,
  })

  return response
}
