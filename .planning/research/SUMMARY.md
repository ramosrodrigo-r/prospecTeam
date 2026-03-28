# Project Research Summary

**Project:** ProspecTeam
**Domain:** Node.js CLI outreach automation bot (Google Places + WhatsApp via Evolution API + Email via Zoho SMTP)
**Researched:** 2026-03-28
**Confidence:** HIGH

## Executive Summary

ProspecTeam is a purpose-built internal CLI tool for B2B local business prospecting: it finds businesses without a real website via the Google Places API and contacts them through WhatsApp (Evolution API) and email (Zoho SMTP). This niche is entirely unserved by mainstream outreach tools — Apollo.io and Outscraper target different data models and channels. The recommended implementation is a linear pipeline (Pipes and Filters pattern) with thin service wrappers per integration, a local JSON deduplication history, and a Commander.js CLI entry point. The entire system is a single-operator, on-demand script — no server, no UI, no scheduler required for v1.

The recommended approach is to build in strict dependency order: Google Places search first (core data source), then the no-website/Instagram filter, then deduplication history, then message template rendering, then the WhatsApp sender, then email. Each stage is an isolated module; the orchestrator wires them together only after all stages are individually verified. All key libraries — `@googlemaps/places`, `nodemailer`, `axios`, `commander`, `lowdb`, `chalk` — are ESM-only or ESM-compatible, so the project must use `"type": "module"` in `package.json` from day one. This constraint must be set before any code is written or library conflicts will surface late.

The highest-risk areas are WhatsApp account health and Google Cloud billing. Evolution API uses the unofficial WhatsApp Web protocol, which means an overzealous send loop or bulk number validation will ban the sending number — potentially permanently. Google Places API (New) bills per data tier requested, and a single uncapped run can generate hundreds of dollars in charges. Both risks are fully preventable but must be addressed before any live API calls are made, not retrofitted afterward. The second major risk cluster — Instagram URL filter bugs and Brazilian phone number normalization — can silently corrupt the pipeline's targeting logic and cause duplicate sends if not unit-tested with real data variants.

---

## Key Findings

### Recommended Stack

The stack is lean and well-established for this use case. The ESM-only constraint is the single most important architectural decision: `lowdb`, `chalk`, and `ora` all require ESM, which forces `"type": "module"` in `package.json`. This is a clean project, so this is a non-issue if set from the start. `@googlemaps/places@2.4.0` is the only correct Google client — the legacy `@googlemaps/google-maps-services-js` wraps the old Places API that can no longer be enabled for new projects. `nodemailer@8.0.4` is a significant rewrite from v6 (which many guides reference); pin to v8+.

**Core technologies:**
- `Node.js 22.x LTS`: Runtime — active LTS, native `fetch`, stable ESM support
- `@googlemaps/places@2.4.0`: Google Places API (New) — the only viable client for new projects
- `nodemailer@8.0.4`: Zoho SMTP sending — port 465 (SSL), app-specific password required
- `axios@1.4.0`: Evolution API HTTP calls — interceptor support for global `apikey` header
- `commander@14.0.3`: CLI argument parsing — `--city` / `--category` interface; 25ms startup
- `lowdb@7.0.1`: Local JSON deduplication history — zero-dependency, sufficient for v1 scale
- `dotenv@17.3.1`: Environment variable management — all credentials in `.env`, never committed
- `chalk@5.6.2`: Terminal output colorization — per-business status instantly scannable
- `zod@4.3.6`: CLI input validation — catches empty `--city` / `--category` before API calls
- `libphonenumber-js`: Brazilian phone normalization — required for Evolution API compatibility (not in original STACK.md but flagged as critical in PITFALLS.md)

**Do not use:** `@googlemaps/google-maps-services-js` (legacy API, cannot be enabled on new projects), `@google/maps` (unmaintained since 2019), `winston` (overkill for a CLI), TypeScript (unnecessary compilation complexity for v1).

### Expected Features

The MVP feature set is well-defined and entirely achievable within a single focused development sprint. The pipeline's filter — "find businesses with no real website, or with Instagram as their only web presence" — is the core competitive differentiator. No mainstream tool does this natively.

