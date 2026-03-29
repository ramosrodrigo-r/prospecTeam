---
phase: 3
slug: contact-history-deduplication
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-29
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in test runner (`node:test`) |
| **Config file** | none — framework built into Node.js 24 |
| **Quick run command** | `node --test src/history.test.js` |
| **Full suite command** | `node --test src/**/*.test.js` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test src/history.test.js`
- **After every plan wave:** Run `node --test src/**/*.test.js`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 3-01-01 | 01 | 1 | HIST-01 | unit | `node --test src/history.test.js` | ❌ W0 | ⬜ pending |
| 3-01-02 | 01 | 1 | HIST-02 | unit | `node --test src/history.test.js` | ❌ W0 | ⬜ pending |
| 3-01-03 | 01 | 1 | HIST-03 | unit | `node --test src/history.test.js` | ❌ W0 | ⬜ pending |
| 3-02-01 | 02 | 2 | HIST-01 | integration | `node --test src/**/*.test.js` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/history.test.js` — stubs para HIST-01, HIST-02, HIST-03
- [ ] Fixtures de arquivo temporário usando `node:os` + `tmpdir()` para isolamento entre testes

*Se nenhum: "Infraestrutura existente cobre todos os requisitos da fase."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Crash mid-run não corrompe history.json | HIST-03 | Requer Ctrl+C durante execução real | Iniciar run, pressionar Ctrl+C após alguns envios, verificar que o arquivo JSON é válido e contém entradas anteriores |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
