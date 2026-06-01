---
phase: 05-pulido-y-deploy
verified: 2026-06-01T10:35:00Z
status: human_needed
score: 15/15 must-haves verified
overrides_applied: 0
human_verification:
  - test: "DARK-01: Sin flash de tema claro al recargar con preferencia oscura"
    expected: "Al setear prefers-color-scheme: dark en OS/DevTools y recargar /admin y /reservar, no debe haber flash de tema claro antes del paint"
    why_human: "El anti-FOUC depende de timing de paint del navegador; ningún grep puede verificar que el script inline corre antes del primer frame"
  - test: "DARK-02: Persistencia del tema elegido en localStorage"
    expected: "Al hacer click en el toggle Sun/Moon, recargar la página, el tema elegido se mantiene. DevTools > Application > localStorage muestra clave 'tm-theme' con valor 'dark' o 'light'"
    why_human: "Comportamiento de persistencia entre recargas requiere interacción manual en browser"
  - test: "DARK-03: Wizard /reservar legible en modo oscuro"
    expected: "En modo oscuro, el panel glassmorphism del wizard muestra texto legible y las orbes de fondo no saturan la pantalla"
    why_human: "Legibilidad visual es subjetiva y depende de renderizado real en browser"
  - test: "DARK-04: Toggle visible y funcional en header público"
    expected: "En /reservar, el header muestra el botón Sun/Moon y al hacer click cambia el tema"
    why_human: "Requiere inspección visual y click en browser"
  - test: "A11Y-01: Escape cierra overlays"
    expected: "En /admin/especialidades abrir el Drawer y presionar Escape lo cierra. En /admin/turnos abrir 'Nuevo turno' y presionar Escape lo cierra"
    why_human: "Comportamiento de teclado requiere prueba manual en browser; el useEffect de Escape está en código pero necesita verificación en DOM real"
  - test: "A11Y-02: Focus loop dentro de overlays"
    expected: "Con el Drawer o el modal abiertos, navegar con Tab cicla el foco dentro del overlay sin saltar al contenido de fondo"
    why_human: "Focus trap requiere interacción de teclado en browser con contexto de DOM real"
  - test: "A11Y-03: Contraste WCAG AA en modo claro y oscuro"
    expected: "Texto de éxito (--success) y de error (--error) sobre fondo claro ≥4.5:1 en light y dark mode (Chrome DevTools Accessibility/Contrast)"
    why_human: "La verificación de ratio de contraste exacto requiere herramienta de browser; los tokens están ajustados (#047857 = 5.24:1, #b91c1c = 6.18:1) pero se debe confirmar en contexto real"
  - test: "RATE-04: 6 POSTs a /api/auth/login desde misma IP devuelven 429 en el 6to intento"
    expected: "curl -X POST http://localhost:3000/api/auth/login x6 desde la misma IP retorna HTTP 429 en el 6to intento con mensaje 'Demasiados intentos'"
    why_human: "Requiere servidor corriendo localmente; no se puede levantar servidor en contexto de verificación estática"
---

# Phase 05: Pulido y Deploy — Informe de Verificacion

**Phase Goal:** Pulido y Deploy — rate limiting en endpoints criticos, dark mode class-based, y accesibilidad WCAG AA en la app local. Deploy diferido (fuera de scope).
**Verificado:** 2026-06-01T10:35:00Z
**Status:** human_needed
**Re-verificacion:** No — verificacion inicial

## Resumen Ejecutivo

Los 15 must-haves verificables por inspeccion de codigo estan VERIFICADOS. Los 7 tests de Vitest pasan (tras instalar dependencias faltantes con `npm install`). No se encontraron anti-patrones bloqueantes. 8 items requieren verificacion humana en browser (comportamiento visual, teclado, y prueba del servidor en vivo).