**Must have (table stakes — P1):**
- Google Places search by `--city` and `--category` CLI args
- Filter: no website OR Instagram/bio-link URL as website
- Extract name, rating, phone, email from Places result
- Variable substitution in a fixed message template (`{{nome}}`, `{{rating}}`, `{{categoria}}`)
- WhatsApp send via Evolution API (with 5–15s random delay between sends — non-negotiable)
- Email send via Zoho SMTP (skip gracefully when email absent)
- Local deduplication history by `place_id` — prevents re-sends across runs
- Per-contact terminal log with channel and status
- Per-contact error handling — failures must not abort the run

**Should have (differentiators — P2, add after validation):**
- Pagination via `next_page_token` — triples leads from 20 to 60 per query; high value
- `--dry-run` mode — preview sends without side effects
- Run summary at exit — sent/skipped/failed counters
- Configurable template file path via CLI arg

**Defer to v2+:**
- Multiple templates per category, follow-up sequences, CRM sync, log file output, AI personalization, web UI

### Architecture Approach

The architecture is a linear Pipes and Filters pipeline: CLI entry point → Orchestrator → Fetch → Filter → Dedup → Template → Sender → History write → Logger. Each stage is one file with one responsibility. External APIs (Google Places, Evolution API, Zoho SMTP) are wrapped in thin service modules under `src/services/` so that stage logic is never coupled to HTTP details. The orchestrator sequences stages and passes arrays between them — it contains no business logic itself. History is written per-contact immediately after a confirmed successful send, not at batch end, so a crash mid-run does not lose progress.

**Major components:**
1. `bin/prospect.js` (CLI entry) — Commander.js arg parsing; delegates to orchestrator; no business logic
2. `src/orchestrator.js` (pipeline wiring) — drives all stages in sequence; mediates data flow; handles summary
3. `src/stages/fetch.js` — Google Places text search + pagination via `src/services/places.js`
4. `src/stages/filter.js` — pure function: no website OR Instagram/bio-link URL detection
5. `src/stages/dedup.js` — loads `data/history.json` Set at startup; filters already-contacted prospects
6. `src/stages/template.js` — pure function: variable substitution into `templates/outreach.txt`
7. `src/stages/sender.js` — WhatsApp + email dispatch via service wrappers; returns `SendResult[]`
8. `src/history.js` (persistence) — single write point to `data/history.json`; appends after confirmed send
9. `src/logger.js` — chalk-formatted per-prospect terminal output; read-only, no side effects
10. `src/services/{places,whatsapp,email}.js` — thin wrappers owning credentials and request format

### Critical Pitfalls

1. **WhatsApp ban from bulk number validation** — Never call `/chat/whatsappNumbers` endpoint in bulk. Send directly; catch failure; mark invalid. Delay between sends must be random 5–15s (fixed intervals look robotic). Cap 20–30 messages per session on a new account. This is confirmed GitHub Issue #2228 behavior — account bans are permanent.

2. **Google Cloud billing explosion from unrestricted field masks** — Set a $10 billing alert and a daily quota cap in Google Cloud Console BEFORE writing the first line of search code. Use `FieldMask` on every request: `id,displayName,websiteUri,nationalPhoneNumber,rating,formattedAddress`. Include `websiteUri` in the Text Search request to avoid a separate Place Details call for each result.

3. **Brazilian phone number format mismatch** — Google Places returns numbers in inconsistent formats (`+55 (11) 98765-4321`). Evolution API requires `5511987654321` (no `+`, no spaces, no punctuation). Use `libphonenumber-js` to normalize. Write unit tests covering at least 10 format variants before any live send.

4. **Instagram filter false positives/negatives** — `instagram.com/businessname` (no protocol) will throw `TypeError: Invalid URL` in `new URL()`. Always add `https://` before parsing. Also handle `linktr.ee`, `beacons.ai`, and other bio-link services as equivalent to no-website. Log every filter decision.

5. **Zoho Workspace suspension for cold outreach** — Use a dedicated alias or subdomain (`contato@outreach.domain.com.br`), not the primary business email. Verify SPF/DKIM/DMARC pass before first send. Cap at 30–50 emails/day initially. Consider Zoho ZeptoMail if volume grows beyond 50/day.

6. **`nextPageToken` timing (Places API)** — Must `await sleep(2500)` after receiving a `nextPageToken` before using it. Requesting immediately returns `INVALID_REQUEST`. Teams consistently misread this as "only 20 results exist" and miss 67% of leads.

