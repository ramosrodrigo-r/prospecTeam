# Phase 6: Email Send via Zoho SMTP - Research

**Researched:** 2026-03-31
**Domain:** Node.js SMTP email via nodemailer + Zoho, channel-aware history, pipeline extension
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Usar `nodemailer` como cliente SMTP
- **D-02:** Host/port hard-coded: `smtp.zoho.com`, porta `587` (STARTTLS). Sem variáveis de ambiente para host/port
- **D-03:** Sem delay entre envios de e-mail
- **D-04:** Duas novas env vars obrigatórias: `ZOHO_SMTP_USER` e `ZOHO_SMTP_PASS`
- **D-05:** `From` header usa `ZOHO_SMTP_USER`
- **D-06:** `validateEnv()` expandido para incluir `ZOHO_SMTP_USER`, `ZOHO_SMTP_PASS`
- **D-07:** `.env.example` atualizado com as 2 novas vars + comentários
- **D-08:** Template separado: `templates/outreach-email.txt`
- **D-09:** Assunto configurável via env var `EMAIL_SUBJECT`, suporta variáveis `{{nome}}` etc.
- **D-10:** `renderMessage()` reutilizado para corpo; `renderTemplate()` reutilizado para assunto
- **D-11:** `EMAIL_SUBJECT` também validado como env var obrigatória
- **D-12:** Schema `history.json` expandido: `{ placeId: { wa: ISO8601 | null, email: ISO8601 | null } }`
- **D-13:** Migração automática na leitura: `{ sentAt }` → `{ wa: sentAt, email: null }`
- **D-14:** API channel-aware: `recordSend(placeId, channel)` e `isDuplicate(placeId, channel)`
- **D-15:** `isDuplicate(placeId, 'wa')` e `isDuplicate(placeId, 'email')` são independentes
- **D-16:** `loadHistory()` e `saveHistory()` mantêm a mesma assinatura externa
- **D-17:** `src/stages/emailSender.js` exporta `sendEmail(prospect, message, subject, config, _deps = {})`
- **D-18:** `src/services/zoho.js` encapsula nodemailer, exporta `sendMail({ from, to, subject, text })`
- **D-19:** `config` para emailSender: `{ user: ZOHO_SMTP_USER, pass: ZOHO_SMTP_PASS }`
- **D-20:** `sendEmail` pula silenciosamente se `prospect.email` for null/undefined — retorna `{ ok: false, reason: 'no email address' }` sem lançar exceção
- **D-21:** Log de skip: `[email skipped: no address] NomeEmpresa`
- **D-22:** Loop por prospect: WA primeiro, depois e-mail — usando `isDuplicate(id, channel)` por canal
- **D-23:** Output terminal: `[WA sent]`, `[email sent]`, `[email skipped: no address]`
- **D-24:** `recordSend(placeId, 'email')` chamado apenas após SMTP confirmado
- **D-25:** Canais independentes — falha no WA não dispara e-mail como fallback

### Claude's Discretion

- Estrutura interna do `src/services/zoho.js` (transporter reutilizado vs criado por envio)
- Tratamento de erros SMTP específicos do nodemailer (logging do `reason`)
- Estrutura dos testes unitários para emailSender e zoho service
- Caminho de resolução do `outreach-email.txt` (seguir padrão de `TEMPLATE_PATH` em template.js)

### Deferred Ideas (OUT OF SCOPE)

- Modo `--dry-run` para e-mail — v2 CLI-01
- Resumo ao final (total WA/email enviados, pulados, erros) — fase 7
- Retry em falhas SMTP transitórias — pós-v1
- Template HTML para e-mail — pós-v1
- Log persistente em arquivo — v2 OPS-03
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EMAIL-01 | Bot envia e-mail via Zoho SMTP quando e-mail estiver disponível | nodemailer `createTransport` com smtp.zoho.com:587 STARTTLS; `sendMail` retorna info com `accepted[]`; `src/services/zoho.js` encapsula transporter |
| EMAIL-02 | Bot pula o envio de e-mail silenciosamente quando não há e-mail no resultado | `sendEmail` verifica `prospect.email` antes de chamar serviço; retorna `{ ok: false, reason: 'no email address' }` sem throw; log de skip sem gravar histórico |
</phase_requirements>

