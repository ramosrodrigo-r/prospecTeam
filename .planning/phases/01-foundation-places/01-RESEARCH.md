# Phase 1: Project Foundation + Google Places Search - Research

**Researched:** 2026-03-28
**Domain:** Node.js ESM project scaffold + Google Places API v1 Text Search
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Use the **New Places API (v1)** via Text Search — field names (`displayName`, `nationalPhoneNumber`, `websiteUri`) confirm this
- **D-02:** Requests via native Node.js `fetch` (no client library) — pure ESM, no extra dependency
- **D-03:** FieldMask restricted to `places.id,places.displayName,places.websiteUri,places.nationalPhoneNumber,places.rating` in `X-Goog-FieldMask` header
- **D-04:** Endpoint: `POST https://places.googleapis.com/v1/places:searchText` with body `{ textQuery: "{categoria} em {cidade}" }`
- **D-05:** Paginate via `nextPageToken` with 2.5s sleep between pages — implemented in `stages/fetch.js`
- **D-06:** Return accumulated array of all results across pages
- **D-07:** `GOOGLE_PLACES_API_KEY` read from `.env` via `dotenv` — if absent or empty, `process.exit(1)` with clear message before any API call
- **D-08:** Billing guard is env-only check — `$10` alert and quota cap in Google Cloud Console are operational prerequisites documented in README, not code
- **D-09:** Output: `console.log(JSON.stringify(results, null, 2))` — raw JSON to stdout; chalk formatting is Phase 7
- **D-10:** Structured prospect data: `{ placeId, name, rating, phone, website, email: null }` — `email` always null in this phase
- **D-11:** `process.argv` direct parsing with minimal extraction of `--city` and `--category` — no Commander.js (Phase 7)
- **D-12:** Missing args cause `process.exit(1)` with usage example
- **D-13:** `DEBUG=1` env var enables `console.error` of headers and body for each request — no extra flag, no dependency

### Claude's Discretion

- Exact `package.json` structure (scripts, engines field)
- Rate limit / 429 handling from Places API (simple retry or fail-fast)
- Query field name in body (`textQuery` already specified in D-04)

### Deferred Ideas (OUT OF SCOPE)

- None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SRCH-01 | User searches businesses on Google Places via `--city` and `--category` CLI args | D-04 defines endpoint + query format; D-11 defines arg parsing; pagination (D-05/D-06) returns up to 60 results |
| SRCH-03 | Bot extracts name, rating, phone, and email from each result | D-03 FieldMask includes `displayName`, `nationalPhoneNumber`, `rating`, `websiteUri`; `email` always null in Phase 1 per D-10 |
</phase_requirements>

---

## Summary

Phase 1 builds the project from scratch: ESM scaffold, environment loading, and a working Places API v1 Text Search implementation that paginates correctly. All decisions are locked — the research below validates them and surfaces the critical implementation details the planner needs to write accurate tasks.

The biggest surprises found during research: (1) `displayName` is an object `{ text, languageCode }`, not a plain string — `place.displayName.text` must be used to extract the business name; (2) `nextPageToken` must be **explicitly included in the `X-Goog-FieldMask` header** or it will not appear in the response, silently breaking pagination; (3) requesting `nationalPhoneNumber`, `websiteUri`, and `rating` together triggers the **Enterprise SKU** (highest billing tier) — this is expected and budgeted for, but must be documented in README.

The `fetch` API is stable since Node.js v21 (October 2023). The dev machine runs Node.js v24. The `engines` field in `package.json` should require `>=21` to guarantee stable fetch.

**Primary recommendation:** Follow all locked decisions exactly. The critical task ordering is: scaffold project → load dotenv → validate API key → call Places API with correct FieldMask (including `nextPageToken`) → extract `place.displayName.text` → paginate with 2.5s sleep.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| dotenv | 17.3.1 | Load `.env` into `process.env` at startup | Industry-standard; native ESM support via `import 'dotenv/config'` |

