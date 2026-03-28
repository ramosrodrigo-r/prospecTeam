---
phase: 01-foundation-places
plan: "01"
subsystem: infra
tags: [nodejs, esm, dotenv, node-test, google-places]

# Dependency graph
requires: []
provides:
  - ESM Node.js project scaffold with dotenv 17.3.1
  - Wave 0 unit test stubs for all Phase 1 behaviors (RED phase)
  - .env.example documenting GOOGLE_PLACES_API_KEY with billing guard instructions
  - Directory structure: bin/, src/services/, src/stages/, tests/unit/
affects:
  - 01-02-PLAN (implements source modules these tests import)

# Tech tracking
tech-stack:
  added: [dotenv@17.3.1, node:test (built-in)]
  patterns:
    - ESM with type:module in package.json
    - node:test built-in test runner (zero extra dependency)
    - globalThis.fetch mocking in node:test for HTTP unit tests
    - beforeEach/afterEach for test isolation (env vars, fetch mock)

key-files:
  created:
    - package.json
    - .gitignore
    - .env.example
    - README.md
    - package-lock.json
    - tests/unit/args.test.js
    - tests/unit/env.test.js
    - tests/unit/fetch.test.js
    - tests/unit/places.test.js
  modified: []

key-decisions:
  - "node:test built-in as test framework — zero dependency, Node.js v18+ stable, consistent with minimal dependency philosophy"
  - "globalThis.fetch mocking via direct assignment in beforeEach/afterEach — no third-party mock library needed"
  - "Wave 0 tests fail RED intentionally — source modules (src/utils/args.js, src/utils/env.js, src/stages/fetch.js, src/services/places.js) not created in this plan"

patterns-established:
  - "Pattern 1: Test mocking — globalThis.fetch = async (url, opts) => { capturedUrl = url; capturedOpts = opts; return { ok: true, json: async () => mockResponse } }"
  - "Pattern 2: Env cleanup — store originalKey in beforeEach, restore or delete in afterEach"
  - "Pattern 3: console.error spy — assign a replacement function, restore in finally block"

requirements-completed: [SRCH-01, SRCH-03]

# Metrics
duration: 2min
completed: "2026-03-28"
---

# Phase 01 Plan 01: Project Scaffold + Wave 0 Test Stubs Summary

**ESM Node.js project scaffolded with dotenv 17.3.1 and four failing RED test stubs covering all Phase 1 behaviors (arg parsing, env validation, pagination, field mapping, FieldMask header, DEBUG logging)**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-28T19:03:42Z
- **Completed:** 2026-03-28T19:05:37Z
- **Tasks:** 2 completed
- **Files modified:** 9 created, 0 modified

## Accomplishments

- Valid ESM project with `"type": "module"`, `"engines": ">=21"`, and dotenv 17.3.1 installed
- .env.example documents GOOGLE_PLACES_API_KEY with $10 billing alert and quota cap prerequisites
- README.md warns about Enterprise SKU billing tier triggered by nationalPhoneNumber/websiteUri/rating fields
- Four unit test files covering all Wave 0 requirements — all fail RED because source modules do not exist yet

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold ESM project with dotenv** - `9a95eb4` (chore)
2. **Task 2: Create Wave 0 test stubs (RED phase)** - `c9131a5` (test)

## Files Created/Modified

- `package.json` - ESM project config with type:module, engines>=21, dotenv dependency, test script
- `.gitignore` - Blocks .env and node_modules/
- `.env.example` - GOOGLE_PLACES_API_KEY placeholder with billing guard documentation
- `README.md` - Setup instructions with Enterprise SKU billing warning
- `package-lock.json` - Lockfile from npm install
- `tests/unit/args.test.js` - parseArgs() tests: city/category parsing, missing args, edge cases
- `tests/unit/env.test.js` - validateEnv() tests: key present returns value, absent/empty throws
- `tests/unit/fetch.test.js` - fetchProspects() tests: single-page, two-page pagination, field mapping, displayName.text extraction, email:null
- `tests/unit/places.test.js` - searchPlaces() tests: FieldMask header, API key header, URL, method, body, pageToken, DEBUG logging

## Decisions Made

- Used `node:test` built-in as test framework — zero extra dependency, consistent with minimal-dependency philosophy (native fetch, native arg parsing, native test runner)
- Used direct `globalThis.fetch` assignment for mocking rather than sinon or jest.fn() — simpler, no dependencies
- Wave 0 test structure uses `beforeEach`/`afterEach` for full test isolation (restoring original fetch and env vars)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required at this stage. GOOGLE_PLACES_API_KEY configuration is needed before running live API calls (Plan 02 implementation).

## Next Phase Readiness

- Project scaffold is complete and `npm install` runs cleanly
- All 4 test files define the exact contracts Plan 02 must implement against
- Source modules to implement: `src/utils/args.js`, `src/utils/env.js`, `src/stages/fetch.js`, `src/services/places.js`
- Wave 0 tests will turn GREEN when Plan 02 creates those source modules

---
*Phase: 01-foundation-places*
*Completed: 2026-03-28*
