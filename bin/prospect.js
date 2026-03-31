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

// 2. Parse CLI args
const { city, category } = parseArgs(process.argv)
if (!city || !category) {
  console.error('Usage: node bin/prospect.js --city "Sao Paulo" --category "restaurante"')
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

// 5. Fetch prospects
let prospects
try {
  prospects = await fetchProspects({ city, category, apiKey: env.apiKey })
} catch (err) {
  console.error(`Error fetching prospects: ${err.message}`)
  process.exit(1)
}

// 6. Load history and dedup (keeps prospects with at least one channel pending)
loadHistory()
prospects = dedupProspects(prospects)

if (prospects.length === 0) {
  console.log('No new prospects to contact.')
  process.exit(0)
}

// 7. Dual-channel loop: WA first, then email (per D-22, D-25: channels independent)
const waConfig = {
  baseUrl: env.evolutionApiUrl,
  apiKey: env.evolutionApiKey,
  instance: env.evolutionInstance
}
const emailConfig = { user: env.zohoSmtpUser, pass: env.zohoSmtpPass }

for (const prospect of prospects) {
  // Canal WA (per D-22)
  if (prospect.phone && !isDuplicate(prospect.placeId, 'wa')) {
    const message = renderMessage(prospect, { cidade: city, categoria: category })
    const result = await sendWhatsApp(prospect, message, waConfig)
    if (result.ok) {
      console.log(`[WA sent] ${prospect.name}`)
    } else {
      console.log(`[WA failed: ${result.reason}] ${prospect.name}`)
    }
  }

  // Canal email (per D-22, D-20, D-21)
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
}

process.exit(0)
