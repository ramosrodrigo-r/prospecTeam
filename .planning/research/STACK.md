# Stack Research

**Domain:** Node.js CLI outreach automation bot (Google Places + WhatsApp + Email)
**Researched:** 2026-03-28
**Confidence:** HIGH (all versions verified via npm registry; APIs verified via official docs)

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Node.js | 22.x LTS | Runtime | Active LTS as of 2025; native `fetch` built-in reduces dependency surface; stable ES module support |
| `@googlemaps/places` | 2.4.0 | Places API (New) client | Official Google client for Places API (New) — legacy API can no longer be enabled for new projects; auto-retry on 5xx, typed responses |
| `nodemailer` | 8.0.4 | SMTP email sending via Zoho | De-facto standard for Node.js SMTP; actively maintained; proven Zoho SMTP compatibility at `smtp.zoho.com:465` |
| `axios` | 1.4.0 | HTTP client for Evolution API | Evolution API is a plain REST/JSON service — no SDK needed; axios provides interceptors, automatic JSON parsing, and consistent error objects; simpler than `got` for this synchronous CLI use case |
| `commander` | 14.0.3 | CLI argument parsing | Most downloaded CLI parser (500M+ weekly downloads); 25ms startup vs 48ms for yargs; clean declarative API perfect for a simple `--city` / `--category` interface |
| `lowdb` | 7.0.1 | Local JSON deduplication store | Zero-dependency flat-file JSON database; no compilation required (unlike better-sqlite3); `Array.includes()` queries are sufficient for a place-ID deduplication set; file persists between runs |
| `dotenv` | 17.3.1 | Environment variable loading | Industry standard for `.env` files; keeps API keys out of source; no alternative needed |
| `chalk` | 5.6.2 | Terminal output colorization | Pure ESM, zero dependencies; `green` for sent, `red` for error, `yellow` for skipped — makes per-business status instantly scannable |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | 4.3.6 | Config and CLI input validation | Validate that `--city` and `--category` are non-empty strings before making API calls; prevents silent failures from bad inputs |
| `ora` | 9.3.0 | Terminal spinner | Show progress while waiting for Places API pages to load; improves operator UX during long searches |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `eslint` + `@eslint/js` | Linting | Catches common async/await mistakes before runtime; configure with `flat` config (ESLint v9+) |
| `prettier` | Code formatting | One config file, no debates; pair with eslint-config-prettier to avoid conflicts |
| `.env.example` | Secrets documentation | Commit a template with all required keys listed but no values; operators copy to `.env` |

## Installation

```bash
# Core runtime dependencies
npm install @googlemaps/places axios nodemailer commander lowdb dotenv chalk

# Supporting
npm install zod ora

# Dev dependencies
npm install -D eslint @eslint/js prettier eslint-config-prettier
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `@googlemaps/places` | Direct `fetch` to `places.googleapis.com` | Only if you need zero dependencies and are comfortable building field-mask headers manually; official client is worth the overhead |
| `@googlemaps/places` | `@googlemaps/google-maps-services-js` (v3.4.2) | This is the legacy client wrapping the old Places API (v1), which can no longer be enabled for new projects; avoid for greenfield |
| `axios` | Native `fetch` (Node 22 built-in) | `fetch` is fine if you want zero-dep HTTP; axios is preferred here for its interceptor support (useful for adding the Evolution API key header globally) and cleaner error handling |
| `axios` | `got` | `got` v14 is ESM-only and adds complexity for a simple CLI; choose it only if you need built-in retry and HTTP/2; overkill for this use case |
| `lowdb` | `better-sqlite3` | Use sqlite when you need relational queries, indexes, or expect >10K records; for a deduplication set of place IDs, JSON is sufficient and avoids native module compilation |
| `lowdb` | In-memory `Set` | Loses history between runs; not viable for deduplication across multiple bot invocations |
| `commander` | `yargs` | Choose yargs if you need interactive prompts, strict argument validation with coercion, or complex option dependencies; commander is sufficient for `--city` and `--category` |
| `chalk` | `pino` + `pino-pretty` | Pino excels at structured JSON logging for long-running servers; for a short-lived CLI that needs human-readable status lines, chalk + `console.log` is lighter and more direct |
| Native template literals | `handlebars` / `mustache` | Use a template engine if templates are loaded from disk at runtime or need partials; for a single hardcoded template with `{{nome}}`, `str.replace(/\{\{nome\}\}/g, value)` or a tiny helper is sufficient — no library needed |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@googlemaps/google-maps-services-js` | Wraps the legacy Places API which can no longer be enabled on new Google Cloud projects as of 2025 | `@googlemaps/places` (Places API New) |
| `@google/maps` (npm) | Unmaintained community package; last published 2019; does not support Places API (New) endpoints | `@googlemaps/places` |
| `winston` | Designed for multi-transport server logging; configuration overhead is unnecessary for a single-run CLI that only needs terminal output | `chalk` + structured `console.log` |
| `nodemon` / `ts-node` in production | Development tools only; this bot runs on-demand via CLI, not as a long-running process | Direct `node index.js` invocation |
| TypeScript (for v1) | Adds compilation step and build tooling complexity to what should be a simple script; the typed Google client already provides IDE hints via JSDoc | Plain JavaScript (ESM); add TypeScript only if the team decides to maintain this long-term |

