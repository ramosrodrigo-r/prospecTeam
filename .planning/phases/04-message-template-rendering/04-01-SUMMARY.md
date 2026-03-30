---
phase: 04-message-template-rendering
plan: 01
subsystem: testing
tags: [node:test, tdd, templates, string-replacement]

requires:
  - phase: 03-contact-history-deduplication
    provides: "Established node:test + node:assert/strict patterns and pure-function unit test structure"

provides:
  - "templates/outreach.txt with 4 placeholders ({{nome}} x2, {{rating}}, {{categoria}}, {{cidade}})"
  - "tests/unit/template.test.js with 5 failing tests for renderTemplate (TDD RED)"

affects:
  - 04-message-template-rendering Plan 02 (implements src/utils/template.js to make tests go GREEN)

tech-stack:
  added: []
  patterns:
    - "TDD RED phase: test file imports from not-yet-created module, fails with ERR_MODULE_NOT_FOUND"
    - "Plain-text template with {{placeholder}} syntax for non-developer editability"

key-files:
  created:
    - templates/outreach.txt
    - tests/unit/template.test.js
  modified: []

key-decisions:
  - "Plain ASCII in outreach.txt (no accents) to avoid encoding issues in WhatsApp/email delivery"
  - "{{nome}} appears twice in template to verify multiple-occurrence substitution behavior"
  - "5 test cases covering: all-vars happy path, null rating, missing key, multiple occurrences, all-null"

patterns-established:
  - "Template file at templates/ root — plain text, editable without JavaScript knowledge"
  - "TDD RED: test file created before implementation module, import fails as expected"

requirements-completed:
  - TMPL-01

duration: 1min
completed: 2026-03-30
---

# Phase 4 Plan 1: Message Template Rendering — TDD RED Phase Summary

**TDD RED setup: outreach.txt template with 4 placeholders and 5 failing unit tests for renderTemplate awaiting src/utils/template.js implementation**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-30T14:51:39Z
- **Completed:** 2026-03-30T14:53:13Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created `templates/outreach.txt` with all 4 placeholders (`{{nome}}` x2, `{{rating}}`, `{{categoria}}`, `{{cidade}}`) in plain ASCII
- Created `tests/unit/template.test.js` with 5 test cases following established `node:test` + `node:assert/strict` pattern
- Tests fail RED with `ERR_MODULE_NOT_FOUND` (correct TDD state — `src/utils/template.js` not created yet)
- Zero regressions in existing 26-test suite (dedup, filter, phone)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create outreach template file** - `1a59996` (chore)
2. **Task 2: Create failing tests for renderTemplate (RED)** - `7f0c9da` (test)

## Files Created/Modified

- `templates/outreach.txt` — Plain-text outreach message with `{{nome}}`, `{{rating}}`, `{{categoria}}`, `{{cidade}}` placeholders; `{{nome}}` used twice to test multi-occurrence substitution
- `tests/unit/template.test.js` — 5 unit tests for `renderTemplate`: happy path with all 4 vars, null rating, absent key, multiple occurrences of same placeholder, all-null values

## Decisions Made

- Plain ASCII only in template (no accented characters) — safer for cross-channel delivery via WhatsApp and email where encoding can differ
- `{{nome}}` repeated twice in template deliberately — tests that regex global flag handles multiple occurrences correctly
- Test cases use inline template strings (not the file) — unit tests stay isolated from filesystem, testing function purity

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — shell `!` escape issue in verify command resolved by switching to `node --input-type=module` heredoc. No code changes needed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- TDD RED phase complete: contract established by 5 failing tests
- Plan 02 must create `src/utils/template.js` exporting `renderTemplate(template, vars)` to make tests go GREEN
- Template file is ready and will be used by `src/stages/render.js` (Plan 02)

---
*Phase: 04-message-template-rendering*
*Completed: 2026-03-30*
