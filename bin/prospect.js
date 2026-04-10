import 'dotenv/config'
import { validateEnv } from '../src/utils/env.js'
import { checkConnection } from '../src/services/evolution.js'
import {
  sendMessage, waitForTextReply, waitForApproval, waitForMedia,
  downloadTelegramFile, initUpdatesOffset
} from '../src/services/telegram.js'
import { fetchProspects } from '../src/stages/fetch.js'
import { loadHistory, isDuplicate } from '../src/history.js'
import { dedupProspects } from '../src/stages/dedup.js'
import { renderMessage } from '../src/stages/render.js'
import { sendWhatsApp, sendWhatsAppMedia } from '../src/stages/sender.js'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const TEMPLATE_PATH = join(__dirname, '..', 'templates', 'outreach.txt')
const SESSION_TARGET = 100
const NICHES_COUNT = 6

// ── Env ──────────────────────────────────────────────────────────────────────
let env
try {
  env = validateEnv()
} catch (err) {
  console.error(`Error: ${err.message}`)
  process.exit(1)
}

// ── Health check ─────────────────────────────────────────────────────────────
try {
  const status = await checkConnection({ baseUrl: env.evolutionApiUrl, apiKey: env.evolutionApiKey })
  if (!status.data?.Connected || !status.data?.LoggedIn) throw new Error()
} catch {
  console.error('Error: Evolution Go instance not connected. Reconnect via QR code before running.')
  process.exit(1)
}

const waConfig = { baseUrl: env.evolutionApiUrl, apiKey: env.evolutionApiKey }
let offset = await initUpdatesOffset(env.telegramBotToken)

// Carrega histórico persistente — garante que nenhuma empresa já contactada seja repetida
loadHistory()

// ─────────────────────────────────────────────────────────────────────────────
// SETUP DA SESSÃO
// ─────────────────────────────────────────────────────────────────────────────

await sendMessage(
  env.telegramBotToken, env.telegramChatId,
  `🚀 *ProspecTeam — Nova Sessão*\n\n🎯 Meta: *${SESSION_TARGET} contatos*\n\n📍 Qual *cidade* deseja prospectar?`
)

const cityReply = await waitForTextReply(env.telegramBotToken, env.telegramChatId, offset)
const city = cityReply.text
offset = cityReply.nextOffset

await sendMessage(
  env.telegramBotToken, env.telegramChatId,
  `✅ Cidade: *${city}*\n\n🏷️ Defina os *${NICHES_COUNT} nichos* da sessão (um por mensagem):\n\n*Nicho 1/${NICHES_COUNT}:*`
)

const niches = []
for (let i = 1; i <= NICHES_COUNT; i++) {
  const reply = await waitForTextReply(env.telegramBotToken, env.telegramChatId, offset)
  niches.push(reply.text)
  offset = reply.nextOffset

  if (i < NICHES_COUNT) {
    await sendMessage(
      env.telegramBotToken, env.telegramChatId,
      `✅ _${reply.text}_ adicionado!\n\n*Nicho ${i + 1}/${NICHES_COUNT}:*`
    )
  }
}

const nichesList = niches.map((n, i) => `${i + 1}. ${n}`).join('\n')
const confirmMsg = await sendMessage(
  env.telegramBotToken, env.telegramChatId,
  `📋 *Sessão configurada:*\n\n📍 Cidade: *${city}*\n🏷️ Nichos:\n${nichesList}\n\n🎯 Meta: *${SESSION_TARGET} contatos*\n\nConfirmar e iniciar?`,
  {
    inline_keyboard: [[
      { text: '🚀 Iniciar', callback_data: 'start' },
      { text: '❌ Cancelar', callback_data: 'cancel' }
    ]]
  }
)

const confirmResult = await waitForApproval(
  env.telegramBotToken, env.telegramChatId, confirmMsg.message_id, offset
)
offset = confirmResult.nextOffset

if (confirmResult.decision === 'cancel') {
  await sendMessage(env.telegramBotToken, env.telegramChatId, '❌ Sessão cancelada.')
  process.exit(0)
}

// ─────────────────────────────────────────────────────────────────────────────
// LOOP POR NICHO
// ─────────────────────────────────────────────────────────────────────────────

let totalSent = 0
let totalSkipped = 0
// Template base — pode ser editado a cada nicho
let currentTemplate = readFileSync(TEMPLATE_PATH, 'utf8')

