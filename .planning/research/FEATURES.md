# Feature Research

**Domain:** B2B outreach automation / local business prospecting CLI tool
**Researched:** 2026-03-28
**Confidence:** HIGH (core features), MEDIUM (anti-features rationale from ecosystem patterns)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features the sales team assumes exist. Missing these = tool is broken or untrustworthy.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Google Places search by city + category | Core data source — without it the tool has nothing to work with | LOW | CLI args: `--city` and `--category`; Places API supports both |
| Filter businesses with no real website | The entire value prop depends on finding the right targets; Instagram = no website | LOW | Check if `website` field is absent or matches `instagram.com` |
| Variable substitution in message template | Personalized outreach converts better than generic blasts; expected by any sender | LOW | `{{nome}}`, `{{rating}}`, `{{categoria}}` injected before send |
| WhatsApp send via Evolution API | Primary channel; the team already uses it — not optional | LOW | POST to Evolution API REST endpoint with phone + message |
| Email send via Zoho when available | Secondary channel; graceful skip when email absent is standard behavior | LOW | SMTP or Zoho API; skip silently if no email in Places result |
| Deduplication / contact history | Without this, the same business gets spammed across runs, destroying credibility | MEDIUM | Persist sent records to local JSON or SQLite keyed by `place_id` |
| Clear terminal output per send | Team needs to know what happened without reading logs; expected from any CLI tool | LOW | Log: business name, channel used (WA/email/both/skipped), status |
| Graceful error handling per contact | A single failure must not abort the entire run; batch tools always continue on error | LOW | Try/catch per contact; log error and continue to next |

### Differentiators (Competitive Advantage)

Features not expected in v1 but that raise quality or team confidence significantly.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Send delay / throttle between messages | Protects WhatsApp account from ban; mimics human pacing — recommended 3-8s between sends | LOW | `setTimeout` or configurable `--delay` flag; critical for WA account health |
| Dry-run mode (`--dry-run`) | Preview what would be sent without actually sending — reduces mistakes in new cities/categories | LOW | Print instead of send; no side effects; very fast to build |
| Resume / skip already-sent on re-run | If a run crashes mid-way, restart from where it left off without re-sending | LOW | Already implied by deduplication history; just make it explicit |
| Run summary at end | "Sent: 12 WA, 3 email, 5 skipped (no contact), 1 error" — gives team confidence in tool | LOW | Aggregate counters flushed at process exit |
| Configurable template file path | Let team swap templates without touching code — `--template ./msg.txt` | LOW | `fs.readFileSync` with path from CLI arg; negligible complexity |
| Pagination across Google Places results | Places API caps at 20 results per call; `next_page_token` allows up to 60 total | MEDIUM | Worth building in v1 — triples the leads per search without extra API calls |
| Log file output | Persistent audit trail of sends; useful when team reviews activity later | LOW | Write same terminal lines to `./outreach-log-YYYY-MM-DD.txt` |

### Anti-Features (Explicitly Not Building)

Features that seem useful but create disproportionate problems for this stage.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Web UI / dashboard | "Easier for the team to use" | Adds auth, hosting, frontend complexity — doubles the build for a small team that already uses terminal | Stay CLI; readable terminal output is sufficient for internal use |
| Multiple message templates (per category) | "Each category needs a different tone" | Adds template management logic, harder to test; in v1 one well-crafted template performs fine | One template with good variable substitution; add multi-template in v1.x if team requests it |
| Follow-up sequences / re-engagement | "Send a follow-up after 3 days" | Requires scheduling, state machine, date tracking — fundamentally a different product | Log contacts; manual follow-up for v1; build sequences only after validating the channel |
| Email scraping beyond Google Places | "Get more emails from business websites" | Out of scope per PROJECT.md; adds scraping infrastructure, ToS risk, and fragile parsing | Use Places data only; accept low email coverage as a known constraint |
| CRM sync / integration | "Push to HubSpot/Pipedrive" | No CRM defined for the team; integration without a target is gold-plating | Local history file is the CRM for v1; export to CSV if needed |
| AI-generated personalization | "Make messages sound more personal" | LLM API cost, latency, and inconsistent output quality; variable substitution already achieves adequate personalization | `{{nome}}`, `{{cidade}}`, `{{rating}}` cover the high-value personalization; AI in v2 if conversion rates justify it |
| WhatsApp reply handling / inbox | "See responses from prospects" | Requires persistent webhook listener, stateful conversation tracking — a different product entirely | Replies go to the connected WhatsApp number; team handles them manually |
| Rate limiting per Zoho SMTP quota | "Don't burn Zoho sending limits" | Zoho email volume for this use case (occasional cold email) is far below Zoho SMTP limits; unnecessary complexity | Send synchronously; revisit if team runs >200 emails/day |

