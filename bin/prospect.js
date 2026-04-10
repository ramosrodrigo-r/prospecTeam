import 'dotenv/config'
import { validateEnv } from '../src/utils/env.js'
import { checkConnection } from '../src/services/evolution.js'
import {
  sendMessage, waitForTextReply, waitForApproval, initUpdatesOffset
} from '../src/services/telegram.js'
import { fetchProspects } from '../src/stages/fetch.js'
import { loadHistory, isDuplicate } from '../src/history.js'
import { dedupProspects } from '../src/stages/dedup.js'
import { renderMessage } from '../src/stages/render.js'
import { sendWhatsApp } from '../src/stages/sender.js'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const TEMPLATE_PATH = join(__dirname, '..', 'templates', 'outreach.txt')
const SESSION_TARGET = 100
const NICHES_COUNT = 6

// --- Validate env ---
let env
try {
  env = validateEnv()
} catch (err) {
  console.error(`Error: ${err.message}`)
  process.exit(1)
}

// --- Health check ---
try {
  const status = await checkConnection({ baseUrl: env.evolutionApiUrl, apiKey: env.evolutionApiKey })
  if (!status.data?.Connected || !status.data?.LoggedIn) throw new Error('not connected')
} catch {
  console.error('Error: Evolution Go instance not connected. Reconnect via QR code before running.')
  process.exit(1)
}

const waConfig = { baseUrl: env.evolutionApiUrl, apiKey: env.evolutionApiKey }
let offset = await initUpdatesOffset(env.telegramBotToken)
loadHistory()

// ─────────────────────────────────────────────
// SETUP PHASE
// ─────────────────────────────────────────────

await sendMessage(
  env.telegramBotToken, env.telegramChatId,
  `🚀 *ProspecTeam — Nova Sessão*\n\n🎯 Meta: *${SESSION_TARGET} contatos*\n\n📍 Qual *cidade* deseja prospectar?`
)

// 1. City
const cityReply = await waitForTextReply(env.telegramBotToken, env.telegramChatId, offset)
const city = cityReply.text
offset = cityReply.nextOffset

// 2. Niches
await sendMessage(
  env.telegramBotToken, env.telegramChatId,
  `✅ Cidade: *${city}*\n\n🏷️ Defina *${NICHES_COUNT} nichos* (um por mensagem):\n\n*Nicho 1/${NICHES_COUNT}:*`
)

const niches = []
for (let i = 1; i <= NICHES_COUNT; i++) {
  const reply = await waitForTextReply(env.telegramBotToken, env.telegramChatId, offset)
  niches.push(reply.text)
  offset = reply.nextOffset

  if (i < NICHES_COUNT) {
    await sendMessage(
      env.telegramBotToken, env.telegramChatId,
      `✅ _${reply.text}_ registrado!\n\n*Nicho ${i + 1}/${NICHES_COUNT}:*`
    )
  } else {
    await sendMessage(
      env.telegramBotToken, env.telegramChatId,
      `✅ _${reply.text}_ registrado!\n\n6 nichos definidos.`
    )
  }
}

// 3. Template approval loop
let template = readFileSync(TEMPLATE_PATH, 'utf8')
while (true) {
  const preview = [
    `📝 *Template da sessão:*`,
    `\`\`\``,
    template,
    `\`\`\``,
    `_Variáveis disponíveis: {{nome}}, {{cidade}}, {{categoria}}, {{rating}}_`
  ].join('\n')

  const templateMsg = await sendMessage(
    env.telegramBotToken, env.telegramChatId,
    preview,
    {
      inline_keyboard: [[
        { text: '✅ Aprovar', callback_data: 'approve' },
        { text: '✏️ Editar', callback_data: 'edit' }
      ]]
    }
  )

  const templateResult = await waitForApproval(
    env.telegramBotToken, env.telegramChatId,
    templateMsg.message_id, offset
  )
  offset = templateResult.nextOffset

  if (templateResult.decision === 'approve') break

  await sendMessage(env.telegramBotToken, env.telegramChatId, '✏️ Envie o novo texto do template:')
  const editReply = await waitForTextReply(env.telegramBotToken, env.telegramChatId, offset)
  template = editReply.text
  offset = editReply.nextOffset
}

