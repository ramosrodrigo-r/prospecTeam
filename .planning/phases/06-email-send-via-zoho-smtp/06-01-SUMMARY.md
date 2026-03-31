---
phase: 06-email-send-via-zoho-smtp
plan: 01
subsystem: email
tags: [nodemailer, smtp, zoho, history, channel-aware, tdd]

# Dependency graph
requires:
  - phase: 05-whatsapp-send-via-evolution-api
    provides: sender.js pattern (_deps injection), history.js with recordSend/isDuplicate, pipeline structure

provides:
  - Channel-aware history API: isDuplicate(placeId, channel) and recordSend(placeId, channel)
  - Automatic schema migration: { sentAt } -> { wa, email } on loadHistory()
  - Zoho SMTP transporter factory: src/services/zoho.js with createZohoTransporter and sendMail
  - Email pipeline stage: src/stages/emailSender.js with sendEmail and renderEmailMessage
  - Email body template: templates/outreach-email.txt with 4 placeholders

affects: [06-email-send-via-zoho-smtp plan 02, bin/prospect.js pipeline wiring]

# Tech tracking
tech-stack:
  added: [nodemailer 8.0.4]
  patterns:
    - "_deps injection for all new stages (mirrors sender.js pattern)"
    - "channel-aware history: isDuplicate/recordSend take 2nd param 'wa' or 'email'"
    - "atomic write-then-rename preserved in recordSend"
    - "import.meta.url path resolution for template files in stages"

key-files:
  created:
    - src/services/zoho.js
    - src/stages/emailSender.js
    - templates/outreach-email.txt
    - tests/unit/zoho.test.js
    - tests/unit/emailSender.test.js
  modified:
    - src/history.js
    - src/stages/dedup.js
    - tests/unit/history.test.js
    - package.json

key-decisions:
  - "isDuplicate(placeId, channel) and recordSend(placeId, channel) — channel-aware API, wa and email are independent"
  - "loadHistory migrates old { sentAt } schema to { wa: sentAt, email: null } in memory — no disk rewrite on migration"
  - "dedup.js uses isDuplicate(placeId, 'wa') — dedup stage guards WA channel; Plan 02 adds dual-channel loop"
  - "createZohoTransporter accepts optional _createTransport dep for unit testing without real SMTP"

patterns-established:
  - "Pattern: new channel stages mirror sender.js — _deps={}, { ok, reason } return, recordSend after confirmation"
  - "Pattern: transporter created once via factory, reused across sendMail calls"

requirements-completed: [EMAIL-01, EMAIL-02]

# Metrics
duration: 2min
completed: 2026-03-31
---

# Phase 06 Plan 01: Email Send via Zoho SMTP — Foundation Summary

**Channel-aware history with schema migration, nodemailer Zoho SMTP service, email sender stage with silent skip, and complete unit test coverage (23 tests, 90 suite-wide)**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-31T17:21:07Z
- **Completed:** 2026-03-31T17:23:00Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- history.js updated to channel-aware API: `isDuplicate(placeId, channel)` and `recordSend(placeId, channel)` with automatic migration of old `{ sentAt }` schema to `{ wa, email }`
- zoho.js creates nodemailer transporter with smtp.zoho.com:587 STARTTLS (secure: false) via injectable factory
- emailSender.js sends email via _deps pattern — silently returns `{ ok: false, reason: 'no email address' }` when prospect.email absent, calls `recordSend(placeId, 'email')` only after SMTP confirmed
- outreach-email.txt template with {{nome}}, {{rating}}, {{categoria}}, {{cidade}} placeholders in plain ASCII
- 23 phase-6 tests passing, 90 total suite-wide (0 failures)

## Task Commits

Each task was committed atomically:

1. **Task 1: Channel-aware history.js + updated tests** - `28e51b2` (feat)
2. **Task 2: Zoho SMTP service, emailSender stage, email template + tests** - `d9ed7fb` (feat)

**Plan metadata:** _pending final commit_

_Note: Both tasks followed TDD — tests written RED before implementation, then GREEN._

## Files Created/Modified

- `src/history.js` - Channel-aware isDuplicate/recordSend + loadHistory migration
- `src/services/zoho.js` - Nodemailer Zoho SMTP transporter factory
- `src/stages/emailSender.js` - Email pipeline stage with skip logic and renderEmailMessage
- `src/stages/dedup.js` - Updated to call isDuplicate with 'wa' channel (auto-fix)
- `templates/outreach-email.txt` - Email body template (plain ASCII, 4 placeholders)
- `tests/unit/history.test.js` - Updated + 5 new tests for migration and channel independence
- `tests/unit/zoho.test.js` - New: transporter config and sendMail arg tests
- `tests/unit/emailSender.test.js` - New: 8 tests covering EMAIL-01 and EMAIL-02
- `package.json` - Added nodemailer 8.0.4 dependency

## Decisions Made

- Channel independence: `isDuplicate('id', 'wa')` and `isDuplicate('id', 'email')` check separate fields — a business can be contacted via WA but not email and vice versa
- Schema migration in memory only: `loadHistory()` converts old `{ sentAt }` entries to `{ wa: sentAt, email: null }` without rewriting the file — safe for production data
- `dedup.js` updated to pass `'wa'` channel to isDuplicate — dedup stage guards WA channel specifically; dual-channel loop comes in Plan 02
- `_createTransport` optional dep in `createZohoTransporter` allows full unit testing without real SMTP connections

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed dedup.js calling old 1-parameter isDuplicate API**
- **Found during:** Task 2 (full suite verification)
- **Issue:** `dedup.js` called `isDuplicate(p.placeId)` without channel — new API requires 2 parameters; 2 dedup tests were failing
- **Fix:** Updated `src/stages/dedup.js` to call `isDuplicate(p.placeId, 'wa')` — dedup stage logically guards the WA channel (pre-existing behavior)
- **Files modified:** `src/stages/dedup.js`
- **Verification:** `node --test tests/unit/dedup.test.js` — all 5 tests pass; full suite 90/90 green
- **Committed in:** `d9ed7fb` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug)
**Impact on plan:** Auto-fix necessary for correctness — changing isDuplicate signature without updating all callers would leave the codebase broken. No scope creep.

## Issues Encountered

None — TDD RED/GREEN cycles worked as expected. nodemailer installed without issues.

## User Setup Required

None - no external service configuration required in this plan. Zoho SMTP credentials (ZOHO_SMTP_USER, ZOHO_SMTP_PASS) will be wired in Plan 02 pipeline integration.

## Next Phase Readiness

- All foundation modules tested and committed: history.js, zoho.js, emailSender.js, outreach-email.txt
- Plan 02 can now wire emailSender into bin/prospect.js dual-channel loop
- sender.js still calls `recordSend(prospect.placeId)` without channel — Plan 02 must update this as well
- validateEnv expansion (ZOHO_SMTP_USER, ZOHO_SMTP_PASS, EMAIL_SUBJECT) deferred to Plan 02

## Self-Check: PASSED

- All 9 expected files confirmed present on disk
- Both task commits found: `28e51b2`, `d9ed7fb`
- `node --test tests/unit/emailSender.test.js tests/unit/zoho.test.js tests/unit/history.test.js` — 23/23 pass

---
*Phase: 06-email-send-via-zoho-smtp*
*Completed: 2026-03-31*
