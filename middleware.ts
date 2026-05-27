export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken, COOKIE_NAME } from '@/lib/auth'

const PUBLIC_PATHS = ['/login', '/reservar', '/api/auth', '/api/public']

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p))
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isPublic(pathname)) return NextResponse.next()

  const token = request.cookies.get(COOKIE_NAME)?.value
  const payload = token ? verifyToken(token) : null

  if (!payload) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Inject user info into headers so Server Components can read it without re-verifying
  const response = NextResponse.next()
  response.headers.set('x-user-id', String(payload.userId))
  response.headers.set('x-user-role', payload.role)
  response.headers.set('x-user-name', payload.name)
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}
