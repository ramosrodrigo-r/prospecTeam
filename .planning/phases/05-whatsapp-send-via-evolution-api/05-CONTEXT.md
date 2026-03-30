# Phase 5: WhatsApp Send via Evolution API - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

O canal primário de outreach entra em operação: o bot envia mensagens WhatsApp para números normalizados via Evolution API, aplica delay aleatório de 3–8 segundos entre envios, trata falhas por contato sem abortar o lote, e verifica o estado da instância no startup.

Não inclui: envio de e-mail (fase 6), wiring do CLI final e resumo de execução (fase 7).

</domain>

<decisions>
## Implementation Decisions

### Registro no histórico após falha
- **D-01:** `recordSend(placeId)` chamado APENAS em envio confirmado (sucesso). Número sem WhatsApp → não grava → próxima rodada tenta novamente
- **D-02:** Erros de API (timeout, 5xx, network) → logar e continuar sem gravar. Próxima rodada tenta novamente
- **D-03:** Output por contato no terminal: `[WA sent] NomeEmpresa` em sucesso / `[WA failed: motivo] NomeEmpresa` em falha — sem exceções
- **D-04:** Exit code 0 mesmo se todos os contatos falharem no envio. Falhas por contato são comportamento esperado, não erro do processo

### Health check de instância
- **D-05:** Endpoint de verificação: `GET /instance/{EVOLUTION_INSTANCE}/connectionState` — verificar se `connectionStatus === 'open'` na resposta
- **D-06:** Instância desconectada → imprimir `Error: Evolution API instance not connected. Reconnect via QR code before running.` e `process.exit(1)` imediatamente
- **D-07:** Health check roda ANTES de buscar prospects — ordem no pipeline: validateEnv → healthCheck → fetchProspects → dedup → render → send
- **D-08:** Timeout de 5 segundos no health check via `AbortController` + `signal` no fetch

### Wiring do pipeline em bin/prospect.js
- **D-09:** `bin/prospect.js` é o único entry point e vira o orquestrador completo: health check → fetch → dedup → render → send WA
- **D-10:** `src/stages/sender.js` exporta `sendWhatsApp(prospect, message)` — retorna `{ ok: boolean, reason?: string }`
- **D-11:** `src/services/evolution.js` contém o código HTTP da Evolution API (espelho do padrão de `src/services/places.js`)
- **D-12:** Delay aleatório 3–8s fica dentro de `src/stages/sender.js` após cada envio — `bin/prospect.js` não conhece esse detalhe

### Variáveis de ambiente Evolution API
- **D-13:** Novas env vars obrigatórias: `EVOLUTION_API_URL` (ex: `http://localhost:8080`), `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE` (nome da instância)
- **D-14:** `validateEnv()` em `src/utils/env.js` expandido para validar as 3 novas vars junto com `GOOGLE_PLACES_API_KEY` — erro no startup antes de qualquer chamada
- **D-15:** Header de autenticação: `apikey: {EVOLUTION_API_KEY}` (padrão Evolution API v2 — não Bearer token)
- **D-16:** `.env.example` atualizado com as 3 novas vars + comentários explicativos

### Claude's Discretion
- Estrutura interna de `src/services/evolution.js` (funções separadas vs única função parametrizada)
- Formato exato do `reason` nos logs de falha (mensagem da API ou texto normalizado)
- Implementação do `AbortController` para timeout no health check
- Estrutura dos testes unitários para o sender e o service

</decisions>

<specifics>
## Specific Ideas

- O pipeline atual termina em `fetchProspects` + `console.log(JSON.stringify)`. A fase 5 transforma esse `console.log` em um loop de envio real
- `sendWhatsApp` recebe o prospect (para ter `phone` e `placeId`) e a `message` já renderizada — não re-renderiza internamente
- O delay pertence ao sender porque é uma restrição do canal WA, não da orquestração

</specifics>

<canonical_refs>
## Canonical References

Sem specs externas — requisitos totalmente capturados nas decisões acima e no ROADMAP.md.

### Requisitos mapeados
- `WA-01` — Envio via Evolution API → D-10, D-11
- `WA-02` — Delay aleatório 3–8s → D-12

### Código existente que esta fase consome
- `src/history.js` — `recordSend(placeId)` chamado por `sendWhatsApp` em sucesso (D-01)
- `src/stages/render.js` — `renderMessage(prospect, context)` entrega a mensagem pronta
- `src/stages/dedup.js` — filtra duplicados antes de chegar ao sender
- `src/utils/phone.js` — normalização E.164 já aplicada na fase 2 (não re-normalizar)
- `src/utils/env.js` — `validateEnv()` a ser expandido (D-14)
- `src/services/places.js` — padrão a seguir em `src/services/evolution.js` (D-11)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/history.js`: `recordSend(placeId)` pronto, aguardando ser chamado pelo sender após confirmação
- `src/stages/render.js`: `renderMessage(prospect, {cidade, categoria})` → string de mensagem pronta
- `src/services/places.js`: padrão de módulo HTTP puro (sem estado, recebe params, retorna JSON) a replicar em `evolution.js`
- `src/utils/env.js`: `validateEnv()` a expandir — retorna objeto com todas as keys em vez de apenas `apiKey`

### Established Patterns
- Stages em `src/stages/` para pipeline com I/O (fetch, dedup, render → sender segue o mesmo padrão)
- Services em `src/services/` para clients HTTP puros (places.js → evolution.js)
- `AbortController` + signal para timeout em fetch (padrão Node.js nativo, sem lib extra)
- Testes TDD em `tests/unit/` com `node:test` e mock de `globalThis.fetch`

### Integration Points
- `bin/prospect.js` receberá: health check antes do fetch, loop de send após dedup+render
- `sendWhatsApp` chamará `recordSend` de `src/history.js` após sucesso
- Pipeline final da fase 5: `healthCheck() → fetchProspects() → dedupProspects() → loop(renderMessage + sendWhatsApp)`

</code_context>

<deferred>
## Deferred Ideas

- Modo `--dry-run` (simula envios sem efeito colateral) — v2 CLI-01
- Resumo ao final (total enviados / falhas / pulados) — fase 7 / v2 CLI-02
- Retry automático 1x em falhas transitórias — pós-v1
- Log persistente em arquivo — v2 OPS-03

</deferred>

---

*Phase: 05-whatsapp-send-via-evolution-api*
*Context gathered: 2026-03-30*
