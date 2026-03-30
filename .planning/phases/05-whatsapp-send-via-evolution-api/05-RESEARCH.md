# Phase 5: WhatsApp Send via Evolution API - Research

**Researched:** 2026-03-30
**Domain:** Evolution API v2 HTTP integration — Node.js native fetch, AbortController timeout, random delay
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Registro no histórico após falha**
- D-01: `recordSend(placeId)` chamado APENAS em envio confirmado (sucesso). Número sem WhatsApp → não grava → próxima rodada tenta novamente
- D-02: Erros de API (timeout, 5xx, network) → logar e continuar sem gravar. Próxima rodada tenta novamente
- D-03: Output por contato no terminal: `[WA sent] NomeEmpresa` em sucesso / `[WA failed: motivo] NomeEmpresa` em falha — sem exceções
- D-04: Exit code 0 mesmo se todos os contatos falharem no envio. Falhas por contato são comportamento esperado, não erro do processo

**Health check de instância**
- D-05: Endpoint de verificação: `GET /instance/{EVOLUTION_INSTANCE}/connectionState` — verificar se `connectionStatus === 'open'` na resposta
- D-06: Instância desconectada → imprimir `Error: Evolution API instance not connected. Reconnect via QR code before running.` e `process.exit(1)` imediatamente
- D-07: Health check roda ANTES de buscar prospects — ordem no pipeline: validateEnv → healthCheck → fetchProspects → dedup → render → send
- D-08: Timeout de 5 segundos no health check via `AbortController` + `signal` no fetch

**Wiring do pipeline em bin/prospect.js**
- D-09: `bin/prospect.js` é o único entry point e vira o orquestrador completo: health check → fetch → dedup → render → send WA
- D-10: `src/stages/sender.js` exporta `sendWhatsApp(prospect, message)` — retorna `{ ok: boolean, reason?: string }`
- D-11: `src/services/evolution.js` contém o código HTTP da Evolution API (espelho do padrão de `src/services/places.js`)
- D-12: Delay aleatório 3–8s fica dentro de `src/stages/sender.js` após cada envio — `bin/prospect.js` não conhece esse detalhe

**Variáveis de ambiente Evolution API**
- D-13: Novas env vars obrigatórias: `EVOLUTION_API_URL` (ex: `http://localhost:8080`), `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE` (nome da instância)
- D-14: `validateEnv()` em `src/utils/env.js` expandido para validar as 3 novas vars junto com `GOOGLE_PLACES_API_KEY` — erro no startup antes de qualquer chamada
- D-15: Header de autenticação: `apikey: {EVOLUTION_API_KEY}` (padrão Evolution API v2 — não Bearer token)
- D-16: `.env.example` atualizado com as 3 novas vars + comentários explicativos

### Claude's Discretion
- Estrutura interna de `src/services/evolution.js` (funções separadas vs única função parametrizada)
- Formato exato do `reason` nos logs de falha (mensagem da API ou texto normalizado)
- Implementação do `AbortController` para timeout no health check
- Estrutura dos testes unitários para o sender e o service

### Deferred Ideas (OUT OF SCOPE)
- Modo `--dry-run` (simula envios sem efeito colateral) — v2 CLI-01
- Resumo ao final (total enviados / falhas / pulados) — fase 7 / v2 CLI-02
- Retry automático 1x em falhas transitórias — pós-v1
- Log persistente em arquivo — v2 OPS-03
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| WA-01 | Bot envia mensagem via Evolution API para o número WhatsApp do negócio | D-10, D-11: `src/services/evolution.js` POST `/message/sendText/{instance}`, `src/stages/sender.js` wrapper |
| WA-02 | Bot aplica delay aleatório de 3-8 segundos entre envios WhatsApp | D-12: `setTimeout` + `Math.random()` inside `sender.js` after each send |
</phase_requirements>

---

## Summary

Esta fase faz o bot produzir efeito real: enviar mensagens WhatsApp via Evolution API v2. O trabalho é puramente de integração HTTP — não há dependências npm novas. O projeto já usa `globalThis.fetch` nativo (Node >= 21) e `AbortController` para timeouts, e os padrões já estão estabelecidos em `src/services/places.js`.