**Nota importante:** Al momento de la verificacion, `vitest`, `@upstash/ratelimit`, `@upstash/redis` y `focus-trap-react` no estaban instalados en `node_modules` (el `package.json` los declara pero `npm install` no habia sido ejecutado post-commit). Se ejecuto `npm install` durante la verificacion para confirmar que los paquetes instalan correctamente y los tests pasan. Esto no representa un gap de implementacion — el codigo es correcto — pero el repositorio requiere `npm install` antes de poder ejecutar tests o el servidor.

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidencia |
|---|-------|--------|-----------|
| 1 | El limiter in-memory bloquea (success=false) tras superar el limite | VERIFICADO | Test RATE-01 en lib/rate-limit.test.ts pasa — 4to request con limite 3 devuelve `success: false` |
| 2 | El limiter in-memory permite (success=true) requests dentro del limite | VERIFICADO | Test RATE-02 pasa — remaining decrementa 2,1,0 correctamente |
| 3 | getIp extrae la primera IP de x-forwarded-for con lista | VERIFICADO | Test RATE-03 (x3) pasa — split+trim correcto en lib/rate-limit.ts:80 |
| 4 | POST /api/auth/login responde 429 con JSON en espanol tras 5 intentos | VERIFICADO | loginLimiter.limit(ip) + Response.json 429 antes de request.json() en route.ts:10-16 |
| 5 | POST /api/public/appointments responde 429 con JSON en espanol tras 10 requests | VERIFICADO | bookingLimiter.limit(ip) + Response.json 429 en appointments/route.ts:9-15 |
| 6 | La app arranca con npm run dev sin las env vars de Upstash | VERIFICADO | Guard `hasUpstash` en lib/rate-limit.ts:46-48 — Redis.fromEnv() solo se llama si ambas vars existen |
| 7 | En la primera visita el tema sigue prefers-color-scheme del sistema | VERIFICADO | Script anti-FOUC en layout.tsx:32 lee `prefers-color-scheme: dark` cuando no hay valor en localStorage |
| 8 | La eleccion manual del toggle persiste en localStorage | VERIFICADO | ThemeToggle.tsx:19-20 escribe `localStorage.setItem('tm-theme', ...)` en cada toggle |
| 9 | No hay flash de tema claro al recargar con preferencia oscura | HUMANO | Script inline en head verifica logica correcta en codigo; timing de paint requiere browser |
| 10 | El toggle Sun/Moon esta visible en el sidebar admin y en el header publico | VERIFICADO | AdminSidebar.tsx:79 importa y renderiza `<ThemeToggle />`; PublicHeader.tsx:9 renderiza `<ThemeToggle />` |
| 11 | El panel glassmorphism del wizard /reservar sigue legible en modo oscuro | VERIFICADO (parcial) | BookingWizard.tsx:62 tiene `dark:bg-slate-900/80`; legibilidad visual requiere browser |
| 12 | Los tokens --success y --error en light mode cumplen WCAG AA | VERIFICADO | globals.css:25-26 define `--success: #047857` (emerald-700, 5.24:1) y `--error: #b91c1c` (red-700, 6.18:1) |
| 13 | Todos los elementos interactivos muestran focus ring teal visible | VERIFICADO | globals.css:128-136 tiene regla :focus-visible con `outline: 2px solid var(--border-focus)` para a, button, input, select, textarea, [tabindex] |
| 14 | El Drawer y el NewAppointmentModal atrapan el foco del teclado | VERIFICADO | Drawer.tsx:37-43 y NewAppointmentModal.tsx:113-118 envuelven panel en `<FocusTrap>` con opciones correctas |
| 15 | El Drawer y el NewAppointmentModal se cierran con Escape | VERIFICADO | Drawer.tsx:16-23 y NewAppointmentModal.tsx:42-48 tienen useEffect que registra keydown listener para 'Escape' |
| 16 | El Drawer y el NewAppointmentModal exponen role=dialog y aria-modal=true | VERIFICADO | Drawer.tsx:44-46 y NewAppointmentModal.tsx:121-123 tienen `role="dialog"`, `aria-modal="true"` |
| 17 | El boton de cierre del NewAppointmentModal tiene aria-label | VERIFICADO | NewAppointmentModal.tsx:136 tiene `aria-label="Cerrar modal"` en el button X |

**Score:** 15/15 truths verificadas por inspeccion de codigo (8 items adicionales requieren verificacion humana)

---

