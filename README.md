# ProspecTeam

Bot de prospecção B2B automatizada. Busca negócios pela **Google Places API**, filtra leads sem site, dispara mensagens de outreach via **WhatsApp** (Evolution API) — com texto e mídia — e é operado inteiramente pelo **Telegram**, com deduplicação persistente entre sessões.

## Como funciona

```
Telegram (operador)
        │  escolhe nicho → aprova template → anexo opcional → informa cidade
        ▼
   ┌─────────────────────────────────────────────────────┐
   │  fetch → filter → dedup → render → send (loop)        │
   └─────────────────────────────────────────────────────┘
        │ Google Places          │ Evolution API (WhatsApp)
        ▼                        ▼
   leads sem site           texto + mídia, delay 3–8s
        │
        ▼
   data/history.json  (deduplicação persistente por placeId + canal)
```

O operador configura a sessão uma única vez (nicho, template, anexo) e depois roda **cidade após cidade** em loop: para cada cidade o bot busca, filtra, deduplica e dispara automaticamente, reportando o progresso no Telegram. Ao final, um resumo consolidado da sessão.

## Funcionalidades

- **Busca segmentada** por nicho e cidade via Google Places API (New), com paginação automática (`nextPageToken`).
- **Filtro de leads** — descarta negócios que já têm site "real" (ignora Instagram e Linktree como não-site), focando em quem ainda não tem presença web.
- **Deduplicação em duas camadas** — dentro da sessão e persistente entre sessões (`data/history.json`), por `placeId` e por canal (WhatsApp / e-mail).
- **Operação via Telegram** — seleção de nicho, aprovação/edição de template com botões inline, upload de anexo (vídeo / imagem / documento) e atualizações de progresso a cada 10 envios.
- **Envio por WhatsApp** via Evolution API — texto renderizado por template + mídia opcional, com *delay* aleatório de 3–8s entre disparos para reduzir risco de bloqueio.
- **Loop cidade-a-cidade** — mesma configuração reaproveitada em múltiplas cidades numa única sessão.
- **Normalização de telefone** para o padrão brasileiro (DDI 55).
- **Templates com variáveis** — `{{nome}}`, `{{cidade}}`, `{{categoria}}`, `{{rating}}`.
- **Canal de e-mail (Zoho SMTP)** implementado via nodemailer (`emailSender.js`), pronto para integração ao fluxo principal.

## Stack

- **Runtime:** Node.js >= 21 (ES Modules, sem build step)
- **CLI:** Commander.js
- **HTTP:** `fetch` nativo (sem SDKs de terceiros para as APIs)
- **E-mail:** nodemailer (Zoho SMTP)
- **Config:** dotenv
- **Testes:** `node:test` + `node:assert/strict` (suíte de testes unitários, sem dependências externas)
- **Persistência:** arquivo JSON único com escrita atômica (temp file + rename)

## Arquitetura

Pipeline de transformação com *gates* de aprovação interativos, em camadas:

| Camada | Local | Responsabilidade |
|--------|-------|------------------|
| Apresentação | `src/services/telegram.js` | UI interativa via polling (mensagens, botões inline, upload de mídia) |
| Serviços | `src/services/` | Clientes das APIs externas: `places`, `evolution`, `telegram`, `zoho` |
| Estágios | `src/stages/` | Lógica do pipeline: `fetch`, `dedup`, `render`, `sender`, `emailSender` |
| Utilitários | `src/utils/` | Funções puras: `env`, `template`, `filter`, `phone`, `args` |
| Estado | `src/history.js` | Deduplicação persistente (Map em memória + JSON em disco) |
| Orquestração | `bin/prospect.js` | Loop principal e fluxo de sessão |

## Pré-requisitos

- Node.js >= 21
- Projeto Google Cloud com **Places API (New)** habilitada
- Servidor **Evolution API** conectado (WhatsApp via QR code)
- Bot do **Telegram**
- Conta **Zoho Mail** (opcional, para o canal de e-mail)

> **Atenção — guards de cobrança do Google:** antes de qualquer chamada à API, configure:
> 1. Um **alerta de orçamento** em Google Cloud Console > Billing > Budgets & Alerts.
> 2. Um **limite diário de cotas** em APIs & Services > Places API (New) > Quotas.
>
> Campos como `nationalPhoneNumber`, `websiteUri` e `rating` ativam o SKU Enterprise (tier de maior custo).

## Setup

```bash
cp .env.example .env
# Preencha as variáveis no .env (veja a seção abaixo)
npm install
```

## Variáveis de ambiente

| Variável | Descrição |
|----------|-----------|
| `GOOGLE_PLACES_API_KEY` | Chave da Places API (New) |
| `EVOLUTION_API_URL` | URL do servidor Evolution API |
| `EVOLUTION_API_KEY` | Token da instância Evolution |
| `TELEGRAM_BOT_TOKEN` | Token do bot Telegram |
| `TELEGRAM_CHAT_ID` | Chat ID que recebe as notificações |
| `ZOHO_SMTP_USER` | E-mail Zoho (ex.: `user@dominio.com`) |
| `ZOHO_SMTP_PASS` | App Password do Zoho Mail |
| `EMAIL_SUBJECT` | Assunto do e-mail (suporta `{{nome}}`, `{{categoria}}`, `{{cidade}}`, `{{rating}}`) |

## Uso

```bash
# Inicia o bot — toda a operação acontece pelo Telegram
npm start

# ou diretamente:
node bin/prospect.js

# Com debug (loga headers e body das requisições à Places API)
DEBUG=1 node bin/prospect.js
```

Ao iniciar, o bot faz *health check* da instância Evolution e abre a sessão no Telegram.

## Testes

```bash
npm test
```

Suíte unitária com o test runner nativo do Node, cobrindo serviços, estágios e utilitários (com injeção de dependências para isolar chamadas externas).
