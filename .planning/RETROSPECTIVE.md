# Retrospective: ProspecTeam Bot

---

## Milestone: v1.0 — MVP

**Shipped:** 2026-04-02
**Phases:** 7 | **Plans:** 14 | **Timeline:** 2026-03-28 → 2026-04-01 (4 dias)

### What Was Built

1. **Phase 1** — Scaffold ESM + Places search: projeto Node.js com dotenv, node:test, FieldMask no Google Places API v1, paginação via nextPageToken
2. **Phase 2** — Filtro de negócios sem site real (Instagram/bio-link como ausência de site) + normalização de telefone brasileiro para E.164
3. **Phase 3** — Histórico de deduplicação em `data/history.json` com write-then-rename atômico, channel-aware (wa + email independentes)
4. **Phase 4** — Renderização de template com substituição de variáveis `{{nome}}`, `{{rating}}`, `{{categoria}}`, `{{cidade}}`
5. **Phase 5** — Sender WhatsApp via Evolution API com health check, delay aleatório 3-8s, e pipeline completo em bin/prospect.js
6. **Phase 6** — Sender email via Zoho SMTP com nodemailer, canal dual (WhatsApp + email por prospect), skip gracioso sem e-mail
7. **Phase 7** — Commander.js para args, callbacks onSkip em filter/dedup, logging explícito de cada skip, try/catch por contato

### What Worked

- **TDD com RED/GREEN** — escrever testes antes da implementação capturou vários edge cases cedo (ex: normalização de telefone com 10/11/12/13 dígitos, mock do SMTP sem conexão real)
- **Dependency injection via `_deps` param** — permitiu testes unitários sem mock.module experimental; padrão limpo e reutilizável
- **node:test built-in** — zero configuração, suficientemente capaz para 97 testes; boa escolha para um projeto minimal
- **Checkpoints humanos** — fases 5, 6, e 7 tiveram verificação manual de pipeline que detectou problemas de integração antes da verificação formal
- **onSkip callback opcional** — design backward-compatible permitiu adicionar logging sem quebrar callers existentes em Phase 7

### What Was Inefficient

- **Traceability table desatualizada** — OPS-02 ficou como "Pending" na tabela mesmo após verificação. A atualização deveria acontecer automaticamente no `phase complete`.
- **Progress table do ROADMAP.md** — Phase 3 apareceu como "In Progress" mesmo após conclusão; foi corrigido só no complete-milestone.
- **SUMMARY.md sem one_liner** — a maioria das SUMMARYs não tinha campo `one_liner` preenchido, dificultando extração automática de accomplishments.

### Patterns Established

- `_deps` parameter para dependency injection em módulos com efeitos colaterais (SMTP, fetch, Evolution API)
- `globalThis.fetch = async (url, opts) => {...}` como padrão de mock em node:test
- Write-then-rename (`writeFileSync` + `renameSync`) para atomicidade em arquivos de estado
- `onSkip(prospect, reason, detail)` como callback opcional para logging sem acoplamento
- `dotenv/config` como primeiro import ESM para garantir carregamento antes de qualquer módulo

### Key Lessons

- Commander.js com `.exitOverride()` é o padrão correto para args em projetos testáveis — process.exit em testes é um anti-pattern
- Evolution API usa header `apikey` (não `Authorization: Bearer`) — documentação é ambígua, vale testar a autenticação cedo
- Google Places API v1 exige FieldMask explícito — sem ele, retorna campos padrão mínimos sem email/phone
- `nextPageToken` é top-level na resposta do Places API (não `places.nextPageToken`) — detalhe crítico para paginação
- História channel-aware desde o início evita reescrita posterior quando o segundo canal é adicionado

### Cost Observations

- Modelo: sonnet (balanced profile) para todos os executores e verificadores
- Sessions: ~7 (uma por fase aproximadamente)
- 81 commits, 95 arquivos criados/modificados, 13.7k linhas inseridas
- Milestone concluído em 4 dias corridos (incluindo design e planejamento)

---

## Cross-Milestone Trends

| Metric | v1.0 |
|--------|------|
| Phases | 7 |
| Plans | 14 |
| Tests | 97 |
| LOC (src+bin) | 466 |
| LOC (tests) | 1162 |
| Timeline | 4 dias |
| Commits | 81 |
