---
phase: 05-whatsapp-send-via-evolution-api
plan: 02
subsystem: cli
tags: [evolution-api, whatsapp, pipeline, orchestrator, nodejs]

# Dependency graph
requires:
  - phase: 05-01
    provides: evolution.js (checkConnection, sendTextMessage), sender.js (sendWhatsApp), env.js (validateEnv returning object)
  - phase: 04-message-template-rendering
    provides: render.js (renderMessage)
  - phase: 03-contact-history-deduplication
    provides: history.js (loadHistory), dedup.js (dedupProspects)
  - phase: 01-foundation-places
    provides: fetch.js (fetchProspects), args.js (parseArgs)
provides:
  - bin/prospect.js — complete pipeline orchestrator: env -> health check -> fetch -> dedup -> render -> send WA
affects:
  - 06-email-send-via-zoho-smtp
  - 07-cli-wiring-operator-ux

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Pipeline wiring pattern: validateEnv -> healthCheck -> fetch -> loadHistory -> dedup -> render+send loop
    - Health check gate before expensive operations (fetch + send)
    - Per-contact error isolation: failures logged, pipeline continues, exit 0 always

key-files:
  created: []
  modified:
    - bin/prospect.js

key-decisions:
  - "Pipeline order: validateEnv -> healthCheck -> fetchProspects -> loadHistory -> dedupProspects -> loop(renderMessage + sendWhatsApp)"
  - "Health check exits 1 on disconnected instance before fetching any prospects (cost guard)"
  - "loadHistory() called before dedupProspects to ensure history is loaded into memory"
  - "Per-contact failures use console.log (not console.error) to avoid alarming operators — failures are expected"

patterns-established:
  - "Pipeline orchestrator pattern: single entry point wires all stages in order"
  - "Exit 0 even on per-contact failures — only env/health/fetch errors exit 1"

requirements-completed:
  - WA-01
  - WA-02

# Metrics
duration: 2min
completed: 2026-03-30
---

# Phase 05 Plan 02: WhatsApp Pipeline Wiring Summary

**bin/prospect.js rewritten as complete pipeline orchestrator: env validation, Evolution API health check, Google Places fetch, dedup, message render, and WhatsApp send with [WA sent]/[WA failed] output per contact**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-30T17:47:18Z
- **Completed:** 2026-03-30T17:48:15Z
- **Tasks:** 1 auto (Task 2 is checkpoint awaiting human verification)
- **Files modified:** 1

## Accomplishments
- Replaced debug-only script (console.log JSON) with complete v1 pipeline orchestrator
- Health check via Evolution API before any prospect fetching (cost guard + UX guard)
- Full pipeline: validateEnv -> healthCheck -> fetchProspects -> loadHistory -> dedupProspects -> render+send loop
- Per-contact output: `[WA sent] NomeDaEmpresa` or `[WA failed: motivo] NomeDaEmpresa`
- Exit 0 always — per-contact failures are expected, not fatal

## Task Commits

Each task was committed atomically:

1. **Task 1: Reescrever bin/prospect.js com pipeline completo v1** - `8417beb` (feat)

**Plan metadata:** pending (checkpoint not yet verified)

## Files Created/Modified
- `bin/prospect.js` - Complete pipeline orchestrator replacing debug-only script

## Decisions Made
- Pipeline order enforced: health check before fetch (D-07 compliance) to avoid billing Google Places for contacts that can't be messaged
- `loadHistory()` explicitly called before `dedupProspects()` to ensure in-memory map is populated
- `env = validateEnv()` returns full object — fields accessed as `env.apiKey`, `env.evolutionApiUrl`, etc. (breaking change from Phase 05-01)
- `status.instance?.state !== 'open'` checks correct field (`state`, not `connectionStatus`) per Evolution API response shape

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required beyond what is already in .env.

## Checkpoint Status

Plan paused at **Task 2: Verificar pipeline completo com instancia Evolution API real** (checkpoint:human-verify).

The user must:
1. Ensure `.env` has all 4 vars: `GOOGLE_PLACES_API_KEY`, `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE`
2. Ensure Evolution API instance is connected (QR code scanned)
3. Run: `node bin/prospect.js --city "Campinas" --category "padaria"`
4. Verify: health check passes, each contact produces `[WA sent]` or `[WA failed:]` line, delay visible between sends, exit code 0
5. Run same command again — should print "No new prospects to contact." (dedup works)

## Next Phase Readiness

- bin/prospect.js pipeline complete and ready for real-world verification
- After human verification: Phase 05 complete, ready for Phase 06 (email via Zoho SMTP)

## Known Stubs

None — all pipeline stages are fully wired with real implementations.

## Self-Check: PASSED

- `bin/prospect.js` — FOUND
- `05-02-SUMMARY.md` — FOUND
- commit `8417beb` — FOUND

---
*Phase: 05-whatsapp-send-via-evolution-api*
*Completed: 2026-03-30*
