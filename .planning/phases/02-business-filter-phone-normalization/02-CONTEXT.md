# Phase 2: Business Filter + Phone Normalization - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Criar duas funções puras com testes unitários: (1) um filtro que identifica negócios sem site real (incluindo Instagram-only e bio-link sites) e (2) um utilitário de normalização de telefone brasileiro para o formato E.164 exigido pela Evolution API. Nenhuma infraestrutura de envio é construída nesta fase — ambas as funções são verificadas com `node:test` antes de qualquer integração com WhatsApp.

</domain>

<decisions>
## Implementation Decisions

### Filtro de domínios bloqueados
- **D-01:** Lista fixa de domínios bloqueados: `instagram.com` e `linktr.ee` apenas — não estender com outros bio-links nesta fase
- **D-02:** Match por hostname: qualquer URL cujo hostname termine em `.instagram.com`, `instagram.com`, `.linktr.ee`, ou `linktr.ee` é considerada "sem site real" (inclui subdomínios como `www.instagram.com`, `m.instagram.com`)
- **D-03:** URLs sem protocolo (ex: `instagram.com/business`) → prefixar `https://` antes de parsear com `new URL()` para extrair hostname

### Tratamento de websites vazios e mal-formatados
- **D-04:** `null`, `""` (string vazia) e strings de apenas espaços são tratados como ausência de site — negócio é **incluído** no output
- **D-05:** URLs que falham ao parsear (hostname não extraível via `new URL()`) são tratadas como sem site real — negócio é **incluído** no output (err on the side of contact)

### Localização dos módulos
- **D-06:** `src/utils/filter.js` exporta `filterBusinesses(prospects)` — recebe array, retorna array filtrado
- **D-07:** `src/utils/phone.js` exporta `normalizePhone(raw)` — recebe string, retorna string E.164 ou `null` se falhar

### Integração no pipeline
- **D-08:** `filterBusinesses()` é chamado dentro de `stages/fetch.js` em `fetchProspects()`, logo após acumular todos os resultados de paginação — `bin/prospect.js` já recebe apenas os prospects válidos
- **D-09:** `normalizePhone()` **não** é chamado em `fetch.js` — é utilitário puro. A Fase 5 (Evolution API) importa e usa `normalizePhone` na hora do envio

### Normalização de telefone brasileiro
- **D-10:** Normalizar qualquer DDD válido do Brasil (não apenas SP/11) — formato final: `55` + DDD (2 dígitos) + número (8 ou 9 dígitos)
- **D-11:** Telefone fixo (8 dígitos após DDD, ex: `(11) 3456-7890`) também é normalizado — formato: `5511XXXXXXXX` (12 dígitos totais)
- **D-12:** Celular (9 dígitos após DDD, ex: `(11) 98765-4321`) — formato: `5511XXXXXXXXX` (13 dígitos totais)
- **D-13:** Número sem DDD identificável (apenas 8 ou 9 dígitos, sem código de área) → **falha de normalização** → `console.warn` com o valor bruto, retornar `null`
- **D-14:** Variantes de entrada a cobrir (mínimo 10, conforme roadmap): `+55 (11) 98765-4321`, `+5511987654321`, `(11) 98765-4321`, `11987654321`, `5511987654321`, `11 98765-4321`, `(11)987654321`, `11987654321`, `(11) 3456-7890` (fixo), `11 3456-7890` (fixo sem parens)

### Testes (node:test)
- **D-15:** Usar `node:test` built-in (padrão do projeto — Phase 1 já estabeleceu)
- **D-16:** Arquivo de testes: `tests/unit/filter.test.js` e `tests/unit/phone.test.js`
- **D-17:** Padrão RED → GREEN: criar testes primeiro (podem falhar), depois implementar até passar — consistente com Phase 1

### Claude's Discretion
- Regex exata para extração de DDD e dígitos do número
- Lógica de detecção de fixo vs. celular (8 vs. 9 dígitos após DDD)
- Estrutura interna dos testes (agrupamento com `describe`)

</decisions>

<specifics>
## Specific Ideas

- No pipeline integration, `bin/prospect.js` não deve precisar importar `filterBusinesses` diretamente — a abstração fica em `stages/fetch.js`
- O campo `website` no objeto prospect (de `stages/fetch.js`) já usa `place.websiteUri ?? null` — `filterBusinesses` lê esse campo

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Fase 2
- `.planning/ROADMAP.md` §Phase 2 — Goal, Success Criteria (SC #1–5), e Design Constraints (`src/utils/phone.js` existir antes de Phase 5)

### Código existente (leitura obrigatória antes de modificar)
- `src/stages/fetch.js` — onde `filterBusinesses()` será integrado (D-08); estrutura atual do objeto prospect (campos: `placeId`, `name`, `rating`, `phone`, `website`, `email`)
- `tests/unit/fetch.test.js` — padrão de teste estabelecido no projeto (estrutura, mocking de fetch, node:test API)

### Requisitos
- `.planning/REQUIREMENTS.md` §SRCH-02 — Filtro: sem site OU URL do Instagram
- `.planning/REQUIREMENTS.md` §WA-03 — Normalização para E.164 antes de enviar

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/utils/env.js` — padrão de módulo utilitário puro (sem I/O além do necessário): `filter.js` e `phone.js` seguem o mesmo estilo
- `tests/unit/fetch.test.js` — padrão de mock com `globalThis.fetch = ...` (mock de fetch nativo)

### Established Patterns
- ESM obrigatório: `import/export`, sem `require()`
- `node:test` + `node:assert` para todos os testes
- `console.warn` / `console.error` para logging de erros (não `throw` para casos recuperáveis no pipeline)
- Objeto prospect: `{ placeId, name, rating, phone, website, email }` — `website` é string ou `null`

### Integration Points
- `stages/fetch.js:fetchProspects()` → importará `filterBusinesses` de `utils/filter.js` (D-08)
- `services/whatsapp.js` (Fase 5) → importará `normalizePhone` de `utils/phone.js` (D-09)

</code_context>

<deferred>
## Deferred Ideas

- Lista de domínios configurável (blocked-domains.json) — não necessária agora; adicionar à backlog se surgir em produção
- Outros bio-link domains (beacons.ai, bio.link, etc.) — adicionar somente se aparecerem em dados reais
- Normalização de telefone aplicada em `fetch.js` (dados limpos desde o início) — decidido que fica na Fase 5

</deferred>

---

*Phase: 02-business-filter-phone-normalization*
*Context gathered: 2026-03-28*
