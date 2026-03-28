# Architecture Research

**Domain:** Node.js CLI outreach/prospecting automation bot
**Researched:** 2026-03-28
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                         CLI Entry Point                               │
│  bin/prospect.js  ←  Commander.js  ←  args: --city --category        │
└──────────────────────────────┬───────────────────────────────────────┘
                               │ RunConfig { city, category }
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         Orchestrator                                  │
│  src/orchestrator.js   — wires stages, drives the pipeline           │
└──┬────────────┬───────────────┬──────────────┬───────────────────────┘
   │            │               │              │
   ▼            ▼               ▼              ▼
┌──────┐  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐
│Fetch │  │  Filter  │  │  Dedup Check │  │  Template Render  │
│Stage │→ │  Stage   │→ │  Stage       │→ │  Stage            │
└──────┘  └──────────┘  └──────────────┘  └────────┬──────────┘
   │                                                │
   │ PlacesResult[]    Prospect[]    Prospect[]     │ OutreachPayload[]
   │                                                ▼
   │                                  ┌─────────────────────────┐
   │                                  │      Sender Stage       │
   │                                  │  ┌───────────────────┐  │
   │                                  │  │ WhatsApp Sender   │  │
   │                                  │  │ (Evolution API)   │  │
   │                                  │  └───────────────────┘  │
   │                                  │  ┌───────────────────┐  │
   │                                  │  │  Email Sender     │  │
   │                                  │  │  (Zoho SMTP)      │  │
   │                                  │  └───────────────────┘  │
   │                                  └────────────┬────────────┘
   │                                               │
   ▼                                               ▼
┌────────────────────────────────────────────────────────────────────┐
│                      Persistence Layer                              │
│  data/history.json  — flat JSON keyed by place_id                  │
└────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│                         Logger                                      │
│  src/logger.js  — chalk-formatted terminal output per prospect     │
└────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Boundary |
|-----------|----------------|----------|
| CLI Entry (`bin/prospect.js`) | Parse `--city` and `--category` args, validate presence, invoke orchestrator | Knows nothing about business logic; only wires args |
| Orchestrator (`src/orchestrator.js`) | Drive the pipeline in order; pass data between stages; surface errors | Owns stage sequencing; delegates all work to stages |
| Fetch Stage (`src/stages/fetch.js`) | Call Google Places API, paginate if needed, return raw `PlacesResult[]` | Only talks to Google Places; returns raw API shape |
| Filter Stage (`src/stages/filter.js`) | Keep only results with no website OR with an Instagram URL as website | Pure function — no I/O; stateless |
| Dedup Stage (`src/stages/dedup.js`) | Load `history.json`, remove any `place_id` already present | Reads history; does not write (write happens after send) |
| Template Stage (`src/stages/template.js`) | Load template string, substitute `{{nome}}`, `{{rating}}`, etc. per prospect | Pure function; no I/O; single template file |
| Sender Stage (`src/stages/sender.js`) | Dispatch WhatsApp (always) and email (when present); collect `SendResult[]` | Talks to Evolution API and Zoho SMTP; each send is isolated |
| History Logger (`src/history.js`) | Append successfully-sent `place_id` entries to `data/history.json` | Owns persistence contract; single write point |
| Logger (`src/logger.js`) | Print chalk-formatted status line per prospect to stdout | Read-only; no side effects |

## Recommended Project Structure

```
prospecTeam/
├── bin/
│   └── prospect.js          # CLI entry — Commander.js, shebang, arg validation
├── src/
│   ├── orchestrator.js      # Pipeline wiring — drives all stages in sequence
│   ├── stages/
│   │   ├── fetch.js         # Google Places API call + pagination
│   │   ├── filter.js        # No-website / Instagram-only filter
│   │   ├── dedup.js         # History lookup, returns only new prospects
│   │   ├── template.js      # Variable substitution against fixed template
│   │   └── sender.js        # WhatsApp + email dispatch; returns per-channel status
│   ├── services/
│   │   ├── places.js        # Thin wrapper: @googlemaps/google-maps-services-js
│   │   ├── whatsapp.js      # Thin wrapper: Evolution API REST (fetch/axios)
│   │   └── email.js         # Thin wrapper: Zoho SMTP (nodemailer)
│   ├── history.js           # Read/write data/history.json
│   └── logger.js            # Chalk-formatted terminal output
├── templates/
│   └── outreach.txt         # Plain-text template with {{nome}}, {{rating}}, etc.
├── data/
│   └── history.json         # Flat object: { "<place_id>": { sentAt, channels } }
├── .env                     # API keys — never committed
├── .env.example             # Documented env vars for onboarding
└── package.json
```

### Structure Rationale

- **`bin/`:** Keeps the executable entry point separate from library code. Standard Node.js CLI convention; allows `npm link` to work cleanly.
- **`src/stages/`:** Each stage is one file, one responsibility. Easier to test in isolation and swap without touching the orchestrator.
- **`src/services/`:** External API wrappers isolated from pipeline logic. When Evolution API changes an endpoint signature, only `whatsapp.js` needs updating.
- **`templates/`:** Decoupled from code; non-developers on the sales team can edit the message without touching JS.
- **`data/`:** History file lives outside `src/` to make it obvious it is runtime state, not source code. Add to `.gitignore` or commit as empty `{}` depending on team preference.