---

## Summary

A fase 6 é altamente mecânica: todos os padrões estão estabelecidos nas fases anteriores e as decisões já estão totalmente travadas no CONTEXT.md. Não há escolhas de design em aberto — o trabalho é aplicar o padrão existente (`sender.js` / `evolution.js`) a um novo canal (SMTP / `emailSender.js` / `zoho.js`) e expandir dois módulos existentes (`history.js`, `env.js`).

O único risco técnico não-trivial é a migração de schema do `history.json`: a função `loadHistory()` precisa detectar entradas antigas `{ sentAt: "..." }` e convertê-las para `{ wa: "...", email: null }` em memória na leitura, sem reescrever o arquivo. Os testes de history existentes dependem do schema antigo e precisarão ser atualizados junto com a migração.

Do lado Zoho: `smtp.zoho.com:587` com `secure: false` (STARTTLS) é o setup correto. O `From` header deve ser idêntico ao `ZOHO_SMTP_USER` — Zoho rejeita mensagens cujo remetente não corresponde ao usuário autenticado. Contas com 2FA precisam de App Password gerada em Settings > App Passwords.

**Recomendação principal:** Crie um transporter reutilizável no nível de módulo em `zoho.js`, criado via factory function que recebe `{ user, pass }` — permite mock nos testes sem precisar de `_deps` adicional.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| nodemailer | 8.0.4 | Cliente SMTP Node.js | Única dependência já decidida; suporte nativo STARTTLS; API simples |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| node:test (built-in) | Node >= 21 | Framework de testes | Já em uso no projeto; zero dependência |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| nodemailer 8.x | @sendgrid/mail | Sendgrid requer API externa; nodemailer vai direto ao SMTP |
| Port 587 STARTTLS | Port 465 SSL | Zoho suporta ambos; 587 é o padrão moderno; `secure: false` correto para 587 |

**Installation:**
```bash
npm install nodemailer
```

**Version verificada:** `npm view nodemailer version` retornou `8.0.4` em 2026-03-31.

---

## Architecture Patterns

### Estrutura de Arquivos desta Fase

```
src/
├── services/
│   └── zoho.js          # NOVO — transporter nodemailer; exporta sendMail()
├── stages/
│   └── emailSender.js   # NOVO — pipeline stage; exporta sendEmail()
├── history.js           # MODIFICADO — schema channel-aware + migração
└── utils/
    └── env.js           # MODIFICADO — ZOHO_SMTP_USER, ZOHO_SMTP_PASS, EMAIL_SUBJECT
templates/
└── outreach-email.txt   # NOVO — template de corpo de e-mail
bin/
└── prospect.js          # MODIFICADO — loop dual-channel
.env.example             # MODIFICADO — 3 novas vars
tests/unit/
├── emailSender.test.js  # NOVO
├── zoho.test.js         # NOVO
└── history.test.js      # MODIFICADO — schema migration + channel API
```

### Pattern 1: Transporter Reutilizável no Módulo

**O que é:** O transporter do nodemailer é criado uma vez via factory e reutilizado entre chamadas — evita overhead de conexão por envio.

**Quando usar:** Sempre em envio de múltiplos e-mails sequenciais no mesmo processo.

**Exemplo:**
```javascript
// src/services/zoho.js
// Source: nodemailer.com/smtp — createTransport documentation
import nodemailer from 'nodemailer'

let transporter = null

export function createZohoTransporter({ user, pass }) {
  transporter = nodemailer.createTransport({
    host: 'smtp.zoho.com',
    port: 587,
    secure: false, // STARTTLS — NOT SSL; secure: true seria para porta 465
    auth: { user, pass }
  })
}

export async function sendMail({ from, to, subject, text }) {
  return transporter.sendMail({ from, to, subject, text })
}
```

### Pattern 2: emailSender.js Espelhando sender.js

**O que é:** `sendEmail` segue exatamente o mesmo contrato de `sendWhatsApp` — guarda de null, `_deps={}`, retorno `{ ok, reason }`.