No other dependencies. Native Node.js `fetch` handles HTTP. `process.argv` handles CLI args.

### Supporting

None for this phase. Commander.js is deferred to Phase 7 (D-11).

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native `fetch` | `axios`, `got`, `node-fetch` | Native fetch is stable since Node.js v21 and requires zero dependencies — correct choice per D-02 |
| `dotenv` (import side-effect) | `--env-file` flag (Node 20.6+) | `--env-file` removes the dependency but requires Node >=20.6; dotenv is universal and well-understood |

**Installation:**
```bash
npm install dotenv
```

**Version verification:** Confirmed via `npm view dotenv version` on 2026-03-28: `17.3.1`.

---

## Architecture Patterns

### Recommended Project Structure

```
prospecTeam/
├── bin/
│   └── prospect.js        # Entry point — arg parsing, env validation, orchestration call
├── services/
│   └── places.js          # Encapsulates single Places API HTTP call (one page)
├── stages/
│   └── fetch.js           # Orchestrates pagination loop, returns accumulated array
├── .env                   # GOOGLE_PLACES_API_KEY (never committed)
├── .env.example           # Template with placeholder values (committed)
├── .gitignore             # Blocks .env
└── package.json           # "type": "module", engines: ">=21"
```

### Pattern 1: ESM Package Setup

**What:** `package.json` with `"type": "module"` enables ES module syntax across all files.
**When to use:** Required from day one — all subsequent phases build on this.
**Example:**
```json
{
  "name": "prospecTeam",
  "version": "0.1.0",
  "type": "module",
  "engines": { "node": ">=21" },
  "scripts": {
    "start": "node bin/prospect.js"
  },
  "dependencies": {
    "dotenv": "^17.3.1"
  }
}
```

Note: `"engines"` requires `>=21` because native `fetch` is only stable (unflagged and production-ready) from Node.js v21. The dev machine runs v24.

### Pattern 2: dotenv in ESM — Side-Effect Import

**What:** `import 'dotenv/config'` as the very first import in `bin/prospect.js` loads `.env` before any other module executes.
**When to use:** Always — in ESM, all `import` statements are hoisted and resolved before any module body runs. The side-effect import ensures `process.env` is populated before any module that reads it is initialized.
**Example:**
```javascript
// bin/prospect.js — FIRST LINE must be dotenv
import 'dotenv/config'
import { fetchProspects } from '../stages/fetch.js'

const apiKey = process.env.GOOGLE_PLACES_API_KEY
if (!apiKey) {
  console.error('Error: GOOGLE_PLACES_API_KEY is missing or empty in .env')
  process.exit(1)
}
```

**Critical gotcha:** `import dotenv from 'dotenv'; dotenv.config()` does NOT work reliably in ESM because the `dotenv.config()` call runs after all imports have been resolved. Other modules imported after the dotenv import line will already have been initialized with an empty `process.env`. Use `import 'dotenv/config'` only.

### Pattern 3: Places API v1 Text Search — Single Page Request

**What:** POST to `places:searchText` with `X-Goog-Api-Key` header and `X-Goog-FieldMask` header.
**When to use:** Called once per page from `stages/fetch.js`.
**Example:**
```javascript
// services/places.js
export async function searchPlaces({ query, pageToken = null, apiKey }) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': apiKey,
    'X-Goog-FieldMask': 'places.id,places.displayName,places.websiteUri,places.nationalPhoneNumber,places.rating,nextPageToken'
  }

  if (process.env.DEBUG === '1') {
    console.error('[DEBUG] Request headers:', JSON.stringify(headers, null, 2))
    console.error('[DEBUG] Request body:', JSON.stringify({ textQuery: query, pageSize: 20, ...(pageToken && { pageToken }) }, null, 2))
  }

  const body = { textQuery: query, pageSize: 20 }
  if (pageToken) body.pageToken = pageToken

  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Places API error ${response.status}: ${err}`)
  }

  return response.json()
}
```

### Pattern 4: Pagination Loop with 2.5s Sleep

**What:** Loop calling `searchPlaces` until no `nextPageToken`, sleeping 2.5s between requests.
**When to use:** In `stages/fetch.js` — wraps `services/places.js`.
**Example:**
```javascript
// stages/fetch.js
import { searchPlaces } from '../services/places.js'

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

