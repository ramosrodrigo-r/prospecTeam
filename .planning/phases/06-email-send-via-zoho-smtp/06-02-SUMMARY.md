---
phase: 06-email-send-via-zoho-smtp
plan: "02"
subsystem: api
tags: [nodemailer, zoho-smtp, email, whatsapp, dual-channel, dedup, env-validation]

# Dependency graph
requires:
  - phase: 06-email-send-via-zoho-smtp-01
    provides: "Zoho SMTP service, emailSender stage, channel-aware history.js"
  - phase: 05-whatsapp-send-via-evolution-api
    provides: "sender.js, sender unit tests, Evolution API health check"
provides:
  - "Dual-channel pipeline: WA + email per prospect in single bot run"
  - "Channel-aware dedup: isDuplicate(placeId, channel) guards each send independently"
  - "env.js validates all 7 required env vars including Zoho SMTP credentials"
  - "bin/prospect.js wired for full dual-channel loop with per-channel skip logging"
  - "sender.js fixed to call recordSend(placeId, 'wa') with channel param"
affects: [07-cli-wiring-operator-ux]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dual-channel loop: for each prospect, attempt WA then email independently"
    - "Per-channel dedup guard in loop: isDuplicate(id, 'wa') and isDuplicate(id, 'email')"
    - "dedupProspects keeps prospect if at least one channel still pending"
    - "renderTemplate used inline in loop for email subject variable substitution"

key-files:
  created: []
  modified:
    - src/utils/env.js
    - src/stages/sender.js
    - src/stages/dedup.js
    - bin/prospect.js
    - .env.example
    - tests/unit/sender.test.js
    - tests/unit/dedup.test.js
    - tests/unit/env.test.js

key-decisions:
  - "dedupProspects keeps prospect if either wa or email channel still pending — channel guards in loop handle individual skips"
  - "createZohoTransporter initialized once before the loop, not per-prospect"
  - "email subject rendered per-prospect via renderTemplate to support {{nome}} and other variables"
  - "prospect without phone still goes through email channel (no WA guard needed for email)"

patterns-established:
  - "Pattern: dual-channel loop — WA first (guarded by phone check), email second (no phone requirement)"
  - "Pattern: per-channel isDuplicate guard in loop body, not at dedup stage"

requirements-completed: [EMAIL-01, EMAIL-02]

# Metrics
duration: 10min
completed: 2026-03-31
---

# Phase 06 Plan 02: Email Send via Zoho SMTP — Pipeline Wiring Summary

**Dual-channel outreach pipeline wired: WA + email per prospect with channel-aware dedup, Zoho SMTP initialized once, and env.js validating all 7 required variables**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-31T17:20:00Z
- **Completed:** 2026-03-31T17:30:00Z
- **Tasks:** 2 (1 auto + 1 human-verify, approved)
- **Files modified:** 8

## Accomplishments

- Expanded `validateEnv()` to require and return 3 new Zoho/email vars (`zohoSmtpUser`, `zohoSmtpPass`, `emailSubject`) alongside the existing 4
- Fixed breaking call in `sender.js`: `recordSend(prospect.placeId)` updated to `recordSend(prospect.placeId, 'wa')` to match the new channel-aware history API
- Updated `dedupProspects` in `dedup.js` to use channel-aware checks — keeps prospects with at least one channel still pending
- Rewrote `bin/prospect.js` as dual-channel loop: WA (guarded by phone check + isDuplicate 'wa') then email (guarded by isDuplicate 'email') per prospect, with distinct log lines per outcome
- Updated `sender.test.js`, `dedup.test.js`, `env.test.js` to cover the new channel-aware APIs
- Human verified: full test suite green, terminal shows dual-channel status lines, email delivered via Zoho SMTP, history.json shows channel-aware schema, second run deduplicates all prospects

## Task Commits

1. **Task 1: Expand env.js, fix sender.js channel call, update dedup.js, wire bin/prospect.js dual-channel loop** - `fbbc10c` (feat)
2. **Task 1 (auto-fix): Update dedup.test.js and env.test.js for channel-aware API** - `822853b` (fix)
3. **Task 2: Verify dual-channel pipeline end-to-end** — human-verified, approved by user

## Files Created/Modified

- `src/utils/env.js` — Added `zohoSmtpUser`, `zohoSmtpPass`, `emailSubject` to validateEnv (7 total vars)
- `src/stages/sender.js` — Fixed `recordSend(prospect.placeId, 'wa')` (was missing channel param)
- `src/stages/dedup.js` — Channel-aware filter: keeps prospects where wa or email still pending
- `bin/prospect.js` — Full dual-channel pipeline: health check, Zoho init, dedup, WA+email loop
- `.env.example` — Documented `ZOHO_SMTP_USER`, `ZOHO_SMTP_PASS`, `EMAIL_SUBJECT` with usage notes
- `tests/unit/sender.test.js` — Updated mockRecordSend to capture channel param, added channel assertion
- `tests/unit/dedup.test.js` — Updated to cover channel-aware isDuplicate mock
- `tests/unit/env.test.js` — Updated to cover 7-var validateEnv

## Decisions Made

- `dedupProspects` keeps a prospect if EITHER channel is still pending — per-channel guards in the loop body handle individual skips (not at dedup stage)
- `createZohoTransporter` called once before the loop to initialize singleton transporter, not per-prospect
- Email subject rendered per-prospect with `renderTemplate(env.emailSubject, {...})` to support `{{nome}}` and other vars
- Prospect without phone still enters email channel (no phone required for email)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated test files (dedup.test.js, env.test.js) for channel-aware API**
- **Found during:** Task 1 (post-implementation test run)
- **Issue:** `dedup.test.js` used old 1-param `isDuplicate` mock; `env.test.js` did not cover the 3 new Zoho vars
- **Fix:** Updated both test files to match the new channel-aware API and 7-var env validation
- **Files modified:** `tests/unit/dedup.test.js`, `tests/unit/env.test.js`
- **Verification:** `node --test tests/unit/*.test.js` exits 0
- **Committed in:** `822853b`

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug in test files)
**Impact on plan:** Required for test correctness. No scope creep.

## Issues Encountered

None — all planned work proceeded as specified. Test file updates were a natural consequence of the API changes in the source modules.

## User Setup Required

**External services require manual configuration:**

- `ZOHO_SMTP_USER` — Zoho Mail account email address
- `ZOHO_SMTP_PASS` — App Password from Zoho Mail > Settings > Security > App Passwords
- `EMAIL_SUBJECT` — Subject line with optional `{{nome}}`, `{{rating}}`, `{{categoria}}`, `{{cidade}}` variables
- SPF record: DNS TXT `v=spf1 include:zoho.com ~all` for sending domain
- DKIM: Zoho Admin Console > Email Authentication > DKIM — add DNS TXT record

## Next Phase Readiness

- Complete dual-channel outreach pipeline is operational
- Phase 07 (CLI Wiring + Operator UX) can build on the current `bin/prospect.js` entry point
- No blockers — all unit tests pass, human verification passed

---
*Phase: 06-email-send-via-zoho-smtp*
*Completed: 2026-03-31*
