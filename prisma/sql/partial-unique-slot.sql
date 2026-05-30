-- Partial unique index for appointment slots.
--
-- WHY: Prisma cannot express filtered (partial) indexes, and a plain
-- @@unique([doctorId, date, time]) would let a CANCELLED/NO_SHOW row keep
-- occupying a slot forever — the slot shows as free in /reservar but the
-- INSERT fails with P2002. This index enforces "one ACTIVE appointment per
-- (doctor, date, time)" while ignoring freed slots, so they can be re-booked.
--
-- The POST /api/public/appointments handler still catches P2002 → 409.
--
-- HOW TO APPLY (run once, and re-run if `prisma db push` ever drops it):
--   npx prisma db execute --schema prisma/schema.prisma --file prisma/sql/partial-unique-slot.sql

DROP INDEX IF EXISTS "appointment_active_slot_unique";

CREATE UNIQUE INDEX "appointment_active_slot_unique"
  ON "Appointment" ("doctorId", "date", "time")
  WHERE status NOT IN ('CANCELLED', 'NO_SHOW');
