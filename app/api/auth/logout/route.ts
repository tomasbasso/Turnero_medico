import { COOKIE_NAME } from '@/lib/auth'

export async function POST() {
  const response = Response.json({ ok: true })
  response.headers.set(
    'Set-Cookie',
    `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; SameSite=lax`,
  )
  return response
}
