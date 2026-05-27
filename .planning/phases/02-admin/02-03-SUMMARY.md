---
plan: 02-03
status: complete
wave: 2
completed: 2026-05-27
---
# 02-03 Summary — Specialties API

## What was done
- GET /api/admin/specialties — returns active specialties (any authenticated role)
- POST /api/admin/specialties — creates specialty (ADMIN only, 201)
- PUT /api/admin/specialties/[id] — partial update (ADMIN only)
- DELETE /api/admin/specialties/[id] — soft delete via isActive=false (ADMIN only)
- No mass assignment, no NextResponse, params always awaited

## Deviations from Plan
- Used named import `{ prisma }` instead of default import `prisma` from `@/lib/prisma` — the module uses `export const prisma`, not `export default`. Plan showed default import which would have caused a TypeScript error.

## Files modified
- app/api/admin/specialties/route.ts (new)
- app/api/admin/specialties/[id]/route.ts (new)

## Verification
- npx tsc --noEmit: PASS