7. **Deduplication by name instead of `place_id`** — Business names are not unique. The same business can appear under different names across searches. Use `place_id` as primary key; normalized E.164 phone number as secondary key.

---

## Implications for Roadmap

Based on the combined research, the pipeline's hard dependencies dictate phase order. Each phase depends on the previous one producing verified output before the next can be tested. The pitfall research reinforces this order: billing guard rails and phone normalization must be built early, before their dependent phases.

### Phase 1: Foundation and Google Places Search

**Rationale:** The entire product depends on Places data. Nothing can be built or tested without a working search. Billing guard rails must be set up before any live API calls are made (Pitfall 4). This phase has the most external setup dependency (Google Cloud project, billing alerts, quota cap).

**Delivers:** Working `fetch` stage returning `PlacesResult[]` for a given city + category, with pagination (up to 60 results) and field-masked requests to control billing.

**Addresses:** Google Places search (P1), pagination via `next_page_token` (P2 — worth including here to avoid architectural rework)

**Must set up first:** Google Cloud billing alert at $10, daily quota cap, API key restricted by HTTP referrer or IP

**Avoids:** Pitfall 3 (pagination timing — add 2.5s sleep between pages), Pitfall 4 (billing — field masks and quota cap before first call)

**Research flag:** Standard patterns. No deeper research needed; official docs and SDK are well-documented.

---

### Phase 2: Business Filter and Phone Normalization

**Rationale:** The filter is the core value proposition of the tool. It must be verified with real API data before any sending infrastructure is built. Phone normalization is a precondition for WhatsApp integration — it must exist and be unit-tested before Phase 4. Both are pure logic modules with no external dependencies, making them fast to build and test.

**Delivers:** `filter.js` (website absence + Instagram/bio-link detection) and phone normalization utility (Brazilian E.164 format, 10+ variant coverage)

**Addresses:** "No website" filter (P1), Instagram URL detection edge cases

**Must unit test:** At least 5 Instagram URL format variants (with/without protocol, trailing slash), 3 bio-link service domains, 10 Brazilian phone number format variants

**Avoids:** Pitfall 5 (dedup by name — this phase defines the `Prospect` data shape with `place_id`), Pitfall 6 (phone format — normalization exists before sender is built), Pitfall 7 (Instagram filter TypeErrors)

**Research flag:** Standard patterns. URL parsing and phone normalization are well-documented. `libphonenumber-js` has comprehensive docs.

---

### Phase 3: Contact History and Deduplication

**Rationale:** Deduplication must be verified with real data from Phase 1 before the sender is built. If history is implemented incorrectly (wrong key, file corruption on crash), the fix is expensive post-send. This phase is also where the persistence contract is locked in — all subsequent phases depend on it.

**Delivers:** `history.js` + `dedup.js` — loads history into memory Set at startup, gates sends on `place_id` presence, appends immediately after confirmed send, survives mid-run crash without corruption

**Addresses:** Deduplication (P1), crash safety, per-run resume

**Must verify:** Same city+category search run twice produces zero duplicate send attempts on second run; Ctrl+C mid-run does not corrupt history file

**Avoids:** Pitfall 5 (name-based dedup — this phase enforces `place_id` key), performance trap (load history into Set once at startup, not on every send)

**Research flag:** Standard patterns. `lowdb` and flat-file JSON persistence are straightforward.

---

### Phase 4: Message Template Rendering

**Rationale:** Template rendering is a pure function with no external dependencies. It can be built quickly and is a prerequisite for sender testing. This is also when the sales team reviews and approves the outreach message — content validation before any live send.

**Delivers:** `templates/outreach.txt` with `{{nome}}`, `{{rating}}`, `{{categoria}}`, `{{cidade}}` variables, and `template.js` substitution stage

**Addresses:** Variable substitution (P1), configurable template path (P2 — trivial to add here)

**Avoids:** Anti-pattern of using a single template for both WhatsApp (plain text + emojis) and email (plain text OK for v1, HTML for v2) — at minimum, note the distinction in comments

**Research flag:** Standard patterns. No research needed.

---

### Phase 5: WhatsApp Send via Evolution API

