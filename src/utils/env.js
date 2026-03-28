export function validateEnv() {
  const key = process.env.GOOGLE_PLACES_API_KEY
  if (!key) {
    throw new Error('GOOGLE_PLACES_API_KEY is missing or empty in .env')
  }
  return key
}
