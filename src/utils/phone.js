export function normalizePhone(raw) {
  if (!raw) return null

  const digits = raw.replace(/\D/g, '')

  if ((digits.length === 13 || digits.length === 12) && digits.startsWith('55')) {
    return digits
  }

  if (digits.length === 11 || digits.length === 10) {
    return '55' + digits
  }

  console.warn(`[phone] normalizePhone: unrecognized format, skipping — raw="${raw}"`)
  return null
}
