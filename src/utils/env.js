export function validateEnv() {
  const required = {
    apiKey:            process.env.GOOGLE_PLACES_API_KEY,
    evolutionApiUrl:   process.env.EVOLUTION_API_URL,
    evolutionApiKey:   process.env.EVOLUTION_API_KEY,
    evolutionInstance: process.env.EVOLUTION_INSTANCE
  }
  const envNames = {
    apiKey:            'GOOGLE_PLACES_API_KEY',
    evolutionApiUrl:   'EVOLUTION_API_URL',
    evolutionApiKey:   'EVOLUTION_API_KEY',
    evolutionInstance: 'EVOLUTION_INSTANCE'
  }
  for (const [key, value] of Object.entries(required)) {
    if (!value) {
      throw new Error(`${envNames[key]} is missing or empty in .env`)
    }
  }
  return required
}