**Rationale:** WhatsApp is the primary channel and the highest-risk integration. It depends on all previous phases being correct (clean data, normalized phones, deduplication working). The send loop must enforce random delays and per-session caps as non-negotiable features — not added later. Evolution API instance health check at startup is a hard requirement.

**Delivers:** `services/whatsapp.js` + `sender.js` (WhatsApp path) — sends to normalized phone numbers with random 5–15s delay, per-session cap of 20–30 messages, handles `failed` result without aborting run, checks instance connection status at startup

**Addresses:** WhatsApp send (P1), send delay/throttle (P1 — account health is non-negotiable)

**Must verify before going live:** Evolution API instance is connected; 5-number test run confirms no `/chat/whatsappNumbers` bulk calls; per-send delay is random, not fixed

**Avoids:** Pitfall 1 (bulk number validation — never call the check endpoint), Pitfall 2 (high-volume ban — random delay and session cap enforced), Anti-Pattern 4 (single failure must not abort run)

**Research flag:** Needs careful testing. Evolution API uses unofficial protocol; account ban behavior is confirmed but nuanced. Test with small batches and monitor Evolution API logs.

---

### Phase 6: Email Send via Zoho SMTP

**Rationale:** Email is the secondary channel and optional per contact. It shares the sender stage with WhatsApp but is lower risk and lower volume. Domain authentication (SPF/DKIM/DMARC) must be verified before first live send. Using a dedicated outreach alias rather than the primary business email is mandatory.

**Delivers:** `services/email.js` — Zoho SMTP via `nodemailer`, port 465 (SSL), app password auth, graceful skip when email is absent, `From` header matches authenticated account

**Addresses:** Email send (P1), graceful skip when email absent (P1)

**Must verify before going live:** SPF and DKIM pass on `mail-tester.com`, `From` header matches authenticated account, sending alias is isolated from primary business email, rate cap of 30–50/day

**Avoids:** Pitfall 8 (Zoho suspension — dedicated alias, SPF/DKIM configured, rate capped)

**Research flag:** Standard patterns. Zoho SMTP + nodemailer is well-documented. The risk is operational (SPF/DKIM setup), not implementation.

---

### Phase 7: CLI Entry Point, Orchestrator Wiring, and Operator UX

**Rationale:** This is the integration phase where all stages are wired together. It comes last because each stage must be individually verified before the orchestrator can be trusted. This phase also delivers all operator-facing UX: terminal output formatting, run summary, error messaging.

**Delivers:** `bin/prospect.js` (Commander.js CLI with `--city`, `--category`, `--dry-run`, `--delay`), `src/orchestrator.js` (linear pipeline), `src/logger.js` (chalk-formatted per-prospect output with explicit skip reasons), run summary at exit

**Addresses:** Clear terminal output (P1), graceful error handling (P1), dry-run mode (P2), run summary (P2)

**Avoids:** UX Pitfall: silent skips — every skip must log its reason (`[SKIP already-contacted]`, `[SKIP has-website]`, `[SKIP no-phone]`); UX Pitfall: crash mid-run losing progress — history writes per-send, not at end

**Research flag:** Standard patterns. Commander.js and chalk are well-documented.

---

### Phase Ordering Rationale

- **Data before logic:** Phases 1–2 establish the data source and core filter before any stateful or side-effectful work begins.
- **Safety before sends:** Phase 3 (dedup) and the billing guard rails in Phase 1 exist specifically to prevent the most expensive failure modes — duplicate sends and billing overruns.
- **Phone normalization before WhatsApp:** Phase 2 builds and tests phone normalization so it is a verified dependency when Phase 5 needs it. Building normalization inside Phase 5 would delay finding format bugs until live sends.
- **Primary channel before secondary:** Phase 5 (WhatsApp) before Phase 6 (email) because WhatsApp is the core value, email is optional, and the sender stage architecture is validated on WhatsApp before email is added.
- **Stages before orchestrator:** Individual stages are testable in isolation. The orchestrator (Phase 7) only exists after all stages are verified, preventing the orchestrator from masking stage-level bugs.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 5 (WhatsApp/Evolution API):** Evolution API uses the unofficial WhatsApp Web protocol (Baileys). Account ban behavior is sensitive to message volume, send cadence, and recipient report rate. Test with 5 numbers first; review Evolution API issue tracker for current ban thresholds before scaling.
- **Phase 6 (Zoho SMTP):** Zoho's cold outreach policies and suspension thresholds are not publicly documented precisely. Test with `mail-tester.com` deliverability scoring before any live campaign send.

