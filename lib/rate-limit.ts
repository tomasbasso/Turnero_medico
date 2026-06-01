// lib/rate-limit.ts
// Helper de rate limiting: usa Upstash Redis en producción cuando las env vars
// están presentes, y un limiter in-memory propio cuando no lo están.
// Esto permite que `npm run dev` corra en local sin ninguna cuenta externa.

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// ── In-memory fallback ───────────────────────────────────────────────────────
// Ventana deslizante simple usando timestamps por identifier en un Map.
// Exportada para poder testearla directamente en unit tests sin tocar Upstash.

export interface LimiterResult {
  success: boolean
  limit: number
  remaining: number
}

export function makeInMemoryLimiter(limit: number, windowMs: number) {
  const store = new Map<string, number[]>()

  return {
    limit(identifier: string): LimiterResult {
      const now = Date.now()
      const timestamps = (store.get(identifier) ?? []).filter(
        (t) => now - t < windowMs,
      )

      if (timestamps.length >= limit) {
        store.set(identifier, timestamps)
        return { success: false, limit, remaining: 0 }
      }

      timestamps.push(now)
      store.set(identifier, timestamps)
      return { success: true, limit, remaining: limit - timestamps.length }
    },
  }
}

// ── Upstash backend (prod) ────────────────────────────────────────────────────
// La guarda `hasUpstash` evita instanciar Redis.fromEnv() sin credenciales,
// lo que lanzaría un error en startup y rompería `npm run dev` en local.
// (Pitfall 2 documentado en RESEARCH.md)

const hasUpstash = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
)

type Limiter = { limit: (id: string) => Promise<LimiterResult> | LimiterResult }

let loginLimiter: Limiter
let bookingLimiter: Limiter

if (hasUpstash) {
  const redis = Redis.fromEnv()
  loginLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '15 m'),
    prefix: 'rl:login',
  }) as Limiter
  bookingLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '10 m'),
    prefix: 'rl:booking',
  }) as Limiter
} else {
  // D-11: login 5/15min, reserva 10/10min
  loginLimiter = makeInMemoryLimiter(5, 15 * 60 * 1000)
  bookingLimiter = makeInMemoryLimiter(10, 10 * 60 * 1000)
}

// ── Extractor de IP ───────────────────────────────────────────────────────────
// x-forwarded-for puede traer una lista "ip1, ip2, ip3" (cliente + proxies).
// Se usa la primera IP (la del cliente original) para evitar colisiones.
// (Pitfall 5 documentado en RESEARCH.md)

export function getIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return 'anonymous'
}

export { loginLimiter, bookingLimiter }
