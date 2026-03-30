# Requirements: ProspecTeam Bot

**Defined:** 2026-03-28
**Core Value:** Encontrar e contatar automaticamente negócios sem site — sem isso, o bot não tem razão de existir.

## v1 Requirements

### Search

- [x] **SRCH-01**: Usuário busca negócios no Google Places via `--city` e `--category` no CLI
- [x] **SRCH-02**: Bot filtra negócios sem site real (campo ausente ou URL do Instagram)
- [x] **SRCH-03**: Bot extrai nome, rating, telefone e e-mail de cada resultado

### Template

- [x] **TMPL-01**: Bot substitui variáveis (`{{nome}}`, `{{rating}}`, `{{categoria}}`, `{{cidade}}`) no template de mensagem fixo

### WhatsApp

- [ ] **WA-01**: Bot envia mensagem via Evolution API para o número WhatsApp do negócio
- [ ] **WA-02**: Bot aplica delay aleatório de 3-8 segundos entre envios WhatsApp
- [x] **WA-03**: Bot normaliza números brasileiros para formato E.164 antes de enviar

### Email

- [ ] **EMAIL-01**: Bot envia e-mail via Zoho SMTP quando e-mail estiver disponível
- [ ] **EMAIL-02**: Bot pula o envio de e-mail silenciosamente quando não há e-mail no resultado

### Histórico

- [x] **HIST-01**: Bot mantém histórico local de deduplicação com chave `place_id`
- [x] **HIST-02**: Bot pula contatos que já receberam mensagem em rodadas anteriores
- [x] **HIST-03**: Bot grava no histórico imediatamente após envio bem-sucedido

### Operacional

- [ ] **OPS-01**: Bot exibe status por contato no terminal (nome, canal, sucesso/erro)
- [ ] **OPS-02**: Bot continua processando em caso de erro por contato (não aborta o lote)

## v2 Requirements

### Search

- **SRCH-04**: Paginação via `next_page_token` — busca até 60 resultados por rodada (vs 20)

### CLI

- **CLI-01**: Modo dry-run (`--dry-run`) — simula envios sem efeito colateral
- **CLI-02**: Resumo ao final da execução (total enviados WA / email / pulados / erros)
- **CLI-03**: Caminho de template configurável via `--template ./msg.txt`

### Operacional

- **OPS-03**: Log persistente em arquivo `outreach-log-YYYY-MM-DD.txt`

## Out of Scope

| Feature | Reason |
|---------|--------|
| Interface web / dashboard | Dobra a complexidade de build; CLI com output legível é suficiente para uso interno |
| Múltiplos templates | Gerenciamento adicional sem valor validado; variáveis cobrem personalização em v1 |
| Sequências de follow-up | Requer agendamento e máquina de estado — produto diferente; validar canal primeiro |
| Scraping de e-mail fora do Google Places | Fora do escopo por PROJECT.md; risco de ToS e parsing frágil |
| Sincronização com CRM | Nenhum CRM definido; histórico local é o CRM do v1 |
| Personalização via IA | Custo de API LLM e latência; substituição de variáveis já é personalização suficiente |
| Gerenciamento de respostas do WhatsApp | Requer webhook persistente e estado de conversa — produto diferente |
| Validação em lote de números antes do envio | Evolution API pode banir conta por bulk-check; padrão seguro é "tenta, trata falha" |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SRCH-01 | Phase 1 | Complete |
| SRCH-03 | Phase 1 | Complete |
| SRCH-02 | Phase 2 | Complete |
| WA-03 | Phase 2 | Complete |
| HIST-01 | Phase 3 | Complete |
| HIST-02 | Phase 3 | Complete |
| HIST-03 | Phase 3 | Complete |
| TMPL-01 | Phase 4 | Complete |
| WA-01 | Phase 5 | Pending |
| WA-02 | Phase 5 | Pending |
| EMAIL-01 | Phase 6 | Pending |
| EMAIL-02 | Phase 6 | Pending |
| OPS-01 | Phase 7 | Pending |
| OPS-02 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 14 total
- Mapped to phases: 14
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-28*
*Last updated: 2026-03-28 after roadmap creation — traceability updated to 7-phase structure*