**Quando usar:** Sempre que um novo canal for adicionado ao pipeline.

**Exemplo:**
```javascript
// src/stages/emailSender.js
import { sendMail as _sendMail } from '../services/zoho.js'
import { recordSend as _recordSend } from '../history.js'

export async function sendEmail(prospect, message, subject, config, _deps = {}) {
  const sendMail   = _deps.sendMail   ?? _sendMail
  const recordSend = _deps.recordSend ?? _recordSend

  // EMAIL-02: skip silencioso sem e-mail
  if (!prospect.email) {
    return { ok: false, reason: 'no email address' }
  }

  try {
    await sendMail({
      from:    config.user,
      to:      prospect.email,
      subject: subject,
      text:    message
    })
    recordSend(prospect.placeId, 'email')
    return { ok: true }
  } catch (err) {
    return { ok: false, reason: err.message }
  }
}
```

### Pattern 3: Migração de Schema no loadHistory()

**O que é:** `loadHistory()` detecta entradas no formato antigo `{ sentAt: "..." }` e converte para `{ wa: "...", email: null }` em memória. O arquivo em disco NÃO é reescrito na migração.

**Quando usar:** Toda vez que `loadHistory()` ler uma entrada sem chaves `wa`/`email`.

**Exemplo:**
```javascript
// src/history.js — trecho de loadHistory()
// Migration: old schema { sentAt } → new schema { wa, email }
const raw = JSON.parse(readFileSync(HISTORY_FILE, 'utf8'))
const migrated = Object.fromEntries(
  Object.entries(raw).map(([id, val]) => {
    if (val.sentAt !== undefined && val.wa === undefined) {
      return [id, { wa: val.sentAt, email: null }]
    }
    return [id, val]
  })
)
historyMap = new Map(Object.entries(migrated))
```

### Pattern 4: isDuplicate/recordSend Channel-Aware

```javascript
// src/history.js
export function isDuplicate(placeId, channel) {
  const entry = historyMap.get(placeId)
  if (!entry) return false
  return entry[channel] != null
}

export function recordSend(placeId, channel) {
  const existing = historyMap.get(placeId) ?? { wa: null, email: null }
  historyMap.set(placeId, { ...existing, [channel]: new Date().toISOString() })
  // write-then-rename atômico permanece igual
  const obj = Object.fromEntries(historyMap)
  writeFileSync(HISTORY_TMP, JSON.stringify(obj, null, 2), 'utf8')
  renameSync(HISTORY_TMP, HISTORY_FILE)
}
```

### Pattern 5: Loop Dual-Channel em bin/prospect.js

```javascript
// bin/prospect.js — trecho do loop expandido
const emailConfig = { user: env.zohoSmtpUser, pass: env.zohoSmtpPass }

for (const prospect of prospects) {
  // Canal WA
  if (prospect.phone && !isDuplicate(prospect.placeId, 'wa')) {
    const message = renderMessage(prospect, { cidade: city, categoria: category })
    const result = await sendWhatsApp(prospect, message, waConfig)
    console.log(result.ok
      ? `[WA sent] ${prospect.name}`
      : `[WA failed: ${result.reason}] ${prospect.name}`)
  }

  // Canal e-mail
  if (!isDuplicate(prospect.placeId, 'email')) {
    const body    = renderEmailMessage(prospect, { cidade: city, categoria: category })
    const subject = renderTemplate(env.emailSubject, { nome: prospect.name, ... })
    const result  = await sendEmail(prospect, body, subject, emailConfig)
    if (!result.ok && result.reason === 'no email address') {
      console.log(`[email skipped: no address] ${prospect.name}`)
    } else if (result.ok) {
      console.log(`[email sent] ${prospect.name}`)
    } else {
      console.log(`[email failed: ${result.reason}] ${prospect.name}`)
    }
  }
}
```

### Anti-Patterns a Evitar

