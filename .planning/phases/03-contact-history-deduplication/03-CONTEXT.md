# Phase 3: Contact History + Deduplication - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Local JSON history file keyed by `place_id` that gates sends — businesses already in history are skipped, history is written immediately after each confirmed send, and a crash mid-run does not corrupt the file.

Does NOT include: sending logic (phases 5–6), template rendering (phase 4), CLI wiring (phase 7).

</domain>

<decisions>
## Implementation Decisions

### Schema do history.json
- **D-01:** Formato `{ place_id: { sentAt: ISO8601 } }` — objeto keyed por `place_id`, não array
- **D-02:** Guardar apenas `sentAt` (timestamp ISO) junto com o ID — sem canal, nome ou cidade
- **D-03:** Arquivo local, não versionado no git — cada operador mantém o seu (adicionar ao `.gitignore`)
- **D-04:** Lookup O(1) via chave de objeto, carregado uma vez como in-memory Set/Map no startup

### Proteção contra corrupção (Ctrl+C)
- **D-05:** Write-then-rename atômico — escrever em `data/history.json.tmp`, depois `fs.renameSync` para `data/history.json`
- **D-06:** `rename` do SO é atômico — Ctrl+C no meio nunca deixa o JSON em estado intermediário
- **D-07:** Arquivo `.tmp` órfão pode ser ignorado — não corrompe o histórico real

### Interface do módulo history.js
- **D-08:** `src/history.js` exporta três funções: `loadHistory()`, `isDuplicate(placeId)`, `recordSend(placeId)`
- **D-09:** `loadHistory()` cria `data/` automaticamente via `fs.mkdirSync(dir, { recursive: true })` — zero fricção no primeiro uso
- **D-10:** `loadHistory()` retorna graciosamente se `data/history.json` não existir (primeira execução)

### Integração no pipeline
- **D-11:** Deduplicação fica em `stages/dedup.js` (stage separado), não dentro de `fetch.js` — consistente com o padrão de stages existente
- **D-12:** `stages/dedup.js` recebe o array de prospects, chama `isDuplicate` para cada um, retorna apenas os novos
- **D-13:** `recordSend(placeId)` será chamado pelos senders (fases 5–6) após confirmação de envio — fase 3 apenas define e testa a função, não a invoca no pipeline real

### Claude's Discretion
- Implementação interna do in-memory store (Map vs Set — ambos viáveis, Map permite guardar `sentAt` em memória se necessário)
- Nome do arquivo temporário (`history.json.tmp`)
- Estrutura exata dos testes de integração

</decisions>

<specifics>
## Specific Ideas

- O pipeline atual: `fetchProspects` → `filterBusinesses` (já no fetch.js). A fase 3 adiciona: → `dedupProspects` (novo stage)
- `recordSend` é a única função que precisa existir para as fases 5–6 poderem gravar histórico — interface mínima intencional

</specifics>

<canonical_refs>
## Canonical References

Sem specs externas — requisitos totalmente capturados nas decisões acima e no ROADMAP.md.

### Requisitos mapeados
- `HIST-01` — Histórico local keyed por `place_id` → D-01, D-04
- `HIST-02` — Pular contatos já contatados → D-11, D-12
- `HIST-03` — Gravar imediatamente após envio confirmado → D-08, D-13

### Código existente relevante
- `src/stages/fetch.js` — pipeline atual que `dedup.js` se conecta após
- `src/utils/filter.js` — padrão de função pura a seguir em `history.js`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/utils/filter.js`: função pura que recebe array, retorna array filtrado — mesmo padrão para `stages/dedup.js`
- `src/stages/fetch.js`: retorna `filterBusinesses(results)` no fim — `dedup.js` encadeia após isso

### Established Patterns
- Módulos em `src/utils/` para funções puras sem I/O
- Módulos em `src/stages/` para stages do pipeline com I/O ou efeitos
- `src/history.js` na raiz de `src/` (tem I/O de arquivo, não é stage nem util puro)
- Testes TDD em `tests/unit/` — RED primeiro, GREEN depois

### Integration Points
- `stages/dedup.js` recebe saída de `fetchProspects` e retorna subset para os senders
- `recordSend(placeId)` será importado em `stages/sender.js` (fase 5) e `stages/email.js` (fase 6)

</code_context>

<deferred>
## Deferred Ideas

- `--stats` ou relatório de histórico — útil, mas é CLI UX (fase 7)
- Limpar entradas antigas por timestamp — pós-v1
- Histórico compartilhado entre membros do time — pós-v1

</deferred>

---

*Phase: 03-contact-history-deduplication*
*Context gathered: 2026-03-29*
