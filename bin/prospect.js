import 'dotenv/config'
import { parseArgs } from '../src/utils/args.js'
import { validateEnv } from '../src/utils/env.js'
import { fetchProspects } from '../src/stages/fetch.js'

// 1. Validate environment (billing guard)
let apiKey
try {
  apiKey = validateEnv()
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

// 3. Fetch prospects
try {
  const results = await fetchProspects({ city, category, apiKey })
  console.log(JSON.stringify(results, null, 2))
} catch (err) {
  console.error(`Error fetching prospects: ${err.message}`)
  process.exit(1)
}