- **`secure: true` com porta 587:** Incorreto — `secure: true` é apenas para porta 465 (SSL implícito). Para 587 com STARTTLS, `secure: false` é obrigatório.
- **Criar transporter dentro de `sendMail` a cada chamada:** Gera overhead de conexão TCP por envio; usar transporter reutilizável no nível de módulo.
- **`recordSend(placeId, 'email')` antes de `await sendMail`:** O registro deve ser apenas após confirmação de envio SMTP — mesmo padrão do WA.
- **Lançar exceção no skip:** `sendEmail` retorna `{ ok: false, reason: 'no email address' }` sem throw — o caller simplesmente loga e continua.
- **Atualizar os testes de `history.js` sem testar a migração:** O schema antigo pode estar em `history.json` em produção — os testes de migração são críticos.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SMTP connection + TLS upgrade | Código raw com `net`/`tls` + protocolo SMTP manual | `nodemailer` | STARTTLS, auth PLAIN/LOGIN, MIME encoding, retries de conexão — complexidade absurda |
| MIME encoding do corpo de texto | `Buffer.from(text).toString('base64')` manual | `nodemailer` text field | nodemailer cuida de charset, Content-Transfer-Encoding, line endings |
| Verificação de entrega | Checar `accepted[]` manualmente | Deixar nodemailer lançar erro se rejected | SMTP throw em 5xx; accepted/rejected no info object é detalhe de múltiplos destinatários |

**Insight chave:** O protocolo SMTP tem quirks de encoding, timing e auth que o nodemailer resolve há anos. Nunca re-implementar.

---

## Common Pitfalls

### Pitfall 1: `secure: true` na Porta 587

**O que dá errado:** Conexão recusada ou timeout — Zoho espera STARTTLS na 587, não SSL direto.

**Por que acontece:** Confusão entre porta 465 (SSL, `secure: true`) e porta 587 (STARTTLS, `secure: false`).

**Como evitar:** Hard-code `secure: false` ao lado de `port: 587` com comentário explicativo.

**Sinais de alerta:** `Error: connect ECONNREFUSED` ou `Error: Greeting never received`.

### Pitfall 2: From Header Diferente do ZOHO_SMTP_USER

**O que dá errado:** Zoho rejeita a mensagem com erro de relay ou spoofing — o remetente não corresponde ao usuário autenticado.

**Por que acontece:** Tentativa de usar um `from` customizado (ex: `"ProspecTeam <outro@domain.com>"`) sem que esse endereço seja alias da conta.

**Como evitar:** `from` sempre igual a `config.user` (= `ZOHO_SMTP_USER`). Decisão D-05 já garante isso.

**Sinais de alerta:** `Error: 535 Authentication credentials invalid` ou `553 Relaying disallowed`.

### Pitfall 3: Senha Incorreta com 2FA Ativa

**O que dá errado:** Erro de autenticação 535 mesmo com senha correta da conta.

**Por que acontece:** Zoho com 2FA ativa requer App Password específica — não aceita a senha principal.

**Como evitar:** Documentar no `.env.example` que `ZOHO_SMTP_PASS` deve ser App Password se 2FA ativo (Settings > Security > App Passwords).

**Sinais de alerta:** `Error: 535 5.7.8 Authentication credentials invalid`.

### Pitfall 4: Testes de history.js Quebrando com Novo Schema

**O que dá errado:** Testes existentes chamam `recordSend('ChIJnew')` sem `channel` e falham porque a assinatura mudou.

**Por que acontece:** `recordSend` passa de 1 para 2 parâmetros; `isDuplicate` também.

**Como evitar:** Atualizar todos os testes existentes de `history.test.js` junto com a mudança da API, e adicionar casos de migração (schema antigo → novo).

**Sinais de alerta:** Falhas em testes pré-existentes após modificar `history.js`.

### Pitfall 5: render.js Lê outreach.txt — emailSender Precisa do Outro Template

**O que dá errado:** `renderMessage()` lê `templates/outreach.txt` (WhatsApp) — reutilizá-la diretamente para e-mail envia o template errado.

**Por que acontece:** `TEMPLATE_PATH` em `render.js` é resolvido no load do módulo apontando para `outreach.txt`.

**Como evitar:** Criar `renderEmailMessage()` em um módulo separado (ou inline no emailSender) que lê `templates/outreach-email.txt`. Seguir o mesmo padrão de `import.meta.url` para resolução de caminho.

---

## Code Examples

