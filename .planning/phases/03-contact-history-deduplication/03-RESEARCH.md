# Phase 3: Contact History + Deduplication - Research

**Researched:** 2026-03-29
**Domain:** Node.js file-system persistence, atomic writes, in-memory deduplication
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Formato `{ place_id: { sentAt: ISO8601 } }` — objeto keyed por `place_id`, não array
- **D-02:** Guardar apenas `sentAt` (timestamp ISO) junto com o ID — sem canal, nome ou cidade
- **D-03:** Arquivo local, não versionado no git — cada operador mantém o seu (adicionar ao `.gitignore`)
- **D-04:** Lookup O(1) via chave de objeto, carregado uma vez como in-memory Set/Map no startup
- **D-05:** Write-then-rename atômico — escrever em `data/history.json.tmp`, depois `fs.renameSync` para `data/history.json`
- **D-06:** `rename` do SO é atômico — Ctrl+C no meio nunca deixa o JSON em estado intermediário
- **D-07:** Arquivo `.tmp` órfão pode ser ignorado — não corrompe o histórico real
- **D-08:** `src/history.js` exporta três funções: `loadHistory()`, `isDuplicate(placeId)`, `recordSend(placeId)`
- **D-09:** `loadHistory()` cria `data/` automaticamente via `fs.mkdirSync(dir, { recursive: true })` — zero fricção no primeiro uso
- **D-10:** `loadHistory()` retorna graciosamente se `data/history.json` não existir (primeira execução)
- **D-11:** Deduplicação fica em `stages/dedup.js` (stage separado), não dentro de `fetch.js`
- **D-12:** `stages/dedup.js` recebe o array de prospects, chama `isDuplicate` para cada um, retorna apenas os novos
- **D-13:** `recordSend(placeId)` será chamado pelos senders (fases 5–6) após confirmação de envio — fase 3 apenas define e testa a função, não a invoca no pipeline real

### Claude's Discretion

- Implementação interna do in-memory store (Map vs Set — ambos viáveis, Map permite guardar `sentAt` em memória se necessário)
- Nome do arquivo temporário (`history.json.tmp`)
- Estrutura exata dos testes de integração

### Deferred Ideas (OUT OF SCOPE)

- `--stats` ou relatório de histórico — útil, mas é CLI UX (fase 7)
- Limpar entradas antigas por timestamp — pós-v1
- Histórico compartilhado entre membros do time — pós-v1
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HIST-01 | Bot mantém histórico local de deduplicação com chave `place_id` | D-01/D-04: objeto JSON keyed por placeId, carregado em Map no startup — verificado com Node.js 24 |
| HIST-02 | Bot pula contatos que já receberam mensagem em rodadas anteriores | D-11/D-12: `stages/dedup.js` filtra prospects via `isDuplicate(placeId)` — O(1) Map.has() verificado |
| HIST-03 | Bot grava no histórico imediatamente após envio bem-sucedido | D-08/D-13: `recordSend(placeId)` com write-then-rename atômico — padrão testado manualmente em Node.js 24 |
</phase_requirements>

---

## Summary

Esta fase é inteiramente baseada em primitivas nativas do Node.js: `node:fs` para persistência atômica e `Map` para lookup em memória. Não há dependências externas a instalar. O padrão write-then-rename (escrever em `.tmp`, depois `fs.renameSync`) é atômico no Linux porque `rename(2)` do kernel é uma operação atômica — um Ctrl+C entre o write e o rename deixa o `.tmp` órfão (inofensivo), mas nunca corrompe `history.json`.

O projeto usa ESM (`"type": "module"`) com Node.js 24.13.1. O `node:fs` não tem equivalente ESM de named exports — importa-se via `import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync } from 'node:fs'`. O framework de testes é `node:test` (built-in), padrão já estabelecido nas fases 1 e 2. Todos os testes são síncronos ou `async/await`, sem biblioteca de mock adicional.

A escolha entre Map e Set para o in-memory store favorece Map: Map armazena `{ sentAt }` junto com a chave, tornando a estrutura em memória espelho fiel do JSON em disco. Set seria suficiente para `isDuplicate` mas perderia o dado `sentAt` em memória. A diferença de performance é irrelevante para o volume esperado.