## Architectural Patterns

### Pattern 1: Linear Pipeline (Pipes and Filters)

**What:** Each stage receives an array, applies a transformation or side-effect, and returns an array. The orchestrator drives stages in sequence via `async/await` — no event bus, no queues.

**When to use:** This is the correct pattern for this project. The workload is small (tens to low hundreds of prospects per run), sequential dependencies are strict (you cannot send before rendering), and the team is a single operator running the bot manually.

**Trade-offs:** Simple to reason about and debug; easy to add a new stage; does not parallelize sending (acceptable at this volume). Would need rework only if processing thousands of records per run.

**Example:**
```javascript
// src/orchestrator.js
export async function run(city, category) {
  const raw       = await fetch(city, category);       // PlacesResult[]
  const filtered  = filter(raw);                       // Prospect[]
  const fresh     = await dedup(filtered);             // Prospect[]
  const payloads  = template(fresh);                   // OutreachPayload[]
  const results   = await sender(payloads);            // SendResult[]
  await history.record(results);
  logger.summary(results);
}
```

### Pattern 2: Thin Service Wrappers

**What:** Each external API (Google Places, Evolution API, Zoho SMTP) gets its own module in `src/services/`. That module owns credentials, request formatting, and error normalization. Stages call service modules — stages never call external APIs directly.

**When to use:** Always, even for small CLIs. The boundary keeps stage logic testable (mock the service) and makes credential changes surgical.

**Trade-offs:** One extra file per integration. Worth it even at this scale because Evolution API and Google Places both have non-trivial request shapes.

### Pattern 3: Append-Only JSON History File

**What:** `data/history.json` is a flat object keyed by `place_id`. On each run, the dedup stage reads the whole file; after a successful send, the history module appends the new entries. No database daemon required.

**When to use:** Correct choice for an internal CLI tool with a single operator. Zero setup cost, human-readable, easy to inspect or reset.

**Trade-offs:** Reads the entire file on every run — acceptable up to tens of thousands of entries (microseconds). If the team runs thousands of searches per day over months, consider SQLite (better-sqlite3) as a drop-in replacement with the same interface contract.

## Data Flow

### Main Pipeline Flow

```
CLI args (city, category)
        ↓
    fetch.js  →  Google Places API  →  PlacesResult[]
        ↓
    filter.js  →  Prospect[]  (no site / Instagram site only)
        ↓
    dedup.js  →  data/history.json (read)  →  fresh Prospect[]
        ↓
    template.js  →  templates/outreach.txt  →  OutreachPayload[]
        ↓
    sender.js
      ├──→  services/whatsapp.js  →  Evolution API  →  WhatsAppResult
      └──→  services/email.js     →  Zoho SMTP       →  EmailResult (or skipped)
        ↓
    history.js  →  data/history.json (append)
        ↓
    logger.js  →  stdout (per-prospect status line)
```

### Key Data Shapes

**PlacesResult** (from Google Places, raw):
```javascript
{ place_id, name, rating, website, formatted_phone_number, international_phone_number }
```

**Prospect** (after filter, before template):
```javascript
{ place_id, name, rating, phone, email /* often null */ }
```

**OutreachPayload** (after template):
```javascript
{ prospect: Prospect, message: string }
```

**SendResult** (after sender):
```javascript
{ place_id, name, whatsapp: 'sent'|'failed', email: 'sent'|'skipped'|'failed' }
```

**History entry** (persisted):
```javascript
{ place_id: { name, sentAt: ISO8601, channels: { whatsapp, email } } }
```

## Build Order

The pipeline stages have hard dependencies. This order maps directly to development phases:

| Order | Component | Depends On | Why First |
|-------|-----------|------------|-----------|
| 1 | `services/places.js` + `stages/fetch.js` | Nothing | Core value — without data, nothing works |
| 2 | `stages/filter.js` | fetch | Pure logic; validates the Instagram-as-no-site rule |
| 3 | `history.js` + `stages/dedup.js` | filter | Needs real data to test dedup correctly |
| 4 | `templates/outreach.txt` + `stages/template.js` | dedup | Substitution is trivial; template content needs iteration |
| 5 | `services/whatsapp.js` + `stages/sender.js` (WhatsApp half) | template | Expensive integration; build last to avoid wasted API calls |
| 6 | `services/email.js` + `stages/sender.js` (email half) | WhatsApp path | Email is optional path; compose after WhatsApp works |
| 7 | `bin/prospect.js` + `orchestrator.js` | All stages | Wire everything together once stages are individually tested |
| 8 | `logger.js` | sender results | Polish; can add incrementally throughout |

## Anti-Patterns

### Anti-Pattern 1: Stages Calling External APIs Directly

**What people do:** Put `axios.get('https://places.googleapis.com/...')` directly inside `stages/fetch.js`.

