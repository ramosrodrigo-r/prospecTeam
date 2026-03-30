---
phase: 5
slug: whatsapp-send-via-evolution-api
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in test runner (`node --test`) |
| **Config file** | none — Node 21 nativo |
| **Quick run command** | `node --test src/__tests__/evolution.test.js` |
| **Full suite command** | `node --test src/__tests__/` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test src/__tests__/evolution.test.js`
- **After every plan wave:** Run `node --test src/__tests__/`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 5-01-01 | 01 | 0 | WA-01 | stub | `node --test src/__tests__/evolution.test.js` | ❌ W0 | ⬜ pending |
| 5-01-02 | 01 | 1 | WA-01 | unit | `node --test src/__tests__/evolution.test.js` | ✅ | ⬜ pending |
| 5-01-03 | 01 | 1 | WA-01 | unit | `node --test src/__tests__/evolution.test.js` | ✅ | ⬜ pending |
| 5-01-04 | 01 | 1 | WA-02 | unit | `node --test src/__tests__/evolution.test.js` | ✅ | ⬜ pending |
| 5-02-01 | 02 | 2 | WA-01 | integration | `node --test src/__tests__/` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/evolution.test.js` — stubs para WA-01, WA-02 (sendWhatsApp, healthCheck)
- [ ] `src/__tests__/` directory — se não existir

*Infraestrutura Node 21 nativa não requer instalação de framework.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Mensagem recebida no WhatsApp real | WA-01 | Requer instância Evolution API conectada e número real | Rodar bot com 3-5 contatos reais, verificar recebimento |
| Delay 3-8s entre envios | WA-02 | Timing real não mockável | Observar timestamps no terminal — diferença deve ser 3-8s |
| Erro de instância desconectada | WA-01 | Requer Evolution API offline | Desconectar instância, rodar bot, verificar mensagem de erro e exit |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
