# ProspecTeam

Bot de prospecção automatizada via Google Places API com envio por WhatsApp e e-mail, controlado pelo Telegram.

## Funcionalidades

- Busca negócios por cidade e categoria via Google Places API
- Envia mensagens de prospecção via WhatsApp (Evolution API) ou e-mail (Zoho SMTP)
- Interface de controle pelo Telegram com aprovação manual por nicho
- Deduplicação persistente para evitar contatos duplicados entre sessões
- Modo hard: 6 nichos, aprovação por template, meta de 100 contatos

## Pré-requisitos

- Node.js >= 21
- Google Cloud project com Places API (New) habilitada
- Servidor Evolution API (para WhatsApp)
- Conta Zoho Mail (para e-mail)
- Bot Telegram

> **Atenção:** Antes de qualquer chamada à API do Google, configure os guards de cobrança:
> 1. Crie um **alerta de $10** em Google Cloud Console > Billing > Budgets & Alerts
> 2. Configure um **limite diário de cotas** em APIs & Services > Places API (New) > Quotas
>
> Campos como `nationalPhoneNumber`, `websiteUri` e `rating` ativam o SKU Enterprise (tier de maior custo).

## Setup

```bash
cp .env.example .env
# Preencha as variáveis no .env (veja seção abaixo)
npm install
```

## Variáveis de ambiente

| Variável | Descrição |
|----------|-----------|
| `GOOGLE_PLACES_API_KEY` | Chave da Places API (New) |
| `EVOLUTION_API_URL` | URL do servidor Evolution API |
| `EVOLUTION_API_KEY` | Token da instância Evolution |
| `ZOHO_SMTP_USER` | E-mail Zoho (ex: user@dominio.com) |
| `ZOHO_SMTP_PASS` | App Password do Zoho Mail |
| `EMAIL_SUBJECT` | Assunto do e-mail (suporta `{{nome}}`, `{{categoria}}`, `{{cidade}}`, `{{rating}}`) |
| `TELEGRAM_BOT_TOKEN` | Token do bot Telegram |
| `TELEGRAM_CHAT_ID` | Chat ID para receber notificações |

## Uso

```bash
# Pipeline interativo via Telegram
node bin/prospect.js --city "São Paulo" --category "restaurante"

# Com debug (loga headers e body da requisição)
DEBUG=1 node bin/prospect.js --city "São Paulo" --category "restaurante"
```