**Why it's wrong:** Stage tests require live network access. Rotating an API key means hunting through stage files. Evolution API endpoint changes break stage logic.

**Do this instead:** Stage imports `services/places.js`, calls `places.searchByCategory(city, category)`. The service owns credentials and request format.

### Anti-Pattern 2: Orchestrator Containing Business Logic

**What people do:** Add filter conditions, template logic, or send decisions inside the orchestrator's pipeline loop.

**Why it's wrong:** Orchestrators become untestable monoliths. The correct responsibility of the orchestrator is sequencing and wiring — nothing else.

**Do this instead:** Every decision (is this Instagram? already sent? does the template have all vars?) lives in its stage. Orchestrator is a dumb pipe.

### Anti-Pattern 3: Writing History Before Confirming Send

**What people do:** Record a prospect in history as soon as it passes dedup, before actually sending.

**Why it's wrong:** A network failure between history write and send silently skips that prospect forever.

**Do this instead:** History is written only after the sender stage returns a confirmed success response. Failed sends are not recorded — the next run will attempt them again.

### Anti-Pattern 4: Stopping the Pipeline on a Single Send Failure

**What people do:** `await sender(payload)` wrapped in a top-level try/catch that aborts the run on first error.

**Why it's wrong:** One unregistered number or a momentary Evolution API hiccup skips all remaining prospects in the batch.

**Do this instead:** Sender catches per-prospect errors, records them as `failed` in `SendResult`, and continues. The orchestrator reports failures in the summary without aborting.

## Integration Points

### External Services

| Service | Integration Pattern | Key Notes |
|---------|---------------------|-----------|
| Google Places API | REST via `@googlemaps/google-maps-services-js` (official SDK) | Paginate with `next_page_token`; apply exponential backoff on 429; API key in `.env` |
| Evolution API | REST `POST /message/sendText/{instance}` with `apikey` header | Self-hosted; base URL and instance name in `.env`; phone numbers must include country code |
| Zoho SMTP | SMTP via `nodemailer` (`transporter.sendMail`) | Port 465 (SSL) or 587 (STARTTLS); app password preferred over account password; skip gracefully when email is null |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| CLI ↔ Orchestrator | Direct function call with `RunConfig` object | No events; synchronous boundary |
| Stage ↔ Stage | Array returned from one, received by next | All via orchestrator; stages never import each other |
| Stage ↔ Service | Direct function call; service owns async | Stages await service calls; no callbacks |
| Sender ↔ History | `SendResult[]` array returned to orchestrator, passed to `history.record()` | Sender does not import history; orchestrator mediates |

## Scaling Considerations

This is an internal single-operator CLI. Scaling concerns are minimal, but here is the realistic ceiling and mitigation path:

| Scale | Architecture Adjustment |
|-------|--------------------------|
| 1-500 prospects/run | Current flat-pipeline design; JSON history — no changes needed |
| 500-5000 prospects/run | Introduce concurrency in sender (Promise.allSettled with concurrency cap); JSON history still fine |
| 5000+ prospects/run or multi-operator | Replace `history.json` with SQLite (`better-sqlite3`); wrap history read/write in transactions |
| Scheduled / unattended runs | Add a cron wrapper or `node-cron` scheduler; no architectural change to pipeline stages |

**First bottleneck:** Google Places API rate limits (60 req/min on standard tier). Mitigation: paginate with `next_page_token` and add 200ms delay between page requests.

**Second bottleneck:** Evolution API send rate. WhatsApp will flag accounts sending too fast. Mitigation: add a configurable `DELAY_BETWEEN_SENDS_MS` env var (default 1000ms) applied inside the sender loop.

## Sources

- [Pipeline Pattern — Streamlining Data Processing (DEV Community)](https://dev.to/wallacefreitas/the-pipeline-pattern-streamlining-data-processing-in-software-architecture-44hn)
- [Evolution API GitHub — REST architecture and message endpoints](https://github.com/EvolutionAPI/evolution-api)
- [Evolution API DeepWiki — WhatsApp Integration](https://deepwiki.com/EvolutionAPI/evolution-api/3-whatsapp-integration)
- [Evolution API Docs — Send Plain Text endpoint](https://doc.evolution-api.com/v1/api-reference/message-controller/send-text)
- [Google Maps Node.js Client — official SDK](https://github.com/googlemaps/google-maps-services-js)
- [Google Places API Best Practices](https://developers.google.com/maps/documentation/places/web-service/web-services-best-practices)
- [Commander.js — Node.js CLI framework](https://github.com/tj/commander.js/)
- [Building CLI Tools with Node.js (Java Code Geeks, 2025)](https://www.javacodegeeks.com/2025/03/building-cli-tools-with-node-js.html)
- [Node.js with SQLite — local persistence (BetterStack)](https://betterstack.com/community/guides/scaling-nodejs/nodejs-sqlite/)
- [node-pipes-and-filters — pattern reference](https://github.com/slashdotdash/node-pipes-and-filters)

---
*Architecture research for: Node.js outreach prospecting automation CLI bot*
*Researched: 2026-03-28*