Phases with standard patterns (skip deeper research):
- **Phase 1** (Google Places): Official SDK and docs are thorough. Billing setup is procedural.
- **Phase 2** (filter + phone normalization): URL parsing and `libphonenumber-js` are well-documented.
- **Phase 3** (deduplication): `lowdb` flat-file pattern is straightforward.
- **Phase 4** (template rendering): Pure string substitution; no research needed.
- **Phase 7** (CLI wiring): Commander.js and chalk have comprehensive documentation.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified via `npm view` on 2026-03-28; all official docs checked |
| Features | HIGH | Core features derived from stated project requirements; anti-features from ecosystem patterns |
| Architecture | HIGH | Pipes and Filters is a verified pattern for this scale; component boundaries derived from hard dependencies |
| Pitfalls | HIGH | Critical pitfalls verified via Evolution API GitHub issues (#2228, #2298), Google issue tracker, and official billing docs |

**Overall confidence:** HIGH

### Gaps to Address

- **`libphonenumber-js` not in original STACK.md:** Identified as critical in PITFALLS.md for Brazilian phone normalization. Must be added to `package.json` dependencies. All other stack choices are complete.
- **Evolution API version lock:** PITFALLS.md references v2 endpoint (`/message/sendText/{instance}`); ARCHITECTURE.md references v1 docs. Verify the team's self-hosted Evolution API version before starting Phase 5 — the endpoint path differs between v1 and v2.
- **Zoho account isolation:** PITFALLS.md strongly recommends using a dedicated outreach email alias, not the primary business email. This is an operational decision the team must make before Phase 6 begins. If using a new subdomain, DNS propagation can take up to 48 hours.
- **Brazilian legacy 8-digit mobile numbers:** `libphonenumber-js` may not auto-correct 8-digit local numbers that predate Brazil's 2012 9th-digit mandate. A manual prepend-`9` fallback may be needed. Flag this for unit testing in Phase 2.

---

## Sources

### Primary (HIGH confidence)
- https://www.npmjs.com/package/@googlemaps/places — version 2.4.0 confirmed via `npm view`
- https://developers.google.com/maps/documentation/places/web-service/overview — Places API (New) current; legacy cannot be enabled on new projects
- https://developers.google.com/maps/documentation/places/web-service/usage-and-billing — 2025 pricing tiers
- https://developers.google.com/maps/documentation/places/web-service/text-search — field masks, pagination
- https://github.com/EvolutionAPI/evolution-api/issues/2228 — bulk number check ban confirmed
- https://github.com/EvolutionAPI/evolution-api/issues/2298 — temporary restriction pattern confirmed
- https://nodemailer.com/ — v8.0.4 + Zoho SMTP port 465 verified
- https://github.com/typicode/lowdb — v7.0.1 ESM-only confirmed
- https://www.npmjs.com/package/libphonenumber-js — Brazilian phone normalization

### Secondary (MEDIUM confidence)
- https://doc.evolution-api.com/v2/api-reference/message-controller/send-text — Evolution API v2 REST endpoint (no version lock confirmed)
- https://wasenderapi.com/blog/whatsapp-api-rate-limits-explained-how-to-scale-messaging-safely-in-2025 — WA rate limit guidance
- https://www.zoho.com/mail/help/adminconsole/rates-and-limits.html — Zoho sending limits
- https://community.n8n.io/t/whatsapp-numbers-in-brazil-help-me-fix-using-javascript-please/20996 — Brazilian number formatting
- https://issuetracker.google.com/issues/343942714 — Places API `nextPageToken` timing

### Tertiary (MEDIUM confidence, pattern-based)
- https://dev.to/wallacefreitas/the-pipeline-pattern-streamlining-data-processing-in-software-architecture-44hn — Pipes and Filters pattern reference
- https://medium.com/@sohail_saifi/command-line-argument-parsing-yargs-vs-commander-and-why-you-should-care-e9c8dac1fcc5 — Commander vs Yargs comparison (single source, corroborated by download stats)

---
*Research completed: 2026-03-28*
*Ready for roadmap: yes*
