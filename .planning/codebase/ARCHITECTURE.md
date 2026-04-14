# Architecture

**Analysis Date:** 2026-04-14

## Pattern Overview

**Overall:** Pipeline with Interactive Approval Gates

**Key Characteristics:**
- Session-based flow: operator selects city and niches via Telegram, then bot runs unattended outreach
- Multi-stage transformation: fetch → filter → dedup → render → send
- External API orchestration: 4 parallel integrations (Google Places, Evolution WhatsApp, Telegram, Zoho SMTP)
- Persistent deduplication: `data/history.json` prevents re-contact across sessions
- Synchronous command pattern: each prospect processed sequentially with 3-8 second delays

## Layers

**Presentation (Telegram UI):**
- Purpose: Interactive session configuration and progress monitoring
- Location: `src/services/telegram.js` (6 polling functions) + `bin/prospect.js` (main loop orchestration)
- Contains: Message formatting, inline buttons, media download, callback handling
- Depends on: Telegram Bot API (fetch), environment variables (token, chat ID)
- Used by: Main orchestrator (`bin/prospect.js`)

**Service Integration:**
- Purpose: Abstract external API clients
- Location: `src/services/` (4 files: `places.js`, `evolution.js`, `zoho.js`, `telegram.js`)
- Contains: HTTP request wrappers, error mapping, header/auth injection
- Depends on: fetch API, environment variables, each external service
- Used by: Pipeline stages

**Pipeline Stages:**
- Purpose: Transform and move data through outreach workflow
- Location: `src/stages/` (4 files: `fetch.js`, `dedup.js`, `render.js`, `sender.js`, `emailSender.js`)
- Contains: Business logic for each step
- Depends on: Services, utilities, history module
- Used by: Main orchestrator

**Utilities:**
- Purpose: Helpers for environment validation, templating, filtering, phone normalization
- Location: `src/utils/` (4 files: `env.js`, `template.js`, `filter.js`, `phone.js`, `args.js`)
- Contains: Pure functions and validators
- Depends on: Node builtins only
- Used by: Services, stages, main orchestrator

**History (State):**
- Purpose: Persistent deduplication across sessions
- Location: `src/history.js`
- Contains: File I/O for `data/history.json`, in-memory Map, atomicity via temp file
- Depends on: `node:fs`, `node:path`
- Used by: `dedupProspects()`, `sendWhatsApp()`, `sendEmail()`

## Data Flow

**Session Initiation:**

1. Operator sends city via Telegram
2. Bot displays niche list, operator selects (e.g., `1 4 7`)
3. Bot shows template for approval (approve/edit cycle)
4. Bot requests media attachment (optional)
5. Bot displays confirmation with inline button (approve/cancel)

**Prospect Processing (per niche):**

1. Fetch: Call Google Places API with query `"${niche} em ${city}"`
2. Filter: Exclude businesses with "real" websites (filter via `hasRealWebsite()`)
3. Dedup (session): Filter out duplicates within current niche (by placeId)
4. Dedup (history): Skip if previously contacted on WhatsApp (via `isDuplicate(placeId, 'wa')`)
5. Render: Template substitution ({{nome}}, {{rating}}, {{categoria}}, {{cidade}})
6. Send: WhatsApp text via Evolution API
7. Send (media): If media attached for niche, send after text
8. Record: Write to `history.json` after successful send
9. Delay: 3-8 second random delay before next prospect

**State Management:**
- In-memory `historyMap` (loaded at startup from `data/history.json`)
- Atomic writes: temp file (`history.json.tmp`) + rename (prevents corruption on crash)
- Per-niche template: Updated via Telegram approval flow
- Per-niche media: Uploaded and buffered in memory

## Key Abstractions

**Prospect Object:**
- Purpose: Represent a business extracted from Google Places
- Examples: `{ placeId, name, rating, phone, website, email }`
- Pattern: Flat object, immutable after construction, extended via filters/dedup

**Message Rendering:**
- Purpose: Template substitution with fallback to empty string
- Examples: `renderTemplate("Oi {{nome}}, sua nota é {{rating}}", { nome: "Pizza X", rating: "4.5" })`
- Pattern: Regex-based, safe fallback for null/undefined values

**Send Result:**
- Purpose: Unified error handling for WhatsApp and email sends
- Examples: `{ ok: true }` or `{ ok: false, reason: "API timeout" }`
- Pattern: Returned from `sendWhatsApp()` and `sendEmail()`, consumed by main loop

**History Entry:**
- Purpose: Track contact channels per prospect
- Examples: `{ wa: "2026-04-14T10:30:00.000Z", email: null }`
- Pattern: Per-channel timestamps, supports future channels (SMS, etc.)

## Entry Points

**CLI Entry:**
- Location: `bin/prospect.js` (352 lines)
- Triggers: `npm start` or `node bin/prospect.js`
- Responsibilities:
  - Load `.env` and validate required variables
  - Health check Evolution Go connection
  - Initialize Telegram polling offset (skip old messages)
  - Load persistent history from `data/history.json`
  - Interactive session setup (city, niches, template, media)
  - Main loop: iterate niches → fetch → dedup → render → send with per-niche approval gates
  - Error handling with Telegram notifications

## Error Handling

**Strategy:** Fail loudly (console + Telegram), continue processing when recoverable

**Patterns:**
- Google Places API error → Notify operator, skip to next niche
- Evolution API error (send fails) → Log, skip prospect, continue with next
- Telegram timeout → Exit with 0 (operator didn't respond within 5 minutes)
- Missing env var → Exit with 1 before any API call
- Fetch parse error → Wrap in try/catch, return `{ ok: false, reason }`
- File I/O error (history.json read) → Exit at startup, else silent fallback to empty history

## Cross-Cutting Concerns

**Logging:**
- stdout: Session progress (prospects sent, total, current niche)
- stderr (console.error): Failures, skips, debug headers (DEBUG=1)
- Telegram: Session config, progress updates, errors, summary

**Validation:**
- Environment: `validateEnv()` checks all 8 required vars before startup
- Phone: Normalized via `normalizePhone()` (handles Brazilian formats only)
- Website: `hasRealWebsite()` excludes Instagram/Linktree before filtering
- Template: `renderTemplate()` safe fallback for missing vars

**Authentication:**
- Per-service header injection (Google API key, Evolution token, Zoho credentials)
- No token refresh or renewal logic (assumes static credentials)

---

*Architecture analysis: 2026-04-14*