A Evolution API v2 tem dois endpoints relevantes: `GET /instance/connectionState/{instance}` para verificar se a instância está conectada, e `POST /message/sendText/{instance}` para envio de mensagem. Ambos usam o header `apikey` para autenticação (não Bearer). A resposta do health check retorna `{ instance: { state: "open" | "close" | "connecting" } }`. O endpoint de envio retorna 201 em sucesso.

A fase adiciona dois novos módulos (`src/services/evolution.js` e `src/stages/sender.js`), expande `validateEnv()` para as 3 novas env vars, e transforma `bin/prospect.js` de um script de debug (console.log JSON) em um orquestrador completo do pipeline v1.

**Recomendação primária:** Implementar `evolution.js` como dois exports (`checkConnection` e `sendTextMessage`), cada um seguindo o padrão sem-estado de `places.js`. O `sender.js` orquestra: chama `sendTextMessage`, aplica delay, chama `recordSend` em sucesso, retorna `{ ok, reason }`.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `node:test` (built-in) | Node 21+ | Testes unitários | Decisão do projeto — zero deps |
| `globalThis.fetch` (built-in) | Node 21+ | HTTP client para Evolution API | Já usado em `places.js` |
| `AbortController` (built-in) | Node 21+ | Timeout no health check | Já estabelecido no projeto (D-08) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `dotenv` | ^17.3.1 | Carregar `.env` | Já instalado, usado no entry point |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `globalThis.fetch` nativo | `axios`, `node-fetch` | Nenhuma vantagem — projeto explicitamente evita deps extras |
| `setTimeout` + Promise | `sleep-promise`, `delay` | Desnecessário — 3 linhas de código nativo resolvem |

**Installation:** Nenhuma instalação necessária. Todas as dependências já estão no projeto.

---

## Architecture Patterns

### Project Structure After Phase 5
```
src/
├── services/
│   ├── places.js         # existente — padrão a replicar
│   └── evolution.js      # NOVO — cliente HTTP Evolution API
├── stages/
│   ├── fetch.js          # existente
│   ├── dedup.js          # existente
│   ├── render.js         # existente
│   └── sender.js         # NOVO — stage de envio WA
├── utils/
│   ├── env.js            # EXPANDIDO — valida 4 vars (era 1)
│   └── ...
└── history.js            # existente — recordSend chamado por sender
bin/
└── prospect.js           # TRANSFORMADO — pipeline completo
```

### Pattern 1: Evolution API Service Module
**What:** Módulo HTTP puro sem estado, recebe params, retorna JSON — exato espelho de `places.js`
**When to use:** Sempre para clientes HTTP de APIs externas neste projeto

```javascript
// src/services/evolution.js
// Source: https://doc.evolution-api.com/v2/api-reference/instance-controller/connection-state

export async function checkConnection({ baseUrl, apiKey, instance }) {
  const response = await fetch(`${baseUrl}/instance/connectionState/${instance}`, {
    headers: { apikey: apiKey }
  })
  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Evolution API error ${response.status}: ${err}`)
  }
  return response.json()
  // Returns: { instance: { instanceName, state: 'open' | 'close' | 'connecting' } }
}

