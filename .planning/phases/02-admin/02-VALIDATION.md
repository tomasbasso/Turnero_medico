---
phase: 2
slug: admin
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-27
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | none — no test framework installed |
| **Config file** | none |
| **Quick run command** | `npx tsc --noEmit` (type check only) |
| **Full suite command** | `npx tsc --noEmit` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit`
- **After every plan wave:** Manual verification via dev server (`npm run dev`)
- **Before `/gsd-verify-work`:** All manual checklist items must be checked
- **Max feedback latency:** 5 seconds (TypeScript), manual for behavior

---

## Per-Task Verification Map

All behavioral verification is manual. TypeScript check is the only automated gate.

| Task ID | Wave | Success Criterion | Test Type | Automated Command | Status |
|---------|------|-------------------|-----------|-------------------|--------|
| Dashboard | 1 | 4 cards show correct counts for current week | manual | `npx tsc --noEmit` | ⬜ pending |
| Specialty CRUD | 2 | Create/edit/delete specialty via drawer | manual | `npx tsc --noEmit` | ⬜ pending |
| Doctor CRUD | 2 | Create/edit/delete doctor with avatar upload | manual | `npx tsc --noEmit` | ⬜ pending |
| Availability | 3 | Save/reload availability per doctor | manual | `npx tsc --noEmit` | ⬜ pending |
| Permissions | 3 | RECEPTIONIST sees lists, no action buttons | manual | `npx tsc --noEmit` | ⬜ pending |
| Feedback | all | Loading/error states visible on async ops | manual | `npx tsc --noEmit` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `npx tsc --noEmit` passes before any wave begins
- [ ] `npm run dev` starts without errors

*No test framework — all behavioral validation is manual via dev server.*

---

## Manual-Only Verifications

| Behavior | Why Manual | Test Instructions |
|----------|------------|-------------------|
| Dashboard 4 stat cards show correct weekly counts | No test framework; Prisma groupBy requires live DB | Run seed, navigate to /admin, verify counts match seeded data for current week |
| Specialty drawer create/edit/delete works | UI behavior | Create specialty "Test" → verify appears in list; edit name → verify updated; delete → verify removed |
| Doctor drawer with avatar preview and upload | File upload requires browser | Create doctor, select image → verify preview shows; save → verify avatar URL saved in DB |
| Availability editor per doctor | Complex state | Set Mon 09:00–12:00, add Tue 10:00–14:00; save; reload page → verify persisted |
| RECEPTIONIST role sees no action buttons | Role-based rendering | Login as receptionist@consultorio.com → verify no "Crear", "Editar", "Eliminar" buttons |
| API role enforcement | Security | Direct POST /api/admin/specialties with RECEPTIONIST token → expect 403 |

---

## Validation Sign-Off

- [ ] TypeScript passes (`npx tsc --noEmit`) after all waves
- [ ] All manual verifications checked above
- [ ] No broken navigation in sidebar
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
