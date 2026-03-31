export function validateEnv() {
  const required = {
    apiKey:            process.env.GOOGLE_PLACES_API_KEY,
    evolutionApiUrl:   process.env.EVOLUTION_API_URL,
    evolutionApiKey:   process.env.EVOLUTION_API_KEY,
    evolutionInstance: process.env.EVOLUTION_INSTANCE,
    zohoSmtpUser:     process.env.ZOHO_SMTP_USER,
    zohoSmtpPass:     process.env.ZOHO_SMTP_PASS,
    emailSubject:     process.env.EMAIL_SUBJECT
  }
  const envNames = {
    apiKey:            'GOOGLE_PLACES_API_KEY',
    evolutionApiUrl:   'EVOLUTION_API_URL',
    evolutionApiKey:   'EVOLUTION_API_KEY',
    evolutionInstance: 'EVOLUTION_INSTANCE',
    zohoSmtpUser:     'ZOHO_SMTP_USER',
    zohoSmtpPass:     'ZOHO_SMTP_PASS',
    emailSubject:     'EMAIL_SUBJECT'
  }
  for (const [key, value] of Object.entries(required)) {
    if (!value) {
      throw new Error(`${envNames[key]} is missing or empty in .env`)
    }
  }
  return required
}
