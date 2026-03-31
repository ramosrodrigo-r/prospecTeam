---
phase: 6
slug: email-send-via-zoho-smtp
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-31
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | node:test (built-in, Node >= 21) |
| **Config file** | none — invocado via `node --test tests/unit/*.test.js` |
| **Quick run command** | `node --test tests/unit/emailSender.test.js tests/unit/zoho.test.js tests/unit/history.test.js` |
| **Full suite command** | `node --test tests/unit/*.test.js` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test tests/unit/emailSender.test.js tests/unit/zoho.test.js tests/unit/history.test.js`
- **After every plan wave:** Run `node --test tests/unit/*.test.js`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 6-W0-01 | 01 | 0 | EMAIL-01 | unit | `node --test tests/unit/emailSender.test.js` | ❌ W0 | ⬜ pending |
| 6-W0-02 | 01 | 0 | EMAIL-01 | unit | `node --test tests/unit/zoho.test.js` | ❌ W0 | ⬜ pending |
| 6-W0-03 | 01 | 0 | EMAIL-02 | unit | `node --test tests/unit/emailSender.test.js` | ❌ W0 | ⬜ pending |
| 6-W0-04 | 01 | 0 | EMAIL-01/02 | unit | `node --test tests/unit/history.test.js` | ✅ modify | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/emailSender.test.js` — stubs para EMAIL-01 (send com email presente) e EMAIL-02 (skip sem email)
- [ ] `tests/unit/zoho.test.js` — cobre configuração do transporter (host/port/secure, sem I/O real)
- [ ] `tests/unit/history.test.js` — MODIFICAR existente: adicionar casos de migração de schema e channel API
- [ ] `src/services/zoho.js` — arquivo vazio para testes importarem sem crash
- [ ] `src/stages/emailSender.js` — arquivo vazio para testes importarem sem crash

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| SPF e DKIM passam no mail-tester.com | EMAIL-01 | Requer envio real + DNS configurado | Enviar e-mail de teste para mail-tester.com e verificar score >= 9/10 |
| From header = conta Zoho autenticada | EMAIL-01 | Requer conta Zoho real para verificar rejeição de relay | Enviar e-mail e verificar headers no cliente receptor |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
