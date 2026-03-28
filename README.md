# ProspecTeam

Automated business prospecting via Google Places API.

## Prerequisites

- Node.js >= 21
- Google Cloud project with Places API (New) enabled
- **IMPORTANT: Before any live API call, configure billing guards:**
  1. Set a **$10 billing alert** in Google Cloud Console > Billing > Budgets & Alerts
  2. Set a **daily quota cap** in APIs & Services > Places API (New) > Quotas
  - Requesting `nationalPhoneNumber`, `websiteUri`, and `rating` triggers the Enterprise SKU (highest billing tier)

## Setup

```bash
cp .env.example .env
# Edit .env with your GOOGLE_PLACES_API_KEY
npm install
```

## Usage

```bash
node bin/prospect.js --city "Sao Paulo" --category "restaurante"

# Debug mode (logs request headers and body to stderr)
DEBUG=1 node bin/prospect.js --city "Sao Paulo" --category "restaurante"
```
