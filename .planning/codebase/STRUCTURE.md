# Codebase Structure

**Analysis Date:** 2026-04-14

## Directory Layout

```
/home/rodrigo/prospecTeam/
├── bin/                        # Entry points
│   └── prospect.js             # Main CLI application (352 lines)
├── src/                        # Source code
│   ├── services/               # External API clients
│   │   ├── places.js           # Google Places API wrapper
│   │   ├── evolution.js        # WhatsApp via Evolution Go
│   │   ├── zoho.js             # Zoho SMTP mail transport
│   │   └── telegram.js         # Telegram Bot API polling
│   ├── stages/                 # Pipeline transformation stages
│   │   ├── fetch.js            # Google Places search
│   │   ├── dedup.js            # Session-level deduplication
│   │   ├── render.js           # Template rendering
│   │   ├── sender.js           # WhatsApp send via Evolution
│   │   └── emailSender.js      # Email send via Zoho
│   ├── utils/                  # Utility functions
│   │   ├── env.js              # Environment validation
│   │   ├── template.js         # Template variable substitution
│   │   ├── filter.js           # Website exclusion filter
│   │   ├── phone.js            # Brazilian phone normalization
│   │   └── args.js             # CLI argument parsing (unused)
│   └── history.js              # Persistent contact history (dedup across sessions)
├── tests/                      # Test suite
│   └── unit/                   # Unit tests (13 test files)
│       ├── places.test.js
│       ├── evolution.test.js
│       ├── telegram.test.js
│       ├── fetch.test.js
│       ├── dedup.test.js
│       ├── render.test.js
│       ├── sender.test.js
│       ├── emailSender.test.js
│       ├── zoho.test.js
│       ├── filter.test.js
│       ├── phone.test.js
│       ├── template.test.js
│       ├── history.test.js
│       ├── env.test.js
│       └── args.test.js
├── templates/                  # Message templates
│   ├── outreach.txt            # WhatsApp message template
│   └── outreach-email.txt      # Email message template (if exists)
├── data/                       # Persistent storage
│   └── history.json            # Contact history (auto-created)
├── .env                        # Environment secrets (untracked)
├── .env.example                # Environment template
├── .gitignore                  # Ignore .env, node_modules, data/
├── package.json                # Dependencies: commander, dotenv, nodemailer
├── package-lock.json           # Locked versions
└── README.md                   # Setup and usage guide
```

## Directory Purposes

**bin/:**
- Purpose: Executable entry point
- Contains: `prospect.js` (main CLI, 352 lines)
- Key files: `bin/prospect.js`

**src/services/:**
- Purpose: Abstract external API integrations
- Contains: HTTP request wrappers, error handling, auth injection
- Key files:
  - `src/services/places.js` - Google Places search
  - `src/services/evolution.js` - WhatsApp send (text + media)
  - `src/services/telegram.js` - Operator UI (polling-based)
  - `src/services/zoho.js` - Zoho SMTP transporter

**src/stages/:**
- Purpose: Business logic for outreach pipeline steps
- Contains: Transformation and control flow for fetch → dedup → render → send
- Key files:
  - `src/stages/fetch.js` - Fetch prospects from Google Places
  - `src/stages/dedup.js` - Filter duplicates from current session
  - `src/stages/render.js` - Template variable substitution
  - `src/stages/sender.js` - Send WhatsApp via Evolution
  - `src/stages/emailSender.js` - Send email via Zoho (not in main flow yet)

**src/utils/:**
- Purpose: Pure utility functions
- Contains: Validators, formatters, filters, helpers
- Key files:
  - `src/utils/env.js` - Validate required environment variables
  - `src/utils/template.js` - Safe template substitution (handles null/undefined)
  - `src/utils/filter.js` - Exclude businesses with "real" websites
  - `src/utils/phone.js` - Normalize Brazilian phone numbers (unused)
  - `src/utils/args.js` - CLI argument parser via commander (unused, hardcoded in prospect.js)

**src/history.js:**
- Purpose: Persistent contact tracking across sessions
- Contains: File I/O, deduplication logic, atomic writes
- Key functions:
  - `loadHistory()` - Read `data/history.json` at startup
  - `isDuplicate(placeId, channel)` - Check if contacted on channel
  - `recordSend(placeId, channel)` - Write send timestamp after success

