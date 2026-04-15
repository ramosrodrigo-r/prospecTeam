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

const SUGGESTED_NICHES = [
  'Restaurantes e lanchonetes',
  'Salões de beleza e barbearias',
  'Academias e personal trainers',
  'Clínicas odontológicas',
  'Clínicas de estética',
  'Consultórios médicos',
  'Advocacias e escritórios jurídicos',
  'Imobiliárias e corretores',
  'Petshops e veterinárias',
  'Escolas de idiomas',
  'Escolas de música e artes',
  'Oficinas mecânicas e auto peças',
  'Lojas de roupa e calçados',
  'Padarias e confeitarias',
  'Fotógrafos e estúdios',
  'Psicólogos e terapeutas',
  'Hotéis e pousadas',
  'Eventos e espaços para festas',
  'Arquitetos e designers de interiores',
  'Contabilidades e consultorias',
]

function esc(text) {
  return String(text).replace(/([_*`[])/g, '\\$1')
}

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

loadHistory()

try {

// ─────────────────────────────────────────────────────────────────────────────
// SETUP: NICHO
// ─────────────────────────────────────────────────────────────────────────────

await sendMessage(
  env.telegramBotToken, env.telegramChatId,
  `🚀 *ProspecTeam — Nova Sessão*\n\nEscolha o nicho da sessão:`
)

const nicheListText = SUGGESTED_NICHES.map((n, i) => `${i + 1}. ${n}`).join('\n')

await sendMessage(
  env.telegramBotToken, env.telegramChatId,
  `🏷️ *Nichos disponíveis:*\n\n${nicheListText}\n\nResponda com o *número* do nicho desejado:`
)

let niche = ''
while (!niche) {
  const reply = await waitForTextReply(env.telegramBotToken, env.telegramChatId, offset)
  offset = reply.nextOffset
  const num = parseInt(reply.text.trim(), 10)
  if (isNaN(num) || num < 1 || num > SUGGESTED_NICHES.length) {
    await sendMessage(
      env.telegramBotToken, env.telegramChatId,
      `⚠️ Número inválido. Envie um número entre 1 e ${SUGGESTED_NICHES.length}.`
    )
    continue
  }
  niche = SUGGESTED_NICHES[num - 1]
}

await sendMessage(
  env.telegramBotToken, env.telegramChatId,
  `✅ Nicho: *${esc(niche)}*`
)

// ─────────────────────────────────────────────────────────────────────────────
// SETUP: TEMPLATE (aprovado uma única vez)
// ─────────────────────────────────────────────────────────────────────────────

let currentTemplate = readFileSync(TEMPLATE_PATH, 'utf8')

while (true) {
  const preview = [
    `📝 *Template de mensagem:*`,
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

// ─────────────────────────────────────────────────────────────────────────────
// SETUP: ARQUIVO ANEXO (opcional, uma única vez)
// ─────────────────────────────────────────────────────────────────────────────

let sessionMedia = null

const attachMsg = await sendMessage(
  env.telegramBotToken, env.telegramChatId,
  `📎 Deseja enviar um arquivo junto com cada mensagem?`,
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
    sessionMedia = { buffer, filePath, fileName: mediaReply.fileName }
    await sendMessage(env.telegramBotToken, env.telegramChatId, `✅ Arquivo recebido: _${esc(mediaReply.fileName)}_`)
  } catch (err) {
    await sendMessage(env.telegramBotToken, env.telegramChatId, `⚠️ Falha ao receber arquivo: ${err.message}\nContinuando sem anexo.`)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LOOP POR CIDADE
// ─────────────────────────────────────────────────────────────────────────────

let totalSent = 0
let totalSkipped = 0
const citiesVisited = []
let roundNum = 0

while (true) {
  roundNum++

  await sendMessage(
    env.telegramBotToken, env.telegramChatId,
    `━━━━━━━━━━━━━━━━━━\n🌆 *Rodada ${roundNum}* — Qual cidade prospectar?`
  )

  const cityReply = await waitForTextReply(env.telegramBotToken, env.telegramChatId, offset)
  const city = cityReply.text.trim()
  offset = cityReply.nextOffset
  citiesVisited.push(city)

  console.log(`\n[RODADA ${roundNum}] ${niche} em ${city}`)

  // ── Busca ──────────────────────────────────────────────────────────────────
  await sendMessage(
    env.telegramBotToken, env.telegramChatId,
    `🔍 Buscando *${esc(niche)}* em *${esc(city)}*...`
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
      `❌ Erro ao buscar em *${esc(city)}*: ${esc(err.message)}`
    )
    console.error(`[ERROR] ${city}: ${err.message}`)
  }

  if (prospects) {
    prospects = dedupProspects(prospects, (p, reason, channels) => {
      console.log(`[SKIP ${reason}: ${channels.join('+')}] ${p.name}`)
    })

    await sendMessage(
      env.telegramBotToken, env.telegramChatId,
      `📋 *${prospects.length}* prospects novos encontrados\n🔄 Iniciando envios automáticos...`
    )

    // ── Envio ────────────────────────────────────────────────────────────────
    let citySent = 0
    let citySkipped = 0

    for (const prospect of prospects) {
      if (!prospect.phone) {
        console.log(`[SKIP no-phone] ${prospect.name}`)
        citySkipped++
        continue
      }

      if (isDuplicate(prospect.placeId, 'wa')) {
        console.log(`[SKIP already-sent] ${prospect.name}`)
        citySkipped++
        continue
      }

      const message = renderMessage(prospect, { cidade: city, categoria: niche }, currentTemplate)
      const result = await sendWhatsApp(prospect, message, waConfig)

      if (result.ok) {
        citySent++
        totalSent++
        console.log(`[WA sent] ${prospect.name} (sessão: ${totalSent})`)

        if (sessionMedia) {
          const mediaResult = await sendWhatsAppMedia(prospect, sessionMedia, waConfig)
          if (!mediaResult.ok) {
            console.log(`[MEDIA failed] ${prospect.name}: ${mediaResult.reason}`)
          }
        }

        if (citySent % 10 === 0) {
          await sendMessage(
            env.telegramBotToken, env.telegramChatId,
            `📊 *${citySent}* enviados em ${esc(city)} (total da sessão: ${totalSent})`
          )
        }
      } else {
        citySkipped++
        totalSkipped++
        console.log(`[WA failed: ${result.reason}] ${prospect.name}`)
      }
    }

    await sendMessage(
      env.telegramBotToken, env.telegramChatId,
      `✅ *${esc(city)}* concluída — ${citySent} enviados, ${citySkipped} pulados`
    )
  }

  // ── Continuar ou parar? ────────────────────────────────────────────────────
  const continueMsg = await sendMessage(
    env.telegramBotToken, env.telegramChatId,
    `📊 Total da sessão: *${totalSent}* enviados\n\nDeseja prospectar outra cidade?`,
    {
      inline_keyboard: [[
        { text: '🌆 Nova cidade', callback_data: 'approve' },
        { text: '🛑 Encerrar sessão', callback_data: 'cancel' }
      ]]
    }
  )

  const continueResult = await waitForApproval(
    env.telegramBotToken, env.telegramChatId, continueMsg.message_id, offset
  )
  offset = continueResult.nextOffset

  if (continueResult.decision === 'cancel') break
}

// ─────────────────────────────────────────────────────────────────────────────
// RESUMO FINAL
// ─────────────────────────────────────────────────────────────────────────────

await sendMessage(
  env.telegramBotToken, env.telegramChatId,
  [
    `🏁 *Sessão encerrada*`,
    ``,
    `📊 *Resumo*`,
    `✅ Enviados: *${totalSent}*`,
    `⏭️ Pulados/já contatados: ${totalSkipped}`,
    `🏷️ Nicho: ${esc(niche)}`,
    `🌆 Cidades: ${citiesVisited.map(esc).join(', ')}`,
    `🔄 Rodadas: ${roundNum}`
  ].join('\n')
)

console.log(`\n[DONE] enviados=${totalSent} pulados=${totalSkipped} cidades=${citiesVisited.join(', ')}`)

} catch (err) {
  console.error(`[FATAL] ${err.message}`, err)
  try {
    await sendMessage(
      env.telegramBotToken, env.telegramChatId,
      `🔴 *Erro fatal no bot:*\n\`${esc(err.message)}\`\n\nVerifique o terminal para detalhes.`
    )
  } catch { /* ignora erro ao enviar o aviso */ }
  process.exit(1)
}
