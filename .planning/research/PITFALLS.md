# Pitfalls Research

**Domain:** Node.js outreach automation — Google Places scraping + WhatsApp (Evolution API) + Email (Zoho Workspace)
**Researched:** 2026-03-28
**Confidence:** HIGH (all critical pitfalls verified with official sources or GitHub issue trackers)

---

## Critical Pitfalls

### Pitfall 1: WhatsApp Account Ban from Bulk Number Checking

**What goes wrong:**
Using Evolution API's `/chat/whatsappNumbers/{instance}` endpoint to validate many phone numbers in rapid succession triggers WhatsApp's fraud detection and results in the account being temporarily or permanently banned — with no warning from the API before the ban hits.

**Why it happens:**
Evolution API runs on the unofficial WhatsApp Web protocol (Baileys). The number-check endpoint has no built-in rate limiting. When a bot fires dozens of validation requests back-to-back, WhatsApp detects non-human behavior and bans the number. This was formally reported as Issue #2228 and confirmed as a critical design gap.

**How to avoid:**
- Do NOT bulk-validate numbers before sending. Instead, attempt the send and handle failure gracefully.
- If you must validate first, add a minimum 3–5 second random delay between each check, and cap checks per session to under 20.
- Structure the flow as: "try send → catch failure → mark as invalid" rather than "validate all → send to valid."
- Keep a local cache of confirmed WhatsApp numbers so the same number is never checked twice.

**Warning signs:**
- The WhatsApp QR code disconnects within 1–2 days of starting use.
- Sending succeeds for the first batch then silently fails for all subsequent ones.
- Evolution API logs show `connection.update` state going to `close` without explicit disconnect.

**Phase to address:**
WhatsApp send implementation phase — the send loop must never make bulk number-check calls.

---

### Pitfall 2: WhatsApp Account Ban from High-Volume Cold Outreach

**What goes wrong:**
Sending cold unsolicited messages to a large volume of recipients using an unofficial WhatsApp channel causes the phone number to be reported as spam by recipients, which triggers WhatsApp's automated ban system. Even a handful of "Report Spam" taps can permanently ban the sending number.

**Why it happens:**
Businesses receiving cold WhatsApp messages from unknown numbers will report them. WhatsApp's anti-spam system uses block/report ratio as its primary signal. Evolution API uses the unofficial protocol, making the account more vulnerable than official Business API accounts since it lacks Meta's graduated quality rating system.

**How to avoid:**
- Send in small batches (recommended: 20–30 messages per session maximum for a new account).
- Space messages with a random delay of 5–15 seconds between each send, not a fixed interval (fixed intervals look robotic).
- Do not send more than 50–100 messages per day from a single number until the account has established history.
- The message template must clearly state who is contacting the business and why — context reduces report rate.
- Include an easy opt-out instruction in the message body (e.g., "Responda PARA para não receber mais mensagens").

