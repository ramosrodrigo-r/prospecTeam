# Phase 6: Email Send via Zoho SMTP - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

O canal secundário de outreach entra em operação: o bot envia e-mail via Zoho SMTP quando um endereço de e-mail estiver presente nos dados do prospect, e pula silenciosamente (com log) quando não houver e-mail disponível. O histórico é expandido para rastrear canais separadamente (WA e e-mail). SPF e DKIM devem passar antes de qualquer envio em produção.

Não inclui: wiring do CLI final e resumo de execução (fase 7).

</domain>

<decisions>
## Implementation Decisions

### Biblioteca SMTP
- **D-01:** Usar `nodemailer` como cliente SMTP — suporte nativo a Zoho SMTP com TLS, fácil de mockar via `_deps` pattern
- **D-02:** Host/port hard-coded: `smtp.zoho.com`, porta `587` (STARTTLS). Zoho SMTP é alvo fixo — sem variáveis de ambiente para host/port
- **D-03:** Sem delay entre envios de e-mail — SMTP não tem risco de ban como WhatsApp

### Credenciais Zoho via .env
- **D-04:** Duas novas env vars obrigatórias: `ZOHO_SMTP_USER` (usuário SMTP) e `ZOHO_SMTP_PASS` (senha de app Zoho)
- **D-05:** `From` header usa `ZOHO_SMTP_USER` — remetente = usuário autenticado (sem FROM_EMAIL separado)
- **D-06:** `validateEnv()` em `src/utils/env.js` expandido para validar `ZOHO_SMTP_USER` e `ZOHO_SMTP_PASS` junto com as vars existentes
- **D-07:** `.env.example` atualizado com as 2 novas vars + comentários explicativos

### Template de e-mail
- **D-08:** Template separado: `templates/outreach-email.txt` — corpo do e-mail, independente do `outreach.txt` do WhatsApp
- **D-09:** Assunto do e-mail configurável via env var `EMAIL_SUBJECT` (ex: `Site profissional para {{nome}}`) — suporta variáveis `{{nome}}`, etc.
- **D-10:** Substituição de variáveis reutiliza `renderMessage()` de `src/stages/render.js` — sem duplicar lógica. Assunto também passa por `renderTemplate()` de `src/utils/template.js`
- **D-11:** `ZOHO_SMTP_USER` também validado como mais uma env var obrigatória junto com `EMAIL_SUBJECT`

### Histórico por canal
- **D-12:** Schema do `history.json` expandido: `{ placeId: { wa: ISO8601 | null, email: ISO8601 | null } }` — entradas separadas por canal
- **D-13:** Migração automática na leitura: se entrada tem `sentAt` direto (schema antigo), converte para `{ wa: sentAt, email: null }` — backward compatible com histórico existente
- **D-14:** API channel-aware: `recordSend(placeId, channel)` e `isDuplicate(placeId, channel)` onde `channel` é `'wa'` ou `'email'`
- **D-15:** `isDuplicate(placeId, 'wa')` retorna `true` apenas se `wa` foi enviado. `isDuplicate(placeId, 'email')` retorna `true` apenas se `email` foi enviado — independentes
- **D-16:** `loadHistory()` e `saveHistory()` (write-then-rename atômico) permanecem com a mesma assinatura — só schema interno muda

### Sender de e-mail
- **D-17:** `src/stages/emailSender.js` exporta `sendEmail(prospect, message, subject, config, _deps = {})` — retorna `{ ok: boolean, reason?: string }`
- **D-18:** `src/services/zoho.js` contém o código SMTP via nodemailer (espelho do padrão de `src/services/evolution.js`) — exporta `sendMail({ from, to, subject, text })`
- **D-19:** `config` para emailSender: `{ user: ZOHO_SMTP_USER, pass: ZOHO_SMTP_PASS }` — passado de `bin/prospect.js`
- **D-20:** `sendEmail` pula silenciosamente se `prospect.email` for null/undefined — retorna `{ ok: false, reason: 'no email address' }` SEM lançar exceção (EMAIL-02)
- **D-21:** Log de skip: `[email skipped: no address] NomeEmpresa` — sem gravar no histórico