**Recomendação principal:** Usar `Map` como in-memory store (não Set) e manter `recordSend` atualizando tanto o Map quanto o arquivo JSON atomicamente em uma única chamada síncrona.

---

## Standard Stack

### Core

| Biblioteca | Versão | Propósito | Por que usar |
|------------|--------|-----------|--------------|
| `node:fs` | built-in (Node 24) | Leitura/escrita de arquivos, renameSync | Sem dependência externa, API síncrona adequada para CLI sequencial |
| `node:path` | built-in | Construção de caminhos portáveis | Garante separadores corretos no Linux |
| `node:test` | built-in | Framework de testes | Já em uso nas fases 1 e 2 — consistência total |
| `node:assert/strict` | built-in | Asserções nos testes | Já em uso nas fases 1 e 2 |

### Sem dependências externas

Nenhum pacote npm novo necessário. Todo o stack desta fase existe na stdlib do Node.js 24.

### Alternativas Consideradas

| Ao invés de | Poderia usar | Trade-off |
|-------------|-------------|-----------|
| `Map` in-memory | `Set` in-memory | Set não armazena `sentAt` em memória — Map é mais fiel ao schema JSON |
| `fs.renameSync` atômico | `fs.writeFileSync` direto | writeFileSync direto pode corromper se Ctrl+C ocorrer durante o write |
| `readFileSync` + try/catch ENOENT | `existsSync` + readFileSync | try/catch é idiomático e evita race condition (TOCTOU) |

**Instalação:** Nenhuma. Apenas Node.js 24+ (já disponível: v24.13.1).

---

## Architecture Patterns

### Estrutura de Arquivos desta Fase

```
src/
├── history.js              # Módulo com I/O de arquivo — loadHistory, isDuplicate, recordSend
├── stages/
│   └── dedup.js            # Stage do pipeline — recebe array, retorna subset sem duplicatas
└── utils/                  # (não alterado nesta fase)

data/
└── history.json            # Criado em runtime — NÃO commitado no git

tests/unit/
├── history.test.js         # Testa os três exports de history.js
└── dedup.test.js           # Testa stages/dedup.js
```

### Pattern 1: Módulo history.js com state encapsulado

**O que é:** history.js mantém um Map privado em módulo-scope. `loadHistory()` popula o Map; `isDuplicate()` e `recordSend()` leem/escrevem nele sem exposição externa.

**Quando usar:** Módulos com I/O que precisam de estado em memória isolado do caller.

**Exemplo:**

```javascript
// src/history.js
import { readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '..', 'data')
const HISTORY_FILE = join(DATA_DIR, 'history.json')
const HISTORY_TMP = HISTORY_FILE + '.tmp'

let historyMap = new Map()

export function loadHistory() {
  mkdirSync(DATA_DIR, { recursive: true })
  try {
    const raw = readFileSync(HISTORY_FILE, 'utf8')
    historyMap = new Map(Object.entries(JSON.parse(raw)))
  } catch (err) {
    if (err.code !== 'ENOENT') throw err
    historyMap = new Map()
  }
}

export function isDuplicate(placeId) {
  return historyMap.has(placeId)
}

export function recordSend(placeId) {
  historyMap.set(placeId, { sentAt: new Date().toISOString() })
  const obj = Object.fromEntries(historyMap)
  writeFileSync(HISTORY_TMP, JSON.stringify(obj, null, 2), 'utf8')
  renameSync(HISTORY_TMP, HISTORY_FILE)
}
```

### Pattern 2: Stage dedup.js como função pura

**O que é:** `stages/dedup.js` importa `isDuplicate` de `history.js` e filtra o array de prospects. Mesmo padrão de `src/utils/filter.js`: recebe array, retorna array.

**Quando usar:** Toda operação de filtro no pipeline segue este padrão.

**Exemplo:**

```javascript
// src/stages/dedup.js
import { isDuplicate } from '../history.js'

export function dedupProspects(prospects) {
  return prospects.filter(p => !isDuplicate(p.placeId))
}
```