// 4. Session summary + confirm start
const nichesList = niches.map((n, i) => `${i + 1}. ${n}`).join('\n')
const summaryMsg = await sendMessage(
  env.telegramBotToken, env.telegramChatId,
  [
    `✅ *Sessão configurada!*`,
    ``,
    `📍 Cidade: *${city}*`,
    `🏷️ Nichos:\n${nichesList}`,
    `📝 Template: aprovado`,
    `🎯 Meta: *${SESSION_TARGET} contatos*`,
    ``,
    `Tudo certo — iniciar?`
  ].join('\n'),
  {
    inline_keyboard: [[
      { text: '🚀 Iniciar', callback_data: 'start' },
      { text: '❌ Cancelar', callback_data: 'cancel' }
    ]]
  }
)

const startResult = await waitForApproval(
  env.telegramBotToken, env.telegramChatId,
  summaryMsg.message_id, offset
)
offset = startResult.nextOffset

if (startResult.decision === 'cancel') {
  await sendMessage(env.telegramBotToken, env.telegramChatId, '❌ Sessão cancelada.')
  process.exit(0)
}

// ─────────────────────────────────────────────
// EXECUTION PHASE
// ─────────────────────────────────────────────

await sendMessage(
  env.telegramBotToken, env.telegramChatId,
  `🔄 Iniciando prospecção automática...\n_Você receberá updates a cada 10 enviados._`
)
console.log(`\n[SESSION] cidade=${city} | nichos=${niches.join(', ')} | meta=${SESSION_TARGET}`)

let totalSent = 0
let totalSkipped = 0

for (let i = 0; i < niches.length; i++) {
  if (totalSent >= SESSION_TARGET) break

  const niche = niches[i]
  await sendMessage(
    env.telegramBotToken, env.telegramChatId,
    `🔍 Nicho *${i + 1}/${NICHES_COUNT}*: _${niche}_ — buscando...`
  )
  console.log(`\n[NICHE ${i + 1}/${NICHES_COUNT}] ${niche}`)

  let prospects
  try {
    prospects = await fetchProspects({
      city, category: niche, apiKey: env.apiKey,
      onSkip: (p, reason, url) => console.log(`[SKIP ${reason}: ${url ?? ''}] ${p.name}`)
    })
  } catch (err) {
    await sendMessage(
      env.telegramBotToken, env.telegramChatId,
      `❌ Erro buscando *${niche}*: ${err.message}`
    )
    console.error(`[ERROR] ${niche}: ${err.message}`)
    continue
  }

  prospects = dedupProspects(prospects, (p, reason, channels) => {
    console.log(`[SKIP ${reason}: ${channels.join('+')}] ${p.name}`)
  })

  await sendMessage(
    env.telegramBotToken, env.telegramChatId,
    `📋 *${prospects.length}* prospects novos encontrados para _${niche}_`
  )

  for (const prospect of prospects) {
    if (totalSent >= SESSION_TARGET) break
    if (!prospect.phone) { totalSkipped++; continue }
    if (isDuplicate(prospect.placeId, 'wa')) { totalSkipped++; continue }

    const message = renderMessage(prospect, { cidade: city, categoria: niche }, template)
    const result = await sendWhatsApp(prospect, message, waConfig)

    if (result.ok) {
      totalSent++
      console.log(`[WA sent] ${prospect.name} (${totalSent}/${SESSION_TARGET})`)

      if (totalSent % 10 === 0) {
        await sendMessage(
          env.telegramBotToken, env.telegramChatId,
          `📊 Progresso: *${totalSent}/${SESSION_TARGET}* enviados`
        )
      }
    } else {
      totalSkipped++
      console.log(`[WA failed: ${result.reason}] ${prospect.name}`)
    }
  }
}

// ─────────────────────────────────────────────
// FINAL SUMMARY
// ─────────────────────────────────────────────

const goalLine = totalSent >= SESSION_TARGET
  ? `🎯 *Meta atingida!*`
  : `⚠️ Nichos esgotados antes da meta`

await sendMessage(
  env.telegramBotToken, env.telegramChatId,
  [
    goalLine,
    ``,
    `📊 *Resumo da sessão*`,
    `✅ Enviados: *${totalSent}/${SESSION_TARGET}*`,
    `⏭️ Pulados: ${totalSkipped}`,
    `📍 Cidade: ${city}`,
    `🏷️ Nichos: ${niches.join(', ')}`
  ].join('\n')
)

console.log(`\n[DONE] enviados=${totalSent}/${SESSION_TARGET} pulados=${totalSkipped}`)
