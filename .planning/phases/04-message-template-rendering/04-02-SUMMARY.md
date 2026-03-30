---
phase: 04-message-template-rendering
plan: 02
subsystem: messaging
tags: [template, rendering, pipeline, regex]

# Dependency graph
requires:
  - phase: 04-message-template-rendering/04-01
    provides: "tests/unit/template.test.js with 5 RED tests and templates/outreach.txt"
provides:
  - "src/utils/template.js: pure renderTemplate function with regex-based variable substitution"
  - "src/stages/render.js: pipeline stage that reads outreach.txt and calls renderTemplate"
affects: [05-whatsapp-send, 06-email-send, 07-cli-wiring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure function + I/O wrapper split: renderTemplate handles logic, renderMessage handles file I/O"
    - "import.meta.url + dirname + join for ESM-safe absolute path resolution"
    - "Nullish coalescing (??) at I/O boundary to prevent 'null' literals in rendered output"

key-files:
  created:
    - src/utils/template.js
    - src/stages/render.js
  modified: []

key-decisions:
  - "renderTemplate is a pure function with no imports — takes template string and vars object, returns rendered string"
  - "renderMessage separates prospect fields from CLI context (cidade/categoria) — prospect is immutable, context is separate param"
  - "TEMPLATE_PATH resolved at module load time using import.meta.url to ensure correct path regardless of process cwd"

patterns-established:
  - "Pattern: Pure utility functions in src/utils/ have no imports and no side effects"
  - "Pattern: Pipeline stages in src/stages/ handle I/O and delegate logic to src/utils/"

requirements-completed: [TMPL-01]

# Metrics
duration: 1min
completed: 2026-03-30
---

# Phase 04 Plan 02: Message Template Rendering (GREEN) Summary

**renderTemplate pure function and renderMessage pipeline stage implemented — regex substitution, null-safe fallbacks, absolute path resolution, all 59 tests GREEN**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-30T14:55:32Z
- **Completed:** 2026-03-30T14:56:30Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- renderTemplate: regex-based variable substitution with global flag, handles null/undefined/missing keys as empty string
- renderMessage: reads templates/outreach.txt via ESM-safe absolute path, maps prospect + CLI context to template vars
- Full test suite (59 tests, 9 suites) passes GREEN with zero regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement renderTemplate pure function** - `64a85e1` (feat)
2. **Task 2: Implement renderMessage pipeline stage** - `da6f789` (feat)

## Files Created/Modified
- `src/utils/template.js` - Pure renderTemplate function using regex /\{\{(\w+)\}\}/g with null/undefined fallback to empty string
- `src/stages/render.js` - Pipeline stage reading outreach.txt via import.meta.url path, calling renderTemplate with mapped vars

## Decisions Made
- renderTemplate uses `val != null` (loose equality) to catch both null and undefined in a single check
- renderMessage uses `??` fallback on both prospect fields and CLI context params for double safety against null literals
- TEMPLATE_PATH navigates up 2 directories from src/stages/ to reach project root, then into templates/

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- renderMessage is ready for use by sender stages in phases 5 and 6
- Function signature: `renderMessage(prospect, { cidade, categoria })` returns fully-substituted string
- No `{{` literals possible in output for any input (all unknowns default to empty string)

---
*Phase: 04-message-template-rendering*
*Completed: 2026-03-30*