**Warning signs:**
- Recipients start reporting the number (you won't see this directly, but sending speed drops).
- Account gets a 24-hour temporary restriction (Issue #2298 pattern).
- WhatsApp shows "too many messages" or rate-limit errors in Evolution API logs.

**Phase to address:**
WhatsApp send implementation phase — the send loop must enforce per-session rate limiting as a non-optional feature, not an afterthought.

---

### Pitfall 3: Google Places API Pagination nextPageToken Timing Requirement

**What goes wrong:**
The next page of results is requested immediately after receiving the `nextPageToken`, which returns a `INVALID_REQUEST` error. The developer sees this as "only 20 results exist" and moves on, silently missing up to 40 additional leads per search query.

**Why it happens:**
Google Places API requires a minimum delay (typically 2–3 seconds) between receiving a `nextPageToken` and using it in the next request. The token takes time to become valid server-side. This is not prominently documented but is a real requirement enforced by the API.

**How to avoid:**
- After receiving a `nextPageToken`, always `await sleep(2500)` before the next request (2.5 seconds minimum; 3 seconds to be safe).
- Treat pagination as a required step, not an optimization — the API caps results at 20 per page and 3 pages maximum (60 results total per query).
- Log the number of results fetched per query so underpagination is visible.

**Warning signs:**
- Every city+category search returns exactly 20 results, never more.
- API returns `INVALID_REQUEST` or `NOT_FOUND` on pagination attempts.
- No `nextPageToken` in responses even when the category is common (implies the delay is missing and the token expired).

**Phase to address:**
Google Places search implementation phase.

---

### Pitfall 4: Google Places API Billing Explosion from Unrestricted Field Masks

**What goes wrong:**
All fields are requested in Place Details calls (no `FieldMask` header), which bills at the Pro SKU tier. A single uncapped run over a large city category list can generate hundreds of dollars in API charges before the developer notices.

**Why it happens:**
The Places API (New) changed pricing on March 1, 2025: costs are now based on which data tiers the requested fields belong to (Essentials, Pro, Enterprise). Requesting `website`, `international_phone_number`, `rating` alongside basic fields escalates billing to Pro tier per request. Without a billing alert or daily cap, a loop over thousands of results drains the budget silently.

**How to avoid:**
- Set a Google Cloud billing alert at $10, $25, and $50 immediately when the API key is created — before writing a single line of search code.
- Set a daily quota cap in Google Cloud Console (API & Services > Quotas) to hard-limit requests per day.
- Use `FieldMask` on every request and request only the minimum fields needed: `id,displayName,websiteUri,nationalPhoneNumber,rating,formattedAddress`.
- Log estimated API cost in the terminal output per run (number of Place Detail calls × per-request price).

**Warning signs:**
- No billing alert configured in Google Cloud Console.
- Place Details requests have no `X-Goog-FieldMask` header.
- A test run returns an unexpectedly large Google Cloud bill the next day.

**Phase to address:**
Google Places search implementation phase — billing guard rails must be set up before any live API calls are made.

---

### Pitfall 5: Deduplication Key Based on Business Name Instead of place_id

**What goes wrong:**
The contact history tracks previously prospected businesses by name (e.g., `"Padaria do João"`). When the same business appears again in a different search (different category keyword, neighboring city query, or slightly different name spelling), it is treated as a new contact and messaged again, causing duplicate outreach.

**Why it happens:**
Business names are not unique identifiers. Google itself notes that the same place can have multiple `place_id` values and the same address can appear under different listings. When developers build deduplication logic quickly, "name looks familiar" is the intuitive key — but it fails for name variants and is useless cross-run.

**How to avoid:**
- Use `place_id` as the primary deduplication key in the contact history store (JSON file or SQLite).
- Secondary key: normalized phone number (E.164 format, stripped of all formatting). A business may appear under a different `place_id` in rare cases but will share the same phone number.
- Normalize phone numbers before inserting or checking (strip spaces, dashes, parentheses, country code variations).
- The history store should be checked at the filter stage, not after sending.

**Warning signs:**
- The same business owner receives two WhatsApp messages within hours.
- History file grows but duplicate messages still occur.
- Search results for different category keywords return overlapping businesses and all pass the "already contacted" check.

**Phase to address:**
Contact history and deduplication implementation phase.

---

### Pitfall 6: Phone Number Format Mismatch for Brazilian Numbers

**What goes wrong:**
Google Places API returns Brazilian phone numbers in inconsistent formats (e.g., `+55 (11) 98765-4321` or `(11) 98765-4321` or `55119876543`). Evolution API requires numbers in a specific format (typically `5511987654321` — country code + DDD + number, no `+` prefix, no spaces). Sending to a malformatted number results in a silent failure or "number not found" error.

**Why it happens:**
Brazil has a unique phone number complexity: DDI (+55) + DDD (2 digits) + 9-digit mobile number = 13 digits total for mobiles (the leading `9` for mobile was added in 2012, but older numbers in databases may still be stored as 8-digit local numbers). Google's `international_phone_number` field returns the `+55` prefix with spaces and punctuation that must be stripped before passing to Evolution API.

**How to avoid:**
- Use `libphonenumber-js` (npm) to parse and normalize every phone number from Google Places to E.164, then strip the `+` prefix for Evolution API.
- Apply Brazilian-specific logic: if after stripping country code and DDD the remaining number has 8 digits, prepend `9` (legacy landline to mobile conversion — use carefully; log these cases).
- Log all numbers that fail `libphonenumber-js` parsing so they can be inspected manually.
- Write a unit test with at least 10 real Brazilian number format variants before shipping the normalization function.

**Warning signs:**
- Evolution API returns "number not found on WhatsApp" for numbers that clearly exist.
- Phone numbers in logs contain spaces, parentheses, or dashes.
- Numbers from one city work but another city's numbers all fail (DDD-specific formatting difference).

**Phase to address:**
Phone number normalization utility — must be built and tested before the WhatsApp send phase.

---

### Pitfall 7: Instagram URL Filter False Positives / False Negatives

**What goes wrong:**
The filter that classifies a business as "no real website" by detecting Instagram URLs either (a) misses variations of Instagram URLs and lets through businesses that do have only Instagram, or (b) rejects businesses that have both a real site AND an Instagram link listed as website (rare but possible). The core value of the bot — only contacting businesses without a real site — is undermined.

**Why it happens:**
Google Places stores the `websiteUri` field exactly as the business owner entered it. Instagram links appear in multiple formats: `https://www.instagram.com/businessname`, `http://instagram.com/businessname`, `instagram.com/businessname` (no protocol), or `https://www.instagram.com/businessname/` (trailing slash). A naive `=== 'instagram.com'` check misses most variants.

**How to avoid:**
- Use a hostname-based check after parsing the URL: `new URL(websiteUri).hostname.includes('instagram.com')`.
- Also handle the case where `websiteUri` has no protocol prefix (add `https://` before parsing).
- Similarly check for `linktree`, `linktr.ee`, `bio.site`, `beacons.ai` and other "bio link" services that are effectively the same as no-website.
- Treat `null`, `undefined`, and empty string `websiteUri` identically as "no website."
- Log every business that passes or fails this filter so the team can audit the decisions.

**Warning signs:**
- Businesses with clear Instagram-only URLs appear in the "has website" skip list.
- `new URL(websiteUri)` throws `TypeError: Invalid URL` for entries without a protocol prefix.
- All results from a particular category are getting filtered out (may indicate a bug in the filter logic).

**Phase to address:**
Business filtering logic — implement and test with real Google Places API response data before building the send pipeline.

---

### Pitfall 8: Zoho Workspace Email Account Suspension for Cold Outreach

**What goes wrong:**
Using a Zoho Workspace account (the primary business email) to send cold outreach causes Zoho to flag the account as a spam sender and suspend it, taking down the entire team's email communication, not just the bot.

**Why it happens:**
Zoho Mail is a business communication platform, not a transactional/outreach platform. Zoho actively monitors for cold emailing patterns and has been known to block accounts engaged in bulk outreach. Sending 50+ similar emails per day from a workspace account to cold contacts triggers this. The risk is higher because Zoho's ToS explicitly discourages unsolicited bulk emails.

**How to avoid:**
- Use a subdomain alias or a dedicated email address (e.g., `contato@outreach.dominio.com.br`) registered separately from the primary domain — this isolates reputation risk.
- Cap email sends to 30–50 per day initially and ramp up slowly.
- Ensure SPF, DKIM, and DMARC records are configured on the sending domain before any sends.
- The email body must not be a pure template blast — personalize with `{{nome}}` and `{{cidade}}` at minimum to avoid spam content scoring.
- Consider Zoho ZeptoMail for transactional outreach instead of Zoho Workspace SMTP if volume grows beyond 50/day.

**Warning signs:**
- Zoho shows delivery failures with `421` or `550` SMTP errors after the first batch.
- Recipients report emails landing in spam or promotions folders.
- Zoho Admin console shows outbound email rate anomalies.

**Phase to address:**
Email send implementation phase — domain authentication must be verified before first live send.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| JSON flat file for contact history | Zero setup, simple reads/writes | Slow lookups as list grows; no atomic write safety (corruption on crash mid-write) | Acceptable for v1 if guarded with try/catch and file-locking or write-then-rename pattern |
| Single message template for both WhatsApp and email | Less code to maintain | Email expects HTML structure; WhatsApp expects plain text with emojis — the same template performs poorly in both | Acceptable for v1 but add channel-specific formatting in Phase 2 |
| No retry logic on API failures | Simpler code | A single rate-limit error causes the entire run to fail silently | Never acceptable — implement basic exponential backoff from day one |
| Hardcoded delay values (e.g., `sleep(3000)`) | Easy to reason about | Cannot adapt to API response hints (`Retry-After` headers); breaks if API speed changes | Acceptable for v1, but log the delays so they can be tuned |
| Skip email when absent (no fallback) | Reduces code path | Metrics will undercount true reach; no visibility into how many WhatsApp-only vs dual-channel sends happen | Acceptable — but always log the channel decision per contact |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Google Places API (New) | Using `maxResultCount` parameter (deprecated May 2024) | Use `pageSize` (1–20) and paginate with `pageToken` |
| Google Places API (New) | Calling Place Details for every result to get `website` field | Include `websiteUri` in the Text Search `FieldMask` to avoid a separate Detail call for every result |
| Evolution API | Sending to `+5511...` format (with `+` prefix) | Strip the `+` — Evolution API expects `5511...` without it |
| Evolution API | Not handling `instance disconnected` state before sending | Check instance connection status at the start of each run; bail early with a clear error if disconnected |
| Zoho SMTP | Sending over port 25 (often blocked by ISPs) | Use port 587 (STARTTLS) or 465 (SSL) as documented by Zoho |
| Zoho SMTP | Not setting `From` header to match the authenticated email | Many SMTP configs send as the auth user but override `From` — Zoho rejects this as spoofing |
| Google Places API | Not setting a Cloud billing alert before first run | A looping bug can exhaust budget in minutes — alert at $10 must be set before any live call |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Fetching Place Details for every result (even filtered-out ones) | High API cost, slow runs | Apply website filter at Text Search stage using `websiteUri` field before Detail calls | Breaks at ~100 results/run (cost multiplied by 3-5x unnecessarily) |
| Sequential sends with no concurrency AND no backpressure | Runs take hours for 100 contacts | Add configurable delay but keep sequential — parallelism increases ban risk; time is the acceptable cost | Not a performance trap for this scale — 100 contacts/day is fine sequential |
| Reading entire contact history JSON on every send | Slow as history grows to thousands of entries | Load history once into a `Set` at startup, check in-memory, write once at end | Breaks noticeably at ~10,000 entries in a flat JSON file |
| No pagination = 20 results per city+category max | Bot appears to work but misses 67% of leads | Always paginate up to 3 pages; log result count per query | Every single run — 20/60 leads is not a scale issue, it's a correctness issue |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| API keys and Evolution API tokens hardcoded in source code | Credentials committed to git, leaked publicly | Use `.env` file, add `.env` to `.gitignore` immediately at project init; validate required env vars at startup |
| No input sanitization on CLI city/category args | Injection into API query strings (low risk with Google API but still sloppy) | Trim and sanitize CLI input; reject obviously invalid values with a clear error |
| Evolution API instance URL exposed in logs | Instance URL + API key = full account takeover | Redact credentials in all terminal log output |
| Contact history file writable by all users | Another process could corrupt or read the prospect list | Set file permissions to owner-only (`chmod 600`) on the history file |

---

## UX Pitfalls (CLI Operator Experience)

| Pitfall | Operator Impact | Better Approach |
|---------|-----------------|-----------------|
| No dry-run mode | Operator cannot preview what will be sent before committing | Add `--dry-run` flag that shows what would be sent without actually sending |
| Silent success on skipped contacts | Operator doesn't know how many were skipped for "already contacted" vs "no phone" vs "has website" | Log each skip reason explicitly: `[SKIP already-contacted] Padaria do João` |
| No summary at end of run | Operator has no idea if the run achieved anything | Print a summary line: `Run complete: 12 WhatsApp sent, 3 emails sent, 28 skipped (15 already contacted, 8 has website, 5 no phone)` |
| Crash mid-run loses partial progress | If run crashes after 30 sends, re-running re-sends to the first 30 | Write contact history to disk after each successful send, not at the end |

---

## "Looks Done But Isn't" Checklist

- [ ] **Deduplication:** History file uses `place_id` as key, not business name — verify with a test run that searches the same city twice
- [ ] **Phone normalization:** All 10 Brazilian number format variants produce the correct 13-digit `5511NXXXXXXXX` string — unit tests must exist
- [ ] **Pagination:** A category with many results (e.g., `restaurante` in São Paulo) returns more than 20 results — verify in terminal logs
- [ ] **Instagram filter:** URLs without `https://` prefix do not throw `TypeError` — test with `instagram.com/test` (no protocol)
- [ ] **Billing guard:** Google Cloud Console shows a billing alert at $10 and a daily quota cap — screenshot proof before going live
- [ ] **Evolution API connection check:** Running the bot when the WhatsApp instance is disconnected prints a clear error and exits — does not attempt to send
- [ ] **History write safety:** Simulating a crash mid-run (Ctrl+C) does not leave the history file in a corrupt/empty state
- [ ] **Zoho SMTP auth:** SPF and DKIM records verified passing (use `mail-tester.com`) before first live send

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| WhatsApp number banned | HIGH | Get a new SIM card; rebuild Evolution API instance; accept 1–3 day cooldown; reconfigure API key and QR code |
| Google Cloud billing overrun | MEDIUM | Set quota to 0 immediately; contest charge with Google Support if billing alert was not triggered; review and add field masks |
| Zoho account suspended | HIGH | Contact Zoho support to appeal; migrate outreach to a dedicated subdomain/alias going forward; may need 5–7 days for resolution |
| Duplicate messages sent to a business | LOW | Apologize template message sent manually; add `place_id` to block list; investigate deduplication logic |
| Contact history file corrupted | MEDIUM | Restore from last git commit or backup; rebuild history by cross-referencing with WhatsApp/email send logs |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| WhatsApp ban from bulk number checking | WhatsApp send implementation | Run bot with 5 numbers; confirm no `whatsappNumbers` endpoint is called |
| WhatsApp ban from high volume | WhatsApp send implementation | Verify configurable delay and per-session cap are enforced; test with >20 numbers |
| Google Places pagination timing | Google Places search implementation | Search `restaurante` in a large city; confirm >20 results returned |
| Google billing explosion | Google Places setup (before any API call) | Verify billing alert and quota cap exist in Cloud Console before first run |
| Deduplication by name instead of place_id | Contact history implementation | Run same search twice; confirm zero duplicates in second run's send list |
| Brazilian phone format mismatch | Phone normalization utility (early phase) | Unit test 10 format variants; integration test with Evolution API sandbox |
| Instagram filter false positives/negatives | Business filter implementation | Test filter with 5 Instagram URL variants and 3 no-protocol edge cases |
| Zoho suspension for cold outreach | Email send implementation | Verify SPF/DKIM pass, sending domain is isolated from primary domain, rate cap enforced |

---

## Sources

- [Evolution API Issue #2228 — Account ban risk from bulk number checking](https://github.com/EvolutionAPI/evolution-api/issues/2228)
- [Evolution API Issue #2298 — Temporary restriction after 1–2 days of use](https://github.com/EvolutionAPI/evolution-api/issues/2298)
- [Google Places API — nextPageToken timing and pagination](https://github.com/googleapis/google-cloud-node/issues/5385)
- [Google Places API (New) — Places API nextPageToken non-functional issue tracker](https://issuetracker.google.com/issues/343942714)
- [Google Places API — Text Search (New) official docs](https://developers.google.com/maps/documentation/places/web-service/text-search)
- [Google Places API — Place IDs and deduplication](https://developers.google.com/maps/documentation/places/web-service/place-id)
- [Google Maps Platform — Usage and Billing (2025 pricing model)](https://developers.google.com/maps/documentation/places/web-service/usage-and-billing)
- [WhatsApp API Rate Limits — WASenderAPI scaling guide](https://wasenderapi.com/blog/whatsapp-api-rate-limits-explained-how-to-scale-messaging-safely-in-2025)
- [Zoho Mail — Rates, limits, and policies](https://www.zoho.com/mail/help/adminconsole/rates-and-limits.html)
- [Brazil WhatsApp number formatting — n8n community](https://community.n8n.io/t/whatsapp-numbers-in-brazil-help-me-fix-using-javascript-please/20996)
- [libphonenumber-js — npm](https://www.npmjs.com/package/libphonenumber-js)
- [Cold email deliverability checklist 2025](https://www.theprospectagency.com/blog/deliverability2025)
- [WhatsApp Business ban avoidance guide 2026](https://www.chatappquestions.com/whatsapp/policy/)

---
*Pitfalls research for: Node.js outreach automation (Google Places + Evolution API WhatsApp + Zoho Email)*
*Researched: 2026-03-28*