### Pattern 3: Testes com tmp files — isolamento via beforeEach/afterEach

**O que é:** Testes de `history.js` que fazem I/O real usam um caminho de arquivo temporário por teste para evitar interferência entre casos.

**Quando usar:** Qualquer teste que exercite `loadHistory()` ou `recordSend()` com arquivo real.

**Exemplo:**

```javascript
// tests/unit/history.test.js
import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync, rmSync, mkdirSync, existsSync } from 'node:fs'

// Padrão: injetar DATA_DIR via variável de ambiente OU resetar o módulo entre testes
// Alternativa mais simples para módulo com estado: usar o arquivo real em /tmp durante testes
```

### Anti-Patterns a Evitar

- **Ler `history.json` a cada send:** Re-leitura em cada `recordSend` ou `isDuplicate` derrota o propósito do cache em memória e adiciona latência desnecessária.
- **`fs.writeFileSync` direto sobre `history.json`:** Sem o `.tmp` intermediário, um Ctrl+C durante o write pode corromper o JSON (arquivo parcialmente escrito).
- **Array como estrutura de dados:** Lookup em array é O(n); com centenas de entradas de histórico, cada dedup seria uma iteração completa. Map é O(1).
- **`existsSync` antes de `readFileSync`:** Cria race condition TOCTOU (time-of-check / time-of-use). Use try/catch com `err.code === 'ENOENT'`.

---

## Don't Hand-Roll

| Problema | Não construir | Usar | Por quê |
|----------|---------------|------|---------|
| Atomic file write | Custom lock/mutex | `writeFileSync` + `renameSync` | `rename(2)` do kernel Linux é atômico por especificação POSIX |
| Serialização JSON | Parser manual | `JSON.stringify` / `JSON.parse` | Built-in, lida com escaping, unicode, null values corretamente |
| Criação de diretório recursivo | Verificações manuais com `existsSync` | `mkdirSync({ recursive: true })` | Idempotente, cria toda a árvore, não lança erro se já existir |

**Insight chave:** A complexidade desta fase está no protocolo de atomicidade (write-then-rename), não na lógica de negócio. A stdlib do Node.js já resolve a parte difícil — o trabalho é apenas usar os primitivos corretos.

---

## Common Pitfalls

### Pitfall 1: State de módulo vaza entre testes

**O que dá errado:** `historyMap` é variável de módulo-scope. Se um teste chama `recordSend('X')`, o próximo teste vê 'X' já no Map, mesmo sem carregar um arquivo com 'X'.

**Por que acontece:** ESM tem cache de módulos — o mesmo módulo é reutilizado entre todos os `import` na mesma execução de teste.

**Como evitar:** Chamar `loadHistory()` no `beforeEach` com um arquivo limpo (ou vazio), garantindo que o Map seja reinicializado antes de cada teste. Alternativamente, exportar uma função `_resetForTests()` usada apenas nos testes.

**Sinais de alerta:** Testes passam isolados mas falham quando rodados juntos (`node --test`).

### Pitfall 2: Caminho do arquivo hardcoded quebrando testes

**O que dá errado:** `history.js` usa `join(__dirname, '..', 'data', 'history.json')` — este caminho é relativo ao arquivo fonte, não ao cwd. Testes escrevem no `data/` real do projeto.

**Por que acontece:** `__dirname` (via `fileURLToPath(import.meta.url)`) aponta para `src/`, então `../data/` é sempre `<project-root>/data/`.

**Como evitar:** Aceitar que testes de `history.js` usam o arquivo real em `data/history.json`, com cleanup no `afterEach`. Ou parametrizar o DATA_DIR (mais complexo — não necessário para v1).

**Sinais de alerta:** Arquivo `data/history.json` com entradas de teste após rodar a suite.

### Pitfall 3: `JSON.stringify` de Map diretamente

**O que dá errado:** `JSON.stringify(historyMap)` produz `{}` — Map não é serializável diretamente por JSON.stringify.

**Por que acontece:** JSON.stringify não itera sobre entradas de Map.

