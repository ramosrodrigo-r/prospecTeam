# ProspecTeam Bot

## What This Is

Bot de prospecção em Node.js que busca negócios no Google Places sem presença web adequada (sem site ou com apenas página do Instagram), e dispara mensagens personalizadas via WhatsApp (Evolution API) e e-mail (Zoho Workspace) para esses contatos. Ferramenta interna do time de vendas para automatizar o outreach de criação de sites.

## Core Value

Encontrar e contatar automaticamente negócios sem site — sem isso, o bot não tem razão de existir.

## Current State

**v1.0 MVP — SHIPPED 2026-04-02**

- 7 fases, 14 planos executados
- 466 LOC em `src/` + `bin/`, 1162 LOC em `tests/`
- 97 testes unitários (node:test built-in, zero dependências de teste)
- Stack: Node.js ESM, Commander.js, dotenv, nodemailer, Google Places API v1, Evolution API, Zoho SMTP
- Pronto para uso: `node bin/prospect.js --city "Campinas" --category "academia"`

## Requirements

### Validated (v1.0)

- ✓ Busca negócios no Google Places via `--city` e `--category` no CLI — v1.0 (SRCH-01)
- ✓ Filtra negócios sem site real (campo ausente ou URL do Instagram/bio-link) — v1.0 (SRCH-02)
- ✓ Extrai nome, rating, telefone e e-mail de cada resultado — v1.0 (SRCH-03)
- ✓ Substitui variáveis (`{{nome}}`, `{{rating}}`, `{{categoria}}`, `{{cidade}}`) no template de mensagem fixo — v1.0 (TMPL-01)
- ✓ Envia mensagem via Evolution API para o número WhatsApp do negócio — v1.0 (WA-01)
- ✓ Aplica delay aleatório de 3-8 segundos entre envios WhatsApp — v1.0 (WA-02)
- ✓ Normaliza números brasileiros para formato E.164 antes de enviar — v1.0 (WA-03)
- ✓ Envia e-mail via Zoho SMTP quando e-mail estiver disponível — v1.0 (EMAIL-01)
- ✓ Pula o envio de e-mail silenciosamente quando não há e-mail no resultado — v1.0 (EMAIL-02)
- ✓ Mantém histórico local de deduplicação com chave `place_id` — v1.0 (HIST-01)
- ✓ Pula contatos que já receberam mensagem em rodadas anteriores — v1.0 (HIST-02)
- ✓ Grava no histórico imediatamente após envio bem-sucedido — v1.0 (HIST-03)
- ✓ Exibe status por contato no terminal (nome, canal, sucesso/erro) — v1.0 (OPS-01)
- ✓ Continua processando em caso de erro por contato (não aborta o lote) — v1.0 (OPS-02)

### Active (v2 candidates)

- [ ] Paginação via `next_page_token` — busca até 60 resultados por rodada (SRCH-04)
- [ ] Modo dry-run (`--dry-run`) — simula envios sem efeito colateral (CLI-01)
- [ ] Resumo ao final da execução (total enviados WA / email / pulados / erros) (CLI-02)
- [ ] Caminho de template configurável via `--template ./msg.txt` (CLI-03)
- [ ] Log persistente em arquivo `outreach-log-YYYY-MM-DD.txt` (OPS-03)

### Out of Scope

- Interface web / dashboard — CLI com output legível é suficiente para uso interno
- Múltiplos templates — variáveis cobrem personalização em v1
- Sequências de follow-up — requer agendamento e máquina de estado; validar canal primeiro
- Scraping de e-mail fora do Google Places — risco de ToS e parsing frágil
- Sincronização com CRM — histórico local é o CRM do v1
- Personalização via IA — custo e latência; substituição de variáveis já é suficiente
- Gerenciamento de respostas do WhatsApp — requer webhook persistente; produto diferente
- Validação em lote de números antes do envio — risco de ban por bulk-check

## Context

- Stack: Node.js ESM, zero frameworks de teste (node:test built-in)
- WhatsApp: Evolution API com `apikey` header (não Authorization Bearer)
- E-mail: Zoho Workspace SMTP com nodemailer
- Fonte de dados: Google Places API v1 com FieldMask restrito
- Histórico: `data/history.json` com schema `{ placeId: { wa: sentAt, email: sentAt|null } }`
- Google Places raramente retorna e-mail; bot opera bem só-WhatsApp
- Template fixo em `templates/outreach.txt` — editável sem tocar JS

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| node:test built-in como framework de teste | Zero dependência, consistente com filosofia minimal | ✓ Bom — 97 testes estáveis |
| globalThis.fetch mock direto (sem biblioteca) | Simplicidade; disponível no Node v18+ | ✓ Bom — funciona em todos os testes de fetch |
| dotenv/config como primeiro import ESM | Garante carregamento do .env antes de qualquer módulo | ✓ Bom — sem erros de env na inicialização |
| Commander.js com .exitOverride() | Testabilidade — testes podem capturar CommanderError sem process.exit | ✓ Bom — args testáveis de forma limpa |
| History channel-aware (wa + email independentes) | Permite recontato via canal diferente se um falhou | ✓ Bom — dedup correto por canal |
| Write-then-rename atômico para history.json | Previne corrupção em crash | ✓ Bom — padrão seguro |
| onSkip callback opcional em filter/dedup | Backward compatible — callers sem callback ainda funcionam | ✓ Bom — nenhuma breaking change |
| try/catch por contato no loop principal | OPS-02: erro em um contato não aborta o lote | ✓ Bom — resiliência validada |
| Evolution API: header `apikey` (não Bearer) | Formato proprietário da Evolution API | ✓ Bom — crítico para autenticação |
| Exit code 0 mesmo quando todos os contatos falham | Falhas individuais são esperadas em outreach | ✓ Bom — sem alarmes falsos em CI |

## Constraints

- **Tech Stack**: Node.js — definido pelo time
- **WhatsApp**: Evolution API — já em uso, não mudar
- **E-mail**: Zoho Workspace — já disponível, usar SMTP
- **Dados**: Apenas o que a Google Places API retorna — sem scraping adicional

---

## Evolution

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-02 after v1.0 milestone — all 14 plans shipped, bot ready for production use*
