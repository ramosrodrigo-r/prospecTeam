---
phase: 1
slug: foundation-places
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-28
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node:test` (built-in) + `node:assert` — zero install required |
| **Config file** | none — run directly |
| **Quick run command** | `node --test tests/unit/*.test.js` |
| **Full suite command** | `node --test tests/unit/*.test.js` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test tests/unit/*.test.js`
- **After every plan wave:** Run `node --test tests/unit/*.test.js`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01 | 01 | 1 | SRCH-01 | unit | `node --test tests/unit/args.test.js` | ❌ W0 | ⬜ pending |
| 1-02 | 01 | 1 | SRCH-01 | unit | `node --test tests/unit/args.test.js` | ❌ W0 | ⬜ pending |
| 1-03 | 01 | 1 | SRCH-01 | unit | `node --test tests/unit/fetch.test.js` | ❌ W0 | ⬜ pending |
| 1-04 | 01 | 1 | SRCH-01 | unit | `node --test tests/unit/fetch.test.js` | ❌ W0 | ⬜ pending |
| 1-05 | 01 | 1 | SRCH-03 | unit | `node --test tests/unit/fetch.test.js` | ❌ W0 | ⬜ pending |
| 1-06 | 01 | 1 | D-07 | unit | `node --test tests/unit/env.test.js` | ❌ W0 | ⬜ pending |
| 1-07 | 01 | 1 | D-03 | unit | `node --test tests/unit/places.test.js` | ❌ W0 | ⬜ pending |
| 1-08 | 01 | 1 | D-13 | unit | `node --test tests/unit/places.test.js` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/args.test.js` — cobre SRCH-01: parsing de `--city`/`--category` e exit code 1 quando ausentes
- [ ] `tests/unit/env.test.js` — cobre D-07: `GOOGLE_PLACES_API_KEY` ausente causa `process.exit(1)`
- [ ] `tests/unit/fetch.test.js` — cobre SRCH-01 paginação + SRCH-03 mapeamento de campos (mocked fetch)
- [ ] `tests/unit/places.test.js` — cobre D-03 FieldMask incluindo `nextPageToken`, D-13 debug logging

Framework install: nenhum necessário (`node:test` é built-in no Node.js v18+).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| SC #3: billing alert $10 + quota cap no Google Cloud Console | — | Configuração externa ao código | Verificar no console GCP antes do primeiro call live |
| SC #4: inspecionar headers na saída do debug mode | D-13 | Requer observar stderr ao vivo | `DEBUG=1 node bin/prospect.js --city "Sao Paulo" --category "restaurante"` — confirmar headers no stderr |
| SC #5: >20 resultados via paginação real | SRCH-01 | Requer chamada real à API | Rodar contra category grande em cidade grande, contar resultados |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 2s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
