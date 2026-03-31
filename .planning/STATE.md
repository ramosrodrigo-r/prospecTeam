---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
last_updated: "2026-03-31T13:49:17.799Z"
progress:
  total_phases: 7
  completed_phases: 5
  total_plans: 10
  completed_plans: 10
---

# Project State: ProspecTeam Bot

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-28)

**Core value:** Encontrar e contatar automaticamente negócios sem site — sem isso, o bot não tem razão de existir.
**Current focus:** Phase 05 — whatsapp-send-via-evolution-api

## Milestone

**v1 — Working outreach bot**

## Current Position

Phase: 05 (whatsapp-send-via-evolution-api) — EXECUTING
Plan: 2 of 2

## Phase Status

| Phase | Name | Status | Plans |
|-------|------|--------|-------|
| 1 | Project Foundation + Google Places Search | ◑ In Progress | 1/2 complete |
| 2 | Business Filter + Phone Normalization | ○ Pending | TBD |
| 3 | Contact History + Deduplication | ○ Pending | TBD |
| 4 | Message Template Rendering | ○ Pending | TBD |
| 5 | WhatsApp Send via Evolution API | ○ Pending | TBD |
| 6 | Email Send via Zoho SMTP | ○ Pending | TBD |
| 7 | CLI Wiring + Operator UX | ○ Pending | TBD |

## Decisions

- node:test built-in as test framework — zero dependency, consistent with minimal-dependency philosophy
- globalThis.fetch direct assignment for mocking — no mock library dependency
- Wave 0 tests fail RED intentionally — source modules not created until Plan 02
- [Phase 01-foundation-places]: parseArgs uses non-consuming iteration to allow flags consumed as values to still be matched as flags
- [Phase 01-foundation-places]: dotenv/config must be first ESM import in CLI entry point to load .env before module initialization
- [Phase 01-foundation-places]: nextPageToken is top-level in Places API v1 FieldMask (not places.nextPageToken) — required for pagination
- [Phase 02-business-filter-phone-normalization]: filterBusinesses uses hostname-based blocked-domain matching (instagram.com, linktr.ee) with protocol-prefixing and try/catch for parse failures
- [Phase 02-business-filter-phone-normalization]: normalizePhone uses digit-length branching (10/11 digits prepend 55, 12/13 digits with 55 prefix pass through, other returns null with console.warn)
- [Phase 02-business-filter-phone-normalization]: filterBusinesses called at end of fetchProspects before return, keeping filter concern inside the pipeline stage (D-08)
- [Phase 03-contact-history-deduplication]: history.json usa formato { placeId: { sentAt: ISO8601 } } via Object.fromEntries(Map)
- [Phase 03-contact-history-deduplication]: Write-then-rename atomico em history.js: writeFileSync para .tmp, renameSync para .json final — previne corrupcao em crash
- [Phase 03-contact-history-deduplication]: D-11: dedup implemented as separate pipeline stage (stages/dedup.js), not inside fetch.js
- [Phase 03-contact-history-deduplication]: D-12: dedupProspects receives array of prospects, calls isDuplicate per item, returns filtered array
- [Phase 03-contact-history-deduplication]: D-13: dedupProspects does NOT call recordSend — recordSend invoked only by senders in phases 5-6
- [Phase 04-message-template-rendering]: Plain ASCII in outreach.txt (no accents) to avoid encoding issues in WhatsApp/email delivery
- [Phase 04-message-template-rendering]: {{nome}} appears twice in template to verify multiple-occurrence substitution behavior
- [Phase 04-message-template-rendering]: renderTemplate is a pure function with no imports — takes template string and vars object, returns rendered string
- [Phase 04-message-template-rendering]: renderMessage separates prospect fields from CLI context (cidade/categoria) — prospect is immutable, context is separate param
- [Phase 04-message-template-rendering]: TEMPLATE_PATH resolved at module load time using import.meta.url to ensure correct path regardless of process cwd
- [Phase 05-whatsapp-send-via-evolution-api]: sender.js accepts optional _deps={}  4th parameter for dependency injection — mock.module not available in node:test v24 without experimental flags
- [Phase 05-whatsapp-send-via-evolution-api]: validateEnv returns object { apiKey, evolutionApiUrl, evolutionApiKey, evolutionInstance } — breaking change from string return, bin/prospect.js update deferred to Plan 02
- [Phase 05-whatsapp-send-via-evolution-api]: Evolution API uses apikey header (not Authorization Bearer) — applies to all future Evolution API calls
- [Phase 05-whatsapp-send-via-evolution-api]: Pipeline order enforced: validateEnv -> healthCheck -> fetchProspects -> loadHistory -> dedupProspects -> render+send loop
- [Phase 05-whatsapp-send-via-evolution-api]: Health check exits 1 on disconnected Evolution API instance before fetching any prospects
- [Phase 05-whatsapp-send-via-evolution-api]: Pipeline order enforced: validateEnv -> healthCheck -> fetchProspects -> loadHistory -> dedupProspects -> loop(renderMessage + sendWhatsApp)
- [Phase 05-whatsapp-send-via-evolution-api]: Health check exits 1 on disconnected Evolution API instance before fetching any prospects
- [Phase 05-whatsapp-send-via-evolution-api]: Exit code 0 mesmo quando todos os contatos falham — falhas por contato individual sao esperadas em outreach

## Performance Metrics

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 01-foundation-places | 01 | 2min | 2 | 9 |
| Phase 01-foundation-places P02 | 2min | 3 tasks | 5 files |
| Phase 02-business-filter-phone-normalization P01 | 1min | 2 tasks | 4 files |
| Phase 02-business-filter-phone-normalization P02 | 3min | 1 tasks | 2 files |
| Phase 03-contact-history-deduplication P01 | 5min | 2 tasks | 2 files |
| Phase 03-contact-history-deduplication P02 | 1min | 2 tasks | 3 files |
| Phase 04-message-template-rendering P01 | 1min | 2 tasks | 2 files |
| Phase 04-message-template-rendering P02 | 1min | 2 tasks | 2 files |
| Phase 05-whatsapp-send-via-evolution-api P01 | 15min | 2 tasks | 7 files |
| Phase 05-whatsapp-send-via-evolution-api P02 | 2 | 1 tasks | 1 files |
| Phase 05-whatsapp-send-via-evolution-api P02 | 5min | 2 tasks | 1 files |

## Next Action

Run `/gsd:execute-phase 01-foundation-places` to execute Plan 02 (implement source modules).

---
*Initialized: 2026-03-28*
*Last updated: 2026-03-28*