---

## Feature Dependencies

```
[Google Places search]
    └──requires──> [City + category CLI args]
    └──produces──> [Raw business list]
                       └──feeds──> [Website filter (no site / Instagram)]
                                       └──feeds──> [Contact extraction (phone, email)]
                                                       └──feeds──> [Variable substitution]
                                                                       └──feeds──> [WhatsApp send]
                                                                       └──feeds──> [Email send]

[Deduplication history]
    └──gates──> [WhatsApp send] (skip if already contacted)
    └──gates──> [Email send] (skip if already contacted)
    └──updated by──> [WhatsApp send] (write on success)
    └──updated by──> [Email send] (write on success)

[Send delay / throttle]
    └──wraps──> [WhatsApp send] (sleep between sends)

[Dry-run mode]
    └──replaces──> [WhatsApp send] (print instead)
    └──replaces──> [Email send] (print instead)
    └──skips──> [Deduplication write] (no side effects)

[Pagination (next_page_token)]
    └──enhances──> [Google Places search] (extends result set from 20 to 60)

[Run summary]
    └──requires──> [Terminal output logging] (consumes same counters)
```

### Dependency Notes

- **Contact extraction requires website filter:** You must filter before extracting to avoid wasting API quota enriching businesses that have websites.
- **Deduplication gates all sends:** History must be loaded before any send attempt; writes must happen immediately after success, not at batch end, to survive crashes.
- **Dry-run must skip deduplication writes:** If it writes to history, a dry-run poisons the history and prevents real sends later.
- **Pagination is independent but high-value:** Places API returns max 20 per call with a `next_page_token` for up to 3 pages (60 results). Not implementing this cuts reach by 66%.

---

## MVP Definition

### Launch With (v1)

Minimum set needed to validate that the tool saves the team real time and reaches real prospects.

- [x] Google Places search by city + category (CLI args)
- [x] Filter businesses without real website (no website or Instagram URL)
- [x] Extract name, rating, phone, email from Places result
- [x] Variable substitution in a single fixed template
- [x] WhatsApp send via Evolution API
- [x] Email send via Zoho (skip gracefully when absent)
- [x] Local deduplication history (by `place_id`) — prevents re-sending across runs
- [x] Clear per-contact terminal log (name, channel, status)
- [x] Graceful per-contact error handling (continue on failure)
- [x] Send delay between WhatsApp messages (3-8s) — account health is non-negotiable

### Add After Validation (v1.x)

Add these once the team has run the tool on real campaigns and confirmed it works.

- [ ] Pagination via `next_page_token` — trigger: team reports low result counts per search
- [ ] Dry-run mode (`--dry-run`) — trigger: first time team runs in a new city/category
- [ ] Run summary at end — trigger: team asks "how many did we send today?"
- [ ] Configurable template file path — trigger: team wants to test different messages

### Future Consideration (v2+)

Defer until tool-market fit is established and volume justifies complexity.