export async function sendTextMessage({ baseUrl, apiKey, instance, number, text }) {
  const response = await fetch(`${baseUrl}/message/sendText/${instance}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: apiKey
    },
    body: JSON.stringify({ number, text })
  })
  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Evolution API error ${response.status}: ${err}`)
  }
  return response.json()
  // Returns: { key, message, messageTimestamp, status: 'PENDING' }
}
```

### Pattern 2: AbortController Timeout (health check)
**What:** 5-second timeout via `AbortController.signal` passado ao `fetch`
**When to use:** Health check obrigatório (D-08) — evita hang indefinido se API offline

```javascript
// Fonte: MDN / Node.js docs — padrão estabelecido no projeto
const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), 5000)
try {
  const response = await fetch(url, {
    headers: { apikey: apiKey },
    signal: controller.signal
  })
  // ...
} finally {
  clearTimeout(timeoutId)
}
```

### Pattern 3: Random Delay (sender.js)
**What:** `Math.random()` para delay 3–8s como Promise
**When to use:** Após cada envio em `sender.js` (D-12)

```javascript
// Delay: 3000ms + random(0 to 5000ms) = 3000–8000ms
const delay = 3000 + Math.floor(Math.random() * 5001)
await new Promise(resolve => setTimeout(resolve, delay))
```

### Pattern 4: Sender Stage Return Contract
**What:** `sendWhatsApp` retorna `{ ok: boolean, reason?: string }` — nunca lança exceção
**When to use:** Qualquer falha dentro de `sender.js` é capturada e convertida em `{ ok: false, reason }`

```javascript
export async function sendWhatsApp(prospect, message) {
  try {
    await sendTextMessage({ ... })
    recordSend(prospect.placeId)
    return { ok: true }
  } catch (err) {
    return { ok: false, reason: err.message }
  }
}
```

### Pattern 5: Expanded validateEnv()
**What:** Retorna objeto com todas as env vars em vez de apenas `apiKey`
**When to use:** `bin/prospect.js` desestrutura o resultado para ter todas as vars

```javascript
export function validateEnv() {
  const required = {
    apiKey:              process.env.GOOGLE_PLACES_API_KEY,
    evolutionApiUrl:     process.env.EVOLUTION_API_URL,
    evolutionApiKey:     process.env.EVOLUTION_API_KEY,
    evolutionInstance:   process.env.EVOLUTION_INSTANCE
  }
  for (const [name, value] of Object.entries(required)) {
    if (!value) throw new Error(`${envVarName(name)} is missing or empty in .env`)
  }
  return required
}
```

### Pattern 6: Pipeline Orchestrator (bin/prospect.js)
**What:** Sequência linear com `try/catch` em cada etapa fatal, loop de send com `try/catch` por contato
**When to use:** Entry point único (D-09)

```javascript
// Pipeline: validateEnv → healthCheck → fetchProspects → dedupProspects → loop(render+send)
for (const prospect of prospects) {
  const message = renderMessage(prospect, { cidade: city, categoria: category })
  const result = await sendWhatsApp(prospect, message)
  if (result.ok) {
    console.log(`[WA sent] ${prospect.name}`)
  } else {
    console.log(`[WA failed: ${result.reason}] ${prospect.name}`)
  }
}
process.exit(0)
```

### Anti-Patterns to Avoid
- **Lançar exceção no sender:** `sendWhatsApp` NUNCA lança — encapsula tudo em `{ ok, reason }`. O orquestrador não deve tratar exceções do sender
- **Re-normalizar o telefone:** O `prospect.phone` já é E.164 da fase 2 — não chamar `normalizePhone` novamente
- **Chamar `recordSend` antes de confirmar sucesso:** `recordSend` APENAS em `response.ok === true` (D-01)
- **Aplicar delay antes do primeiro envio:** Delay aplicado APÓS cada envio, não antes
- **Timeout no sendText:** Apenas o health check tem timeout (D-08) — não adicionar `AbortController` no envio de mensagem (mensagens grandes podem demorar)

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP client | Wrapper customizado ou lib externa | `globalThis.fetch` nativo | Já no projeto, Node 21+, suficiente para REST |
| Timeout de fetch | Loop com `Promise.race` manual | `AbortController` + `signal` | Padrão web — suportado nativamente |
| Random delay | Biblioteca externa | `Math.random()` + `setTimeout` | 3 linhas, sem deps |
| Validação em lote de números WA | `checkWhatsApp()` antes de enviar | Tenta enviar, trata falha | Evolution API pode banir conta por bulk-check (consta em REQUIREMENTS.md Out of Scope) |

**Key insight:** A Evolution API v2 retorna erro claro quando o número não está no WhatsApp — o padrão correto é "tenta, trata falha", não validação preventiva.

---

## Common Pitfalls

### Pitfall 1: Campo `state` vs `connectionStatus` na resposta do health check
**What goes wrong:** CONTEXT.md D-05 menciona `connectionStatus === 'open'`, mas a API real retorna `{ instance: { state: 'open' } }` — campo é `state`, não `connectionStatus`
**Why it happens:** Inconsistência entre a decisão documentada e a resposta real da API verificada nos docs oficiais
**How to avoid:** Usar `data.instance.state === 'open'` no código
**Warning signs:** Health check sempre retorna "disconnected" mesmo com instância conectada

### Pitfall 2: `validateEnv()` retorna `key` (string) na fase 4 — quebra em fase 5
**What goes wrong:** `bin/prospect.js` atual faz `apiKey = validateEnv()` (string). Após expansão, `validateEnv()` retorna objeto — atribuição direta quebra
**Why it happens:** Mudança de contrato de retorno
**How to avoid:** Atualizar `bin/prospect.js` para `const { apiKey, evolutionApiUrl, ... } = validateEnv()` junto com a expansão do módulo
**Warning signs:** Erro `apiKey is not a string` ao chamar `fetchProspects`

### Pitfall 3: `clearTimeout` esquecido após `AbortController`
**What goes wrong:** `timeoutId` vaza — em testes, o timer pendente impede o processo de encerrar
**Why it happens:** `setTimeout` cria timer global mesmo dentro de async function
**How to avoid:** Sempre usar `finally { clearTimeout(timeoutId) }` — padrão obrigatório
**Warning signs:** Testes ficam "pendentes" sem encerrar no CI / `node --test`

### Pitfall 4: Delay executado mesmo em falha antes de tentar
**What goes wrong:** Delay aplicado antes do envio resulta em wait longo sem tentativa
**Why it happens:** Loop mal estruturado com delay no início em vez do fim
**How to avoid:** `await sendTextMessage()` → `await delay()` — delay sempre DEPOIS da tentativa

### Pitfall 5: `recordSend` chamado fora do try/catch de sucesso
**What goes wrong:** `recordSend` chamado mesmo quando `response.ok` é `false`
**Why it happens:** Código `if (!response.ok) throw` + `recordSend()` fora do bloco
**How to avoid:** `recordSend` SOMENTE dentro do branch `ok === true`, explicitamente (D-01)

---

## Code Examples

### Health Check com Timeout (verificado em docs oficiais)
```javascript
// Source: https://doc.evolution-api.com/v2/api-reference/instance-controller/connection-state
// Response: { instance: { instanceName: string, state: 'open' | 'close' | 'connecting' } }