export async function fetchProspects({ city, category, apiKey }) {
  const query = `${category} em ${city}`
  const results = []
  let pageToken = null

  do {
    if (pageToken) await sleep(2500)   // required delay before using nextPageToken

    const data = await searchPlaces({ query, pageToken, apiKey })

    for (const place of (data.places ?? [])) {
      results.push({
        placeId: place.id,
        name: place.displayName?.text ?? null,   // displayName is an object, not a string
        rating: place.rating ?? null,
        phone: place.nationalPhoneNumber ?? null,
        website: place.websiteUri ?? null,
        email: null   // always null in Phase 1
      })
    }

    pageToken = data.nextPageToken ?? null
  } while (pageToken)

  return results
}
```

### Pattern 5: CLI Arg Parsing (minimal, no Commander.js)

**What:** Extract `--city` and `--category` from `process.argv`.
**When to use:** In `bin/prospect.js` entry point.
**Example:**
```javascript
// bin/prospect.js
function parseArgs(argv) {
  const args = {}
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--city' && argv[i + 1]) args.city = argv[++i]
    if (argv[i] === '--category' && argv[i + 1]) args.category = argv[++i]
  }
  return args
}

const { city, category } = parseArgs(process.argv)
if (!city || !category) {
  console.error('Usage: node bin/prospect.js --city "Sao Paulo" --category "restaurante"')
  process.exit(1)
}
```

### Anti-Patterns to Avoid

- **Using `dotenv.config()` after other imports in ESM:** Other modules will have already been initialized with empty `process.env`. Always use `import 'dotenv/config'` as the first import.
- **Omitting `nextPageToken` from FieldMask:** The `nextPageToken` field is not returned unless explicitly included in `X-Goog-FieldMask`. Omitting it silently breaks pagination — requests after page 1 are never made.
- **Accessing `place.displayName` as a string:** `displayName` is `{ text: "...", languageCode: "..." }`. Always use `place.displayName?.text`.
- **Using `fetch` without `"engines": ">=21"` guard:** Fetch is experimental in Node.js 18-20. Declaring the engines field prevents accidental use on older runtimes.
- **Skipping `X-Goog-FieldMask` header entirely:** The Places API v1 returns an error (not an empty response) if FieldMask is omitted. There is no default field list.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Loading `.env` into `process.env` | Custom file parser | `dotenv` 17.3.1 | Handles quotes, multiline values, comment stripping, override logic; one import line |
| HTTP client for POST JSON | Custom `http.request` wrapper | Native `fetch` (Node.js built-in) | Stable since v21; no dependency; Promise-based; handles JSON natively |

**Key insight:** This phase is intentionally minimal. The only external dependency is `dotenv`. Everything else — HTTP, arg parsing, JSON output — uses Node.js built-ins.

---

## Common Pitfalls

### Pitfall 1: `nextPageToken` Missing from FieldMask

**What goes wrong:** The Places API does not return `nextPageToken` in the response unless it is explicitly listed in `X-Goog-FieldMask`. The loop terminates after the first page because `data.nextPageToken` is always `undefined`. The bug is silent — no error is thrown, just fewer results.
**Why it happens:** The Places API v1 treats ALL response fields as opt-in via FieldMask, including pagination tokens. This is a known gotcha reported in the Google Maps SDK issue tracker (issue #5385) and confirmed by official documentation patterns.
**How to avoid:** The FieldMask string MUST be: `places.id,places.displayName,places.websiteUri,places.nationalPhoneNumber,places.rating,nextPageToken` — note `nextPageToken` is at the top level (not prefixed with `places.`).
**Warning signs:** Total results count is always ≤20 even for broad queries like "restaurante em São Paulo".

### Pitfall 2: `displayName` is an Object, Not a String

**What goes wrong:** `place.displayName` evaluates to `{ text: "Padaria Central", languageCode: "pt" }`. Code that uses it as a string gets `[object Object]` in output.
**Why it happens:** Places API v1 returns localized strings as `LocalizedText` objects consistently across all text fields. Old Places API (v2/legacy) returned plain strings.
**How to avoid:** Always use `place.displayName?.text` when extracting the business name.
**Warning signs:** Business names in output show `[object Object]`.

### Pitfall 3: dotenv.config() Runs After Module Imports in ESM

**What goes wrong:** `import dotenv from 'dotenv'; dotenv.config()` followed by other imports — those other modules see empty `process.env` because ESM resolves all imports before executing any module body.
**Why it happens:** ESM import resolution is a depth-first synchronous operation. The `dotenv.config()` call in the module body runs after all imports have already been initialized.
**How to avoid:** Use `import 'dotenv/config'` as the first line of `bin/prospect.js`. This is the official dotenv ESM recommendation.
**Warning signs:** `process.env.GOOGLE_PLACES_API_KEY` is `undefined` even though `.env` file exists and contains the key.

### Pitfall 4: Billing SKU — Requesting Contact Fields Escalates to Enterprise

**What goes wrong:** Requesting `nationalPhoneNumber`, `websiteUri`, or `rating` via FieldMask triggers the **Places Text Search Enterprise SKU**, the highest billing tier. Unexpected costs if billing alerts are not configured before testing.
**Why it happens:** The Places API v1 bills at the highest SKU applicable to any field in the mask: `id` alone = Essentials; `displayName` = Pro; `nationalPhoneNumber` / `websiteUri` / `rating` = Enterprise.
**How to avoid:** Configure the Google Cloud Console billing alert ($10) and daily quota cap before any live API call (documented in README per D-08). The field mask in D-03 is correct and intentional — these fields are required. The billing risk is operational, not a code issue.
**Warning signs:** Unexpected charges without prior billing alert configuration.

### Pitfall 5: `pageSize` Maximum is 20

**What goes wrong:** Setting `pageSize: 60` hoping to get all results in one call. The API silently caps this at 20. To get up to 60 results, three pages must be fetched (20 + 20 + 20 = 60 maximum total).
**Why it happens:** The Places API v1 `pageSize` parameter accepts values 1–20 only; values above 20 are set to 20 by the API.
**How to avoid:** Set `pageSize: 20` (explicit is better than default) and always paginate via `nextPageToken`.
**Warning signs:** Assuming 60 results returned from a single request.

---

## Code Examples

Verified patterns from official Google Places API documentation and dotenv README.

### Full FieldMask Header Value (includes nextPageToken)
```
X-Goog-FieldMask: places.id,places.displayName,places.websiteUri,places.nationalPhoneNumber,places.rating,nextPageToken
```

### Complete Text Search Request (curl reference)
```bash
# Source: https://developers.google.com/maps/documentation/places/web-service/text-search
curl -X POST \
  -H 'Content-Type: application/json' \
  -H "X-Goog-Api-Key: $GOOGLE_PLACES_API_KEY" \
  -H 'X-Goog-FieldMask: places.id,places.displayName,places.nationalPhoneNumber,places.websiteUri,places.rating,nextPageToken' \
  -d '{"textQuery": "restaurante em São Paulo", "pageSize": 20}' \
  'https://places.googleapis.com/v1/places:searchText'
