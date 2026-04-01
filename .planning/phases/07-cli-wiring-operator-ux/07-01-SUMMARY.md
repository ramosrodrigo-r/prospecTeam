---
phase: 07-cli-wiring-operator-ux
plan: 01
subsystem: cli
tags: [commander, args, filter, dedup, fetch, onSkip]

# Dependency graph
requires:
  - phase: 02-business-filter-phone-normalization
    provides: filterBusinesses function this plan updates
  - phase: 03-contact-history-deduplication
    provides: dedupProspects function this plan updates
provides:
  - Commander.js-based CLI arg parsing with required --city and --category
  - filterBusinesses(prospects, onSkip) with callback for discarded prospects
  - dedupProspects(prospects, onSkip) with callback for fully-contacted prospects
  - fetchProspects threads onSkip through to filterBusinesses
affects:
  - 07-02-cli-wiring — Plan 02 wires Commander and skip logging into bin/prospect.js

# Tech tracking
tech-stack:
  added: [commander@^14.x]
  patterns:
    - optional onSkip callback pattern for reporting discarded items without coupling stages to logging
    - exitOverride for testable Commander programs (no process.exit in tests)

key-files:
  created: []
  modified:
    - src/utils/args.js
    - src/utils/filter.js
    - src/stages/dedup.js
    - src/stages/fetch.js
    - tests/unit/args.test.js
    - tests/unit/filter.test.js
    - tests/unit/dedup.test.js
    - package.json

key-decisions:
  - "Commander.js uses .exitOverride() so test suite can catch CommanderError instead of process.exit — required for testability"
  - "onSkip callbacks are optional (backward compatible) — callers not yet updated still work"
  - "fetch.js threads onSkip parameter to filterBusinesses — keeps onSkip wiring at pipeline-stage level"

patterns-established:
  - "onSkip(item, reason, detail) — uniform signature for all skip callbacks across pipeline stages"

requirements-completed:
  - OPS-01

# Metrics
duration: 2min
completed: 2026-04-01
---

# Phase 7 Plan 01: Commander.js args + onSkip callbacks in filter and dedup

**Commander.js replaces manual argv parsing with requiredOption validation; filterBusinesses and dedupProspects gain optional onSkip callbacks for skip event reporting**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-01T16:04:07Z
- **Completed:** 2026-04-01T16:06:01Z
- **Tasks:** 1 (TDD: 2 commits — RED + GREEN)
- **Files modified:** 8

## Accomplishments

- Replaced manual argv iteration in args.js with Commander.js using .requiredOption() — missing --city or --category now emits Commander's native error message
- Added onSkip callback to filterBusinesses — callers can receive (prospect, 'has-website', url) events for every discarded prospect
- Added onSkip callback to dedupProspects — callers can receive (p, 'already-contacted', ['wa', 'email']) events for fully-contacted prospects
- Threaded onSkip through fetchProspects to filterBusinesses for pipeline-level wiring

## Task Commits

1. **RED: failing tests for Commander args, onSkip in filter and dedup** - `00e592c` (test)
2. **GREEN: Commander.js + onSkip implementation** - `1454504` (feat)

## Files Created/Modified

- `src/utils/args.js` - Commander.js program with .requiredOption for --city and --category, .exitOverride for testability
- `src/utils/filter.js` - filterBusinesses gains optional onSkip(prospect, 'has-website', url) callback
- `src/stages/dedup.js` - dedupProspects gains optional onSkip(p, 'already-contacted', channels) callback
- `src/stages/fetch.js` - fetchProspects now accepts and threads onSkip to filterBusinesses
- `tests/unit/args.test.js` - new tests: valid parse, CommanderError on missing --city/--category, CommanderError on no args
- `tests/unit/filter.test.js` - added onSkip callback tests while keeping all existing tests
- `tests/unit/dedup.test.js` - added onSkip callback tests while keeping all existing tests
- `package.json` / `package-lock.json` - commander added to dependencies

## Decisions Made

- Commander's `.exitOverride()` enables throwing `CommanderError` instead of calling `process.exit()` — critical for test isolation
- onSkip callbacks are optional (undefined-safe) to preserve backward compatibility with all existing callers
- fetch.js uses destructured `{ city, category, apiKey, onSkip }` to thread onSkip naturally into filterBusinesses

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Plan 02 can now wire Commander into bin/prospect.js and add skip logging using the onSkip callbacks from filter and dedup
- All 97 existing tests continue to pass — no regressions

---
*Phase: 07-cli-wiring-operator-ux*
*Completed: 2026-04-01*
