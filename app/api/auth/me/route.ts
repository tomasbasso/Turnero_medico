import { cookies } from 'next/headers'
import { verifyToken, COOKIE_NAME } from '@/lib/auth'

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value

  if (!token) {
    return Response.json({ error: 'No autenticado' }, { status: 401 })
  }

  const payload = verifyToken(token)
  if (!payload) {
    return Response.json({ error: 'Token inválido' }, { status: 401 })
  }

  return Response.json({
    user: {
      id: payload.userId,
      email: payload.email,
      role: payload.role,
      name: payload.name,
    },
  })
}
