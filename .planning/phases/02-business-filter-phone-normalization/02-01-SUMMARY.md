---
phase: 02-business-filter-phone-normalization
plan: 01
subsystem: testing
tags: [node:test, pure-functions, url-parsing, phone-normalization, tdd]

# Dependency graph
requires:
  - phase: 01-foundation-places
    provides: Prospect object shape (website field), node:test pattern, ESM module structure

provides:
  - filterBusinesses(prospects) pure function — filters out businesses with real websites
  - normalizePhone(raw) pure function — converts Brazilian phone strings to E.164 format
  - 8 unit tests for filterBusinesses covering all SRCH-02 edge cases
  - 13 unit tests for normalizePhone covering all WA-03 / D-14 variants

affects: [05-whatsapp-evolution-api, fetch-stage-integration, outreach-pipeline]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - URL hostname extraction with protocol-prefixing and try/catch for parse failures
    - Brazilian phone E.164 normalization via digit-stripping + length-based branching
    - console.warn + null return for recoverable normalization failures (not throw)

key-files:
  created:
    - src/utils/filter.js
    - src/utils/phone.js
    - tests/unit/filter.test.js
    - tests/unit/phone.test.js
  modified: []

key-decisions:
  - "BLOCKED_DOMAINS fixed list: instagram.com and linktr.ee only — no other bio-links in Phase 2"
  - "hostname endsWith matching catches all subdomains (www.instagram.com, m.instagram.com)"
  - "Phone normalization: digit-length branching (10/11 → prepend 55, 12/13 with 55 → as-is, other → null)"
  - "normalizePhone returns null with console.warn instead of throwing — keeps pipeline alive on bad data"
  - "No external dependencies added — both functions use only Node.js built-ins"

patterns-established:
  - "Pattern: URL hostname extraction — always prefix https:// for protocol-less strings, wrap new URL() in try/catch"
  - "Pattern: Blocked domain check — hostname === d || hostname.endsWith('.' + d) to handle subdomains without false positives"
  - "Pattern: console.warn spy in tests — store original, replace with spy, restore in same test scope"

requirements-completed: [SRCH-02, WA-03]

# Metrics
duration: 1min
completed: 2026-03-28
---

# Phase 2 Plan 01: Business Filter + Phone Normalization Summary

**Pure ESM utility functions: hostname-based Instagram/linktr.ee filter and digit-length-branching Brazilian E.164 phone normalizer, both with full node:test unit test coverage**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-28T23:52:04Z
- **Completed:** 2026-03-28T23:53:09Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- filterBusinesses: zero-dependency pure function using WHATWG URL API — includes businesses with null/empty/Instagram/linktr.ee/unparseable websites, excludes real websites
- normalizePhone: converts all 10 D-14 Brazilian phone variants to E.164 (5511XXXXXXXXX format) via digit-strip + length branch; returns null with console.warn for unrecognized formats
- 21 unit tests written RED-first, then GREEN — all pass; full suite (41 tests) green

## Task Commits

Each task was committed atomically:

1. **Task 1: Write RED unit tests for filter and phone modules** - `98f45cd` (test)
2. **Task 2: Implement filter.js and phone.js to make tests GREEN** - `af5e7bf` (feat)

_Note: TDD tasks have separate RED (test) and GREEN (feat) commits_

## Files Created/Modified

- `tests/unit/filter.test.js` - 8 unit tests for filterBusinesses (SRCH-02 coverage)
- `tests/unit/phone.test.js` - 13 unit tests for normalizePhone (WA-03 / D-14 coverage)
- `src/utils/filter.js` - filterBusinesses pure function with hostname-based blocked domain check
- `src/utils/phone.js` - normalizePhone pure function with digit-length E.164 normalization

## Decisions Made

- Kept BLOCKED_DOMAINS as a fixed hardcoded array per D-01 — no configurability needed in Phase 2
- Used `hostname === d || hostname.endsWith('.' + d)` to cover all subdomains correctly without false positives
- Digit-length branching chosen over libphonenumber-js — sufficient for Brazilian format, zero dependencies
- normalizePhone does not throw on failure — logs console.warn and returns null to keep pipeline alive (consistent with project error handling pattern)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — both modules implemented per spec on first attempt, all tests passed without debugging.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `src/utils/filter.js` ready for integration into `stages/fetch.js` (D-08: call filterBusinesses after pagination loop)
- `src/utils/phone.js` ready for import in Phase 5 Evolution API send stage (D-09)
- Existing `fetch.test.js` test "returns mapped prospects from a single-page response" uses `websiteUri: 'https://padaria.com'` — when D-08 integration happens, that mock will need updating to `websiteUri: null` to avoid being filtered out

---
*Phase: 02-business-filter-phone-normalization*
*Completed: 2026-03-28*