**tests/unit/:**
- Purpose: Unit test suite
- Contains: 13 test files (one per service/stage/util)
- Framework: node:test (built-in)
- Run: `npm test`

**templates/:**
- Purpose: Message content templates
- Contains:
  - `templates/outreach.txt` - WhatsApp message (variables: {{nome}}, {{rating}}, {{categoria}}, {{cidade}})
  - `templates/outreach-email.txt` - Email message (same variables)

**data/:**
- Purpose: Persistent state between sessions
- Contains: `history.json` (JSON map of placeId → { wa: timestamp|null, email: timestamp|null })
- Generated: Yes (auto-created if missing)
- Committed: No (ignored via .gitignore)

## Key File Locations

**Entry Points:**
- `bin/prospect.js`: Main CLI application, orchestrates session setup and prospect processing

**Configuration:**
- `.env`: Runtime secrets (Google API key, Evolution token, Telegram token, Zoho credentials)
- `.env.example`: Template with all required keys and descriptions
- `package.json`: Dependencies and npm scripts

**Core Logic:**
- `src/services/`: External API integrations
- `src/stages/`: Pipeline transformation stages
- `src/history.js`: Persistent deduplication

**Testing:**
- `tests/unit/`: 13 test files covering services, stages, and utilities
- Run via: `npm test`

## Naming Conventions

**Files:**
- `camelCase.js` for modules (e.g., `places.js`, `evolution.js`, `sendWhatsApp.js`)
- UPPERCASE for constants (e.g., `HISTORY_FILE`, `DATA_DIR`, `SESSION_TARGET`)
- `.test.js` suffix for test files

**Directories:**
- Lowercase plural (e.g., `services/`, `stages/`, `utils/`, `tests/`, `templates/`)
- Except `data/` (singular, reserved for runtime state)

**Functions:**
- camelCase for exported functions (e.g., `searchPlaces()`, `sendWhatsApp()`, `validateEnv()`)
- Underscore prefix for private/internal utilities (e.g., `_sendTextMessage` as injected dependency)

**Variables:**
- camelCase for local/instance variables
- UPPERCASE_WITH_UNDERSCORES for constants (e.g., `SESSION_TARGET = 100`, `BLOCKED_DOMAINS = [...]`)
- Descriptive names (e.g., `prospect`, `message`, `config`, `offset`)

**Types/Objects:**
- Plain objects (no classes, no TypeScript)
- Prospect: `{ placeId, name, rating, phone, website, email }`
- SendResult: `{ ok: boolean, reason?: string }`
- HistoryEntry: `{ wa: ISO_timestamp|null, email: ISO_timestamp|null }`

## Where to Add New Code

**New Feature:**
- Primary code: Add to `src/stages/` if it's a pipeline step, or `src/services/` if it's an API integration
- Tests: Create corresponding `.test.js` file in `tests/unit/`
- Example: New email integration → `src/stages/emailSender.js` (exists) + `tests/unit/emailSender.test.js` (exists)

**New Component/Module:**
- Implementation: Create in appropriate `src/` subdirectory (services, stages, utils)
- Naming: Use `camelCase.js` consistent with existing files
- Exports: Named exports (no default exports) for testability via dependency injection

**Utilities:**
- Shared helpers: `src/utils/`
- Pure functions only (no I/O, no side effects)
- Example: `normalizePhone()` in `src/utils/phone.js`

**Tests:**
- Location: `tests/unit/` (mirror src structure)
- Framework: `node:test`, `node:assert/strict`
- Pattern: Dependency injection via optional `_deps` parameter
- Example: `sendWhatsApp(prospect, message, config, _deps = {})`

## Special Directories

**data/:**
- Purpose: Persistent state (deduplication history)
- Generated: Yes (`history.json` auto-created on first `recordSend()`)
- Committed: No (in .gitignore)
- Critical: Required for cross-session deduplication

**.planning/:**
- Purpose: Project planning and documentation (not core code)
- Subdirs: `phases/`, `codebase/`, `milestones/`, `research/`
- Committed: Yes (tracking)

---

*Structure analysis: 2026-04-14*
