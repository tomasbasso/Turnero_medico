import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { comparePassword, signToken, cookieOptions } from '@/lib/auth'
import type { JWTPayload } from '@/lib/auth'

export async function POST(request: NextRequest) {
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

  const response = Response.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  })

  response.headers.set(
    'Set-Cookie',
    `${cookieOptions.name}=${token}; Max-Age=${cookieOptions.maxAge}; Path=${cookieOptions.path}; HttpOnly; SameSite=${cookieOptions.sameSite}${cookieOptions.secure ? '; Secure' : ''}`,
  )

  return response
}
