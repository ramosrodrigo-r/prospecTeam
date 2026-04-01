# Phase 7: CLI Wiring + Operator UX - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire all pipeline stages under a single Commander.js entry point. The operator runs one command, sees clear per-contact status for every outcome (sent, skipped, failed), and the entire run is resilient to individual contact failures.

This phase does NOT add new pipeline capabilities — it improves observability of what the existing pipeline already does, and migrates CLI arg parsing to Commander.js.

</domain>

<decisions>
## Implementation Decisions

### Commander.js migration
- **D-01:** Migrate from custom `parseArgs` in `src/utils/args.js` to Commander.js — replace the file entirely
- **D-02:** Commander program definition lives in `src/utils/args.js`, exported as a parsed options object — `bin/prospect.js` calls `parseArgs()` with no signature change
- **D-03:** Use Commander's native error messages for missing required args (e.g., `error: required option '--city <city>' not specified`) — no custom override
- **D-04:** `--help` output includes custom description: `"ProspecTeam — bot de outreach via WhatsApp e email"` and addHelpText with example: `node bin/prospect.js --city "Campinas" --category "academia"`

### Skip logging — filter stage
- **D-05:** `filterBusinesses(prospects, onSkip)` accepts optional `onSkip` callback — called when a prospect is discarded
- **D-06:** Filter callback signature: `onSkip(prospect, 'has-website', prospect.website)` — third arg is the URL that triggered the skip
- **D-07:** `bin/prospect.js` passes callback that logs: `[SKIP has-website: ${url}] ${prospect.name}`

### Skip logging — dedup stage
- **D-08:** `dedupProspects(prospects, onSkip)` accepts optional `onSkip` callback — called when a prospect is discarded (both channels already sent)
- **D-09:** Dedup callback signature: `onSkip(prospect, 'already-contacted', ['wa', 'email'])` — third arg is array of channels already sent
- **D-10:** `bin/prospect.js` passes callback that logs: `[SKIP already-contacted: ${channels.join('+')}] ${prospect.name}` → e.g., `[SKIP already-contacted: wa+email] Padaria Silva`

### Skip logging — no-phone inline
- **D-11:** When `prospect.phone` is null, log inline in the loop: `[SKIP wa: no-phone] ${prospect.name}` — simple `else` branch on the existing WA guard
- **D-12:** No change to `sender.js` or `filter.js` for this case — it's a channel-level skip in the loop, not a stage-level discard

### Status line format
- **D-13:** One log line per channel action (current pattern maintained) — not consolidated per contact
- **D-14:** Existing log format preserved: `[WA sent]`, `[WA failed: reason]`, `[email sent]`, `[email failed: reason]`, `[email skipped: no address]`
- **D-15:** For contacts with only one channel pending (WA already sent, email pending or vice-versa) — log only the current channel result. No log for previously-sent channel. Guard `isDuplicate` handles silently.

### Claude's Discretion
- Exact Commander.js option definitions (`.requiredOption` vs `.option` + manual check)
- Whether to keep `src/utils/args.js` as the export boundary or refactor bin/prospect.js directly if simpler
- Test strategy for Commander.js (Commander exposes `.parse(argv)` directly — testable without process.argv)

</decisions>

<specifics>
## Specific Ideas

- Log format must match roadmap success criteria exactly: `[SKIP already-contacted]`, `[SKIP has-website]`, `[SKIP no-phone]` (with channel/URL detail appended)
- `--help` example: `node bin/prospect.js --city "Campinas" --category "academia"`
- Commander native error is preferred — no custom error handler for missing args

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

No external specs — requirements are fully captured in decisions above.

### Key source files to read
- `bin/prospect.js` — current pipeline wiring, loop structure, existing log lines
- `src/utils/args.js` — current parseArgs to be replaced with Commander
- `src/utils/filter.js` — filterBusinesses signature to be extended with onSkip
- `src/stages/dedup.js` — dedupProspects signature to be extended with onSkip
- `.planning/ROADMAP.md` — Phase 7 success criteria (exact log format strings)
- `.planning/REQUIREMENTS.md` — OPS-01, OPS-02

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `sendWhatsApp` / `sendEmail` already return `{ok, reason}` — no change needed for error resilience (OPS-02 already satisfied at channel level)
- `isDuplicate(placeId, channel)` — already channel-aware, used in loop guards

### Established Patterns
- Dependency injection via `_deps={}` (used in sender.js and emailSender.js) — Commander args module does NOT need this pattern since it wraps a CLI tool, not a testable function
- `import.meta.url` for path resolution — relevant if Commander definition needs to reference package root
- `dotenv/config` must be first import in bin/prospect.js (Phase 1 decision) — Commander setup happens AFTER dotenv loads

### Integration Points
- `bin/prospect.js` calls `parseArgs(process.argv)` — Commander replaces the internals but signature stays compatible (`parseArgs()` returns `{city, category}`)
- Loop in `bin/prospect.js` lines 76–105 — where `[SKIP wa: no-phone]` else branch gets added
- `fetchProspects` → `filterBusinesses` (inside fetch.js) — filter callback needs to thread through from bin/prospect.js

</code_context>

<deferred>
## Deferred Ideas

- `--dry-run` mode (v2 CLI-01) — out of scope for Phase 7
- End-of-run summary (v2 CLI-02: total sent WA / email / skipped / errors) — out of scope
- `--template` flag (v2 CLI-03) — out of scope
- Persistent log file `outreach-log-YYYY-MM-DD.txt` (v2 OPS-03) — out of scope

</deferred>

---

*Phase: 07-cli-wiring-operator-ux*
*Context gathered: 2026-04-01*
