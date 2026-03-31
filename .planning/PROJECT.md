# ProspecTeam Bot

## What This Is

Bot de prospecção em Node.js que busca negócios no Google Places sem presença web adequada (sem site ou com apenas página do Instagram), e dispara mensagens personalizadas via WhatsApp (Evolution API) e e-mail (Zoho Workspace) para esses contatos. Ferramenta interna do time de vendas para automatizar o outreach de criação de sites.

## Core Value

Encontrar e contatar automaticamente negócios sem site — sem isso, o bot não tem razão de existir.

## Requirements

### Validated

- [x] Substitui variáveis ({{nome}}, {{rating}}, etc.) em um template de mensagem fixo — Validated in Phase 04: message-template-rendering
- [x] Dispara mensagem via WhatsApp usando Evolution API — Validated in Phase 05: whatsapp-send-via-evolution-api
- [x] Mantém histórico de contatos já prospectados para evitar duplicatas — Validated in Phase 05: whatsapp-send-via-evolution-api
- [x] Exibe log claro no terminal com status de cada envio — Validated in Phase 05: whatsapp-send-via-evolution-api

### Active

- [ ] Busca negócios no Google Places por cidade e categoria (passados via CLI)
- [ ] Filtra negócios que não têm site ou cujo "site" é uma página do Instagram
- [ ] Extrai nome, rating, e-mail e telefone WhatsApp de cada resultado
- [ ] Dispara e-mail via Zoho Workspace (quando e-mail disponível; pula se ausente)

### Out of Scope

- Interface web — ferramenta interna de CLI, painel não agrega valor agora
- Múltiplos templates — um template fixo é suficiente para v1
- Templates separados por canal — mesma mensagem para e-mail e WhatsApp em v1
- Scraping de e-mail fora do Google Places — fora do escopo desta versão

## Context

- Stack: Node.js, CLI
- WhatsApp: Evolution API (já configurada pelo time)
- E-mail: Zoho Workspace (já disponível)
- Fonte de dados: Google Places API (com API key própria)
- O Google Places raramente retorna e-mail; quando ausente, só WhatsApp é enviado
- Instagram como "site" deve ser tratado como ausência de site real
- O time prospecta cidades e categorias variadas a cada rodada de outreach

## Constraints

- **Tech Stack**: Node.js — já definido pelo time
- **WhatsApp**: Evolution API — já em uso, não mudar
- **E-mail**: Zoho Workspace — já disponível, usar SMTP ou API do Zoho
- **Dados**: Apenas o que a Google Places API retorna — sem scraping adicional

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Instagram = sem site | Negócios com só Instagram não têm presença web real | — Pending |
| Pular e-mail quando ausente | Google Places raramente retorna e-mail; bloquear por isso reduz muito o alcance | — Pending |
| Histórico local de duplicatas | Evita reenvio para o mesmo negócio em buscas futuras | — Pending |
| Template único para ambos os canais | Simplicidade em v1; fácil de ajustar depois | — Pending |

---

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-31 — Phase 05 complete: Evolution API service + sender stage + pipeline orchestrator (bin/prospect.js) implementado e verificado com instância real*
