---
phase: 3
slug: reserva-paciente
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-27
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — no test framework installed. TypeScript + build as primary automated gate. |
| **Config file** | `tsconfig.json` (TypeScript), `next.config.ts` (build) |
| **Quick run command** | `npx tsc --noEmit` |
| **Full suite command** | `npm run build` |
| **Estimated runtime** | ~15–30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit`
- **After every plan wave:** Run `npm run build`
- **Before `/gsd-verify-work`:** Full build must succeed + manual smoke test of wizard
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|--------|
| Schema migration | — | 1 | D-05 | — | patientInsurance nullable, no existing data loss | build | `npm run db:push && npx tsc --noEmit` | ⬜ pending |
| Public APIs (GET) | — | 1 | D-06,D-07,D-08 | T-01 | No auth header required; returns 200 | build | `npx tsc --noEmit` | ⬜ pending |
| Slot generation | — | 1 | D-06,D-07,D-08,D-09 | T-02 | Slots excluded for occupied times | manual | See manual table | ⬜ pending |
| POST /api/public/appointments | — | 2 | D-01,D-02,D-04 | T-03 | 409 on duplicate slot | build | `npx tsc --noEmit` | ⬜ pending |
| Wizard UI | — | 2 | D-07,D-08,D-09 | — | Glassmorphism, 5 steps, state management | manual | See manual table | ⬜ pending |
| Patient form validation | — | 2 | D-01,D-02,D-03,D-05 | — | Client-side validation before submit | manual | See manual table | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

No test framework to install. TypeScript compilation serves as the automated gate.

- [ ] Verify `npx tsc --noEmit` passes before beginning execution
- [ ] Verify `npm run db:push` applies schema migration without errors
- [ ] Confirm `Availability.dayOfWeek` convention from `prisma/seed.ts` (0=Sunday or 0=Monday)
- [ ] Verify `PrismaClientKnownRequestError` import path in Prisma 6 before writing POST handler

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Slot generation correctness | D-06, D-07, D-08 | Pure computation, no test harness | Visit /reservar, select a doctor, navigate to step 3. Verify slots match doctor's availability + durationMin. Verify booked slots appear gray. |
| Race condition / double booking | D-04 | Requires concurrent requests | Open two browser tabs, select same doctor/date/time. Submit form in both simultaneously. Verify only one succeeds; second gets "Este turno ya fue reservado" error. |
| No-availability message | D-09 | Requires seed data with no availability | Select a doctor with no Availability records. Verify step 3 shows friendly message + back button. |
| Wizard state resets on reload | Discretion | Browser behavior | Complete step 2, reload page, verify wizard returns to step 1. |
| DNI validation | D-01 | Client-side only | Enter "12.345.678" — verify dots stripped, stored as "12345678". Enter "123" — verify validation error. |
| Phone validation | D-02 | Client-side only | Enter "230-258-7896" — verify error (must be exactly 10 digits). Enter "2302587896" — verify accepted. |
| Obra social optional | D-05 | Form behavior | Submit form without filling obra social — verify turno created successfully. |
| TypeScript build passes | Build gate | CI signal | `npm run build` exits 0 with no TS errors. |

---

## Validation Sign-Off

- [ ] Schema migration applied (`npm run db:push`)
- [ ] TypeScript compiles (`npx tsc --noEmit`)
- [ ] `npm run build` succeeds
- [ ] Manual smoke test: full wizard flow end-to-end
- [ ] Race condition manually tested
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
