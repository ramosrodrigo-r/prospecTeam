# Technology Stack

**Analysis Date:** 2026-04-14

## Languages

**Primary:**
- JavaScript (ES Modules) - All source code, tests, and bin

## Runtime

**Environment:**
- Node.js >= 21

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Commander.js 14.0.3 - CLI argument parsing for interactive prompts

**Testing:**
- node:test (built-in) - Unit testing framework
- node:assert/strict - Assertion library

**Build/Dev:**
- dotenv 17.3.1 - Environment variable loading
- nodemailer 8.0.4 - Email sending via SMTP

## Key Dependencies

**Critical:**
- commander 14.0.3 - CLI UX for session configuration (city/niche selection)
- dotenv 17.3.1 - Loads sensitive credentials from `.env` at startup
- nodemailer 8.0.4 - SMTP integration with Zoho Mail for email sending

**Infrastructure:**
- node:fs - File I/O for history persistence (`data/history.json`)
- node:path - Cross-platform path resolution
- node:url - URL handling (file imports, Google Places API endpoints)
- fetch (native) - HTTP requests to Google Places, Evolution API, Telegram Bot API

## Configuration

**Environment:**
- `.env` file with 8 required variables (see `.env.example`)
- Keys: `GOOGLE_PLACES_API_KEY`, `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `ZOHO_SMTP_USER`, `ZOHO_SMTP_PASS`, `EMAIL_SUBJECT`
- Validated at runtime in `src/utils/env.js` with early exit if missing

**Build:**
- No build step required (ES modules, Node.js native)
- No TypeScript, no bundler, no minification

## Platform Requirements

**Development:**
- Node.js 21+ (ES2024 features required)
- `.env` file with valid API credentials
- Internet connection (calls 4 external APIs)
- Port 8080 available locally if running Evolution Go self-hosted

**Production:**
- Cloud hosting with Node.js 21+ runtime
- Persistent `/data` directory for `history.json` (deduplication across sessions)
- Environment variables injected at deployment
- Outbound HTTPS access to: Google Places API, Evolution Go, Telegram Bot API, Zoho SMTP

---

*Stack analysis: 2026-04-14*
