---
phase: 4
slug: gestion-turnos
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-29
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | none — no test framework configured in project |
| **Config file** | none |
| **Quick run command** | `npm run build` (TypeScript check) |
| **Full suite command** | manual browser verification at http://localhost:3000/admin/turnos |
| **Estimated runtime** | build ~30s; manual smoke test ~5 min |

---

## Sampling Rate

- **After every task commit:** Run `npm run build` to catch TypeScript errors
- **After every plan wave:** Manual browser verification per checklist below
- **Before `/gsd-verify-work`:** Full manual smoke test must pass
- **Max feedback latency:** Build < 30s; manual verification < 5 min per wave

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-API-01 | API | 1 | TURNO-01 | T-04-01 | GET requires valid JWT cookie | manual | `npm run build` | ❌ no test infra | ⬜ pending |
| 04-API-02 | API | 1 | TURNO-02 | T-04-02 | PATCH status requires valid JWT cookie | manual | `npm run build` | ❌ no test infra | ⬜ pending |
| 04-API-03 | API | 1 | TURNO-03 | T-04-03 | PATCH whatsapp requires valid JWT cookie | manual | `npm run build` | ❌ no test infra | ⬜ pending |
| 04-UI-01 | UI | 2 | TURNO-04 | — | WhatsApp URL encodes Argentina number | manual | `npm run build` | ❌ no test infra | ⬜ pending |
| 04-UI-02 | UI | 2 | TURNO-05 | — | Filter by date/médico/estado/DNI | manual | `npm run build` | ❌ no test infra | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

None — no test framework to scaffold. Existing `npm run build` TypeScript check covers structural correctness.

*Existing infrastructure covers all automated phase requirements (TypeScript build).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| GET /api/admin/appointments returns filtered list | TURNO-01 | No test framework | Navigate /admin/turnos, apply each filter, verify table updates without page reload |
| PATCH status PENDING→CONFIRMED | TURNO-02 | No test framework | Click "Confirmar" on a PENDING turno, verify badge changes to CONFIRMED and WhatsApp link appears |
| PATCH status PENDING→CANCELLED | TURNO-02 | No test framework | Click "Cancelar", confirm inline, verify badge changes to CANCELLED and actions column shows dash |
| WhatsApp link opens wa.me with correct message | TURNO-04 | No test framework | Click "Enviar WA" on a CONFIRMED turno, verify URL is `wa.me/549{phone}?text=Hola...CONFIRMADO` |
| whatsappSent indicator shows after clicking WA | TURNO-03 | No test framework | After clicking WA link, icon should change to MessageCircleCheck teal, label to "WA enviado" |
| Filter defaults to today on page load | TURNO-05 | No test framework | Open /admin/turnos fresh, verify date filter shows today's date and table shows today's appointments |
| Unauthenticated request returns 401 | T-04-01/02/03 | No test framework | Call GET /api/admin/appointments without cookie, expect 401 |
| Build passes after all changes | TypeScript | Automated | `npm run build` exits 0 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: build check after each task
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s (build) / 5 min (manual)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
