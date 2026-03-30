---
phase: 4
slug: message-template-rendering
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x |
| **Config file** | `package.json` (jest config inline) |
| **Quick run command** | `npx jest src/utils/template.test.js --no-coverage` |
| **Full suite command** | `npx jest --no-coverage` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest src/utils/template.test.js --no-coverage`
- **After every plan wave:** Run `npx jest --no-coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 4-01-01 | 01 | 1 | TMPL-01 | unit | `npx jest src/utils/template.test.js --no-coverage` | ❌ W0 | ⬜ pending |
| 4-01-02 | 01 | 1 | TMPL-01 | unit | `npx jest src/utils/template.test.js --no-coverage` | ❌ W0 | ⬜ pending |
| 4-02-01 | 02 | 2 | TMPL-01 | unit | `npx jest src/utils/template.test.js --no-coverage` | ❌ W0 | ⬜ pending |
| 4-02-02 | 02 | 2 | TMPL-01 | integration | `npx jest --no-coverage` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/utils/template.test.js` — testes unitários para `renderTemplate` (RED antes da implementação)
- [ ] Stubs dos casos: substituição correta dos 4 campos, fallback de `rating` nulo, ausência de placeholders não resolvidos

*Infraestrutura jest já existe — apenas o arquivo de testes precisa ser criado.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Template editável por não-desenvolvedor | TMPL-01 | Verificação de UX/arquivo | Abrir `templates/outreach.txt`, editar um texto, rodar o bot e confirmar que a mudança aparece na mensagem gerada |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