for (let i = 0; i < niches.length; i++) {
  if (totalSent >= SESSION_TARGET) break

  const niche = niches[i]
  console.log(`\n[NICHO ${i + 1}/${NICHES_COUNT}] ${niche}`)

  await sendMessage(
    env.telegramBotToken, env.telegramChatId,
    `━━━━━━━━━━━━━━━━━━\n🏷️ *Nicho ${i + 1}/${NICHES_COUNT}: ${niche}*\n\nRevisão antes de iniciar:`
  )

  // ── Aprovação do template ────────────────────────────────────────────────
  while (true) {
    const preview = [
      `📝 *Template:*`,
      `\`\`\``,
      currentTemplate,
      `\`\`\``,
      `_Variáveis: {{nome}}, {{cidade}}, {{categoria}}, {{rating}}_`
    ].join('\n')

    const templateMsg = await sendMessage(
      env.telegramBotToken, env.telegramChatId, preview,
      {
        inline_keyboard: [[
          { text: '✅ Aprovar', callback_data: 'approve' },
          { text: '✏️ Editar', callback_data: 'edit' }
        ]]
      }
    )

    const templateResult = await waitForApproval(
      env.telegramBotToken, env.telegramChatId, templateMsg.message_id, offset
    )
    offset = templateResult.nextOffset

    if (templateResult.decision === 'approve') break

    await sendMessage(env.telegramBotToken, env.telegramChatId, '✏️ Envie o novo texto do template:')
    const editReply = await waitForTextReply(env.telegramBotToken, env.telegramChatId, offset)
    currentTemplate = editReply.text
    offset = editReply.nextOffset
  }

  // ── Aprovação do arquivo anexo ────────────────────────────────────────────
  let nicheMedia = null
  const attachMsg = await sendMessage(
    env.telegramBotToken, env.telegramChatId,
    `📎 Deseja enviar um arquivo junto com cada mensagem deste nicho?`,
    {
      inline_keyboard: [[
        { text: '📹 Vídeo', callback_data: 'attach_video' },
        { text: '🖼️ Imagem', callback_data: 'attach_image' },
        { text: '📄 Documento', callback_data: 'attach_document' },
        { text: '❌ Não', callback_data: 'attach_none' }
      ]]
    }
  )

  const attachResult = await waitForApproval(
    env.telegramBotToken, env.telegramChatId, attachMsg.message_id, offset
  )
  offset = attachResult.nextOffset

  if (attachResult.decision !== 'attach_none') {
    await sendMessage(env.telegramBotToken, env.telegramChatId, '📤 Envie o arquivo agora:')
    try {
      const mediaReply = await waitForMedia(env.telegramBotToken, env.telegramChatId, offset)
      offset = mediaReply.nextOffset
      const { buffer, filePath } = await downloadTelegramFile(env.telegramBotToken, mediaReply.fileId)
      nicheMedia = { buffer, filePath, fileName: mediaReply.fileName }
      await sendMessage(env.telegramBotToken, env.telegramChatId, `✅ Arquivo recebido: _${mediaReply.fileName}_`)
    } catch (err) {
      await sendMessage(env.telegramBotToken, env.telegramChatId, `⚠️ Falha ao receber arquivo: ${err.message}\nContinuando sem anexo.`)
    }
  }

  // ── Busca e dedup ─────────────────────────────────────────────────────────
  await sendMessage(
    env.telegramBotToken, env.telegramChatId,
    `🔍 Buscando prospects para *${niche}* em *${city}*...`
  )

  let prospects
  try {
    prospects = await fetchProspects({
      city, category: niche, apiKey: env.apiKey,
      onSkip: (p, reason, url) => console.log(`[SKIP ${reason}: ${url ?? ''}] ${p.name}`)
    })
  } catch (err) {
    await sendMessage(
      env.telegramBotToken, env.telegramChatId,
      `❌ Erro ao buscar *${niche}*: ${err.message}\nPulando para o próximo nicho.`
    )
    console.error(`[ERROR] ${niche}: ${err.message}`)
    continue
  }

  // dedupProspects filtra duplicatas dentro da sessão (placeId)
  // isDuplicate verifica o histórico persistente (entre sessões)
  prospects = dedupProspects(prospects, (p, reason, channels) => {
    console.log(`[SKIP ${reason}: ${channels.join('+')}] ${p.name}`)
  })

  const remaining = SESSION_TARGET - totalSent
  const toProcess = prospects.slice(0, remaining * 3) // margem para prospects sem telefone ou já contatados

  await sendMessage(
    env.telegramBotToken, env.telegramChatId,
    `📋 *${prospects.length}* prospects novos encontrados\n🔄 Iniciando envios automáticos...`
  )

  // ── Envio automático ──────────────────────────────────────────────────────
  for (const prospect of toProcess) {
    if (totalSent >= SESSION_TARGET) break

    if (!prospect.phone) {
      console.log(`[SKIP no-phone] ${prospect.name}`)
      totalSkipped++
      continue
    }

    // Verificação crítica: não contactar empresas já contactadas (histórico persistente)
    if (isDuplicate(prospect.placeId, 'wa')) {
      console.log(`[SKIP already-sent] ${prospect.name}`)
      totalSkipped++
      continue
    }

    const message = renderMessage(prospect, { cidade: city, categoria: niche }, currentTemplate)
    const result = await sendWhatsApp(prospect, message, waConfig)

    if (result.ok) {
      totalSent++
      console.log(`[WA sent] ${prospect.name} (${totalSent}/${SESSION_TARGET})`)

      // Envia anexo após o texto, se houver
      if (nicheMedia) {
        const mediaResult = await sendWhatsAppMedia(prospect, nicheMedia, waConfig)
        if (!mediaResult.ok) {
          console.log(`[MEDIA failed] ${prospect.name}: ${mediaResult.reason}`)
        }
      }

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

  await sendMessage(
    env.telegramBotToken, env.telegramChatId,
    `✅ Nicho *${niche}* concluído — ${totalSent}/${SESSION_TARGET} enviados no total`
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// RESUMO FINAL
// ─────────────────────────────────────────────────────────────────────────────

const goalLine = totalSent >= SESSION_TARGET ? `🎯 *Meta atingida!*` : `⚠️ Nichos esgotados antes da meta`

await sendMessage(
  env.telegramBotToken, env.telegramChatId,
  [
    goalLine,
    ``,
    `📊 *Resumo da sessão*`,
    `✅ Enviados: *${totalSent}/${SESSION_TARGET}*`,
    `⏭️ Pulados/já contatados: ${totalSkipped}`,
    `📍 Cidade: ${city}`,
    `🏷️ Nichos: ${niches.join(', ')}`
  ].join('\n')
)

console.log(`\n[DONE] enviados=${totalSent}/${SESSION_TARGET} pulados=${totalSkipped}`)
