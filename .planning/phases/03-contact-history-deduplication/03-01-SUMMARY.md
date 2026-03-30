---
phase: 03-contact-history-deduplication
plan: 01
subsystem: database
tags: [node:fs, write-then-rename, deduplication, history, json-persistence]

# Dependency graph
requires:
  - phase: 02-business-filter-phone-normalization
    provides: filterBusinesses + normalizePhone pipeline — history integrates downstream at send time
provides:
  - src/history.js with loadHistory, isDuplicate, recordSend exports
  - Atomic write-then-rename persistence via data/history.json
  - O(1) in-memory duplicate lookup via Map
affects: [05-whatsapp-send, 06-email-send, 07-cli-wiring]

# Tech tracking
tech-stack:
  added: []
  patterns: [write-then-rename atomic file update, module-scope Map for in-memory state, ENOENT-tolerant file reads]

key-files:
  created:
    - src/history.js
    - tests/unit/history.test.js
  modified: []

key-decisions:
  - "history.json usa formato { placeId: { sentAt: ISO8601 } } via Object.fromEntries(Map)"
  - "Write-then-rename atomico: writeFileSync para .tmp, renameSync para .json final — sem corrupcao em crash"
  - "Map in-memory para isDuplicate O(1) — reinicializado por loadHistory() em cada execucao do bot"
  - "ENOENT gracioso: primeiro run sem history.json inicia com Map vazio sem lancar erro"

patterns-established:
  - "Atomic file writes: sempre escrever em .tmp, depois renameSync para destino final"
  - "Module-scope state reinicializavel: let map = new Map() + loadHistory() para reset em testes"

requirements-completed: [HIST-01, HIST-03]

# Metrics
duration: 5min
completed: 2026-03-30
---

# Phase 03 Plan 01: Contact History + Deduplication Summary

**Modulo history.js com persistencia atomica write-then-rename e lookup O(1) via Map em memoria**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-30T14:23:36Z
- **Completed:** 2026-03-30T14:28:00Z
- **Tasks:** 2 (RED + GREEN TDD cycle)
- **Files modified:** 2

## Accomplishments
- Implementado `src/history.js` com 3 exports: `loadHistory`, `isDuplicate`, `recordSend`
- Write-then-rename atomico garante que `data/history.json` nunca fica corrompido em caso de crash
- 8 testes unitarios verdes cobrindo todos os requisitos HIST-01 e HIST-03
- Suite completa sem regressoes: 49 testes passando (incluindo fases 1 e 2)

## Task Commits

Cada task foi commitada atomicamente:

1. **Task 1: RED — Escrever testes para history.js** - `209be76` (test)
2. **Task 2: GREEN — Implementar src/history.js** - `50e1b4c` (feat)

**Plan metadata:** (docs commit, criado a seguir)

_Nota: TDD com 2 commits — test (RED) -> feat (GREEN)_

## Files Created/Modified
- `src/history.js` - Modulo de historico com loadHistory, isDuplicate, recordSend e persistencia atomica
- `tests/unit/history.test.js` - 8 testes unitarios cobrindo todos os comportamentos especificados

## Decisions Made
- Formato `{ placeId: { sentAt: ISO8601 } }` — chave simples, unico campo relevante e sentAt para auditoria futura
- Map in-memory reinicializado por `loadHistory()` — permite reset limpo em testes sem mocking complexo
- `writeFileSync(tmp) + renameSync(tmp, final)` — padrao atomico que evita corrupcao em crash no meio da escrita

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `src/history.js` pronto para ser importado pelos senders das fases 5 e 6
- Interface estavel: `loadHistory()` no inicio do bot, `isDuplicate(placeId)` antes de enviar, `recordSend(placeId)` apos envio bem-sucedido
- data/ criado automaticamente na primeira execucao — sem setup manual necessario

---
*Phase: 03-contact-history-deduplication*
*Completed: 2026-03-30*