```

### Pagination Request (with pageToken)
```bash
curl -X POST \
  -H 'Content-Type: application/json' \
  -H "X-Goog-Api-Key: $GOOGLE_PLACES_API_KEY" \
  -H 'X-Goog-FieldMask: places.id,places.displayName,places.nationalPhoneNumber,places.websiteUri,places.rating,nextPageToken' \
  -d '{"textQuery": "restaurante em São Paulo", "pageSize": 20, "pageToken": "TOKEN_FROM_PREV_RESPONSE"}' \
  'https://places.googleapis.com/v1/places:searchText'
```

### Expected Response Shape
```json
{
  "places": [
    {
      "id": "ChIJs5ydyTiuEmsR0fRSlU0C7k0",
      "displayName": {
        "text": "Padaria Central",
        "languageCode": "pt"
      },
      "nationalPhoneNumber": "(11) 98765-4321",
      "websiteUri": "https://padariacentral.com.br",
      "rating": 4.2
    }
  ],
  "nextPageToken": "AeCrKXsZWzNVbP..."
}
```

### Mapping API Response to Prospect Struct
```javascript
// Source: derived from official response schema + D-10 decisions
{
  placeId: place.id,
  name: place.displayName?.text ?? null,   // LocalizedText object, not string
  rating: place.rating ?? null,
  phone: place.nationalPhoneNumber ?? null,
  website: place.websiteUri ?? null,
  email: null   // Places API rarely returns email; always null in Phase 1
}
```

### .env File Structure
```
# .env (never committed)
GOOGLE_PLACES_API_KEY=your_key_here
```

### .gitignore Minimum Entries
```
.env
node_modules/
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Places API legacy (next_page_token in query param) | Places API v1 (pageToken in request body) | 2022 (v1 GA) | Different parameter names and locations |
| `node-fetch` npm package for HTTP | Native `fetch` built-in | Node.js v21 stable (Oct 2023) | No extra dependency needed for HTTP |
| `displayName` as plain string (legacy API) | `displayName` as `{ text, languageCode }` object | v1 API | Must use `.displayName.text` not `.displayName` |
| FieldMask optional | FieldMask required (error if omitted) | v1 API | Every request must include `X-Goog-FieldMask` header |

