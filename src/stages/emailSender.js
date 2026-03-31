import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sendMail as _sendMail } from '../services/zoho.js'
import { recordSend as _recordSend } from '../history.js'
import { renderTemplate } from '../utils/template.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const EMAIL_TEMPLATE_PATH = join(__dirname, '..', '..', 'templates', 'outreach-email.txt')

export function renderEmailMessage(prospect, { cidade, categoria }) {
  const template = readFileSync(EMAIL_TEMPLATE_PATH, 'utf8')
  return renderTemplate(template, {
    nome:      prospect.name   ?? '',
    rating:    prospect.rating ?? '',
    categoria: categoria       ?? '',
    cidade:    cidade          ?? ''
  })
}

export async function sendEmail(prospect, message, subject, config, _deps = {}) {
  const sendMail   = _deps.sendMail   ?? _sendMail
  const recordSend = _deps.recordSend ?? _recordSend

  // EMAIL-02 per D-20: skip silently when no email
  if (!prospect.email) {
    return { ok: false, reason: 'no email address' }
  }

  try {
    await sendMail({
      from:    config.user,    // per D-05: From = ZOHO_SMTP_USER
      to:      prospect.email,
      subject: subject,
      text:    message
    })
    recordSend(prospect.placeId, 'email')  // per D-24: only after SMTP confirmed
    return { ok: true }
  } catch (err) {
    return { ok: false, reason: err.message }
  }
}