export async function checkConnection({ baseUrl, apiKey, instance }) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)
  try {
    const response = await fetch(
      `${baseUrl}/instance/connectionState/${instance}`,
      { headers: { apikey: apiKey }, signal: controller.signal }
    )
    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Evolution API error ${response.status}: ${err}`)
    }
    return response.json()
  } finally {
    clearTimeout(timeoutId)
  }
}
```

### Send Text Message (verificado em docs oficiais)
```javascript
// Source: https://doc.evolution-api.com/v2/api-reference/message-controller/send-text
// POST /message/sendText/{instance}
// Returns 201: { key, message, messageTimestamp, status: 'PENDING' }

export async function sendTextMessage({ baseUrl, apiKey, instance, number, text }) {
  const response = await fetch(`${baseUrl}/message/sendText/${instance}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: apiKey
    },
    body: JSON.stringify({ number, text })
  })
  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Evolution API error ${response.status}: ${err}`)
  }
  return response.json()
}
```

### Mock fetch em tests (padrão estabelecido no projeto)
```javascript
// Source: tests/unit/places.test.js — padrão já em uso no projeto
let originalFetch
beforeEach(() => {
  originalFetch = globalThis.fetch
  globalThis.fetch = async (url, opts) => ({
    ok: true,
    json: async () => ({ instance: { instanceName: 'test', state: 'open' } })
  })
})
afterEach(() => { globalThis.fetch = originalFetch })
```

