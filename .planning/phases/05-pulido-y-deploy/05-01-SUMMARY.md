---
phase: 05-pulido-y-deploy
plan: "01"
subsystem: rate-limiting
tags: [rate-limiting, upstash, redis, vitest, security, tdd]
dependency_graph:
  requires: []
  provides:
    - lib/rate-limit.ts (loginLimiter, bookingLimiter, getIp, makeInMemoryLimiter)
    - vitest infrastructure (vitest.config.ts, test script)
  affects:
    - app/api/auth/login/route.ts
    - app/api/public/appointments/route.ts
tech_stack:
  added:
    - "@upstash/ratelimit@2.0.8 (Upstash slidingWindow rate limiter)"
    - "@upstash/redis@1.38.0 (Upstash HTTP REST Redis client)"
    - "vitest@^3 (unit test framework)"
  patterns:
    - "In-memory fallback Map<string, number[]> with sliding window timestamps"
    - "hasUpstash guard prevents startup crash when env vars absent"
    - "TDD RED/GREEN for rate-limit module"
key_files:
  created:
    - lib/rate-limit.ts
    - lib/rate-limit.test.ts
    - vitest.config.ts
    - .env.example
  modified:
    - package.json (added test script + 3 dependencies)
    - app/api/auth/login/route.ts (rate limiting before request.json())
    - app/api/public/appointments/route.ts (rate limiting before request.json())
decisions:
  - "Exported makeInMemoryLimiter factory from rate-limit.ts to enable deterministic unit tests without Upstash"
  - "Used git add -f for .env.example because .gitignore has .env* pattern; .env.example is intentional documentation"
  - "hasUpstash guard implemented at module level (not function level) to match cold-start behavior"
metrics:
  duration: "~15 minutes"
  completed: "2026-06-01"
  tasks_completed: 4
  files_created: 4
  files_modified: 3
---

# Phase 5 Plan 01: Rate Limiting (Upstash + In-Memory Fallback) Summary

**One-liner:** Rate limiting con sliding window por IP usando Upstash Redis en prod y fallback in-memory para dev local, con primer suite Vitest del proyecto (7 tests verdes cubriendo RATE-01..03).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Verificar legitimidad de paquetes (pre-aprobado por orchestrator) | — | — |
| 2 | Instalar Vitest + Upstash, crear vitest.config.ts y script test | 61f5f37 | package.json, vitest.config.ts, package-lock.json |
| 3 (RED) | Tests fallidos para rate-limit (RATE-01..03) | 6c4dff7 | lib/rate-limit.test.ts |
| 3 (GREEN) | Implementar lib/rate-limit.ts — todos los tests pasan | dc53a87 | lib/rate-limit.ts |
| 4 | Integrar rate limiting en endpoints + .env.example | 1eaba43 | app/api/auth/login/route.ts, app/api/public/appointments/route.ts, .env.example |

## What Was Built

### lib/rate-limit.ts
Helper único que abstrae dos backends:
- **Upstash Redis** (cuando `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` están en env): `Ratelimit.slidingWindow(5, '15 m')` para login, `slidingWindow(10, '10 m')` para reserva.
- **In-memory fallback** (cuando las vars no están): `Map<string, number[]>` con ventana deslizante de timestamps. Permite `npm run dev` sin cuenta Upstash.
- Guarda `hasUpstash` a nivel de módulo (no instancia `Redis.fromEnv()` sin credenciales — previene crash en startup).
- `getIp(request)`: extrae la primera IP de `x-forwarded-for` (split por `,` + trim) o devuelve `'anonymous'`.

### lib/rate-limit.test.ts (7 tests verdes)
- RATE-02: permite requests dentro del límite, remaining decrece correctamente
- RATE-01: bloquea en el request N+1 (4to con límite 3)
- Ventana deslizante: tras avanzar el tiempo con `vi.useFakeTimers()`, vuelve a permitir
- Aislamiento por IP: identificadores distintos no comparten contador
- RATE-03 (×3): getIp con lista, sin header, con espacios

### vitest.config.ts
Configuración mínima: `test.environment: 'node'`, `include: ['lib/**/*.test.ts']`. Sin React/jsdom.

### Endpoints protegidos
Ambos handlers aplican el limiter **antes** de `request.json()`:
- `POST /api/auth/login`: 429 `"Demasiados intentos. Esperá unos minutos e intentá de nuevo."` (no revela si el email existe — D-12)
- `POST /api/public/appointments`: 429 `"Demasiadas solicitudes. Esperá unos minutos e intentá de nuevo."`

### .env.example
Documenta `DATABASE_URL`, `JWT_SECRET`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` con comentarios en español explicando el fallback in-memory.

## TDD Gate Compliance

- RED gate: commit `6c4dff7` — `test(05-01): add failing tests...`
- GREEN gate: commit `dc53a87` — `feat(05-01): implement lib/rate-limit.ts...`

Secuencia de gates correcta: test fallido primero, implementación segundo.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] .env.example bloqueado por .gitignore**
- **Found during:** Task 4
- **Issue:** El `.gitignore` tiene el patrón `.env*` que incluye `.env.example`. El archivo de documentación de variables de entorno no se podía commitear con `git add` normal.
- **Fix:** `git add -f .env.example` — forzar el track del archivo de documentación. El comentario en `.gitignore` dice "can opt-in for committing if needed", confirmando que esto es el flujo esperado.
- **Files modified:** .env.example
- **Commit:** 1eaba43

**2. [Rule 2 - Missing critical functionality] makeInMemoryLimiter exportada**
- **Found during:** Task 3 (planning the tests)
- **Issue:** El plan dice "Exportarla (o exponer una factory testeable) para poder testear el comportamiento in-memory directamente sin depender de Upstash."
- **Fix:** Se exportó `makeInMemoryLimiter` explícitamente desde `lib/rate-limit.ts` para que los tests puedan instanciar limiters frescos por test, garantizando aislamiento entre casos.
- **Files modified:** lib/rate-limit.ts, lib/rate-limit.test.ts
- **Commit:** dc53a87

## Known Stubs

None — todos los exports declarados en el plan están implementados y cableados.

## Threat Flags

Ninguna superficie nueva detectada más allá del threat model documentado en el plan (T-5-01, T-5-02, T-5-03, T-5-04, T-5-SC).

## Verification Results

- `npx vitest run` — 1 suite, 7 tests: **PASS**
- Acceptance criteria Task 2 (node -e): **OK**
- Acceptance criteria Task 4 (node -e): **OK**
- Manual RATE-04 (6 POSTs a login): pendiente de verificación manual en local (no hay servidor corriendo en este contexto de ejecución; el código está correctamente integrado y verificado por inspección de source)

## Self-Check: PASSED

- [x] lib/rate-limit.ts existe: FOUND
- [x] lib/rate-limit.test.ts existe: FOUND
- [x] vitest.config.ts existe: FOUND
- [x] .env.example existe: FOUND
- [x] Commit 61f5f37 (Task 2): FOUND
- [x] Commit 6c4dff7 (Task 3 RED): FOUND
- [x] Commit dc53a87 (Task 3 GREEN): FOUND
- [x] Commit 1eaba43 (Task 4): FOUND
