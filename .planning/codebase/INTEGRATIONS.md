# External Integrations

**Analysis Date:** 2026-04-14

## APIs & External Services

**Google Places API (New):**
- What it's used for: Search businesses by category and location, retrieve name, phone, website, rating
- SDK/Client: Native `fetch()`, POST to `https://places.googleapis.com/v1/places:searchText`
- Auth: Header `X-Goog-Api-Key: ${GOOGLE_PLACES_API_KEY}`
- Implementation: `src/services/places.js` → `searchPlaces()`
- Pagination: Handled via `nextPageToken` in response, request URL encoded

**Evolution Go (WhatsApp API):**
- What it's used for: Send text and media messages via WhatsApp to prospect phone numbers
- SDK/Client: Native `fetch()`, self-hosted server
- Auth: Header `apikey: ${EVOLUTION_API_KEY}` (instance token)
- Implementation: `src/services/evolution.js` → `sendTextMessage()`, `sendMediaMessage()`, `checkConnection()`
- Endpoints:
  - `/instance/status` - Health check before session starts
  - `/send/text` - Send WhatsApp text message
  - `/send/media` - Send WhatsApp media (image/video/document)
- Base URL: `${EVOLUTION_API_URL}` (env var, e.g., `http://localhost:8080`)

**Telegram Bot API:**
- What it's used for: Interactive UI for operator (city selection, niche selection, template approval, media upload, progress updates)
- SDK/Client: Native `fetch()`, polling-based updates
- Auth: URL path token `${TELEGRAM_BOT_TOKEN}`
- Implementation: `src/services/telegram.js` - 6 functions:
  - `sendMessage()` - Send Markdown-formatted message with optional inline keyboard
  - `initUpdatesOffset()` - Skip old messages, start fresh from latest
  - `downloadTelegramFile()` - Download media uploaded by operator (video, image, document)
  - `waitForTextReply()` - Block until operator sends text (5-min timeout)
  - `waitForMedia()` - Block until operator uploads media (5-min timeout)
  - `waitForApproval()` - Block until operator clicks inline button (5-min timeout)
- Base URL: `https://api.telegram.org`

## Data Storage

**Databases:**
- None. Single-file JSON store.

**File Storage:**
- Local filesystem: `/data/history.json` (persistent between sessions)
  - Purpose: Track which companies have been contacted (prevent re-contact across sessions)
  - Schema: `{ placeId: { wa: ISO_timestamp|null, email: ISO_timestamp|null }, ... }`
  - Atomicity: Uses temp-file + rename pattern (`history.json.tmp` → `history.json`)
  - Implementation: `src/history.js` → `loadHistory()`, `recordSend()`, `isDuplicate()`

**Caching:**
- None. In-memory `Map` loaded from `history.json` at startup

## Authentication & Identity

**Auth Provider:**
- Custom / None - API tokens provided as environment variables

**Auth Pattern:**
- Google Places: API key in request header
- Evolution Go: Instance token in request header
- Telegram: Bot token in URL
- Zoho SMTP: Username + app password in nodemailer config

## Monitoring & Observability

**Error Tracking:**
- None integrated. Errors logged to `console.error()` and Telegram (`sendMessage()` with error details)

**Logs:**
- Console output (stdout for session progress, stderr for debug)
- Debug mode: `DEBUG=1` enables `console.error()` of request headers/bodies in `src/services/places.js`

## CI/CD & Deployment

**Hosting:**
- Self-hosted Node.js server (no constraints on platform)

**CI Pipeline:**
- None. Manual startup via `npm start`

## Environment Configuration

**Required env vars:**
```
GOOGLE_PLACES_API_KEY     # Google Cloud credentials
EVOLUTION_API_URL         # Evolution Go server (self-hosted)
EVOLUTION_API_KEY         # Instance token from Evolution Go
TELEGRAM_BOT_TOKEN        # Telegram Bot API token
TELEGRAM_CHAT_ID          # Operator's chat ID (numeric)
ZOHO_SMTP_USER            # Zoho Mail email address
ZOHO_SMTP_PASS            # Zoho Mail app password
EMAIL_SUBJECT             # Template string with vars: {{nome}}, {{rating}}, {{categoria}}, {{cidade}}
```

**Secrets location:**
- `.env` file (untracked, present at runtime only)
- Never committed to git (`.gitignore` present)
- See `.env.example` for all keys and descriptions

## Webhooks & Callbacks

**Incoming:**
- None. Bot polls Telegram API using `getUpdates()` with 30-second timeout.

**Outgoing:**
- Messages to Telegram (informational, progress updates)
- Text/media to WhatsApp via Evolution Go
- Email to Zoho SMTP (not yet integrated into main flow)

---

*Integration audit: 2026-04-14*