### Ordem no pipeline em bin/prospect.js
- **D-22:** Loop por prospect: WA primeiro (se tiver `phone` e não `isDuplicate(id, 'wa')`), depois e-mail (se tiver `email` e não `isDuplicate(id, 'email')`)
- **D-23:** Output terminal: uma linha por canal — `[WA sent] Nome`, `[email sent] Nome`, `[email skipped: no address] Nome`
- **D-24:** `recordSend(placeId, 'email')` chamado apenas após SMTP confirmado (sucesso) — mesmo padrão do WA
- **D-25:** Canais independentes: falha no WA não dispara tentativa de e-mail como fallback

### Claude's Discretion
- Estrutura interna do `src/services/zoho.js` (transporter reutilizado vs criado por envio)
- Tratamento de erros SMTP específicos do nodemailer (logging do `reason`)
- Estrutura dos testes unitários para emailSender e zoho service
- Caminho de resolução do `outreach-email.txt` (seguir padrão de `TEMPLATE_PATH` em template.js)

</decisions>

<specifics>
## Specific Ideas

- O `emailSender.js` segue o mesmo padrão de `sender.js`: `_deps={}` para injeção de dependência nos testes
- `renderMessage()` já resolve as variáveis do template — basta passar o conteúdo do `outreach-email.txt` como string
- O assunto também usa `renderTemplate(subjectTemplate, { nome, rating, cidade, categoria })` — mesma função de substituição
- O delay pertence ao sender WA (D-03 do Phase 5) e não ao emailSender — e-mail não tem delay

</specifics>

<canonical_refs>
## Canonical References

Sem specs externas — requisitos totalmente capturados nas decisões acima e no ROADMAP.md.

### Requisitos mapeados
- `EMAIL-01` — Envio via Zoho SMTP → D-01, D-17, D-18
- `EMAIL-02` — Skip silencioso sem e-mail → D-20, D-21

### Código existente que esta fase consome e modifica
- `src/history.js` — `recordSend()` e `isDuplicate()` expandidos para channel-aware (D-14, D-15); schema migrado (D-13)
- `src/stages/render.js` — `renderMessage()` reutilizado para renderizar corpo do e-mail (D-10)
- `src/utils/template.js` — `renderTemplate()` reutilizado para renderizar assunto (D-10)
- `src/utils/env.js` — `validateEnv()` expandido com `ZOHO_SMTP_USER`, `ZOHO_SMTP_PASS`, `EMAIL_SUBJECT` (D-06)
- `src/services/evolution.js` — padrão a seguir em `src/services/zoho.js` (D-18)
- `src/stages/sender.js` — padrão a seguir em `src/stages/emailSender.js` (D-17)
- `bin/prospect.js` — loop expandido para dois canais por prospect (D-22)
- `.env.example` — novas vars `ZOHO_SMTP_USER`, `ZOHO_SMTP_PASS`, `EMAIL_SUBJECT` (D-07)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/stages/render.js`: `renderMessage(prospect, {cidade, categoria})` → string de corpo pronta para e-mail
- `src/utils/template.js`: `renderTemplate(templateStr, vars)` → pode renderizar assunto com variáveis
- `src/services/evolution.js`: padrão de módulo HTTP puro a replicar para `zoho.js` com nodemailer
- `src/stages/sender.js`: padrão `_deps={}` para injeção, `{ ok, reason }` return shape — emailSender segue exatamente

### Established Patterns
- Services em `src/services/` para I/O externo (evolution.js → zoho.js)
- Stages em `src/stages/` para lógica de pipeline (sender.js → emailSender.js)
- `_deps={}` como 4º parâmetro para dependency injection nos testes
- `recordSend(placeId)` após confirmação de envio — agora recebe `channel` como 2º param

### Integration Points
- `bin/prospect.js` expande o loop para tentar WA e e-mail por prospect, usando `isDuplicate(id, channel)` por canal
- `loadHistory()` faz migração automática do schema antigo na leitura
- `src/history.js` é o único arquivo que conhece o schema de `history.json`

</code_context>

<deferred>
## Deferred Ideas

- Modo `--dry-run` para e-mail — v2 CLI-01
- Resumo ao final (total WA/email enviados, pulados, erros) — fase 7
- Retry em falhas SMTP transitórias — pós-v1
- Template HTML para e-mail — pós-v1
- Log persistente em arquivo — v2 OPS-03

</deferred>

---

*Phase: 06-email-send-via-zoho-smtp*
*Context gathered: 2026-03-31*
