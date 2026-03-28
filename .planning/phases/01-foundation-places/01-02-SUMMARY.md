---
phase: 01-foundation-places
plan: 02
subsystem: api
tags: [google-places, cli, dotenv, node-fetch, esm, pagination]

# Dependency graph
requires:
  - phase: 01-foundation-places plan 01
    provides: Wave 0 unit tests defining exact function signatures and contracts

provides:
  - src/utils/args.js — parseArgs CLI argument extractor
  - src/utils/env.js — validateEnv API key guard
  - src/services/places.js — searchPlaces Google Places API v1 POST wrapper
  - src/stages/fetch.js — fetchProspects pagination orchestrator
  - bin/prospect.js — CLI entry point producing JSON to stdout

affects: [02-filter, 03-history, 05-whatsapp, 06-email, 07-cli-wiring]

# Tech tracking
tech-stack:
  added: [dotenv/config ESM side-effect import]
  patterns: [FieldMask header for Places API v1, 2.5s pagination sleep, displayName.text extraction, env-first fail-fast CLI pattern]

key-files:
  created:
    - src/utils/args.js
    - src/utils/env.js
    - src/services/places.js
    - src/stages/fetch.js
    - bin/prospect.js
  modified: []

key-decisions:
  - "parseArgs uses non-consuming iteration (peek argv[i+1]) allowing flags consumed as values to still be matched as flags on the next iteration"
  - "dotenv/config is first import in bin/prospect.js to ensure .env loaded before any module reads process.env"
  - "env validated before args — fail fast on missing API key without wasting time on arg parsing"
  - "nextPageToken is top-level in FieldMask (not prefixed with places.) — critical for pagination to work"

patterns-established:
  - "Pattern: FieldMask header name is X-Goog-FieldMask, API key header is X-Goog-Api-Key (not Authorization)"
  - "Pattern: Places API v1 textQuery body field with pageSize:20"
  - "Pattern: query format is 'category em city' (Portuguese preposition)"
  - "Pattern: displayName.text (object with text+languageCode) not a plain string"
  - "Pattern: sleep before page 2+ (not after last page)"
  - "Pattern: errors to stderr (console.error), data to stdout (console.log) for pipe-friendly CLI"

requirements-completed: [SRCH-01, SRCH-03]

# Metrics
duration: 2min
completed: 2026-03-28
---

# Phase 01 Plan 02: Foundation Places Search Implementation Summary

**Google Places API v1 CLI integration — 5 modules, 20 tests GREEN, `node bin/prospect.js --city "X" --category "Y"` outputs paginated JSON prospects**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-28T19:08:00Z
- **Completed:** 2026-03-28T19:09:54Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Implemented all 5 source modules turning RED tests to GREEN (20/20 pass)
- Built pagination orchestrator with 2.5s sleep and correct displayName.text extraction
- CLI entry point wires dotenv, env guard, arg parsing, and fetch with proper stderr/stdout separation

## Task Commits

Each task was committed atomically:

1. **Task 1: Utility modules and Places API service** - `df43aa2` (feat)
2. **Task 2: Pagination orchestrator fetch.js** - `c127751` (feat)
3. **Task 3: CLI entry point bin/prospect.js** - `cb09cd5` (feat)

## Files Created/Modified

- `src/utils/args.js` - CLI argument extractor, starts at argv[2], non-consuming iteration
- `src/utils/env.js` - Reads GOOGLE_PLACES_API_KEY, throws with key name in message
- `src/services/places.js` - POST to places:searchText with X-Goog-FieldMask, DEBUG logging
- `src/stages/fetch.js` - Pagination loop with 2.5s sleep, maps Place to Prospect shape
- `bin/prospect.js` - CLI entry: dotenv → validateEnv → parseArgs → fetchProspects → stdout JSON

## Decisions Made

- **parseArgs non-consuming iteration:** When `--city` is followed directly by `--category`, the test expects `--category` to still be recognized as a flag. Non-consuming approach (read `argv[i+1]` without `++i`) allows this — the flag token gets processed twice (once as value, once as flag key).
- **dotenv first:** ESM hoists all imports, so `import 'dotenv/config'` must be the first line in bin/prospect.js to ensure env vars are loaded before any module initializes.
- **FieldMask pitfall documented:** `nextPageToken` is top-level (not `places.nextPageToken`) — critical for pagination to return tokens.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed parseArgs to use non-consuming iteration**
- **Found during:** Task 1 (parseArgs implementation)
- **Issue:** Test case `parseArgs(['node', 'script', '--city', '--category', 'restaurante'])` expected `city='--category'` AND `category='restaurante'`. Original `argv[++i]` implementation consumed `--category` as city's value and skipped it as a flag candidate, leaving category undefined.
- **Fix:** Changed from `args.city = argv[++i]` to `args.city = argv[i + 1]` (peek without pre-increment). The for-loop's natural `i++` advances to index 3 where `--category` is matched as a flag key, capturing `'restaurante'` as its value.
- **Files modified:** `src/utils/args.js`
- **Verification:** All 4 parseArgs tests pass including the edge case
- **Committed in:** `df43aa2` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Fix required for test contract compliance. No scope creep.

## Issues Encountered

None beyond the args.js fix documented above.

## User Setup Required

None - no external service configuration required in this plan. `.env` file with `GOOGLE_PLACES_API_KEY` is required at runtime but was set up as part of project initialization.

## Known Stubs

- `email: null` in `src/stages/fetch.js` — hardcoded null for Phase 1 per D-10. Email extraction from Places API is not available; future phases may add alternative email sourcing. This is intentional and does not prevent the plan's goal (Places search works correctly).

## Next Phase Readiness

- Full Google Places search CLI is operational — ready for Phase 02 (business filter + phone normalization)
- `node bin/prospect.js --city "Sao Paulo" --category "restaurante"` will return structured JSON with placeId, name, rating, phone, website fields when GOOGLE_PLACES_API_KEY is set
- Phase 02 can consume the Prospect array from fetchProspects directly

---
*Phase: 01-foundation-places*
*Completed: 2026-03-28*

## Self-Check: PASSED

- FOUND: src/utils/args.js
- FOUND: src/utils/env.js
- FOUND: src/services/places.js
- FOUND: src/stages/fetch.js
- FOUND: bin/prospect.js
- FOUND commit: df43aa2
- FOUND commit: c127751
- FOUND commit: cb09cd5