### Testar AbortController (mock do sinal)
```javascript
// Para testar o timeout: mock fetch que nunca resolve + AbortController real
globalThis.fetch = (_url, opts) => new Promise((_resolve, reject) => {
  opts.signal.addEventListener('abort', () =>
    reject(new DOMException('signal is aborted', 'AbortError'))
  )
})
```

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `node:test` (built-in, Node 21+) |
| Config file | none — invocado diretamente |
| Quick run command | `node --test tests/unit/evolution.test.js tests/unit/sender.test.js` |
| Full suite command | `npm test` (= `node --test tests/unit/*.test.js`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WA-01 | `sendTextMessage` envia POST para URL correta com headers `apikey` e `Content-Type` | unit | `node --test tests/unit/evolution.test.js` | Wave 0 |
| WA-01 | `sendTextMessage` lança erro em `response.ok === false` | unit | `node --test tests/unit/evolution.test.js` | Wave 0 |
| WA-01 | `checkConnection` faz GET para `/instance/connectionState/{instance}` | unit | `node --test tests/unit/evolution.test.js` | Wave 0 |
| WA-01 | `checkConnection` aplica timeout de 5s via `AbortController` | unit | `node --test tests/unit/evolution.test.js` | Wave 0 |
| WA-01 | `sendWhatsApp` retorna `{ ok: true }` e chama `recordSend` em sucesso | unit | `node --test tests/unit/sender.test.js` | Wave 0 |
| WA-01 | `sendWhatsApp` retorna `{ ok: false, reason }` sem lançar em falha | unit | `node --test tests/unit/sender.test.js` | Wave 0 |
| WA-01 | `sendWhatsApp` NÃO chama `recordSend` em falha | unit | `node --test tests/unit/sender.test.js` | Wave 0 |
| WA-02 | Delay entre envios é >= 3000ms e <= 8000ms | unit | `node --test tests/unit/sender.test.js` | Wave 0 |
| WA-01 | `validateEnv` lança erro quando qualquer var Evolution está ausente | unit | `node --test tests/unit/env.test.js` | Existente — expandir |

### Sampling Rate
- **Per task commit:** `node --test tests/unit/evolution.test.js tests/unit/sender.test.js`
- **Per wave merge:** `npm test`
- **Phase gate:** `npm test` verde antes de `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/evolution.test.js` — cobre WA-01 (checkConnection + sendTextMessage)
- [ ] `tests/unit/sender.test.js` — cobre WA-01 (sendWhatsApp contrato) + WA-02 (delay)
- [ ] `tests/unit/env.test.js` — existente, expandir com casos das 3 novas vars Evolution

*(Infraestrutura de testes já instalada — apenas novos arquivos de teste e expansão do existente)*

---

## Sources

### Primary (HIGH confidence)
- https://doc.evolution-api.com/v2/api-reference/message-controller/send-text — endpoint URL, method, headers, request body, response 201
- https://doc.evolution-api.com/v2/api-reference/instance-controller/connection-state — endpoint URL, response `{ instance: { state } }`, error 404

### Secondary (MEDIUM confidence)
- https://gist.github.com/dantetesta/b8b7e7e2d6196beae968c8b0a61afb7a — Manual de Integração Evolution API V2 (verificado por múltiplas fontes)
- Existing project code (`src/services/places.js`, `tests/unit/places.test.js`) — padrões de módulo e mock confirmados por leitura direta

### Tertiary (LOW confidence)
- Nota: Issue #2216 do EvolutionAPI/evolution-api reporta que `/instance/connectionState` retorna 404 em algumas instalações v2.3.6, enquanto `/message/sendText` funciona. Mitigação: tratar 404 no health check como "instância não encontrada" (exit 1 com mensagem específica)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — sem deps novas, tudo nativo ou já instalado
- Architecture: HIGH — padrões verificados contra código existente e docs oficiais
- Evolution API endpoints: HIGH — verificados diretamente nos docs oficiais (doc.evolution-api.com)
- Pitfall campo `state` vs `connectionStatus`: HIGH — verificado contra resposta real da API
- Pitfall 404 em connectionState: LOW (single source — GitHub issue, pode ser edge case de versão)

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (API estável, sem indicação de mudanças iminentes)