## Required Artifacts

| Artifact | Expected | Status | Detalles |
|----------|----------|--------|----------|
| `lib/rate-limit.ts` | Helper rate limiting + getIp + limiters | VERIFICADO | Exporta `makeInMemoryLimiter`, `getIp`, `loginLimiter`, `bookingLimiter`; guard hasUpstash implementada |
| `lib/rate-limit.test.ts` | Suite de tests RATE-01..03 | VERIFICADO | 7 tests en 2 describe blocks; todos pasan con `npm run test` |
| `vitest.config.ts` | Config Vitest con environment node | VERIFICADO | `test.environment: 'node'`, `include: ['lib/**/*.test.ts']` |
| `.env.example` | Variables documentadas con comentarios | VERIFICADO | DATABASE_URL, JWT_SECRET, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN con comentarios en espanol |
| `components/ThemeToggle.tsx` | Client Component Sun/Moon + localStorage | VERIFICADO | 'use client', useState, useEffect sync, classList.add/remove('dark'), clave 'tm-theme', aria-label dinamico |
| `components/PublicHeader.tsx` | Header con logo + ThemeToggle | VERIFICADO | Importa ThemeToggle, sticky top, tokens CSS correctos |
| `app/globals.css` | @custom-variant dark + bloque .dark + focus-visible | VERIFICADO | Linea 3: `@custom-variant dark (&:where(.dark, .dark *))` antes de :root; bloque .dark completo; regla :focus-visible |
| `app/layout.tsx` | Anti-FOUC script + suppressHydrationWarning | VERIFICADO | suppressHydrationWarning en html:28, dangerouslySetInnerHTML:31-33 con logica tm-theme + prefers-color-scheme |
| `components/admin/Drawer.tsx` | FocusTrap + Escape + role dialog + aria-modal | VERIFICADO | FocusTrap importado, role="dialog", aria-modal="true", aria-label={title}, useEffect Escape |
| `components/admin/NewAppointmentModal.tsx` | FocusTrap + Escape + role dialog + aria-labelledby + aria-label close | VERIFICADO | FocusTrap importado, role="dialog", aria-modal="true", aria-labelledby="new-appointment-title", aria-label="Cerrar modal" |

---

## Key Link Verification

| From | To | Via | Status | Detalles |
|------|-----|-----|--------|----------|
| `app/api/auth/login/route.ts` | `lib/rate-limit.ts` | `import { loginLimiter, getIp }` + `loginLimiter.limit(ip)` | WIRED | Linea 5: import; linea 9-16: limit antes de request.json() |
| `app/api/public/appointments/route.ts` | `lib/rate-limit.ts` | `import { bookingLimiter, getIp }` + `bookingLimiter.limit(ip)` | WIRED | Linea 4: import; linea 8-15: limit antes de request.json() |
| `components/admin/AdminSidebar.tsx` | `components/ThemeToggle.tsx` | import + render en footer del sidebar | WIRED | Linea 14: import; linea 79: `<ThemeToggle />` |
| `app/(public)/layout.tsx` | `components/PublicHeader.tsx` | render del header antes de {children} | WIRED | Linea 1: import; linea 6: `<PublicHeader />` |
| `components/ThemeToggle.tsx` | `document.documentElement` | classList.add/remove('dark') + localStorage 'tm-theme' | WIRED | Lineas 18-21: classList.add/remove y setItem |
| `components/admin/Drawer.tsx` | `focus-trap-react` | import FocusTrap + wrapper del panel | WIRED | Linea 6: `import FocusTrap from 'focus-trap-react'`; lineas 37-69: wrapper |
| `components/admin/NewAppointmentModal.tsx` | `focus-trap-react` | import FocusTrap + wrapper del panel | WIRED | Linea 5: `import FocusTrap from 'focus-trap-react'`; lineas 113-339: wrapper |

---

## Behavioral Spot-Checks