## Stack Patterns by Variant

**If the team adopts TypeScript later:**
- Add `typescript` + `tsx` (for `ts-node` replacement with native ESM support)
- Keep all library choices the same — all listed packages ship TypeScript types
- Because: type safety catches Places API field-mask mistakes at compile time

**If Zoho switches from SMTP to API:**
- Replace `nodemailer` SMTP transport with Zoho's Mail API via axios POST to `https://mail.zoho.com/api/accounts/{accountId}/messages`
- Because: Zoho Mail API supports OAuth2; SMTP app passwords are simpler for v1

**If deduplication history grows beyond ~50K place IDs:**
- Swap `lowdb` for `better-sqlite3` with a single `prospects` table and unique index on `place_id`
- Because: JSON parsing of large files is slow; SQLite handles millions of rows without measurable overhead

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `@googlemaps/places@2.4.0` | Node.js >= 18 | Uses native `fetch`; Node 22 LTS is the recommended baseline |
| `lowdb@7.0.1` | Node.js >= 18; ESM only | Project must use `"type": "module"` in `package.json` or `.mjs` extensions |
| `chalk@5.6.2` | Node.js >= 14; ESM only | Same ESM requirement as lowdb; consistent with modern Node setup |
| `ora@9.3.0` | Node.js >= 18; ESM only | Same ESM requirement |
| `nodemailer@8.0.4` | Node.js >= 18 | v8.x is a significant rewrite; do not pin to v6.x (older guides may reference it) |
| `commander@14.0.3` | Node.js >= 18; CommonJS + ESM | Works with both module systems |
| `axios@1.14.0` | Node.js >= 18; CommonJS + ESM | Dual-module; no ESM issues |

**Key constraint:** `lowdb`, `chalk`, and `ora` are all ESM-only. Set `"type": "module"` in `package.json` and use `import` throughout. Do not mix `require()` calls.

## Zoho SMTP Configuration Reference

```js
// nodemailer transporter for Zoho Workspace
{
  host: 'smtp.zoho.com',      // US region — use smtp.zoho.eu for EU accounts
  port: 465,
  secure: true,               // SSL
  auth: {
    user: process.env.ZOHO_USER,
    pass: process.env.ZOHO_APP_PASSWORD  // use app-specific password, not account password
  }
}
```

## Evolution API HTTP Call Pattern

```js
// POST /message/sendText/{instanceName}
// Header: apikey: <EVOLUTION_API_KEY>
await axios.post(
  `${process.env.EVOLUTION_BASE_URL}/message/sendText/${process.env.EVOLUTION_INSTANCE}`,
  { number: phoneNumber, text: messageText },
  { headers: { apikey: process.env.EVOLUTION_API_KEY } }
);
```

## Sources

- https://www.npmjs.com/package/@googlemaps/places — version 2.4.0 confirmed via `npm view`
- https://developers.google.com/maps/documentation/places/web-service/overview — Places API (New) is current; legacy can no longer be enabled (HIGH confidence)
- https://doc.evolution-api.com/v2/api-reference/message-controller/send-text — Evolution API v2 REST endpoint (MEDIUM confidence — official docs, no version lock confirmed)
- https://nodemailer.com/ + Zoho community guides — nodemailer 8.0.4 + Zoho SMTP port 465 verified by multiple sources (HIGH confidence)
- https://medium.com/@sohail_saifi/command-line-argument-parsing-yargs-vs-commander-and-why-you-should-care-e9c8dac1fcc5 — Commander vs Yargs 2026 comparison (MEDIUM confidence — single source but corroborated by npm download stats)
- https://github.com/typicode/lowdb — lowdb 7.0.1 ESM-only confirmed (HIGH confidence)
- https://www.npmjs.com/package/nodemailer — version 8.0.4 confirmed via `npm view` (HIGH confidence)
- `npm view` registry queries — all version numbers verified live on 2026-03-28 (HIGH confidence)

---
*Stack research for: Node.js CLI prospecting bot (Google Places + Evolution API WhatsApp + Zoho SMTP)*
*Researched: 2026-03-28*
