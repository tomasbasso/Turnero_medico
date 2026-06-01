import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Import the in-memory factory directly for deterministic tests (no Upstash)
import { makeInMemoryLimiter, getIp } from './rate-limit'

describe('makeInMemoryLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('RATE-02: permite requests dentro del límite y decrementa remaining', () => {
    const limiter = makeInMemoryLimiter(3, 1000)

    const r1 = limiter.limit('ip1')
    expect(r1.success).toBe(true)
    expect(r1.remaining).toBe(2)
    expect(r1.limit).toBe(3)

    const r2 = limiter.limit('ip1')
    expect(r2.success).toBe(true)
    expect(r2.remaining).toBe(1)

    const r3 = limiter.limit('ip1')
    expect(r3.success).toBe(true)
    expect(r3.remaining).toBe(0)
  })

  it('RATE-01: bloquea al exceder el límite (4to request con límite 3)', () => {
    const limiter = makeInMemoryLimiter(3, 1000)

    limiter.limit('ip2')
    limiter.limit('ip2')
    limiter.limit('ip2')

    const blocked = limiter.limit('ip2')
    expect(blocked.success).toBe(false)
    expect(blocked.remaining).toBe(0)
  })

  it('ventana deslizante: después de la ventana vuelve a permitir', () => {
    const limiter = makeInMemoryLimiter(3, 500)

    limiter.limit('ip3')
    limiter.limit('ip3')
    limiter.limit('ip3')

    // Avanzar más allá de la ventana
    vi.advanceTimersByTime(600)

    const fresh = limiter.limit('ip3')
    expect(fresh.success).toBe(true)
    expect(fresh.remaining).toBe(2)
  })

  it('aislamiento por IP: identificadores distintos no comparten contador', () => {
    const limiter = makeInMemoryLimiter(2, 1000)

    limiter.limit('ipA')
    limiter.limit('ipA')
    const blockedA = limiter.limit('ipA')
    expect(blockedA.success).toBe(false)

    // ipB no comparte contador con ipA
    const freshB = limiter.limit('ipB')
    expect(freshB.success).toBe(true)
    expect(freshB.remaining).toBe(1)
  })
})

describe('getIp', () => {
  it('RATE-03: extrae la primera IP de x-forwarded-for con lista', () => {
    const req = new Request('http://localhost/', {
      headers: { 'x-forwarded-for': 'ip1, ip2, ip3' },
    })
    expect(getIp(req)).toBe('ip1')
  })

  it('RATE-03: devuelve "anonymous" cuando no hay x-forwarded-for', () => {
    const req = new Request('http://localhost/')
    expect(getIp(req)).toBe('anonymous')
  })

  it('RATE-03: recorta espacios de la primera IP', () => {
    const req = new Request('http://localhost/', {
      headers: { 'x-forwarded-for': ' 203.0.113.1 , 10.0.0.1' },
    })
    expect(getIp(req)).toBe('203.0.113.1')
  })
})