| Comportamiento | Comando | Resultado | Status |
|---------------|---------|-----------|--------|
| Suite Vitest (7 tests) | `npm run test` | 7 passed, 1 suite — 1.18s | PASS |
| Token --success ajustado en globals.css | `grep --success globals.css` | `--success: #047857` en :root | PASS |
| Token --error ajustado en globals.css | `grep --error globals.css` | `--error: #b91c1c` en :root | PASS |
| loginLimiter integrado en login route | inspeccion de codigo | `loginLimiter.limit(ip)` en linea 10, antes de `request.json()` | PASS |
| bookingLimiter integrado en appointments route | inspeccion de codigo | `bookingLimiter.limit(ip)` en linea 9, antes de `request.json()` | PASS |
| npm run dev sin Upstash | hasUpstash guard en modulo | `Redis.fromEnv()` dentro de `if (hasUpstash)` en linea 56 | PASS |

---

## Requirements Coverage

| Req ID | Plan | Descripcion | Status | Evidencia |
|--------|------|------------|--------|-----------|
| D-01 | 05-02 | Dark mode class-based en toda la app | SATISFECHO | @custom-variant dark + bloque .dark en globals.css |
| D-02 | 05-02 | Default por prefers-color-scheme + persistencia manual | SATISFECHO | Script anti-FOUC + ThemeToggle con localStorage |
| D-03 | 05-02 | Clase .dark en html raiz | SATISFECHO | Script anti-FOUC en layout.tsx agrega clase a document.documentElement |
| D-04 | 05-02 | Anti-FOUC sin flash | SATISFECHO (codigo) | Script inline en head; verificacion visual: HUMANO |
| D-05 | 05-02 | Toggle Sun/Moon en sidebar admin y header publico | SATISFECHO | ThemeToggle en AdminSidebar + PublicHeader en (public)/layout |
| D-06 | 05-03 | WCAG AA: contraste, focus states, focus trap, ARIA | SATISFECHO (codigo) | Tokens ajustados, focus ring, FocusTrap, role/aria-modal |
| D-07 | 05-03 | Solo ajustar tokens que no cumplen AA; no cambiar branding teal | SATISFECHO | Solo --success y --error cambiados; --primary intacto |
| D-08 | 05-01 | Helper rate limiting abstrae Upstash + fallback in-memory | SATISFECHO | lib/rate-limit.ts con hasUpstash guard |
| D-09 | 05-01 | Fallback in-memory funciona sin cuenta Upstash | SATISFECHO | makeInMemoryLimiter con Map+timestamps |
| D-10 | 05-01 | Rate limiting corre antes del body parsing | SATISFECHO | loginLimiter.limit() antes de request.json() en ambos endpoints |
| D-11 | 05-01 | Login 5/15min, reserva 10/10min | SATISFECHO | slidingWindow(5,'15 m') y slidingWindow(10,'10 m') en Upstash; makeInMemoryLimiter(5, 15*60*1000) y (10, 10*60*1000) in-memory |
| D-12 | 05-01 | 429 de login no revela si el email existe | SATISFECHO | Mensaje: "Demasiados intentos. Esperá unos minutos e intentá de nuevo." — no menciona email |
| RATE-01 | 05-01 | Test: bloqueo al exceder limite | SATISFECHO | Test "RATE-01: bloquea al exceder el limite" — PASS |
| RATE-02 | 05-01 | Test: permite dentro del limite, remaining decrementa | SATISFECHO | Test "RATE-02: permite requests dentro del limite" — PASS |
| RATE-03 | 05-01 | Test: getIp con lista, sin header, con espacios | SATISFECHO | 3 tests getIp en describe('getIp') — todos PASS |

---

## Anti-Patterns Found

| Archivo | Linea | Patron | Severidad | Impacto |
|---------|-------|--------|-----------|---------|
| — | — | Ninguno | — | Sin anti-patrones TBD/FIXME/XXX encontrados en archivos modificados en esta fase |

---

## Nota: Dependencias no instaladas al momento de la verificacion

Al ejecutar la verificacion se detecto que `vitest`, `@upstash/ratelimit`, `@upstash/redis` y `focus-trap-react` no estaban presentes en `node_modules`. El `package.json` y `package-lock.json` los declaran correctamente, lo que indica que `npm install` no habia sido ejecutado luego de los commits de la fase.