**Como evitar:** Sempre converter para objeto antes de serializar: `Object.fromEntries(historyMap)`.

**Sinais de alerta:** `history.json` escrito como `{}` independente do conteúdo.

### Pitfall 4: `.tmp` não removido após falha de write

**O que dá errado:** Se `writeFileSync(tmp)` lançar exceção (disco cheio), o `.tmp` fica órfão. Na próxima execução, `renameSync` pode sobrescrever o histórico real com dados incompletos se for chamado sem re-escrever o `.tmp`.

**Por que acontece:** Não há limpeza do `.tmp` no caminho de erro.

**Como evitar:** O padrão `writeFileSync(tmp)` seguido imediatamente por `renameSync(tmp, final)` é suficiente — se o write falha, o rename não é chamado e o `.tmp` órfão é ignorado (D-07). O próximo `recordSend` re-escreve o `.tmp` do zero antes do rename.

---

## Code Examples

Padrões verificados em Node.js 24.13.1 (ambiente do projeto):

### loadHistory — first run (ENOENT graceful)

```javascript
// Verificado: node -e "..." — ENOENT caught corretamente
export function loadHistory() {
  mkdirSync(DATA_DIR, { recursive: true })   // idempotent — não lança se já existe
  try {
    const raw = readFileSync(HISTORY_FILE, 'utf8')
    historyMap = new Map(Object.entries(JSON.parse(raw)))
  } catch (err) {
    if (err.code !== 'ENOENT') throw err     // re-lança erros inesperados
    historyMap = new Map()                   // primeira execução — histórico vazio
  }
}
```

### recordSend — write-then-rename atômico

```javascript
// Verificado: padrão write+rename testado manualmente — renameSync atômico no Linux
export function recordSend(placeId) {
  historyMap.set(placeId, { sentAt: new Date().toISOString() })
  writeFileSync(HISTORY_TMP, JSON.stringify(Object.fromEntries(historyMap), null, 2), 'utf8')
  renameSync(HISTORY_TMP, HISTORY_FILE)
}
```

### dedupProspects — stage função pura

```javascript
// Padrão idêntico a filterBusinesses em src/utils/filter.js
export function dedupProspects(prospects) {
  return prospects.filter(p => !isDuplicate(p.placeId))
}
```

### Teste com isolamento de estado

```javascript
import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { rmSync, existsSync } from 'node:fs'

// Recarregar estado entre testes via loadHistory() com arquivo limpo
describe('history', () => {
  const TEST_HIST = './data/history.json'

  afterEach(() => {
    try { rmSync(TEST_HIST) } catch {}       // cleanup — ignora se não existe
    try { rmSync(TEST_HIST + '.tmp') } catch {}
  })

  it('isDuplicate returns false for unknown place', async () => {
    const { loadHistory, isDuplicate } = await import('../../src/history.js')
    loadHistory()
    assert.equal(isDuplicate('ChIJunknown'), false)
  })
})
```

---

## Validation Architecture

Framework de testes: `node:test` (built-in, Node.js 24.13.1)
Config: sem arquivo de config — runner via `node --test tests/unit/*.test.js`
Comando rápido: `node --test tests/unit/history.test.js tests/unit/dedup.test.js`
Suite completa: `node --test tests/unit/*.test.js`

### Mapeamento Requirements → Testes

| Req ID | Comportamento | Tipo | Comando Automatizado | Arquivo Existe? |
|--------|--------------|------|----------------------|-----------------|
| HIST-01 | `loadHistory()` cria data/ e carrega JSON como Map | unit | `node --test tests/unit/history.test.js` | Wave 0 |
| HIST-01 | `loadHistory()` retorna graciosamente se arquivo não existe | unit | `node --test tests/unit/history.test.js` | Wave 0 |
| HIST-01 | `isDuplicate(placeId)` retorna true para place já no histórico | unit | `node --test tests/unit/history.test.js` | Wave 0 |
| HIST-01 | `isDuplicate(placeId)` retorna false para place desconhecido | unit | `node --test tests/unit/history.test.js` | Wave 0 |
| HIST-02 | `dedupProspects` retorna apenas prospects não duplicados | unit | `node --test tests/unit/dedup.test.js` | Wave 0 |
| HIST-02 | `dedupProspects` retorna array vazio se todos são duplicatas | unit | `node --test tests/unit/dedup.test.js` | Wave 0 |
| HIST-03 | `recordSend` persiste entry em `data/history.json` atomicamente | unit | `node --test tests/unit/history.test.js` | Wave 0 |
| HIST-03 | `recordSend` não corrompe histórico existente | unit | `node --test tests/unit/history.test.js` | Wave 0 |
| HIST-03 | Após `recordSend`, `isDuplicate` retorna true para o mesmo placeId | unit | `node --test tests/unit/history.test.js` | Wave 0 |

