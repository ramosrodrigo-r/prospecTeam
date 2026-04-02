# Phase 1: Project Foundation + Google Places Search - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Scaffold ESM Node.js project com billing guards e busca funcional no Google Places por cidade e categoria, retornando dados estruturados de prospects (nome, rating, telefone, website). Filtro de negócios, envio de mensagens e CLI completa são fases posteriores.

</domain>

<decisions>
## Implementation Decisions

### Google Places API
- **D-01:** Usar a **New Places API (v1)** via Text Search — os nomes de campo do roadmap (`displayName`, `nationalPhoneNumber`, `websiteUri`) confirmam esta escolha
- **D-02:** Requisições via `fetch` nativo do Node.js (sem client library) — ESM puro, sem dependência extra
- **D-03:** FieldMask restrito a `places.id,places.displayName,places.websiteUri,places.nationalPhoneNumber,places.rating` no header `X-Goog-FieldMask`
- **D-04:** Endpoint: `POST https://places.googleapis.com/v1/places:searchText` com body `{ textQuery: "{categoria} em {cidade}" }`

### Paginação
- **D-05:** Paginar via `nextPageToken` com sleep de 2.5s entre páginas — implementado em `stages/fetch.js`
- **D-06:** Retornar array acumulado de todos os resultados das páginas

### Credenciais e billing guard
- **D-07:** `GOOGLE_PLACES_API_KEY` lida de `.env` via `dotenv` — se ausente ou vazia, `process.exit(1)` com mensagem clara antes de qualquer chamada à API
- **D-08:** Billing guard é verificação de env apenas — a configuração do alerta de $10 e quota cap no Google Cloud Console é pré-requisito operacional documentado no README, não código

### Output do Phase 1
- **D-09:** Output: `console.log(JSON.stringify(results, null, 2))` — JSON bruto para stdout; formatação com chalk é responsabilidade do Phase 7
- **D-10:** Dados estruturados por prospect: `{ placeId, name, rating, phone, website, email: null }` — `email` sempre `null` nesta fase (Places raramente retorna; campo reservado para consistência)

### Parsing de args (Phase 1)
- **D-11:** `process.argv` direto com parsing mínimo — extrair `--city` e `--value` sem Commander.js; Commander.js é instalado e wired no Phase 7
- **D-12:** Args ausentes causam `process.exit(1)` com exemplo de uso

### Debug mode
- **D-13:** `DEBUG=1` como env var habilita `console.error` dos headers e body de cada request — sem flag extra, sem dependência

### Claude's Discretion
- Estrutura exata do `package.json` (scripts, engines field)
- Tratamento de rate limit / 429 da Places API (retry simples ou fail-fast)
- Nome do campo de query no body (`textQuery` já especificado em D-04)

</decisions>

<specifics>
## Specific Ideas

- Nenhuma preferência específica — deixado a critério do Claude

</specifics>

<canonical_refs>
## Canonical References

Sem specs ou ADRs externos — requisitos totalmente capturados nas decisões acima e nos critérios de sucesso do ROADMAP.md.

### Fase 1
- `.planning/ROADMAP.md` §Phase 1 — Goal, Success Criteria (SC #1–5), e Design Constraints da fase

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Nenhum — projeto começa do zero nesta fase

### Established Patterns
- ESM (`"type": "module"`) obrigatório desde o início — todos os arquivos usam `import/export`, sem `require()`
- `.env` + `.gitignore` para todas as credenciais

### Integration Points
- `bin/prospect.js` → entry point (Phase 1 cria versão mínima; Phase 7 expande)
- `services/places.js` → encapsula chamadas à Places API (consumido por `stages/fetch.js`)
- `stages/fetch.js` → orquestra paginação e retorna array de prospects

</code_context>

<deferred>
## Deferred Ideas

- Nenhuma ideia fora do escopo surgiu — discussão manteve-se dentro da fase

</deferred>

---

*Phase: 01-foundation-places*
*Context gathered: 2026-03-28*