Se ejecuto `npm install` durante la verificacion:
- Todos los paquetes instalaron correctamente
- `npm run test` paso: 7 tests verdes en lib/rate-limit.test.ts
- No se trata de un gap de implementacion — el codigo es correcto
- **Accion recomendada:** Ejecutar `npm install` antes del proximo ciclo de trabajo

---

## Human Verification Required

### 1. DARK-01: Sin flash de tema claro al recargar

**Test:** Iniciar `npm run dev`. En OS/DevTools, setear `prefers-color-scheme: dark`. Recargar `/admin` y `/reservar`.
**Expected:** No debe haber flash de tema claro visible antes del primer paint.
**Why human:** El anti-FOUC depende de timing de paint del navegador. El script inline esta correctamente posicionado en `<head>` antes del `<body>`, pero la ausencia de flash solo es verificable visualmente.

### 2. DARK-02: Persistencia del tema en localStorage

**Test:** En browser: click en el toggle Sun/Moon del sidebar admin (o header publico). Recargar la pagina. Abrir DevTools > Application > localStorage.
**Expected:** El tema elegido se mantiene tras la recarga. La clave `tm-theme` existe con valor `'dark'` o `'light'`.
**Why human:** Comportamiento de persistencia entre sesiones del navegador requiere interaccion manual.

### 3. DARK-03: Wizard /reservar legible en modo oscuro

**Test:** Ir a `/reservar` en modo oscuro (toggle o prefers-color-scheme dark).
**Expected:** El panel glassmorphism del wizard muestra texto legible. Las orbes de fondo azul/teal no saturan la pantalla.
**Why human:** Legibilidad visual es subjetiva; `dark:opacity-5` esta en el codigo pero el resultado visual final depende del browser.

### 4. DARK-04: Toggle visible en header publico de /reservar

**Test:** Navegar a `/reservar`. Verificar que el header muestra el boton Sun/Moon. Hacer click y verificar cambio de tema.
**Expected:** El toggle es visible y funcional en el layout publico.
**Why human:** Requiere interaccion visual en browser.

### 5. A11Y-01: Escape cierra overlays (aprobado previamente — confirmar si persiste)

**Test:** En `/admin/especialidades` abrir el Drawer y presionar la tecla Escape. En `/admin/turnos` abrir "Nuevo turno" y presionar Escape.
**Expected:** Ambos overlays se cierran al presionar Escape.
**Why human:** El comportamiento de tecla Escape requiere prueba manual con foco en el overlay.

### 6. A11Y-02: Focus loop dentro de overlays

**Test:** Con el Drawer abierto, navegar con Tab por todos los elementos. Repetir con el modal "Nuevo turno".
**Expected:** El foco cicla dentro del overlay (FocusTrap activo) sin saltar al contenido de fondo.
**Why human:** Focus trap requiere interaccion de teclado con DOM vivo.

### 7. A11Y-03: Contraste WCAG AA verificado en browser

**Test:** Chrome DevTools > Accessibility > Color Contrast. Verificar texto de exito (color success) y de error (color error) sobre fondo claro.
**Expected:** Texto success ≥4.5:1 (--success: #047857 sobre blanco = 5.24:1). Texto error ≥4.5:1 (--error: #b91c1c sobre blanco = 6.18:1). En dark mode, #34d399 y #f87171 deben verificarse sobre el fondo oscuro.
**Why human:** Herramienta de contraste de browser mide la combinacion real de color computado, que puede diferir del calculo teorico si hay capas de color adicionales.

### 8. RATE-04: 429 al exceder limite en servidor vivo

**Test:** Levantar `npm run dev`. Ejecutar 6 veces: `curl -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' -d '{}'`
**Expected:** Los primeros 5 intentos devuelven 400 (body invalido). El 6to devuelve 429 con `{"error":"Demasiados intentos. Esperá unos minutos e intentá de nuevo."}`.
**Why human:** Requiere servidor corriendo localmente; no fue posible levantarlo en el contexto de verificacion estatica.

---

_Verificado: 2026-06-01T10:35:00Z_
_Verifier: Claude (gsd-verifier)_