### Taxa de Amostragem

- Por commit de tarefa: `node --test tests/unit/history.test.js tests/unit/dedup.test.js`
- Por merge de wave: `node --test tests/unit/*.test.js`
- Gate da fase: suite completa verde antes de `/gsd:verify-work`

### Gaps Wave 0

- [ ] `tests/unit/history.test.js` — cobre HIST-01, HIST-03
- [ ] `tests/unit/dedup.test.js` — cobre HIST-02

---

## State of the Art

| Abordagem Antiga | Abordagem Atual | Mudança | Impacto |
|-----------------|-----------------|---------|---------|
| `fs.writeFileSync` direto sobre o arquivo final | `writeFileSync` em `.tmp` + `renameSync` | Padrão POSIX desde sempre | Proteção contra corrupção por Ctrl+C |
| Array para histórico (busca linear) | Objeto/Map com chave (busca O(1)) | N/A — boa prática | Lookup instantâneo independente do tamanho do histórico |
| `require('fs')` (CJS) | `import { ... } from 'node:fs'` (ESM) | Node.js 12+ | Consistente com `"type": "module"` do projeto |

---

## Open Questions

1. **Estado de módulo entre testes**
   - O que sabemos: ESM cacheia módulos — `historyMap` persiste entre `import` na mesma execução
   - O que não está claro: Estratégia exata de reset (exportar `_resetForTests()` vs recarregar via `loadHistory()` com arquivo limpo)
   - Recomendação: Implementar `loadHistory()` de forma que seja idempotente e use-a no `beforeEach` dos testes; isso é suficiente para os testes desta fase sem precisar expor função de reset privada

2. **`data/history.json` no .gitignore**
   - O que sabemos: D-03 define que o arquivo não deve ser versionado; `.gitignore` atual tem apenas `.env` e `node_modules/`
   - O que não está claro: Se deve-se ignorar `data/` inteiro ou apenas `data/history.json`
   - Recomendação: Ignorar `data/history.json` (não o diretório inteiro, caso fases futuras usem `data/` para outros artefatos)

---

## Sources

### Primary (HIGH confidence)

- Node.js 24 built-in docs (verificado em runtime): `node:fs`, `node:path`, `node:test`, `node:assert/strict`
- Verificação direta em Node.js 24.13.1: write-then-rename atômico, Map.has O(1), mkdirSync recursive, ENOENT handling
- POSIX spec: `rename(2)` é atômico no Linux (não muda entre versões)

### Secondary (MEDIUM confidence)

- Código existente do projeto (`src/utils/filter.js`, `src/stages/fetch.js`, `tests/unit/filter.test.js`) — padrões de código validados por inspeção direta
- `package.json` do projeto — confirma `"type": "module"`, Node.js >=21, test script

### Tertiary (LOW confidence)

- Nenhuma fonte de baixa confiança — toda pesquisa desta fase é baseada em primitivas stdlib verificadas em runtime.

---

## Metadata

**Breakdown de confiança:**
- Stack padrão: HIGH — apenas stdlib Node.js, verificada em runtime
- Arquitetura: HIGH — padrões copiados diretamente do código existente (filter.js, fetch.js)
- Pitfalls: HIGH — verificados por execução direta de Node.js no ambiente do projeto

**Data da pesquisa:** 2026-03-29
**Válido até:** 2026-06-29 (stdlib Node.js é estável; nenhuma dependência externa a se tornar obsoleta)
