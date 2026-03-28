---
phase: 2
slug: business-filter-phone-normalization
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-28
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node:test` (built-in, Node.js >= 21) |
| **Config file** | None — invoked directly via `node --test` |
| **Quick run command** | `node --test tests/unit/filter.test.js tests/unit/phone.test.js` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test tests/unit/filter.test.js tests/unit/phone.test.js`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 2-01-01 | 01 | 0 | SRCH-02 | unit | `node --test tests/unit/filter.test.js` | ❌ W0 | ⬜ pending |
| 2-01-02 | 01 | 0 | WA-03 | unit | `node --test tests/unit/phone.test.js` | ❌ W0 | ⬜ pending |
| 2-01-03 | 01 | 1 | SRCH-02 | unit | `node --test tests/unit/filter.test.js` | ✅ W0 | ⬜ pending |
| 2-01-04 | 01 | 1 | WA-03 | unit | `node --test tests/unit/phone.test.js` | ✅ W0 | ⬜ pending |
| 2-01-05 | 01 | 2 | SRCH-02 | unit | `npm test` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/filter.test.js` — stubs for SRCH-02 (8 filter behaviors: null, empty, whitespace, instagram no-protocol, instagram https, linktr.ee, real website excluded, parse-fail URL)
- [ ] `tests/unit/phone.test.js` — stubs for WA-03 (11 phone behaviors: 10 D-14 variants + null input)

*No framework install needed — `node:test` is built into Node.js 21+.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `filterBusinesses` integration in `fetch.js` pipeline | SRCH-02 | Integration with live Google Places API data | Run `npm start` with a test query; confirm filtered output excludes businesses with real websites |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 2s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