**Deprecated/outdated:**
- `next_page_token` (snake_case): Legacy Places API; v1 uses `nextPageToken` (camelCase) in response AND `pageToken` in request body
- `require('dotenv').config()`: Works only in CJS; ESM projects must use `import 'dotenv/config'`

---

## Open Questions

1. **Rate limit behavior on 429 responses**
   - What we know: The Places API returns 429 or 403 when quotas are exceeded; specific per-minute/per-day quota numbers are project-configured in Cloud Console and not documented universally
   - What's unclear: Whether the 2.5s inter-page sleep (D-05) is sufficient to avoid rate limiting, or whether a simple retry with backoff is needed
   - Recommendation: Implement fail-fast on non-200 responses (throw error with status code) in Phase 1 per Claude's discretion. The 2.5s sleep is between pagination pages (to respect `nextPageToken` processing time), not a rate-limit mitigation. If 429s appear during testing, log the error and stop the run — retry logic is deferred.

2. **Whether the 2.5s delay before nextPageToken is still required**
   - What we know: The legacy Places API required a 2s delay before using `next_page_token`. The decision D-05 specifies 2.5s for the v1 API.
   - What's unclear: The v1 API documentation does not explicitly state a required delay — the token may be usable immediately.
   - Recommendation: Keep the 2.5s sleep as specified in D-05. It is a conservative safe default and matches the legacy behavior. The risk of removing it (immediate token expiry or empty response) outweighs the speed gain.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in `node:test` (no install required) + `node:assert` |
| Config file | none — run directly |
| Quick run command | `node --test tests/unit/*.test.js` |
| Full suite command | `node --test tests/**/*.test.js` |