Padrões verificados de fontes oficiais e código existente do projeto:

### nodemailer createTransport para Zoho SMTP:587 STARTTLS

```javascript
// Source: nodemailer.com/smtp + zoho.com/mail/help/zoho-smtp.html
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: 'smtp.zoho.com',
  port: 587,
  secure: false,  // STARTTLS — obrigatório false para 587
  auth: {
    user: 'user@domain.com',  // ZOHO_SMTP_USER
    pass: 'app-password'      // ZOHO_SMTP_PASS (App Password se 2FA ativo)
  }
})
```

### nodemailer sendMail — objeto info retornado

```javascript
// Source: nodemailer.com/usage — info object
const info = await transporter.sendMail({
  from:    'user@domain.com',   // deve ser igual ao auth.user no Zoho
  to:      'recipient@email.com',
  subject: 'Assunto aqui',
  text:    'Corpo em texto puro'
})
// info.messageId   — Message-ID gerado
// info.accepted[]  — endereços aceitos pelo servidor
// info.rejected[]  — endereços rejeitados
// info.response    — resposta SMTP raw (ex: "250 OK")
// Lança Error em falha SMTP (4xx/5xx)
```

### Padrão _deps para zoho.js em testes

```javascript
// Baseado em sender.test.js do projeto
// Mock de sendMail via _deps:
const mockSendMail = async () => ({ messageId: 'test-id', accepted: ['to@test.com'] })
const deps = { sendMail: mockSendMail, recordSend: mockRecordSend }
const result = await sendEmail(prospect, message, subject, config, deps)
```

### validateEnv expandido

