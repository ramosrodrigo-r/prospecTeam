import 'dotenv/config'
import { parseArgs } from '../src/utils/args.js'
import { validateEnv } from '../src/utils/env.js'
import { checkConnection } from '../src/services/evolution.js'
import { fetchProspects } from '../src/stages/fetch.js'
import { loadHistory } from '../src/history.js'
import { dedupProspects } from '../src/stages/dedup.js'
import { renderMessage } from '../src/stages/render.js'
import { sendWhatsApp } from '../src/stages/sender.js'

// 1. Validate environment (all 4 vars per D-14)
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

// 3. Health check Evolution API instance (per D-05, D-06, D-07)
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

// 4. Fetch prospects
let prospects
try {
  prospects = await fetchProspects({ city, category, apiKey: env.apiKey })
} catch (err) {
  console.error(`Error fetching prospects: ${err.message}`)
  process.exit(1)
}

// 5. Load history and dedup
loadHistory()
prospects = dedupProspects(prospects)

if (prospects.length === 0) {
  console.log('No new prospects to contact.')
  process.exit(0)
}

// 6. Render + Send WhatsApp for each prospect (per D-03, D-04, D-09)
const waConfig = {
  baseUrl: env.evolutionApiUrl,
  apiKey: env.evolutionApiKey,
  instance: env.evolutionInstance
}

for (const prospect of prospects) {
  const message = renderMessage(prospect, { cidade: city, categoria: category })
  const result = await sendWhatsApp(prospect, message, waConfig)
  if (result.ok) {
    console.log(`[WA sent] ${prospect.name}`)
  } else {
    console.log(`[WA failed: ${result.reason}] ${prospect.name}`)
  }
}

process.exit(0)
