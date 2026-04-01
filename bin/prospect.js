import 'dotenv/config'
import { parseArgs } from '../src/utils/args.js'
import { validateEnv } from '../src/utils/env.js'
import { checkConnection } from '../src/services/evolution.js'
import { createZohoTransporter } from '../src/services/zoho.js'
import { fetchProspects } from '../src/stages/fetch.js'
import { loadHistory, isDuplicate } from '../src/history.js'
import { dedupProspects } from '../src/stages/dedup.js'
import { renderMessage } from '../src/stages/render.js'
import { sendWhatsApp } from '../src/stages/sender.js'
import { sendEmail, renderEmailMessage } from '../src/stages/emailSender.js'
import { renderTemplate } from '../src/utils/template.js'

// 1. Validate environment (all 7 vars per D-06)
let env
try {
  env = validateEnv()
} catch (err) {
  console.error(`Error: ${err.message}`)
  process.exit(1)
}

// 2. Parse CLI args (per D-02, D-03)
let city, category
try {
  ({ city, category } = parseArgs(process.argv))
} catch (err) {
  // Commander.js already printed the error message to stderr
  process.exit(1)
}

// 3. Health check Evolution API instance
try {
  const status = await checkConnection({
    baseUrl: env.evolutionApiUrl,
    apiKey: env.evolutionApiKey,
    instance: env.evolutionInstance
  })
  if (status.instance?.state !== 'open') {
    console.error('Error: Evolution API instance not connected. Reconnect via QR code before running.')
    process.exit(1)
  }
} catch (err) {
  console.error(`Error: Evolution API instance not connected. Reconnect via QR code before running.`)
  process.exit(1)
}

// 4. Initialize Zoho SMTP transporter
createZohoTransporter({ user: env.zohoSmtpUser, pass: env.zohoSmtpPass })

// 5. Fetch prospects (per D-05, D-06, D-07)
let prospects
try {
  prospects = await fetchProspects({
    city, category, apiKey: env.apiKey,
    onSkip: (prospect, reason, url) => {
      console.log(`[SKIP ${reason}: ${url}] ${prospect.name}`)
    }
  })
} catch (err) {
  console.error(`Error fetching prospects: ${err.message}`)
  process.exit(1)
}

// 6. Load history and dedup (per D-08, D-09, D-10)
loadHistory()
prospects = dedupProspects(prospects, (prospect, reason, channels) => {
  console.log(`[SKIP ${reason}: ${channels.join('+')}] ${prospect.name}`)
})

if (prospects.length === 0) {
  console.log('No new prospects to contact.')
  process.exit(0)
}

// 7. Dual-channel loop with try/catch per contact (per D-11, D-12, D-13, D-14, D-15, OPS-02)
const waConfig = {
  baseUrl: env.evolutionApiUrl,
  apiKey: env.evolutionApiKey,
  instance: env.evolutionInstance
}
const emailConfig = { user: env.zohoSmtpUser, pass: env.zohoSmtpPass }

for (const prospect of prospects) {
  try {
    // Canal WA (per D-13, D-14)
    if (prospect.phone && !isDuplicate(prospect.placeId, 'wa')) {
      const message = renderMessage(prospect, { cidade: city, categoria: category })
      const result = await sendWhatsApp(prospect, message, waConfig)
      if (result.ok) {
        console.log(`[WA sent] ${prospect.name}`)
      } else {
        console.log(`[WA failed: ${result.reason}] ${prospect.name}`)
      }
    } else if (!prospect.phone) {
      // D-11: no-phone skip log — inline in loop, no change to sender.js or filter.js (D-12)
      console.log(`[SKIP wa: no-phone] ${prospect.name}`)
    }

    // Canal email (per D-14, D-15)
    if (!isDuplicate(prospect.placeId, 'email')) {
      const body = renderEmailMessage(prospect, { cidade: city, categoria: category })
      const subject = renderTemplate(env.emailSubject, {
        nome:      prospect.name   ?? '',
        rating:    prospect.rating ?? '',
        categoria: category        ?? '',
        cidade:    city            ?? ''
      })
      const result = await sendEmail(prospect, body, subject, emailConfig)
      if (!result.ok && result.reason === 'no email address') {
        console.log(`[email skipped: no address] ${prospect.name}`)
      } else if (result.ok) {
        console.log(`[email sent] ${prospect.name}`)
      } else {
        console.log(`[email failed: ${result.reason}] ${prospect.name}`)
      }
    }
  } catch (err) {
    // OPS-02: per-contact error resilience — log and continue
    console.log(`[failed: ${err.message}] ${prospect.name}`)
  }
}

process.exit(0)