Note: No test framework is currently installed. Phase 1 is greenfield. `node:test` is the zero-dependency choice consistent with the project's philosophy of minimal dependencies (native fetch, native arg parsing). It is available in Node.js v18+ and stable in v20+.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SRCH-01 | `--city` and `--category` args parsed correctly from `process.argv` | unit | `node --test tests/unit/args.test.js` | Wave 0 |
| SRCH-01 | Missing `--city` or `--category` exits with code 1 | unit | `node --test tests/unit/args.test.js` | Wave 0 |
| SRCH-01 | `fetchProspects` calls `searchPlaces` with correct `textQuery` format `"{category} em {city}"` | unit | `node --test tests/unit/fetch.test.js` | Wave 0 |
| SRCH-01 | Pagination loop calls `searchPlaces` again when `nextPageToken` present | unit | `node --test tests/unit/fetch.test.js` | Wave 0 |
| SRCH-01 | Pagination loop stops when no `nextPageToken` in response | unit | `node --test tests/unit/fetch.test.js` | Wave 0 |
| SRCH-03 | Response fields mapped to `{ placeId, name, rating, phone, website, email: null }` | unit | `node --test tests/unit/fetch.test.js` | Wave 0 |
| SRCH-03 | `displayName.text` extracted correctly (not the object itself) | unit | `node --test tests/unit/fetch.test.js` | Wave 0 |
| D-07 | Missing `GOOGLE_PLACES_API_KEY` causes `process.exit(1)` | unit | `node --test tests/unit/env.test.js` | Wave 0 |
| D-03 | `X-Goog-FieldMask` header contains all required fields including `nextPageToken` | unit | `node --test tests/unit/places.test.js` | Wave 0 |
| D-13 | `DEBUG=1` logs headers and body to stderr | unit | `node --test tests/unit/places.test.js` | Wave 0 |

All tests are unit-level with mocked `fetch`. No live API calls in test suite.

### Sampling Rate

- **Per task commit:** `node --test tests/unit/*.test.js`
- **Per wave merge:** `node --test tests/unit/*.test.js`
- **Phase gate:** Full unit suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/unit/args.test.js` — covers SRCH-01 arg parsing and exit behavior
- [ ] `tests/unit/env.test.js` — covers D-07 env validation
- [ ] `tests/unit/fetch.test.js` — covers SRCH-01 pagination, SRCH-03 field mapping
- [ ] `tests/unit/places.test.js` — covers D-03 FieldMask, D-13 debug logging

Framework install: none required (`node:test` is built-in).

---

## Sources

### Primary (HIGH confidence)

- [Google Places API — Text Search (New)](https://developers.google.com/maps/documentation/places/web-service/text-search) — endpoint, request body, response structure, pagination, pageSize limits
- [Google Places API — Choose Fields](https://developers.google.com/maps/documentation/places/web-service/choose-fields) — FieldMask syntax, required header, wildcard warning
- [Google Places API — Place Data Fields (New)](https://developers.google.com/maps/documentation/places/web-service/data-fields) — SKU tier per field (id=Essentials, displayName=Pro, rating/nationalPhoneNumber/websiteUri=Enterprise)
- [Google Places API — Method: places.searchText](https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places/searchText) — pageToken in request body, pageSize max 20, nextPageToken in response
- [dotenv GitHub README](https://github.com/motdotla/dotenv) — ESM import pattern, ordering gotcha, `import 'dotenv/config'` as canonical ESM approach
- `npm view dotenv version` — confirmed version 17.3.1 on 2026-03-28

### Secondary (MEDIUM confidence)

- [Node.js 21 release — stable fetch](https://devclass.com/2023/10/17/node-js-21-released-with-stable-fetch-api-node-js-20-becomes-long-term-support-release/) — confirms fetch stable (not experimental) from v21 onward
- [Google Issue Tracker #5385](https://github.com/googleapis/google-cloud-node/issues/5385) — confirms `nextPageToken` missing from response when not included in FieldMask (verified against official curl examples)

### Tertiary (LOW confidence)

- [The Fetch API is finally stable in Node.js — LogRocket](https://blog.logrocket.com/fetch-api-node-js/) — timeline summary for fetch experimental → stable progression

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — dotenv version confirmed live via npm registry; native fetch confirmed stable from Node.js v21
- Architecture: HIGH — all patterns derived from official Google Places API documentation and dotenv official README
- Pitfalls: HIGH — `nextPageToken` FieldMask requirement verified against GitHub issue tracker AND official curl examples; `displayName` object structure verified from official response example

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (stable APIs — 30 days)
