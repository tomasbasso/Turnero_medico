# Email Reminders — Design Spec

**Date:** 2026-06-01  
**Status:** Approved  

## Overview

Add automatic email notifications for appointments using Resend. Two emails per appointment:
1. **Confirmation email** — sent when an admin changes the appointment status to `CONFIRMED`
2. **Reminder email** — sent 24h before the appointment via a daily Vercel Cron Job

## Trigger Conditions

| Event | Condition | Action |
|---|---|---|
| Admin confirms appointment | `status → CONFIRMED` AND `patientEmail` is set | Send confirmation email, set `emailConfirmationSent = true` |
| Vercel Cron (daily 9am ARG) | Appointments with `status = CONFIRMED`, `date = tomorrow`, `emailReminderSent = false` | Send reminder email, set `emailReminderSent = true` |
| Appointment cancelled | `status → CANCELLED` | No action — cron filters by `CONFIRMED` only |

## Data Flow

```
Patient books → status PENDING (no email)
Admin confirms → PATCH /api/admin/appointments/[id]
             → sendConfirmationEmail() fires
             → emailConfirmationSent = true saved to DB

Cron 9am ARG (12 UTC) daily:
  → GET /api/cron/reminders (with Authorization: Bearer <CRON_SECRET>)
  → query: status=CONFIRMED, date=tomorrow, emailReminderSent=false
  → sendReminderEmail() for each
  → emailReminderSent = true saved to DB
```

## Schema Changes

Two boolean fields added to `Appointment`:

```prisma
emailConfirmationSent Boolean @default(false)
emailReminderSent     Boolean @default(false)
```

Migration via `prisma db push` (or migration file). Existing rows default to `false` — no backfill needed.

## New Files

### `lib/email.ts`
- Initializes Resend client with `RESEND_API_KEY` env var
- Exports `sendConfirmationEmail(appointment, doctor)` 
- Exports `sendReminderEmail(appointment, doctor)`
- Templates are plain HTML strings inline (no React Email dependency)
- Both functions return `{ success: boolean; error?: string }` — never throw

### `app/api/cron/reminders/route.ts`
- `GET` handler
- Validates `Authorization: Bearer <CRON_SECRET>` header → 401 if missing/wrong
- Queries all `CONFIRMED` appointments for tomorrow with `emailReminderSent = false`, including `doctor` relation
- Sends reminder emails sequentially (avoids Resend rate limits)
- Updates `emailReminderSent = true` per appointment after successful send
- Returns `{ sent: number; errors: number }` JSON

### `vercel.json`
```json
{
  "crons": [
    {
      "path": "/api/cron/reminders",
      "schedule": "0 12 * * *"
    }
  ]
}
```
12 UTC = 9am Argentina (UTC-3). Runs daily.

## Modified Files

### `app/api/admin/appointments/[id]/route.ts`
After successful `prisma.appointment.update`, if the new `status === 'CONFIRMED'` and the appointment has `patientEmail`:
- Call `sendConfirmationEmail(appointment, doctor)`
- Update `emailConfirmationSent = true` (separate update, fire-and-forget pattern — status change is never rolled back due to email failure)

## Environment Variables

| Variable | Description |
|---|---|
| `RESEND_API_KEY` | Resend API key (from resend.com dashboard) |
| `CRON_SECRET` | Random secret string — set in Vercel env vars, Vercel injects it automatically into cron requests |

## Email Content

### Confirmation email
- **Subject:** `Tu turno está confirmado — Dr. [name] el [date] a las [time]`
- **Body:** Patient name, doctor name + specialty, date, time, duration, instruction to contact if needs to cancel

### Reminder email
- **Subject:** `Recordatorio: tu turno es mañana — Dr. [name] a las [time]`
- **Body:** Same fields as confirmation, plus emphasis that it's tomorrow

## Error Handling

- Patient has no email → skip silently, no error logged
- Resend API fails → log error with appointment ID, do NOT revert status change, `emailConfirmationSent` stays `false` (next cron won't retry confirmation — acceptable trade-off for a consultorio)
- Cron called without valid secret → 401 response
- Appointment not found in cron context → won't happen (query result guarantees existence)

## Dependencies

- `resend` npm package (new)
- No React Email, no additional template engine

## Out of Scope

- Retry logic for failed confirmation emails
- Email open/click tracking
- Unsubscribe mechanism
- WhatsApp reminder changes (existing `whatsappSent` flow untouched)
- Cancellation emails