```javascript
// src/utils/env.js — adição aos campos existentes
const required = {
  // ... campos existentes ...
  zohoSmtpUser:  process.env.ZOHO_SMTP_USER,
  zohoSmtpPass:  process.env.ZOHO_SMTP_PASS,
  emailSubject:  process.env.EMAIL_SUBJECT
}
const envNames = {
  // ... nomes existentes ...
  zohoSmtpUser: 'ZOHO_SMTP_USER',
  zohoSmtpPass: 'ZOHO_SMTP_PASS',
  emailSubject: 'EMAIL_SUBJECT'
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `recordSend(placeId)` — 1 parâmetro | `recordSend(placeId, channel)` — 2 parâmetros | Esta fase | Breaking change na API interna; todos os callers precisam passar `'wa'` ou `'email'` |
| `isDuplicate(placeId)` — boolean simples | `isDuplicate(placeId, channel)` — canal isolado | Esta fase | `isDuplicate('id', 'wa')` e `isDuplicate('id', 'email')` independentes |
| `history.json: { placeId: { sentAt } }` | `history.json: { placeId: { wa, email } }` | Esta fase | Migração automática na leitura para backward compatibility |

**Deprecated/outdated nesta fase:**
- `recordSend(placeId)` sem channel: substituído por `recordSend(placeId, 'wa' | 'email')`
- `isDuplicate(placeId)` sem channel: substituído por `isDuplicate(placeId, 'wa' | 'email')`
- `sender.js` linha 18: `recordSend(prospect.placeId)` deve ser atualizado para `recordSend(prospect.placeId, 'wa')`

---

## Open Questions

1. **Zoho pessoal vs. organizacional**
   - O que sabemos: Zoho pessoal usa `smtp.zoho.com`; Zoho organizacional pode usar `smtppro.zoho.com`
   - O que está incerto: Qual o tipo de conta Zoho do usuário
   - Recomendação: D-02 já hard-codeia `smtp.zoho.com` — se o usuário tiver conta organizacional, basta trocar o host manualmente no código. Documentar no `.env.example`.

2. **`renderEmailMessage` — novo módulo ou inline no emailSender**
   - O que sabemos: `render.js` lê `outreach.txt` com `TEMPLATE_PATH` resolvido no módulo load
   - O que está incerto: CONTEXT.md diz que discretion cobre "caminho de resolução do outreach-email.txt"
   - Recomendação: Criar lógica de leitura inline no `emailSender.js` (resolve o template via `import.meta.url` igual ao `render.js`), sem criar módulo intermediário — mantém emailSender autocontido.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | node:test (built-in, Node >= 21) |
| Config file | none — invocado via `node --test tests/unit/*.test.js` |
| Quick run command | `node --test tests/unit/emailSender.test.js tests/unit/zoho.test.js tests/unit/history.test.js` |
| Full suite command | `node --test tests/unit/*.test.js` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EMAIL-01 | sendEmail chama sendMail e retorna { ok: true } quando e-mail presente | unit | `node --test tests/unit/emailSender.test.js` | Wave 0 |
| EMAIL-01 | sendEmail chama recordSend(placeId, 'email') após sucesso SMTP | unit | `node --test tests/unit/emailSender.test.js` | Wave 0 |
| EMAIL-01 | zoho.js cria transporter com host/port/secure corretos | unit | `node --test tests/unit/zoho.test.js` | Wave 0 |
| EMAIL-02 | sendEmail retorna { ok: false, reason: 'no email address' } quando prospect.email ausente | unit | `node --test tests/unit/emailSender.test.js` | Wave 0 |
| EMAIL-02 | sendEmail NAO chama recordSend no skip | unit | `node --test tests/unit/emailSender.test.js` | Wave 0 |
| EMAIL-02 | sendEmail NAO lanca excecao no skip | unit | `node --test tests/unit/emailSender.test.js` | Wave 0 |
| HIST (migration) | loadHistory converte schema antigo { sentAt } para { wa, email } | unit | `node --test tests/unit/history.test.js` | Modificar existente |
| HIST (channel) | isDuplicate(id, 'wa') independente de isDuplicate(id, 'email') | unit | `node --test tests/unit/history.test.js` | Modificar existente |
| HIST (channel) | recordSend(id, 'email') NAO afeta campo wa | unit | `node --test tests/unit/history.test.js` | Modificar existente |

### Sampling Rate

- **Por commit de tarefa:** `node --test tests/unit/emailSender.test.js tests/unit/zoho.test.js tests/unit/history.test.js`
- **Por merge de wave:** `node --test tests/unit/*.test.js`
- **Phase gate:** Suite completa verde antes de `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/unit/emailSender.test.js` — cobre EMAIL-01 e EMAIL-02
- [ ] `tests/unit/zoho.test.js` — cobre configuracao do transporter (unit, sem I/O real)
- [ ] `tests/unit/history.test.js` — MODIFICAR existente: adicionar casos de migração e channel API
- [ ] `src/services/zoho.js` — Wave 0 pode criar o arquivo vazio para o test importar sem crash
- [ ] `src/stages/emailSender.js` — Wave 0 pode criar o arquivo vazio para o test importar

---

## Sources

### Primary (HIGH confidence)

- nodemailer.com/smtp — configuração createTransport, opções port/secure/auth, reusable transporter
- nodemailer.com/usage — sendMail return value (info.messageId, info.accepted, info.rejected, info.response)
- zoho.com/mail/help/zoho-smtp.html — host smtp.zoho.com, portas 465/587, requisito From = auth user, App Password para 2FA
- npm registry (`npm view nodemailer version`) — versão atual 8.0.4, atualizado 2026-03-25

### Secondary (MEDIUM confidence)

- medium.com/@bluedesk09/sending-email-with-zoho-nodejs-nodemailer — confirma smtp.zoho.com, porta 465 com SSL; alerta App Password
- Código existente do projeto (evolution.js, sender.js, history.js, env.js) — padrões arquiteturais verificados diretamente

### Tertiary (LOW confidence)

- Nota sobre `smtppro.zoho.com` para contas organizacionais — citado em zoho.com docs mas não testado com o account do usuário

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versão verificada no npm registry em 2026-03-31
- Architecture patterns: HIGH — espelha código existente verificado no repositório
- Pitfalls: HIGH — pitfall STARTTLS/SSL confirmado por docs oficiais Zoho + nodemailer; pitfall schema migration deduzido do código atual de history.js
- Zoho host para contas org: LOW — depende do tipo de conta do usuário

**Research date:** 2026-03-31
**Valid until:** 2026-05-01 (nodemailer é biblioteca estável; Zoho SMTP config raramente muda)
