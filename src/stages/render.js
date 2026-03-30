import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderTemplate } from '../utils/template.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const TEMPLATE_PATH = join(__dirname, '..', '..', 'templates', 'outreach.txt')

export function renderMessage(prospect, { cidade, categoria }) {
  const template = readFileSync(TEMPLATE_PATH, 'utf8')
  return renderTemplate(template, {
    nome:      prospect.name   ?? '',
    rating:    prospect.rating ?? '',
    categoria: categoria       ?? '',
    cidade:    cidade          ?? ''
  })
}
