---
phase: 5
slug: pulido-y-deploy
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-31
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (primeros tests del proyecto) |
| **Config file** | `vitest.config.ts` — ❌ Wave 0 gap |
| **Quick run command** | `npx vitest run lib/rate-limit.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~3 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run lib/rate-limit.test.ts` (si el archivo existe)
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Suite verde + auditoría manual WCAG completada
- **Max feedback latency:** ~5 seconds (unit tests only)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| RATE-01 | 05-01 | 1 | Rate limiting | T-5-01 | Bloquea después de N requests por IP | unit | `npx vitest run lib/rate-limit.test.ts` | ❌ W0 | ⬜ pending |
| RATE-02 | 05-01 | 1 | Rate limiting | T-5-01 | Permite requests dentro del límite | unit | `npx vitest run lib/rate-limit.test.ts` | ❌ W0 | ⬜ pending |
| RATE-03 | 05-01 | 1 | Rate limiting | — | getIp extrae IP de x-forwarded-for | unit | `npx vitest run lib/rate-limit.test.ts` | ❌ W0 | ⬜ pending |
| RATE-04 | 05-01 | 1 | Rate limiting | T-5-01 | Login devuelve 429 al exceder límite | manual | POST /api/auth/login ×6 desde misma IP | — | ⬜ pending |
| DARK-01 | 05-02 | 1 | Dark mode anti-FOUC | — | Clase dark se aplica antes del paint | manual visual | Recargar con preferencia dark en OS | — | ⬜ pending |
| DARK-02 | 05-02 | 1 | Dark mode persiste | — | Toggle persiste en localStorage | manual | DevTools → Application → localStorage | — | ⬜ pending |
| A11Y-01 | 05-03 | 2 | WCAG AA focus trap | — | Drawer/Modal cierra con Escape | manual | Abrir overlay, presionar Escape | — | ⬜ pending |
| A11Y-02 | 05-03 | 2 | WCAG AA focus trap | — | Tab no escapa del modal abierto | manual | Tab loop dentro del modal | — | ⬜ pending |
| A11Y-03 | 05-03 | 2 | WCAG AA contraste | — | Tokens ajustados cumplen 4.5:1 | herramienta | Chrome DevTools Accessibility | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `lib/rate-limit.test.ts` — tests del limiter in-memory (RATE-01, RATE-02, RATE-03)
- [ ] `vitest.config.ts` — configuración mínima para el proyecto
- [ ] `package.json devDependencies` — agregar `vitest`; script `"test": "vitest run"`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dark mode anti-FOUC | DARK-01 | CSS/paint timing, no testable con unit tests | Recargar página con `prefers-color-scheme: dark` en OS o DevTools; verificar no hay flash de tema claro |
| Dark mode toggle persiste | DARK-02 | Requiere browser LocalStorage | Toggle → recargar → verificar que el tema se mantiene |
| Login retorna 429 | RATE-04 | Requiere HTTP real en dev server | `curl -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' -d '{}' ` × 6 desde misma IP |
| Escape cierra overlays | A11Y-01 | Requiere browser + foco | Abrir Drawer/Modal/NewAppointmentModal, presionar Escape |
| Focus loop en modal | A11Y-02 | Requiere browser + teclado | Tab por todos los elementos del modal, verificar que cicla y no escapa |
| Contraste WCAG AA | A11Y-03 | Requiere herramienta visual | Usar Chrome DevTools → Accessibility → Contrast checker en tokens --success, --error, text sobre fondos |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
