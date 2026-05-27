import { NextRequest } from 'next/server'
import { verifyToken, COOKIE_NAME, JWTPayload } from '@/lib/auth'

export function requireAdmin(
  request: NextRequest,
): { payload: JWTPayload } | Response {
  const token = request.cookies.get(COOKIE_NAME)?.value

  if (!token) {
    return Response.json({ error: 'No autenticado' }, { status: 401 })
  }

  const payload = verifyToken(token)

  if (!payload) {
    return Response.json({ error: 'No autenticado' }, { status: 401 })
  }

  if (payload.role !== 'ADMIN') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  return { payload }
}
