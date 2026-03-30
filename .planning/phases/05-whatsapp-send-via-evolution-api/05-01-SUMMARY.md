---
phase: 05-whatsapp-send-via-evolution-api
plan: 01
subsystem: api
tags: [evolution-api, whatsapp, fetch, AbortController, env-validation, tdd]

# Dependency graph
requires:
  - phase: 03-contact-history-deduplication
    provides: recordSend function used by sender.js to log successful sends
  - phase: 04-message-template-rendering
    provides: rendered message string passed to sendWhatsApp as second parameter
provides:
  - HTTP client for Evolution API (checkConnection + sendTextMessage) with AbortController timeout
  - WhatsApp send pipeline stage (sendWhatsApp) with 3-8s delay and recordSend on success
  - Expanded validateEnv returning object with 4 env vars
  - .env.example updated with Evolution API vars
affects:
  - 05-02 (wiring — sender.js + evolution.js used in bin/prospect.js)
  - 06-email-send-via-zoho (same config/env pattern to follow)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "AbortController with clearTimeout in finally block for safe HTTP timeout cleanup"
    - "sendWhatsApp accepts optional _deps parameter for test dependency injection (testability pattern)"
    - "validateEnv returns structured object instead of scalar — callers destructure as needed"
    - "Random delay range: 3000 + Math.floor(Math.random() * 5001) for 3000-8000ms inclusive"

key-files:
  created:
    - src/services/evolution.js
    - src/stages/sender.js
    - tests/unit/evolution.test.js
    - tests/unit/sender.test.js
  modified:
    - src/utils/env.js
    - tests/unit/env.test.js
    - .env.example

key-decisions:
  - "sender.js accepts optional _deps = {} 4th parameter for dependency injection — mock.module not available in node:test v24 without extra flags"
  - "validateEnv returns object { apiKey, evolutionApiUrl, evolutionApiKey, evolutionInstance } — callers must destructure (breaking change from string return)"
  - "sendWhatsApp delay applied after recordSend (not before) — ensures history is logged before pause"

patterns-established:
  - "Evolution API uses apikey header (not Authorization: Bearer) — applies to all future Evolution API calls"
  - "Dependency injection via optional _deps parameter for functions that import side-effectful modules"

requirements-completed: [WA-01, WA-02]

# Metrics
duration: 15min
completed: 2026-03-30
---

# Phase 05 Plan 01: WhatsApp Send via Evolution API Summary

**Evolution API HTTP client (checkConnection + sendTextMessage) and sendWhatsApp pipeline stage with AbortController timeout, 3-8s delay, and recordSend integration — all TDD, 75/75 tests green**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-30T18:00:00Z
- **Completed:** 2026-03-30T18:15:00Z
- **Tasks:** 2 (TDD RED + GREEN)
- **Files modified:** 7

## Accomplishments

- `src/services/evolution.js`: `checkConnection` (GET with AbortController 5s timeout + clearTimeout in finally) and `sendTextMessage` (POST with JSON body and apikey header)
- `src/stages/sender.js`: `sendWhatsApp(prospect, message, config, _deps)` — calls sendTextMessage, records send on success, applies 3-8s random delay, returns `{ ok: true }` or `{ ok: false, reason }`
- `src/utils/env.js`: `validateEnv()` now returns structured object with 4 env vars (breaking change from string return)
- `.env.example` updated with `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE` entries
- 19 new tests (evolution: 8, sender: 5, env: 6), all passing alongside 56 pre-existing tests (75 total)

## Task Commits

1. **Task 1: RED — Failing tests + stubs** - `6bd414e` (test)
2. **Task 2: GREEN — Implementation** - `6221946` (feat)

## Files Created/Modified

- `src/services/evolution.js` — Evolution API HTTP client: checkConnection (GET + timeout) and sendTextMessage (POST)
- `src/stages/sender.js` — WhatsApp send stage: sendWhatsApp with delay, recordSend, error handling
- `src/utils/env.js` — Expanded validateEnv returning object with 4 vars
- `.env.example` — Added 3 Evolution API env var entries
- `tests/unit/evolution.test.js` — 8 tests for checkConnection and sendTextMessage
- `tests/unit/sender.test.js` — 5 tests for sendWhatsApp (success, failure, recordSend, delay)
- `tests/unit/env.test.js` — Expanded with 6 tests for 4-var object contract

## Decisions Made

- `sender.js` accepts optional `_deps = {}` as 4th parameter for dependency injection. This was necessary because `mock.module` from `node:test` is not available in Node.js v24 without experimental VM flags. Using `_deps` keeps sender testable while maintaining the public API contract.
- `validateEnv()` now returns an object (not a string). This is a breaking change from Phase 01 — `bin/prospect.js` will be updated in Plan 02 to destructure the return value.
- Delay is applied after `recordSend` to ensure history is committed before the pause.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added dependency injection to sender.js**
- **Found during:** Task 2 (GREEN implementation)
- **Issue:** `mock.module` from `node:test` is not a function in Node.js v24 — the plan suggested using it for mocking `recordSend` in sender.test.js but it does not exist
- **Fix:** Added optional `_deps = {}` 4th parameter to `sendWhatsApp` with `??` fallback to real imports. Updated sender.test.js to use this pattern. The public API is backward compatible (4th param optional)
- **Files modified:** `src/stages/sender.js`, `tests/unit/sender.test.js`
- **Verification:** All 5 sender tests pass, delay test captures correct range
- **Committed in:** `6221946`

---

**Total deviations:** 1 auto-fixed (1 missing critical/testability)
**Impact on plan:** Auto-fix necessary for test isolation. No scope creep. Public API unchanged for callers not passing deps.

## Issues Encountered

- `mock.module` not available in Node.js v24's `node:test` runner without `--experimental-vm-modules`. Resolved via optional dependency injection pattern.

## User Setup Required

**New environment variables required before running.** Add to your `.env` file:

```
EVOLUTION_API_URL=http://your-evolution-api-host:8080
EVOLUTION_API_KEY=your-api-key-from-dashboard
EVOLUTION_INSTANCE=your-instance-name
```

These are now validated at startup by `validateEnv()`. The bot will throw with a descriptive error if any are missing.

## Next Phase Readiness

- `evolution.js` and `sender.js` ready for wiring in Plan 02 (`bin/prospect.js`)
- `validateEnv()` returns structured config — Plan 02 will destructure and pass to `sendWhatsApp` as `config` parameter
- Pre-existing tests unaffected (75/75 passing)
- Blocker: `bin/prospect.js` currently calls `validateEnv()` expecting a string — must update in Plan 02

---
*Phase: 05-whatsapp-send-via-evolution-api*
*Completed: 2026-03-30*