- [ ] Multiple templates per category — defer: one template + variables is sufficient for v1 validation
- [ ] Log file output — defer: terminal output + history file covers auditing needs for v1
- [ ] Follow-up sequences — defer: fundamentally different product; validate channel first
- [ ] CRM sync — defer: no CRM target defined; local history is the v1 CRM

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Google Places search | HIGH | LOW | P1 |
| Website filter (no site / Instagram) | HIGH | LOW | P1 |
| Variable substitution | HIGH | LOW | P1 |
| WhatsApp send via Evolution API | HIGH | LOW | P1 |
| Email send via Zoho | HIGH | LOW | P1 |
| Deduplication history | HIGH | MEDIUM | P1 |
| Terminal log (per contact) | HIGH | LOW | P1 |
| Per-contact error handling | HIGH | LOW | P1 |
| Send delay / throttle (WA) | HIGH | LOW | P1 — account ban risk if skipped |
| Pagination (next_page_token) | HIGH | MEDIUM | P2 |
| Dry-run mode | MEDIUM | LOW | P2 |
| Run summary | MEDIUM | LOW | P2 |
| Configurable template path | MEDIUM | LOW | P2 |
| Log file output | LOW | LOW | P3 |
| Multi-template support | MEDIUM | MEDIUM | P3 |
| Follow-up sequences | HIGH | HIGH | P3 — v2+ |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

| Feature | Apollo.io / Outreach.io | Outscraper + manual | ProspecTeam (this tool) |
|---------|------------------------|---------------------|------------------------|
| Data source | B2B databases (LinkedIn, etc.) | Google Maps scrape | Google Places API |
| "No website" filter | Not a native filter | Manual or paid filter | Built-in (core feature) |
| WhatsApp channel | Not supported | Manual | Evolution API (automated) |
| Email channel | Yes, multi-inbox | Manual | Zoho SMTP (automated) |
| Deduplication | Yes (CRM-backed) | None | Local JSON/SQLite |
| Personalization | AI + variables | Manual copy-paste | Variable substitution |
| Web UI | Yes | Spreadsheet | CLI (intentional) |
| Cost | $1000+/mo | $50+/mo + manual time | Internal tool (infra cost only) |
| Fit for "no website" local outreach | Poor (wrong data model) | Poor (manual) | Purpose-built |

The gap this tool fills is real: no mainstream tool is optimized for "find local businesses without a website and contact them via WhatsApp." The competitive moat is the combination of the filter + WA channel, not any individual feature.

---

## Sources

- [Outreach.io review — B2B outreach table stakes (SalesRobot, 2026)](https://www.salesrobot.co/blogs/outreach-io-review)
- [Best Outreach Workflow Automation Tools for B2B Sales in 2026 (Sendr.ai)](https://www.sendr.ai/blog/best-outreach-workflow-automation-tools-for-b2b-sales-in-2026)
- [WhatsApp API Rate Limits: How They Work (WATI, 2025)](https://www.wati.io/en/blog/whatsapp-business-api/whatsapp-api-rate-limits/)
- [WhatsApp API Rate Limits Explained — Scaling Guide (WASenderApi, 2025)](https://wasenderapi.com/blog/whatsapp-api-rate-limits-explained-how-to-scale-messaging-safely-in-2025)
- [Evolution API — GitHub](https://github.com/EvolutionAPI/evolution-api)
- [Google Places API limits (Apify blog)](https://blog.apify.com/google-places-api-limits/)
- [How to Find Businesses Without Website for Cold Outreach (Outscraper)](https://outscraper.com/how-to-find-businesses-without-website-for-cold-outreach/)
- [Automate B2B Lead Generation using Google Places API & SendGrid (n8n workflow)](https://n8n.io/workflows/11952-automate-b2b-lead-generation-using-google-places-api-and-sendgrid-with-dashboard/)
- [WhatsApp Business Automation guide (TimelinesAI, 2026)](https://timelines.ai/8-best-whatsapp-automation-tools-and-bots/)
- [Outreach deduplication best practices (Default, Nimble references via search)](https://www.default.com/post/sales-prospecting-tools)

---
*Feature research for: B2B outreach automation / local business prospecting CLI (ProspecTeam)*
*Researched: 2026-03-28*
